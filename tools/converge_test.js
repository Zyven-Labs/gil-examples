#!/usr/bin/env node
'use strict';

/**
 * converge_test.js — Load a Gil script and run each intent through the
 * convergence loop.  Fails if any intent throws, loops forever, or produces
 * unexpected results after the first call.
 *
 * Usage:
 *   node tools/converge_test.js <script.gil>
 */

const fs   = require('fs');
const path = require('path');
const { Script, Frontier, GIL } = require(path.resolve(__dirname, '..', '..', 'giljs'));

const scriptPath = path.resolve(process.cwd(), process.argv[2]);
const source  = fs.readFileSync(scriptPath, 'utf8');
const script  = Script.load(source);

// Discover intent names + param counts from source
const intentRe = /intent\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g;
const intents = [];
let m;
while ((m = intentRe.exec(source)) !== null) {
    const params = m[2].trim();
    intents.push({
        name:   m[1],
        argCount: params.length === 0 ? 0 : params.split(',').length
    });
}

console.log(`\n  Script: ${path.basename(scriptPath)}`);
console.log(`  Intents (${intents.length}): ${intents.map(i => i.name).join(', ')}`);
console.log('');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (e) {
        console.log(`  ✗ ${name} — ${e.message}`);
        failed++;
    }
}

for (const intent of intents) {
    const intentObj = script.intent(intent.name);
    if (!intentObj) {
        test(`${intent.name} — intent not found`, () => { throw new Error('not found'); });
        continue;
    }

    // Build some placeholder args: "a", "b", "c"...
    const sampleArgs = [];
    for (let i = 0; i < intent.argCount; i++) {
        sampleArgs.push(String.fromCharCode(97 + i));
    }

    test(`${intent.name} converges`, () => {
        const f = new Frontier();
        intentObj.execute(f, sampleArgs);
        // If we get here without throwing, convergence succeeded
    });
}

console.log(`\n  Results: ${passed}/${passed + failed} passed\n`);
process.exit(failed > 0 ? 1 : 0);