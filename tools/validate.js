#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const giljs = path.resolve(__dirname, '..', '..', 'giljs');
const { Script, Frontier, GIL } = require(giljs);

const SCRIPTS_DIR = path.resolve(__dirname, '..', 'scripts');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        process.stdout.write('  \u2713 ' + name + '\n');
        passed++;
    } catch (e) {
        process.stdout.write('  \u2717 ' + name + ' -- ' + e.message + '\n');
        failed++;
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion failed');
}
function assertVal(got, exp, label) {
    if (got !== exp) throw new Error((label || '') + ': got ' + got + ', expected ' + exp);
}

// ---------------------------------------------------------------------------
// 1. Load every script successfully
// ---------------------------------------------------------------------------

const scriptFiles = fs.readdirSync(SCRIPTS_DIR)
    .filter(function(f) { return f.endsWith('.gil'); })
    .sort();

process.stdout.write('=== Gil Examples Validation ===\n\n');
process.stdout.write('Loading ' + scriptFiles.length + ' scripts...\n\n');

var scripts = {};

for (var i = 0; i < scriptFiles.length; i++) {
    (function(f) {
        test('load ' + f, function() {
            var src = fs.readFileSync(path.join(SCRIPTS_DIR, f), 'utf8');
            var s = Script.load(src);
            assert(s !== null, 'Script.load returned null');
            scripts[f] = { script: s, source: src };
        });
    })(scriptFiles[i]);
}

process.stdout.write('\n');

// ---------------------------------------------------------------------------
function getParamCount(source, intentName) {
    var re = new RegExp('intent\\s+' + intentName + '\\s*\\(([^)]*)\\)');
    var m = re.exec(source);
    if (!m) return 0;
    var params = m[1].trim();
    if (params.length === 0) return 0;
    return params.split(',').length;
}
// ---------------------------------------------------------------------------
// 2. Discover intents in each script
// ---------------------------------------------------------------------------

var intentRe = /intent\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;

var keys = Object.keys(scripts);
for (var k = 0; k < keys.length; k++) {
    (function(f) {
        var obj = scripts[f];
        var script = obj.script;
        var source = obj.source;
        var intents = [];
        var m;
        intentRe.lastIndex = 0;
        while ((m = intentRe.exec(source)) !== null) {
            intents.push(m[1]);
        }
        obj.intentNames = intents;

        if (intents.length === 0) {
            test('warn: no intents in ' + f, function() {
                throw new Error('No intents found in ' + f);
            });
            return;
        }

        for (var j = 0; j < intents.length; j++) {
            (function(name) {
                test(f + ' -> intent ' + name, function() {
                    var intent = script.intent(name);
                    assert(intent !== undefined, 'intent ' + name + ' not found');
                });
            })(intents[j]);
        }
    })(keys[k]);
}

process.stdout.write('\n');

// ---------------------------------------------------------------------------
// 3. Smoke-test execution on a fresh frontier
// ---------------------------------------------------------------------------

for (var p = 0; p < keys.length; p++) {
    (function(f) {
        var obj = scripts[f];
        var intentNames = obj.intentNames;
        var source = obj.source;
        if (!intentNames || intentNames.length === 0) return;

        // Only test 0-parameter intents for simple smoke execution
        var name = intentNames[0];
        var paramCount = getParamCount(source, name);
        if (paramCount > 0) return;

        test(f + ' execute ' + name, function() {
            var intent = obj.script.intent(name);
            var frontier = new Frontier();
            intent.execute(frontier);
        });
    })(keys[p]);
}

process.stdout.write('\n');

// ---------------------------------------------------------------------------
// 4. Specific behavior tests for key scripts
// ---------------------------------------------------------------------------

