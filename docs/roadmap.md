# Roadmap

Two clocks: **today** (hackathon, hard deadline) and **after** (the project we keep). Today's plan is cut to what can be demonstrated; everything else is
queued with enough detail to pick up cold.

## 1. Today: Monad Blitz Shanghai, Saturday 2026-10-17

Hard constraints: **code freeze 18:00 CST, submission closes 18:30 CST**, demos from 19:00, winners chosen by audience vote.
Submission needs at least one screenshot uploaded and confirmed through Mojo (see the workspace notes outside this repo), and goes to manual review.

### 1.1 Timeline (backwards from the freeze)

| Window | Goal | Exit criterion (checked, not felt) |
|---|---|---|
| 15:15 to 16:00 | **Foundations**: contracts compile and tested; wallets funded; core spec/strategy mirror passes golden vectors; repo builds from clean clone | `forge test` and `bun test packages/core` green; deployer funded from faucet |
| 16:00 to 16:40 | **Smoke on testnet** (assumptions A1 to A6): deploy, 20 txs from 10 wallets, then 100 | Measured rows added to `docs/monad-notes.md`; `GAS_LIMIT` fixed |
| 16:40 to 17:25 | **The loop**: operators, bandit, orchestrator generation loop, SSE, minimal UI with the grid | A full run of ≥ 5 generations emits the event stream; UI renders it live |
| 17:25 to 17:50 | **Champion path**: confirm, sealed look, baseline curve, honest panel; record a replay | Sealed result shown; replay file saved; 3 screenshots taken |
| 17:50 to 18:00 | **Freeze**: no feature work; fix only; README and demo script final | Tagged commit `v0-submission`; deploy addresses in `config/` |
| 18:00 to 18:30 | **Submit**: screenshots uploaded and confirmed, project created, pending review | Submission record exists |
| 19:00 onwards | Demo and vote | |

Cut order if time runs out (cut from the top): path potential and ceiling proxy → Jev shadow judge UI meter → suggested-split rule (keep manual allocation) → baseline curve live (keep offline numbers) → crossover/sweep operators → niche map beyond a simple elite list (keep one elite per style) → steering by funding (keep deposit, allocate and the virtual return display). **Never cut:** the grid, the "N evals in B blocks" line, tx links, the sealed number, and withdraw (an escrow that cannot be withdrawn from must not be deployed at all: if the Allocator tests are not green, ship without funding and say so).

### 1.2 Workstreams (parallelizable; names are placeholders: put yours in the issue)

| ID | Stream | Owner | Depends on | Deliverable |
|---|---|---|---|---|
| W1 | Contracts + conformance | _tbd_ | none | `contracts/` green; `data/golden.json` ↔ Solidity test; gas report |
| W2 | Core TS (spec, strategy mirror, series, operators, archive, bandit, cascade, events types) | _tbd_ | spec of record (docs/architecture.md §1) | `packages/core` with tests |
| W3 | Chain glue (clients, deploy script, fan-out, reader) | _tbd_ | W1 ABI | `packages/chain`; `smoke` command |
| W4 | Orchestrator (loop, SSE, recorder/replay, resume) | _tbd_ | W2, W3 | `apps/orchestrator`; event stream per architecture §5 |
| W5 | Web (grid, curve, champion, counters, tape, states) | _tbd_ | event types only; can use a fixture stream | `apps/web`; works from a recorded JSONL |
| W6 | Jev shadow judge (mock first, then real key) | _tbd_ | W3 for `JudgeLog` | `apps/orchestrator/src/judge`; calibration computation in core |
| W7 | Submission + demo (screenshots, Mojo project, script, slide) | _tbd_ | everything | Submission confirmed |
| W8 | Funding: `Allocator` escrow + tests, wallet connect, allocate UI, steering rule | _tbd_ | W1 (Ledger ABI), W2 (steering rule), W5 | Escrow tests green (incl. reentrancy and fuzz); funded agents steer a generation; virtual return shown |

W2 and W5 start immediately: both depend only on documents already in this repo (the spec of record and the event contract). W5 builds against `fixtures/events.sample.jsonl` (to be created in W2) so nobody blocks on the chain.

## 2. After the hackathon: milestones

| Milestone | Theme | Contents |
|---|---|---|
| **v0.1** | Harden the demo | Resume from chain state; RPC pool with batching and backoff; failure injection tests; CI green on clean clone; docs reflect measured numbers |
| **v0.2** | Honest statistics | Offline benchmark harness (portfolio vs random 1× and 2×, ≥ 20 seeds, medians); leave-one-operator-out; negative controls (shuffled series must show no skill) |
| **v0.3** | Sealed data, properly | Commit-reveal: the sealed segment is committed as a hash at deploy and revealed at the first sealed look; multiple series as separate epochs |
| **v0.4** | Judges earn authority | Calibration reports, authority ladder state machine with config thresholds, advisory mode (reordering), exploration quota for delegated mode |
| **v0.5** | Real data | Replace/augment the synthetic series with real return series (including Kuru data pulled via the jev-trader pipeline); decide whether on-chain storage or a Merkle commitment is right for longer series |
| **v0.6** | Agent proposer | A coding/LLM agent that reads the Ledger events as raw history (Meta-Harness style) and proposes specs through the grammar; compared against the portfolio at equal budget |
| **v0.7** | Arena | Champions paper-trade against the live Kuru MON-USDC book in dry-run using the jev-trader pipeline; Jev-alone vs champions vs mock, same calibration accounting; no real funds |
| **v0.8** | Environments | Several series/markets as "colonies"; the bandit allocates compute among them; each colony is an epoch |
| **v0.9** | Real funds (conditional) | Only after a real market (Kuru), settlement, an independent audit of the escrow and risk limits; until then funding is testnet-only and virtual |
| **v1.0** | Shared memory | Ledger as a public pheromone registry other agents read and extend; spec versioning; an interface so third-party proposers can register |

