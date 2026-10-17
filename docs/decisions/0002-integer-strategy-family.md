# 0002 Strategies are seven integers; evaluation is integer-only

**Status:** accepted

**Context.** The EVM has no floating point. We want a strategy family that is tiny (an ants-style small model), expressive enough to contain momentum, mean-reversion and "stay out", and cheap enough to evaluate hundreds of times.

**Decision.** Spec `[w0..w5, thr]` as `int16`, weights in [-64, 63], threshold in [0, 8191]; returns as `int16` basis points; position in {-1, 0, +1}; fixed transaction cost; score is total PnL in bp. Semantics are normative in `docs/architecture.md` §1.

**Consequences.** (+) Exact, reproducible, trivially mirrored in TypeScript, conformance-testable with golden vectors. (+) Search space small enough to explore thoroughly.
(−) Not a realistic trading model, and we say so. (−) Changing anything that affects a score changes the epoch (`SPEC_VERSION`).
