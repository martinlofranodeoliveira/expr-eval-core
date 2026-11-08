# Contract — expr-eval-core

Pure ESM in `src/expr.mjs`, zero runtime dependencies, Node >= 22.
Numbers only (comparisons/logic yield 1/0). No `eval`/`Function`.

| Export | Result |
| --- | --- |
| `MAX_INPUT` (2000 chars) | Hard bound. |
| `parse(input)` | Frozen AST (`num`/`var`/`un`/`bin`/`call`). |
| `evaluate(ast, env)` | Number, with `pi`/`e` defaults under user env. |
| `compile(input)` | Reusable `(env) => number`. |
| `evalExpr(input, env)` | Parse + evaluate. |

Precedence: `\|\|` 1, `&&` 2, `==`/`!=` 3, comparisons 4, `+-` 5,
`*/%` 6, `^` 7 (right-assoc), unary 7-loose (`-3^2` is `-(3^2)`).
`&&`/`||` short-circuit. 16 builtins (`sqrt abs floor ceil round
sin cos tan asin acos atan log ln exp pow min max`), arity-checked.

Errors: `NOT_STRING` · `EMPTY` · `TOO_LONG` · `BAD_TOKEN` ·
`BAD_NUMBER` · `UNEXPECTED` · `UNCLOSED` · `DIV_ZERO` · `UNKNOWN_VAR` ·
`BAD_VAR_VALUE` · `UNKNOWN_FUNC` · `BAD_ARITY` · `BAD_RESULT` ·
`BAD_AST` · `BAD_OP` · `BAD_NODE`.
