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

if (scripts['05_counter.gil']) {
    test('05_counter integer increment', function() {
        var s = scripts['05_counter.gil'].script;
        var f = new Frontier();

        var init = s.intent('init');
        assert(init !== undefined, 'init intent not found');
        init.execute(f);
        assertVal(f.get('count', ['0']), GIL.TRUE, 'count[0] after init');

        var inc = s.intent('inc');
        assert(inc !== undefined, 'inc intent not found');
        inc.execute(f, ['0']);
        assertVal(f.get('count', ['0']), GIL.FALSE, 'count[0] after inc');
        assertVal(f.get('count', ['1']), GIL.TRUE, 'count[1] after inc');

        inc.execute(f, ['1']);
        assertVal(f.get('count', ['1']), GIL.FALSE, 'count[1] after second inc');
        assertVal(f.get('count', ['2']), GIL.TRUE, 'count[2] after second inc');
    });
}

if (scripts['08_inventory.gil']) {
    test('08_inventory count_item and add_one', function() {
        var s = scripts['08_inventory.gil'].script;
        var f = new Frontier();

        var pickup = s.intent('pickup');
        assert(pickup !== undefined, 'pickup intent not found');
        pickup.execute(f, ['alice', 'apple']);

        var set_count = s.intent('set_count');
        assert(set_count !== undefined, 'set_count intent not found');
        set_count.execute(f, ['alice', 'apple', '1']);
        assertVal(f.get('item_count', ['alice', 'apple', '1']), GIL.TRUE, 'item_count[alice,apple,1]');

        var add_one = s.intent('add_one');
        assert(add_one !== undefined, 'add_one intent not found');
        add_one.execute(f, ['alice', 'apple', '1']);
        assertVal(f.get('item_count', ['alice', 'apple', '1']), GIL.FALSE, 'item_count[alice,apple,1] after add_one');
        assertVal(f.get('item_count', ['alice', 'apple', '2']), GIL.TRUE, 'item_count[alice,apple,2] after add_one');
    });
}

if (scripts['14_resource_alloc.gil']) {
    test('14_resource_alloc acquire/release/priority', function() {
        var s = scripts['14_resource_alloc.gil'].script;
        var f = new Frontier();

        var acquire = s.intent('acquire');
        var release = s.intent('release');
        var set_priority = s.intent('set_priority');

        acquire.execute(f, ['alice', 'printer']);
        assertVal(f.get('in_use', ['printer']), GIL.TRUE, 'in_use[printer]');
        assertVal(f.get('owner', ['printer', 'alice']), GIL.TRUE, 'owner[printer, alice]');

        set_priority.execute(f, ['printer', '3']);
        assertVal(f.get('priority', ['printer', '3']), GIL.TRUE, 'priority[printer, 3]');

        release.execute(f, ['alice', 'printer']);
        assertVal(f.get('in_use', ['printer']), GIL.FALSE, 'in_use after release');
        assertVal(f.get('owner', ['printer', 'alice']), GIL.FALSE, 'owner after release');
    });
}

if (scripts['09_voting.gil']) {
    test('09_voting vote and tally', function() {
        var s = scripts['09_voting.gil'].script;
        var f = new Frontier();

        var vote = s.intent('vote');
        assert(vote !== undefined, 'vote intent not found');
        vote.execute(f, ['alice', 'ham']);
        vote.execute(f, ['bob',   'ham']);
        vote.execute(f, ['carol', 'spam']);

        assertVal(f.get('voted', ['alice', 'ham']),   GIL.TRUE, 'voted[alice, ham]');
        assertVal(f.get('voted', ['bob',   'ham']),   GIL.TRUE, 'voted[bob, ham]');
        assertVal(f.get('voted', ['carol', 'spam']),  GIL.TRUE, 'voted[carol, spam]');

        var tally = s.intent('tally');
        assert(tally !== undefined, 'tally intent not found');
        tally.execute(f);

        assertVal(f.get('ballot_for', ['ham',  'alice']), GIL.TRUE, 'ballot_for[ham, alice]');
        assertVal(f.get('ballot_for', ['ham',  'bob']),   GIL.TRUE, 'ballot_for[ham, bob]');
        assertVal(f.get('ballot_for', ['spam', 'carol']), GIL.TRUE, 'ballot_for[spam, carol]');

        var results = s.intent('results');
        assert(results !== undefined, 'results intent not found');
        results.execute(f, ['ham']);

        assertVal(f.get('received_votes', ['ham']),  GIL.TRUE, 'received_votes[ham]');
        results.execute(f, ['spam']);
        assertVal(f.get('received_votes', ['spam']), GIL.TRUE, 'received_votes[spam]');
    });
}

