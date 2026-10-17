# Surfaces

What actually exists, and how far to trust it. Updated in the same change that moves a surface between states. Modelled on
[ants `docs/surfaces.md`](https://github.com/p-to-q/ants/blob/main/docs/surfaces.md): a surface with no evidence is `stub` or `planned`, never `stable`.

Status values: `stable` (rely on it) · `experimental` (feedback wanted) · `internal` (not a contract) · `stub` (visible placeholder) · `planned` (designed in docs, nothing written) · `archived` (receipts only).
"Evidence" is a test or a command that was **run**. "Not run" is written as such.

_Last reviewed: 2026-10-17 15:40 CST, before any test or testnet run._

## On-chain

| Surface | Status | Evidence | Notes |
|---|---|---|---|
| `Ledger` (write-once records, `onlyEvaluator`, one-time `bind`) | experimental | `forge build` succeeded (solc 0.8.28, `via_ir`). **No tests run.** | Storage layout in [contracts.md](contracts.md). Existence is tested as "slot ≠ 0", which relies on a non-zero proposer address |
| `Evaluator` (`evaluate`, `score`, `confirm`, `sealedLook`) | experimental | `forge build` only. **Not run:** unit tests, golden-vector conformance, gas report, testnet deploy | Semantics are normative in [architecture.md](architecture.md) §1; the contract must be brought into agreement with it by tests |
| `JudgeLog` (`predict` before result, `resolve`) | experimental | `forge build` only. **Not run:** any test | Calibration computation does not exist yet |
| Epoch hash (series, split, cost, spec version) | experimental | Not run | TypeScript side must reproduce `abi.encode(uint16,uint8,uint16,uint16,int16[])` byte for byte |
| Sealed segment secrecy | **not provided** | n/a | Public chain data. One *recorded* look is enforced; commit-reveal is roadmap v0.3 |
| Deployment on Monad testnet (chain 10143) | planned | Not run | Addresses will live in `config/deployments.testnet.json` |

## Off-chain, TypeScript

| Surface | Status | Evidence | Notes |
|---|---|---|---|
| `packages/core`: spec, strategy mirror, rng, series generator, event types | internal | Files written, `bun install` completed, `tsc --noEmit` over the workspace printed no errors (2026-10-17). **Not run:** `bun test`, `gen:series`, `gen:golden` | No tests exist yet. Treat as a draft of the spec of record's mirror |
| Operators, niche archive, Thompson bandit with descendant credit, cascade, benchmark, ceiling proxy, path potential | planned | none | Designed in [architecture §3a](architecture.md); roadmap issues 4 to 6, 17, 30, 33, 34 |
| `Allocator` escrow (deposit, allocate, withdraw) | planned | none; **not written** | [contracts.md](contracts.md), [architecture §3b](architecture.md); must pass escrow tests (reentrancy, fuzz) before any deployment; roadmap issues 29, 31, 32 |
| Wallet connect and funding UI | planned | none | burner wallet, chain 10143 only, *virtual* labels; [SECURITY](../SECURITY.md) |
| `packages/chain`: clients, deploy, fan-out, reader | planned | none | Roadmap issues 8 to 10, 19 |
| `apps/orchestrator`: generation loop, SSE, recorder, resume | planned | none | Roadmap issues 11, 20; event contract in architecture §5 |
| `apps/web`: live view | planned | none | [presentation.md](presentation.md); roadmap issues 12, 13 |
| Jev shadow judge (mock and real) | planned | none | [jev.md](jev.md); needs `TYPESAFE_AI_API_KEY`, which the maintainer holds |
| Audience "food drop" | planned | none | Stretch |

## Interfaces for people and agents

| Surface | Status | Evidence | Notes |
|---|---|---|---|
| CLI (`blockwise …`, `--json`, exit codes) | planned | none | Reference: [cli.md](cli.md). Name: [decision 0007](decisions/0007-name-and-positioning.md) |
| Terminal interface (`blockwise` on a terminal) | planned | none | Manual: [tui.md](tui.md) |
| Web view (`blockwise serve`) | planned | none | Same event stream as the terminal interface and replay |
| Replay (JSONL of the event stream) | planned | none | Format = architecture §5 |
| Local mirror database (SQLite projection of chain events) | planned | none | A projection, never the source of truth: the chain is |

## Process

| Surface | Status | Evidence | Notes |
|---|---|---|---|
| Repository docs (README, proposal, principles, architecture, monad-notes, jev, presentation, roadmap, glossary, decisions) | experimental | Written and cross-checked against the contract sources by reading; **no link or consistency checker has run** | Facts about Monad are tagged measured / documented / assumed in [monad-notes.md](monad-notes.md) |
| CI (`.github/workflows/ci.yml`) | stub | Never executed: no remote yet | Runs `forge build/test`, `bun run typecheck`, `bun test` |
| Monad testnet measurements A1 to A7 | planned | Only chain id, block gas limit, base fee, priority fee, gas price were measured | [monad-notes.md](monad-notes.md) |
| Repository on GitHub | planned | Local `git init` only; nothing committed or pushed | Hosting decision pending, see decision 0007 |

## Weaker spots, stated

- The contracts compile but have never been exercised. Until the conformance test passes, no number from them is evidence.
- Gas per evaluation is unmeasured; the budget in monad-notes is a worked example, not a result.
- That a generation lands in few blocks (the central demo claim) is **assumed** (test A1).
- The series is synthetic and fixed; nothing here says anything about real markets.
- The shadow judge cannot be assessed until it exists; Jev may be at the base rate.
- Code under `packages/core` and `contracts/src` was written before the instruction to hold off on code; it is kept as a draft and changes nothing about the plan.
