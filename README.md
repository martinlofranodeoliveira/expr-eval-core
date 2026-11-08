# expr-eval-core

Arithmetic expression evaluator: Pratt parser, precedence, variables,
math builtins. Zero runtime dependencies, Node >= 22.

Part of the LOFRANO TECNOLOGIA open-source lab. MIT.

```js
import { evalExpr, compile } from './src/expr.mjs';
evalExpr('2 + 3 * 4');            // 14
compile('x^2 + 1')({ x: 3 });     // 10
```

```sh
npm test          # 6 tests, node:test, no dependencies
npm run demo
```

Numbers in, numbers out; `&&`/`||` short-circuit. MIT — see `LICENSE`.
[Versão em português](README.pt-BR.md).
