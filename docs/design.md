# Design — expr-eval-core

Hand-written Pratt parser: one precedence table, right-associative
power, unary bound between `*` and `^` so `-3^2` follows mathematical
convention. The AST is frozen and inspectable; evaluation is a separate
total function over it, which makes `compile` trivial and semantics
auditable.

Oracle: precedence ladder, right-assoc towers, short-circuit proofs
(`0 && 1/0`), per-builtin values, and one test per error code.
Non-finite values can never leak out (div-by-zero, NaN results and
infinite variables all throw).
