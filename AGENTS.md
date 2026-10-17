# Blockwise: notes for coding agents

A colony of small trading agents you can fund, judged on-chain, on Monad. Strategies are seven integers; the Evaluator contract scores them; the Ledger stores results and lineage;
proposers and the search (niche archive, Thompson bandit) live off-chain; the planned Allocator is a testnet escrow that steers but never scores. Read [docs/principles.md](docs/principles.md) first; it is short.

## Read route (read only what your change needs)

| Touching | Read |
|---|---|
| Scoring, spec, series, epochs | `docs/architecture.md` §1 (**spec of record**), `contracts/src/Evaluator.sol`, `packages/core/src/strategy.ts` |
| Ledger, permissions, write-once | `contracts/src/Ledger.sol`, `docs/principles.md` rows 1, 4, 5 |
| Fan-out, gas, RPC | `docs/architecture.md` §4, `docs/monad-notes.md` |
| Events, UI | `docs/architecture.md` §5, `docs/presentation.md` |
| Search (niches, bandit, potential) | `docs/architecture.md` §3a, `docs/decisions/0008-colony-funding-and-search-mechanics.md` |
| Funding, the Allocator, wallets | `docs/architecture.md` §3b, `docs/contracts.md` (Allocator), `SECURITY.md` |
| Jev or any AI judge | `docs/jev.md`, `contracts/src/JudgeLog.sol` |
| Unsure what is true about Monad | `docs/monad-notes.md` (measured / documented / assumed) |

## Invariants (do not weaken; add a test for any new failure path)

- Only the bound Evaluator writes the Ledger. Records are write-once. `confirm` and `sealed` bind to the evaluated params and to the proposer.
- The spec grammar is the only door: out-of-range specs revert; never clamp on-chain.
- Contract and TypeScript mirror agree on every golden vector. If you change one, change the other and `data/golden.json`, bump `SPEC_VERSION`, update architecture §1.
- `packages/core` has no I/O and no chain dependency. No `Math.random()`; use the seeded RNG.
- The Allocator never writes the Ledger, never influences a score, pays only the depositor, and `withdraw` must always work: no owner, pause, proxy or oracle. Do not deploy it unless its tests (only-depositor, reentrancy, fuzz, sum invariant) are green. Funding UI always says *test MON, virtual, no payout*.
- Judges are shadow by default. Nothing an AI judge says may change a score, the grammar, or a sealed look.
- Never log, print, commit or screenshot a private key or mnemonic. No mainnet from this repo.
- A check that was not run is written "Not run: reason", never claimed.

## Commands

| Task | Command |
|---|---|
| Install | `bun install` |
| Contracts | `cd contracts && forge build && forge test` (add `--gas-report` for evaluate changes) |
| Core tests | `bun test packages/core` |
| Typecheck | `bun run typecheck` |
| Regenerate series / golden vectors | `bun run gen:series`, `bun run gen:golden` |
| Testnet smoke (needs a funded key) | `bun run orch smoke --txs 20 --workers 10` |

## Change discipline

- Conventional Commits with an area scope. Do not commit, push or publish unless asked.
- Docs move in the same change as behaviour: architecture §1 for semantics, `monad-notes.md` for any new Monad fact, `roadmap.md` if scope moves.

## Stop report (end every task with these five fields)

`Status / Scope / Validation / Risks / Next`. A check that was not run is `Not run` with the reason.
