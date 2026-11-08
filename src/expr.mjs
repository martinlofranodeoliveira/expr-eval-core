// SPDX-License-Identifier: MIT
// Arithmetic expression evaluator: Pratt parser, strict evaluation with
// short-circuit && / ||, variables, builtin math. Numbers only (1/0 for
// truth). No network, no I/O, no eval/Function.

export const MAX_INPUT = 2000;

export class ExprError extends Error {
  constructor(code, detail = '') {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'ExprError';
    this.code = code;
  }
}

const BUILTINS = Object.freeze({
  sqrt: { fn: Math.sqrt, n: 1 }, abs: { fn: Math.abs, n: 1 },
  floor: { fn: Math.floor, n: 1 }, ceil: { fn: Math.ceil, n: 1 },
  round: { fn: Math.round, n: 1 }, sin: { fn: Math.sin, n: 1 },
  cos: { fn: Math.cos, n: 1 }, tan: { fn: Math.tan, n: 1 },
  asin: { fn: Math.asin, n: 1 }, acos: { fn: Math.acos, n: 1 },
  atan: { fn: Math.atan, n: 1 }, log: { fn: Math.log10, n: 1 },
  ln: { fn: Math.log, n: 1 }, exp: { fn: Math.exp, n: 1 },
  pow: { fn: Math.pow, n: 2 },
  min: { fn: Math.min, n: -1 }, max: { fn: Math.max, n: -1 },
});

export const DEFAULT_ENV = Object.freeze({ pi: Math.PI, e: Math.E });

function tokenize(src) {
  const tokens = [];
  let i = 0;
  const fail = (code) => { throw new ExprError(code, `at ${i}`); };
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      const m = /^(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) fail('BAD_NUMBER');
      const v = Number(m[0]);
      if (!Number.isFinite(v)) fail('BAD_NUMBER');
      tokens.push({ t: 'num', v, at: i });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
      tokens.push({ t: 'name', v: m[0], at: i });
      i += m[0].length;
      continue;
    }
    const two = src.substr(i, 2);
    if (['==', '!=', '<=', '>=', '&&', '||'].includes(two)) {
      tokens.push({ t: 'op', v: two, at: i });
      i += 2;
      continue;
    }
    if ('+-*/%^()<>,!'.includes(ch)) {
      tokens.push({ t: ch === '(' || ch === ')' || ch === ',' ? ch : 'op', v: ch, at: i });
      i++;
      continue;
    }
    fail('BAD_TOKEN');
  }
  tokens.push({ t: 'eof', at: src.length });
  return tokens;
}

// Precedence table (higher binds tighter). ^ is right-associative.
const PREC = Object.freeze({ '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '<=': 4, '>': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6, '^': 7 });
const RIGHT_ASSOC = new Set(['^']);

function parseTokens(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  function expr(minPrec) {
    let left = prefix();
    for (;;) {
      const tk = peek();
      if (tk.t !== 'op' || !(tk.v in PREC) || PREC[tk.v] < minPrec) return left;
      const op = next().v;
      const rhs = expr(PREC[op] + (RIGHT_ASSOC.has(op) ? 0 : 1));
      left = Object.freeze({ t: 'bin', op, a: left, b: rhs });
    }
  }
  function prefix() {
    const tk = next();
    if (tk.t === 'num') return Object.freeze({ t: 'num', v: tk.v });
    if (tk.t === 'name') {
      if (peek().t === '(') {
        next();
        const args = [];
        if (peek().t !== ')') {
          for (;;) {
            args.push(expr(1));
            if (peek().t === ',') { next(); continue; }
            break;
          }
        }
        if (peek().t !== ')') throw new ExprError('UNCLOSED', `at ${peek().at}`);
        next();
        return Object.freeze({ t: 'call', name: tk.v, args: Object.freeze(args) });
      }
      return Object.freeze({ t: 'var', name: tk.v });
    }
    if (tk.t === 'op' && (tk.v === '-' || tk.v === '+' || tk.v === '!')) {
      // Binding 7: looser than ^ (so -3^2 is -(3^2)), tighter than *.
      return Object.freeze({ t: 'un', op: tk.v, x: expr(7) });
    }
    if (tk.t === '(') {
      const e = expr(1);
      if (peek().t !== ')') throw new ExprError('UNCLOSED', `at ${peek().at}`);
      next();
      return e;
    }
    throw new ExprError('UNEXPECTED', `at ${tk.at}`);
  }
  const ast = expr(1);
  if (peek().t !== 'eof') throw new ExprError('UNEXPECTED', `at ${peek().at}`);
  return ast;
}

/** Parse to a frozen AST. */
export function parse(input) {
  if (typeof input !== 'string') throw new ExprError('NOT_STRING');
  if (input.trim() === '') throw new ExprError('EMPTY');
  if (input.length > MAX_INPUT) throw new ExprError('TOO_LONG');
  return parseTokens(tokenize(input));
}

function truthy(v) {
  return v !== 0 ? 1 : 0;
}

function ev(node, env) {
  switch (node.t) {
    case 'num': return node.v;
    case 'var':
      if (!(node.name in env)) throw new ExprError('UNKNOWN_VAR', node.name);
      if (typeof env[node.name] !== 'number' || !Number.isFinite(env[node.name])) {
        throw new ExprError('BAD_VAR_VALUE', node.name);
      }
      return env[node.name];
    case 'un': {
      const x = ev(node.x, env);
      if (node.op === '-') return -x;
      if (node.op === '+') return +x;
      return truthy(x) ? 0 : 1;
    }
    case 'bin': {
      const { op } = node;
      if (op === '&&') return truthy(ev(node.a, env)) ? truthy(ev(node.b, env)) : 0;
      if (op === '||') return truthy(ev(node.a, env)) ? 1 : truthy(ev(node.b, env));
      const a = ev(node.a, env);
      const b = ev(node.b, env);
      switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/':
          if (b === 0) throw new ExprError('DIV_ZERO');
          return a / b;
        case '%':
          if (b === 0) throw new ExprError('DIV_ZERO');
          return a % b;
        case '^': return a ** b;
        case '==': return a === b ? 1 : 0;
        case '!=': return a !== b ? 1 : 0;
        case '<': return a < b ? 1 : 0;
        case '<=': return a <= b ? 1 : 0;
        case '>': return a > b ? 1 : 0;
        case '>=': return a >= b ? 1 : 0;
        default: throw new ExprError('BAD_OP', op);
      }
    }
    case 'call': {
      const def = BUILTINS[node.name];
      if (!def) throw new ExprError('UNKNOWN_FUNC', node.name);
      if (def.n !== -1 && node.args.length !== def.n) throw new ExprError('BAD_ARITY', node.name);
      if (def.n === -1 && node.args.length === 0) throw new ExprError('BAD_ARITY', node.name);
      const args = node.args.map((x) => ev(x, env));
      const r = def.fn(...args);
      if (typeof r !== 'number' || Number.isNaN(r)) throw new ExprError('BAD_RESULT', node.name);
      return r;
    }
    default: throw new ExprError('BAD_NODE');
  }
}

/** Evaluate an AST with env over DEFAULT_ENV. */
export function evaluate(ast, env = {}) {
  if (!ast || typeof ast !== 'object') throw new ExprError('BAD_AST');
  return ev(ast, { ...DEFAULT_ENV, ...env });
}

/** Compile once, evaluate many times. */
export function compile(input) {
  const ast = parse(input);
  return (env = {}) => evaluate(ast, env);
}

/** Parse and evaluate in one step. */
export function evalExpr(input, env = {}) {
  return evaluate(parse(input), env);
}