if (scripts['10_pathfinder.gil']) {
    test('10_pathfinder propagate convergence', function() {
        var s = scripts['10_pathfinder.gil'].script;
        var f = new Frontier();
        f.set('connected', ['a', 'b'], GIL.TRUE);
        f.set('connected', ['b', 'c'], GIL.TRUE);
        var prop = s.intent('propagate');
        assert(prop !== undefined, 'propagate intent not found');
        prop.execute(f, ['a']);
        assertVal(f.get('activated', ['a']), GIL.TRUE, 'activated[a]');
        assertVal(f.get('activated', ['b']), GIL.TRUE, 'activated[b]');
        assertVal(f.get('activated', ['c']), GIL.TRUE, 'activated[c]');
    });
}

if (scripts['02_lightswitch.gil']) {
    test('02_lightswitch turn on/off', function() {
        var s = scripts['02_lightswitch.gil'].script;
        var f = new Frontier();
        var turn_on = s.intent('turn_on');
        assert(turn_on !== undefined, 'turn_on intent not found');
        turn_on.execute(f);
        assertVal(f.get('lit'), GIL.TRUE, 'lit after turn_on');
        var turn_off = s.intent('turn_off');
        turn_off.execute(f);
        assertVal(f.get('lit'), GIL.FALSE, 'lit after turn_off');
    });
}

if (scripts['03_greeter.gil']) {
    test('03_greeter parameterized', function() {
        var s = scripts['03_greeter.gil'].script;
        var f = new Frontier();
        var greet = s.intent('greet');
        assert(greet !== undefined, 'greet intent not found');
        greet.execute(f, ['alice']);
        assertVal(f.get('greeted', ['alice']), GIL.TRUE, 'greeted[alice]');
    });
}

if (scripts['06_access_control.gil']) {
    test('06_access_control guarded enter', function() {
        var s = scripts['06_access_control.gil'].script;
        var f = new Frontier();

        var ent = s.intent('enter');
        assert(ent !== undefined, 'enter intent not found');
        ent.execute(f, ['alice', 'vault']);
        assertVal(f.get('inside', ['alice', 'vault']), GIL.FALSE, 'enter without auth');

        var grant = s.intent('grant_access');
        grant.execute(f, ['alice', 'vault']);
        ent.execute(f, ['alice', 'vault']);
        assertVal(f.get('inside', ['alice', 'vault']), GIL.TRUE, 'enter with auth');
    });
}

if (scripts['13_social_graph.gil']) {
    test('13_social_graph suggestions', function() {
        var s = scripts['13_social_graph.gil'].script;
        var f = new Frontier();

        var befriend = s.intent('befriend');
        var suggest = s.intent('suggest_friends');

        befriend.execute(f, ['alice', 'bob']);
        befriend.execute(f, ['bob', 'carol']);

        suggest.execute(f, ['alice']);
        assertVal(f.get('suggested', ['alice', 'carol']), GIL.TRUE, 'suggested[alice, carol]');
        assertVal(f.get('suggested', ['alice', 'bob']), GIL.FALSE, 'not suggested[alice, bob]');
    });
}

if (scripts['14_resource_alloc.gil']) {
    test('14_resource_alloc acquire/release', function() {
        var s = scripts['14_resource_alloc.gil'].script;
        var f = new Frontier();

        var acquire = s.intent('acquire');
        var release = s.intent('release');

        acquire.execute(f, ['alice', 'printer']);
        assertVal(f.get('in_use', ['printer']), GIL.TRUE, 'in_use[printer]');
        assertVal(f.get('owner', ['printer', 'alice']), GIL.TRUE, 'owner[printer, alice]');

        release.execute(f, ['alice', 'printer']);
        assertVal(f.get('in_use', ['printer']), GIL.FALSE, 'in_use after release');
        assertVal(f.get('owner', ['printer', 'alice']), GIL.FALSE, 'owner after release');
    });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

process.stdout.write('\n');
process.stdout.write('Results: ' + passed + '/' + (passed + failed) + ' passed\n');
process.exit(failed > 0 ? 1 : 0);
