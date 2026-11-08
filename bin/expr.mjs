#!/usr/bin/env node
// Demo: fixed expressions, asserts exact output. --assert exits non-zero on mismatch.
import { evalExpr } from '../src/expr.mjs';

const CASES = [
  ['2 + 3 * 4', {}, 14],
  ['2 ^ 3 ^ 2', {}, 512],
  ['x * 2 + 1', { x: 20 }, 41],
  ['sqrt(16) + max(1, 9)', {}, 13],
];

let failed = 0;
for (const [expr, env, expected] of CASES) {
  let got = null;
  try { got = evalExpr(expr, env); } catch { got = null; }
  const pass = got === expected;
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${expr} -> ${got}`);
}
if (process.argv.includes('--assert') && failed > 0) process.exit(1);
if (failed > 0) process.exitCode = 1;
console.log(failed === 0 ? 'demo: all cases as expected' : `demo: ${failed} mismatch(es)`);
