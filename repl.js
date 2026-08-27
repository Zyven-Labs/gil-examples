#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const readline = require('readline');

const giljs = path.resolve(__dirname, '../giljs');
const { Script, Frontier, GIL } = require(giljs);

const VAL_NAMES = { 0: 'false', 1: 'true', 2: 'both' };

function valName(v) {
    return VAL_NAMES[v] !== undefined ? VAL_NAMES[v] : String(v);
}

function parseValue(s) {
    const lo = s.toLowerCase();
    if (lo === 'true')  return GIL.TRUE;
    if (lo === 'false') return GIL.FALSE;
    if (lo === 'both')  return GIL.BOTH;
    throw new Error('invalid value "' + s + '" \u2014 use true, false, or both');
}

function parseArgs(line) {
    const args = [];
    let i = 0;
    while (i < line.length) {
        while (i < line.length && line[i] === ' ') i++;
        if (i >= line.length) break;
        if (line[i] === '"') {
            i++;
            let buf = '';
            while (i < line.length && line[i] !== '"') {
                buf += line[i];
                i++;
            }
            i++;
            args.push(buf);
        } else {
            let buf = '';
            while (i < line.length && line[i] !== ' ') {
                buf += line[i];
                i++;
            }
            args.push(buf);
        }
    }
    return args;
}

function startRepl(script, scriptPath) {
    const frontier = new Frontier();
    const intentCache = {};
    let intentNames = [];
    try {
        const src = fs.readFileSync(scriptPath, 'utf8');
        const re = /intent\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        let m;
        while ((m = re.exec(src)) !== null) {
            intentNames.push(m[1]);
        }
    } catch (_) {}

    console.log('\n  Gil REPL \u2014 loaded: ' + path.basename(scriptPath));
    console.log('  Intents: ' + (intentNames.length > 0 ? intentNames.join(', ') : '(none)'));
    console.log('  Commands: intent, get, set, del, query, ls, help, .exit\n');

    const rl = readline.createInterface({
        input:  process.stdin,
        output: process.stdout,
        prompt: 'gil> '
    });

    rl.prompt();

    rl.on('line', function(line) {
        line = line.trim();
        if (!line || line.startsWith('#')) { rl.prompt(); return; }

        var parts = parseArgs(line);
        var cmd   = parts[0] ? parts[0].toLowerCase() : '';

        try {
            switch (cmd) {

            case 'intent':
            case 'i':
                if (parts.length < 2) {
                    console.log('  Usage: intent <name> [args...]');
                    break;
                }
                var iname = parts[1];
                var iargs = parts.slice(2);
                var intent = intentCache[iname];
                if (!intent) {
                    intent = script.intent(iname);
                    if (!intent) {
                        console.log('  Unknown intent: ' + iname);
                        break;
                    }
                    intentCache[iname] = intent;
                }
                intent.execute(frontier, iargs);
                console.log('  Executed ' + iname + '(' + iargs.join(', ') + ')');
                break;

            case 'get':
            case 'g':
                if (parts.length < 2) {
                    console.log('  Usage: get <predicate> [args...]');
                    break;
                }
                var pname = parts[1];
                var pargs = parts.slice(2);
                var v;
                if (pargs.length === 0) {
                    v = frontier.get(pname);
                } else {
                    v = frontier.get(pname, pargs);
                }
                console.log('  ' + pname + (pargs.length > 0 ? '[' + pargs.join(', ') + ']' : '') + ' = ' + valName(v));
                break;

            case 'set':
            case 's':
                if (parts.length < 3) {
                    console.log('  Usage: set <predicate> [args...] <value>  (value = true/false/both)');
                    break;
                }
                var spname = parts[1];
                var valueStr = parts[parts.length - 1];
                var v = parseValue(valueStr);
                var spargs = parts.slice(2, parts.length - 1);
                if (spargs.length === 0) {
                    frontier.set(spname, v);
                } else {
                    frontier.set(spname, spargs, v);
                }
                console.log('  Set ' + spname + (spargs.length > 0 ? '[' + spargs.join(', ') + ']' : '') + ' = ' + valName(v));
                break;

            case 'del':
            case 'd':
                if (parts.length < 2) {
                    console.log('  Usage: del <predicate> [args...]');
                    break;
                }
                var dpname = parts[1];
                var dpargs = parts.slice(2);
                if (dpargs.length === 0) {
                    frontier.del(dpname);
                } else {
                    frontier.del(dpname, dpargs);
                }
                console.log('  Deleted ' + dpname + (dpargs.length > 0 ? '[' + dpargs.join(', ') + ']' : ''));
                break;

            case 'query':
            case 'q':
                if (parts.length < 2) {
                    console.log('  Usage: query <predicate> [pattern...]  (UPPERCASE = variable)');
                    break;
                }
                var qpname = parts[1];
                var qpargs = parts.slice(2);
                var result = frontier.query(qpname, qpargs.length > 0 ? qpargs : undefined);
                if (result.matches && result.matches.length > 0) {
                    console.log('  Matches for ' + qpname + (qpargs.length > 0 ? '[' + qpargs.join(', ') + ']' : '') + ':');
                    for (var mi = 0; mi < result.matches.length; mi++) {
                        var m = result.matches[mi];
                        var argStr = m.args.length > 0 ? '[' + m.args.join(', ') + ']' : '';
                        console.log('    ' + qpname + argStr + ' = ' + valName(m.value));
                    }
                } else {
                    console.log('  No matches');
                }
                break;

            case 'ls':
                if (intentNames.length === 0) {
                    console.log('  (No intents discovered)');
                } else {
                    console.log('  Intents:');
                    for (var ni = 0; ni < intentNames.length; ni++) {
                        console.log('    ' + intentNames[ni]);
                    }
                }
                break;

            case 'help':
            case '?':
                console.log('');
                console.log('  Commands:');
                console.log('  intent <name> [args...]      Execute an intent');
                console.log('  get    <pname> [args...]     Get predicate value (true/false/both)');
                console.log('  set    <pname> [args...] v   Set predicate to true/false/both');
                console.log('  del    <pname> [args...]     Delete a predicate');
                console.log('  query  <pname> [pattern...]  Pattern-match (UPPERCASE=variable)');
                console.log('  ls                           List loaded intents');
                console.log('  help                         This help');
                console.log('  .exit                        Exit');
                console.log('');
                break;

            case '.exit':
            case 'exit':
            case 'quit':
                rl.close();
                return;

            default:
                console.log('  Unknown command: ' + cmd + '  (try "help")');
            }
        } catch (e) {
            console.log('  Error: ' + e.message);
        }

        rl.prompt();
    });

    rl.on('close', function() {
        console.log('\n  Goodbye!\n');
        process.exit(0);
    });
}

function main() {
    var args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('Usage: node repl.js <script.gil>');
        console.error('  Starts an interactive REPL with the loaded Gil script.');
        console.error('  Type "help" inside the REPL for command reference.');
        process.exit(1);
    }

    var scriptPath = path.resolve(process.cwd(), args[0]);
    var source;
    try {
        source = fs.readFileSync(scriptPath, 'utf8');
    } catch (e) {
        console.error('Cannot read file: ' + args[0]);
        process.exit(1);
    }

    var script;
    try {
        script = Script.load(source);
    } catch (e) {
        console.error('Script parse error: ' + e.message);
        process.exit(1);
    }

    startRepl(script, scriptPath);
}

if (require.main === module) {
    main();
}
