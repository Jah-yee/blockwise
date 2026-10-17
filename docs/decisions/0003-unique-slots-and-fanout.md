# 0003 Unique ledger slots per evaluation; fan out over many wallets

**Status:** accepted; the premise is *assumed* until test A1 in `docs/monad-notes.md` passes.

**Context.** Monad executes transactions optimistically in parallel; conflicting transactions are re-executed. Same-sender transactions are nonce-ordered and share a balance.

**Decision.** Each evaluation writes one unique slot (`keccak(proposer, gen, idx)`); there is no global counter in the hot path. We send from K wallets (default 20) with pre-assigned nonces.

**Consequences.** (+) Evaluations are independent by construction. (−) Funding K wallets costs K transfers and each needs `gasLimit × price × in-flight` balance. (−) The public RPC is likely the real bottleneck: batching and multiple endpoints are part of the design.
We report the measured landing-block distribution rather than asserting "one block".
