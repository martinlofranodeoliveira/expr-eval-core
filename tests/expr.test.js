import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse, evaluate, compile, evalExpr, ExprError } from '../src/expr.mjs';

describe('precedence', () => {
  it('orders arithmetic correctly', () => {
    assert.equal(evalExpr('2 + 3 * 4'), 14);
    assert.equal(evalExpr('(2 + 3) * 4'), 20);
    assert.equal(evalExpr('2 * 3 ^ 2'), 18);
    assert.equal(evalExpr('2 ^ 3 ^ 2'), 512); // right-associative
    assert.equal(evalExpr('-3 ^ 2'), -9); // unary binds looser than ^
    assert.equal(evalExpr('(-3) ^ 2'), 9);
    assert.equal(evalExpr('10 % 3'), 1);
  });
  it('comparisons, logic and short-circuit', () => {
    assert.equal(evalExpr('1 < 2 == 1'), 1);
    assert.equal(evalExpr('1 + 1 == 3'), 0);
    assert.equal(evalExpr('1 && 0 || 1'), 1);
    assert.equal(evalExpr('!0'), 1);
    assert.equal(evalExpr('0 && 1/0'), 0); // short-circuit: no throw
    assert.equal(evalExpr('1 || 1/0'), 1);
  });
});

describe('variables and functions', () => {
  it('resolves env over pi/e defaults', () => {
    assert.equal(evalExpr('x * 2', { x: 21 }), 42);
    assert.ok(Math.abs(evalExpr('sin(pi/2)') - 1) < 1e-12);
    assert.equal(evalExpr('e'), Math.E);
    assert.equal(evalExpr('max(1, 5, 3) + min(4, 2)'), 7);
    assert.equal(evalExpr('sqrt(16) + abs(-3) + pow(2, 10)'), 4 + 3 + 1024);
  });
  it('compile reuses the AST', () => {
    const f = compile('x^2 + 1');
    assert.equal(f({ x: 3 }), 10);
    assert.equal(f({ x: 0 }), 1);
  });
  it('rejects bad input precisely', () => {
    assert.throws(() => evalExpr('1/0'), (e) => e.code === 'DIV_ZERO');
    assert.throws(() => evalExpr('x + 1'), (e) => e.code === 'UNKNOWN_VAR');
    assert.throws(() => evalExpr('nope(1)'), (e) => e.code === 'UNKNOWN_FUNC');
    assert.throws(() => evalExpr('sqrt(1, 2)'), (e) => e.code === 'BAD_ARITY');
    assert.throws(() => evalExpr('(1 + 2'), (e) => e.code === 'UNCLOSED');
    assert.throws(() => evalExpr('1 + * 2'), (e) => e.code === 'UNEXPECTED');
    assert.throws(() => evalExpr('1 @ 2'), (e) => e.code === 'BAD_TOKEN');
    assert.throws(() => evalExpr(''), (e) => e.code === 'EMPTY');
    assert.ok(new ExprError('X') instanceof Error);
  });
  it('guards non-finite values', () => {
    assert.throws(() => evalExpr('x', { x: Infinity }), (e) => e.code === 'BAD_VAR_VALUE');
    assert.throws(() => evalExpr('sqrt(-1)'), (e) => e.code === 'BAD_RESULT');
  });
});