## 3. Issue backlog (seed; copy into GitHub issues, one per row)

Labels: `area:contracts|core|chain|orchestrator|web|judge|docs`, `type:feature|bug|test|research`, `prio:P0` (today) / `P1` / `P2`. "AC" = acceptance criteria.

### P0 (today)

| # | Title | Area | AC |
|---|---|---|---|
| 1 | Evaluator/Ledger/JudgeLog unit tests + gas report | contracts | Tests for: bind once, only-evaluator, write-once, bad params revert, key binding, confirm/sealed binding to params and proposer, JudgeLog refusal after result; `forge test --gas-report` pasted in the PR |
| 2 | Golden-vector conformance (TS ↔ Solidity) | core, contracts | `data/golden.json` ≥ 200 random valid specs with expected dev/confirm/sealed; both implementations pass |
| 3 | Core: spec, strategy mirror, series generator | core | Matches §1 exactly; `data/series/v1.json` committed with seed and hash |
| 4 | Core: operators (random, mutate, crossover, sweep) + archive | core | Property tests: outputs always valid; lineage recorded; deterministic given seed |
| 5 | Core: bandit portfolio | core | Floor on exploration; credit by archive gain; test that a useless operator's share decays to the floor |
| 6 | Core: cascade (dev → confirm top-k → champion → freeze) | core | Champion chosen on confirm not dev; test with a planted overfitter |
| 7 | Core: event types + sample JSONL fixture | core | `events.ts` matches architecture §5; fixture covers every event type |
| 8 | Chain: clients, deploy script, deployments file | chain | `bun run orch deploy` deploys the three contracts and writes `config/deployments.testnet.json` |
| 9 | Chain: wallet fan-out (derive, fund, nonce, sign, batch send, receipts) | chain | `bun run orch smoke --txs 20 --workers 10` prints landing-block histogram; handles partial failure |
| 10 | Chain: ledger reader (rebuild state from events) | chain | Given an epoch, reconstructs archive and generation state; used by resume |
| 11 | Orchestrator: generation loop + SSE + JSONL recorder | orchestrator | A 5-generation run emits every event type; `/history` serves late joiners |
| 12 | Web: grid + header + histogram + tape from SSE or JSONL | web | Renders the sample fixture at real speed; live badge/replay badge |
| 13 | Web: curve + champion panel + counters | web | Dev/confirm/sealed side by side; baseline lines; totals |
| 14 | Submission: screenshots + Mojo project + demo script + slide | docs | Confirmed upload; project record pending review |
| 29 | Allocator escrow + Foundry tests (only-depositor payout, always-withdrawable, reentrancy, fuzz of sequences, sum invariant) | contracts | `forge test` green; no owner, pause, proxy or oracle; deployed only if green |
| 30 | Core: niche archive (style × activity), discovery, Thompson allocation, descendant credit, floor, stagnation burst, tabu, dedupe | core | Deterministic given seed; property tests; matches architecture §3a; test that a useless operator's share decays to the floor |
| 31 | Web: wallet connect (burner, chain 10143 only), deposit / allocate / withdraw, funding panel with *virtual* labels | web | Refuses other chains; shows contract, amount and function in words before the prompt; works against a local fixture |
| 32 | Core: funding steering rule and suggested split | core | `φ = min(0.25, F/(F+F0))`; split ∝ max(0, c − g/2), cap 40%; unit tests with planted overfitters |

### P1

| # | Title | Area | AC |
|---|---|---|---|
| 15 | Jev shadow judge (mock + real) and `JudgeLog` integration | judge | Predictions logged before sending; mock labelled `stand-in`; real model behind env key |
| 16 | Calibration computation (Brier, reliability, lift) | core | Unit tests with known synthetic judges (perfect, random, anti) |
| 17 | Offline benchmark: portfolio vs random 1×/2× vs per-niche evolution over 20 seeds | core | Prints medians and IQR; written to `docs/results/` with the commit hash |
| 33 | Ceiling proxy: large offline multi-start hill-climb with the mirror | core | Reports best dev / confirm / sealed reachable; labelled a proxy; shown on the map |
| 34 | Path potential for niches (velocity, acceleration) steering parent choice | core | Matches §3a; compared with uniform parents at equal budget |
| 19 | RPC pool: batching, round-robin, backoff, probe tool | chain | Probe reports max batch size and sustained rps per endpoint |
| 20 | Failure injection tests (drop RPC, revert, duplicate send) | chain | Orchestrator finishes the generation and the counters are right |

### P2 (after)

| # | Title | Area |
|---|---|---|
| 21 | Commit-reveal for the sealed segment | contracts |
| 22 | Negative controls: shuffled series shows no skill | core |
| 23 | Real return series and storage strategy (calldata vs Merkle) | research |
| 24 | Agent proposer that reads ledger events | orchestrator |
| 25 | Arena: paper-trade champions on Kuru data (dry-run) | research |
| 26 | Multi-environment compute allocation | orchestrator |
| 27 | Authority ladder state machine | judge |
| 28 | Contract audit pass (reentrancy is moot, but permissions and write-once need a second pair of eyes) | contracts |

## 4. Definition of done (every PR)

- Tests added or updated, and **run** (paste the command and result); anything not run is written "Not run: reason".
- If scoring semantics changed: `SPEC_VERSION` bumped, `data/golden.json` regenerated, architecture §1 updated, in the same PR.
- If a Monad claim was added: it is in `docs/monad-notes.md` as measured (with date and command), documented (with link) or assumed (with test).
- No keys, no mnemonics, no `.env` committed.
