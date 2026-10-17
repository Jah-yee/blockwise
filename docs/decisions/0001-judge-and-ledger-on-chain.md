# 0001 Judge and ledger on-chain, proposers off-chain

**Status:** accepted (2026-10-17)

**Context.** The point of the system (ants principle 1) is that whoever proposes does not score. A judge running on the proposer's machine is a judge you take on trust.
On-chain evaluation is not faster than off-chain; a laptop scores seven integers in microseconds.

**Decision.** The scoring function and the evidence store are contracts. Only the bound `Evaluator` can write the `Ledger`. Proposers (search operators, bandit, AI judges) stay off-chain and interact only through `evaluate` and `JudgeLog.predict`.

**Consequences.** (+) The separation is a permission, checkable by anyone. (+) The ledger is public shared memory. (+) Parallel evaluation is a live, measurable demo of Monad.
(−) We pay gas per evaluation (Monad charges the limit). (−) Sealed data is public on-chain; "look once" limits recorded looks, not secrecy (commit-reveal on the roadmap).
We must never claim on-chain evaluation is faster.