if (scripts['12_state_machine.gil']) {
    test('12_state_machine transitions', function() {
        var s = scripts['12_state_machine.gil'].script;
        var f = new Frontier();

        var set_state = s.intent('set_state');
        assert(set_state !== undefined, 'set_state intent not found');
        set_state.execute(f, ['idle']);
        assertVal(f.get('active', ['idle']), GIL.TRUE, 'active[idle] after set_state');

        var transition = s.intent('transition');
        assert(transition !== undefined, 'transition intent not found');
        transition.execute(f, ['idle', 'running']);
        assertVal(f.get('active', ['idle']),    GIL.FALSE, 'active[idle] after transition');
        assertVal(f.get('active', ['running']), GIL.TRUE,  'active[running] after transition');
    });
}

if (scripts['19_battleship.gil']) {
    test('19_battleship damage detection and sector report', function() {
        var s = scripts['19_battleship.gil'].script;
        var f = new Frontier();

        var place  = s.intent('place_ship');
        var fire   = s.intent('fire_at');
        var damage = s.intent('check_damage');
        var sector = s.intent('sector_report');

        place.execute(f, ['carrier', '3', '5']);
        place.execute(f, ['carrier', '4', '5']);

        fire.execute(f, ['3', '5']);
        assertVal(f.get('hit', ['carrier', '3', '5']), GIL.TRUE, 'hit[carrier, 3, 5]');
        assertVal(f.get('hit', ['carrier', '4', '5']), GIL.FALSE, 'not hit[carrier, 4, 5]');

        damage.execute(f, ['carrier']);
        assertVal(f.get('damaged', ['carrier']), GIL.TRUE, 'damaged[carrier]');

        sector.execute(f, ['carrier']);
        assertVal(f.get('sector_hit', ['carrier', '1', '2']), GIL.TRUE, 'sector_hit[carrier, 3/2=1, 5/2=2]');
    });
}

if (scripts['20_life.gil']) {
    test('20_life cell shift with integer arithmetic', function() {
        var s = scripts['20_life.gil'].script;
        var f = new Frontier();

        var set_cell  = s.intent('set_cell');
        var shift     = s.intent('shift');

        set_cell.execute(f, ['0', '0']);
        set_cell.execute(f, ['5', '3']);
        assertVal(f.get('cell', ['0', '0']), GIL.TRUE, 'cell[0,0]');
        assertVal(f.get('cell', ['5', '3']), GIL.TRUE, 'cell[5,3]');

        shift.execute(f, ['1', '0']);

        assertVal(f.get('cell', ['0', '0']), GIL.FALSE, 'cell[0,0] after shift');
        assertVal(f.get('cell', ['5', '3']), GIL.FALSE, 'cell[5,3] after shift');
        assertVal(f.get('shifted', ['1', '0']), GIL.TRUE, 'shifted[1,0] from cell[0,0]+(1,0)');
        assertVal(f.get('shifted', ['6', '3']), GIL.TRUE, 'shifted[6,3] from cell[5,3]+(1,0)');
    });
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

process.stdout.write('\n');
process.stdout.write('Results: ' + passed + '/' + (passed + failed) + ' passed\n');
process.exit(failed > 0 ? 1 : 0);
