# Architecture

Three kinds of thing, kept apart on purpose: what **proposes**, what **judges**, what **executes and shows**.
Only the middle one is trusted; nothing on either side can reach into it.

```
                    off-chain                                   on-chain (Monad)                      off-chain
 ┌───────────────────────────────────────┐        ┌──────────────────────────────────────────┐   ┌───────────────────────┐
 │ PROPOSE                               │        │ JUDGE                                    │   │ SHOW                  │
 │  operators: random mutate crossover   │  txs   │  Evaluator  (fixed series, integer math) │   │  orchestrator (Bun)   │
 │             sweep  (+ agent, later)   │ ─────► │     │ only caller allowed to write       │   │   · SSE event stream  │
 │  bandit: budget by archive gain       │        │     ▼                                    │ ◄─│   · replay recorder   │
 │  Jev shadow judge (predicts winners)  │ ─────► │  Ledger   (write-once evidence)          │   │  web (React)          │
 │                                       │ preds  │  JudgeLog (prediction before result)     │   │   · grid, curve, tape │
 └───────────────────────────────────────┘        └──────────────────────────────────────────┘   └───────────────────────┘
        packages/core, apps/orchestrator                       contracts/                              apps/web
                         └──────────── packages/chain (viem: clients, fan-out, reader) ────────────┘
```

## 1. Strategy semantics (the spec of record)

This section is normative. `contracts/src/Evaluator.sol`, `packages/core/src/strategy.ts` and `data/golden.json` must agree with it;
a disagreement is a bug in whichever one differs from this text.

**Series.** `r[0..N-1]` are signed integers in basis points, `int16`, N = 192 by default. Roles by *earn range* (the index of the return a decision earns):

| role | earn range | looks |
|---|---|---|
| dev | `[6, devEnd)` , default devEnd = 128 | unlimited, used by search |
| confirm | `[devEnd, confirmEnd)`, default confirmEnd = 160 | one recorded look per candidate |
| sealed | `[confirmEnd, N)` | one recorded look per candidate, only by its proposer |

**Spec.** `p = [w0, w1, w2, w3, w4, w5, thr]`, all `int16`. Valid iff `-64 ≤ w_k ≤ 63` for k in 0..5 and `0 ≤ thr ≤ 8191`.

**Walk-forward.** For `t` from `lo - 1` to `hi - 2` (so the earned index `t+1` runs over `[lo, hi)`):

```
s_t   = Σ_{k=0..5} w_k · r[t-k]                    (needs t ≥ 5, hence lo ≥ 6)
pos_t = +1 if s_t >  thr ;  -1 if s_t < -thr ;  else 0
pnl  += pos_t · r[t+1]
if pos_t != pos_{t-1}:  pnl -= COST_BPS · |pos_t - pos_{t-1}| ;  trades += 1        (pos_{lo-2} := 0)
score = pnl  (int32, basis points)
```

`COST_BPS = 3`. All arithmetic is exact integer arithmetic; there is no rounding, no division.

**Epoch.** `keccak256(abi.encode(uint16 SPEC_VERSION, uint8 COST_BPS, uint16 devEnd, uint16 confirmEnd, int16[] returns))`. Anything that changes a score changes the epoch.

**Why this family.** Seven integers is a tiny model in the ants sense, linear in recent returns, thresholded to a position. It is expressive enough that
momentum, mean-reversion and "stay out when unsure" are all reachable, and small enough that a search of a few thousand candidates is meaningful. It is
deliberately *not* a realistic trading system.

## 2. Contracts

| Contract | Role | Writes | Notes |
|---|---|---|---|
| `Ledger` | Evidence store | `recordDev`, `recordConfirm`, `recordSealed` (all write-once, `onlyEvaluator`) | `bind(evaluator)` is callable once by the deployer |
| `Evaluator` | The fixed judge | Calls the Ledger; emits `Evaluated` / `Confirmed` / `Sealed` | `evaluate`, `confirm`, `sealedLook`, view `score` |
| `JudgeLog` | Prediction-before-result for AI judges | `predict` (refused once the Ledger holds the result) | `resolve(key, judge)` reads the outcome from the Ledger |
| `Allocator` (planned) | Test-MON escrow and allocation weights | `deposit`, `allocate`, `reallocate`, `withdraw` | Pays only the depositor; steers parents, never scores (§3b) |

Deployment order: `Ledger` → `Evaluator(ledger, returns, devEnd, confirmEnd)` → `ledger.bind(evaluator)` → `JudgeLog(ledger)` → `Allocator(ledger)` (planned).

Ledger key: `keccak256(abi.encode(proposer, gen, idx))`. Binding the proposer into the key means nobody can squat another proposer's slot, and every
evaluation writes a **unique slot**, which is what lets Monad run them in parallel without re-execution conflicts. There is no global counter in the hot path.

Events (the raw history an agent proposer or the UI reads):

```
Evaluated(gen, idx, proposer, dev, trades, operator, parentGen, parentIdx, params[7])
Confirmed(gen, idx, proposer, score, trades)
Sealed   (gen, idx, proposer, score, trades)
Predicted(key, judge, threshold, pBps)
```

### What the contracts do not do (limits, stated)

- The sealed segment is public on-chain data. One *recorded* look per candidate is enforced; secrecy is not. Commit-reveal is planned (roadmap).
- The score is deterministic and trivially reproducible off-chain; on-chain evaluation is not "faster", it is *verifiable and publicly parallel*.
- Gas is charged on the gas limit on Monad. The limit is fixed per call after measurement (see [monad-notes.md](monad-notes.md)).

## 3. Off-chain components

### `packages/core` (pure, no I/O, fully unit-tested)

| Module | Responsibility |
|---|---|
| `spec.ts` | Constants, `validate`, `specId`, parameter ranges |
| `strategy.ts` | `run(spec, returns, lo, hi)`: the TypeScript mirror of the contract (conformance-tested against `data/golden.json`) |
| `series.ts` | Seeded regime-switching return generator; produces `data/series/v1.json` |
| `operators.ts` | `random`, `mutate`, `crossover`, `sweep`; each returns specs + lineage |
| `archive.ts` | Niche map (style × activity), elites, lineage, ceiling-proxy hooks (§3a) |
| `portfolio.ts` | Thompson-sampling allocation among operators on discovery rate, with descendant credit and a floor (§3a) |
| `cascade.ts` | Dev → top-k confirm → champion on confirm → freeze → sealed |
| `bench.ts` | Offline equal-budget comparison: portfolio vs random 1× and 2× vs per-niche evolution, many seeds, medians; the ceiling proxy |
| `events.ts` | The event schema shared by the orchestrator and the web app (section 5) |

### `packages/chain` (viem)

- `clients.ts` public/wallet clients, RPC list with round-robin and batching.
- `abi.ts` / `deployments.ts` ABIs from `contracts/out`; `deployments.ts` loads the addresses and explorer URL from `config/deployments.testnet.json`.
- `fanout.ts` derive K worker wallets from one seed, fund them, pre-assign nonces, sign offline, send in batches, collect receipts, report the landing-block distribution.
- `reader.ts` read the Ledger/JudgeLog (events and slots) to rebuild state; used for resume and for the UI.

### `apps/orchestrator` (Bun)

The generation loop, in order:

1. Allocate slots among operators (bandit). 2. Generate N specs (validate each locally). 3. *(optional)* Ask the shadow judge for P(win), log to `JudgeLog` **before** sending. 4. Fan out N `evaluate` txs across K wallets.
5. Collect receipts; emit `tx_landed` and `block` events. 6. Update archive and bandit credit. 7. Top-k `confirm`. 8. Emit `generation_end`. 9. After the last generation: freeze the champion, `sealedLook`, emit `sealed`.

It serves `/events` (SSE) and `/history` (JSON), and can record/replay a run as JSONL. It is restartable: on start it rebuilds state from chain events (principle 10).

### `apps/web`

A single screen driven only by the event stream (plus the connected wallet for funding) (so replay and live are the same code path). See [presentation.md](presentation.md).

### 3a. Search mechanics (adapted from ants, sized for seven integers)

Everything here is off-chain, deterministic given a seed, and lives in `packages/core`. None of it can change a score; it only decides what is proposed next.
Status: planned ([surfaces](surfaces.md)). Numbers marked *initial* are starting values to be tuned on the first runs; tuning them does not change the epoch (they are search settings, not measurement), but is recorded in the run config.

**Layers** (compute follows evidence by promotion, not by decree)

| Layer | Who gets in | Cost per candidate | Decides |
|---|---|---|---|
| L0 explore | every candidate (N per generation) | one dev evaluation | which niches show promise; fills the archive |
| L1 confirm | the elite of each niche, up to `confirm_top_k` | one confirm evaluation | which elites generalise |
| L2 sealed | the champion, once | one sealed look | what may be claimed |
| Funding | agents the user picks from L1 survivors | test MON in escrow, §3b | which agents become parents of the next generation |

**The map (quality-diversity archive).** A candidate is placed in one of nine niches by two traits, so the answer is a set of elites on several hills rather than one winner:

| Trait | Definition | Bins (*initial*) |
|---|---|---|
| style | `S = Σ_{k<6} w_k` | reversion if `S < -8`; neutral if `|S| ≤ 8`; momentum if `S > 8` |
| activity | `trades` from the dev run | low `≤ 8`; mid `9 to 24`; high `≥ 25` |

Each niche keeps its **elite**: highest dev score, ties broken by fewer trades, then by smaller `specId`. The archive is rebuilt from Ledger events, so it survives a restart.

**Discovery.** A child *discovers* if it beats its niche's elite or fills an empty niche. Duplicates (same `specId` already evaluated in this epoch) are dropped before sending: gas is never paid twice for the same spec.

**Allocation among operators (Thompson sampling).** Let `n_a` be the proposals of operator `a` and `s_a` its discoveries, both exponentially discounted over past generations with factor 0.8 (*initial*).
Draw `θ_a ~ Beta(1 + s_a, 1 + n_a − s_a)` and give operator `a` a share of the generation proportional to `θ_a`, with a floor of 5% per operator (*initial*) so no operator is starved. Shortfalls are redistributed by the same draw, not dumped on `random`.

**Descendant credit (the path matters).** For every current elite, each ancestor at lineage distance `d` (via `parentGen/parentIdx`, at most 4 steps) adds `0.5^d` to `s_a` of the operator that produced that ancestor. An operator whose payoff is late, such as `sweep` preparing a ridge for `mutate`, is valued rather than starved.

**Parents.** Children of `mutate`, `sweep` and `crossover` are drawn from niche elites. In v0 the choice is weighted by funding (§3b) and otherwise uniform over non-empty niches.
*Planned (v0.2):* weight by niche **potential** from the path of its elite: `level = best dev`, `velocity = level_t − level_{t−1}`, `acceleration = velocity_t − velocity_{t−1}`, `potential = 1` while the niche has fewer than 3 generations of history, else `max(0, velocity) + max(0, acceleration)` (bp). Potential allocates exploration only; it never ranks the answer.

**Not trusting one path.** (i) A **stagnation burst**: if the best dev has not improved for 3 generations, the next generation gives 30% of its slots to `random` and `crossover` across niches, once. (ii) A short **tabu**: a single-weight step of the same parent that failed to discover is blocked for 2 generations.

**Honest controls** (arms in [benchmark.md](benchmark.md)): random at 1× and 2× budget; per-niche elitist evolution without a bandit (`evo_niche`), so the bandit and the portfolio are each compared with a simpler thing; and a **ceiling proxy**: a large offline multi-start hill-climb with the TypeScript mirror (order 10^6 evaluations, not on chain) that gives an altimeter, "how far from the top are we?". It is a proxy, not a proof that a better strategy does not exist.

**Diagnostics shown, not hidden.** Ruggedness (correlation of parent and child dev scores over `mutate` children), plateau fraction (share of children within 1 bp of their parent), duplicate rate, per-niche labels (young, leader, riser, stalled), operator discovery rates.

We do not assume a summit exists or will be found: the statements made are about the elite per niche and the champion's three scores, and about the gap to the ceiling proxy.

### 3b. Funding (the `Allocator` escrow, planned)

Testnet only. Test MON has no value; nothing here is evidence of real returns.

| Rule | Detail |
|---|---|
| Escrow | `deposit()` (payable), `allocate(agentKey, amount)`, `reallocate(from, to, amount)`, `withdraw(amount)`. The contract holds deposits and weights; it pays only the depositor, never another user, and `withdraw` works at any time (checks-effects-interactions, plus a reentrancy guard) |
| Which agents | only keys that already have a Ledger record and a confirm look (`Ledger.exists`, `getConfirm`) |
| Steering | funded total `F`; steered share of a generation `φ = min(0.25, F / (F + F0))` with `F0 = 10` MON (*initial*); those `φN` children are `mutate` or `sweep` (half each) of funded agents, parent chosen in proportion to allocation |
| Suggested split | off-chain, a suggestion only: `w_i ∝ max(0, c_i − g_i/2)` with `c_i` the agent's confirm score and `g_i = max(0, dev_i − c_i)` its overfit gap, capped at 40% per agent and renormalised. The user signs any resulting transaction; nothing moves automatically |
| Virtual return | display only: `allocation_i × c_i / 10_000` per confirm window, labelled *virtual*; no payout exists |
| Limits | One synthetic series; the confirm window is short, so a virtual return is noisy; testnet only; unaudited. Real funds need a real market, settlement, an audit and risk limits (roadmap) |

## 4. Concurrency and the cost model

- **Parallelism needs independent senders.** Transactions from one wallet are ordered by nonce and conflict on the sender's balance; we fan out over K wallets (default 20 to 25), each sending ~N/K txs with pre-assigned nonces.
- **Monad charges gas on the limit.** A sender must hold `gasLimit × gasPrice` per in-flight tx. At the measured testnet price (~100 gwei floor) and a limit near the measured need,
  budget a few hundredths of a MON per evaluation. The orchestrator computes the budget up front and refuses to start a generation it cannot pay for.
- **RPC is the bottleneck, not the chain.** Public endpoints rate-limit; use JSON-RPC batch sends, several providers round-robin, and measure with 20 txs before 200.
- **No shared hot slot.** Each evaluation writes a unique slot; the only shared state touched is read-only (the series).

Numbers are measured in `docs/monad-notes.md`, never assumed.

## 5. Event stream contract (orchestrator → web, also the replay format)

One JSON object per event, `type` discriminates. Defined as TypeScript types in `packages/core/src/events.ts`; this table is the human-readable copy.

| type | fields | when |
|---|---|---|
| `hello` | `epoch, chainId, contracts{evaluator,ledger,judgeLog}, config{n,devEnd,confirmEnd,workers,...}, mode: "live"\|"replay", model: "jev"\|"stand-in"\|"none"` | on connect |
| `generation_start` | `gen, planned, allocation[{operator,count}]` | each generation |
| `tx_sent` | `gen, idx, operator, parent?, wallet, txHash, params[7]` | each submission |
| `tx_landed` | `gen, idx, txHash, block, status, dev?, trades?, gasUsed, latencyMs` | each receipt |
| `block` | `number, ts, evalsLanded` | each block that included our txs |
| `generation_end` | `gen, best, archive[], bandit{operator→credit}, blocks{first,last,span,histogram}` | end of generation |
| `confirm` | `gen, idx, score, trades, txHash` | top-k confirm |
| `sealed` | `gen, idx, dev, confirm, score, trades, txHash` | the one sealed look |
| `judge` | `gen, idx, threshold, pBps, latencyMs, usd, model` | shadow prediction logged |
| `calibration` | `n, brier, brierBaseline, authority: "shadow"\|"advisory"\|"delegated"` | after each resolved batch |
| `baseline` | `gen, bestRandom1x, bestRandom2xMedian, seeds` | offline benchmark curve |
| `map` | `gen, cells[{style, activity, elite:{gen,idx,dev}, label}], discovery{operator→rate}, diagnostics{ruggedness, plateau, duplicates}, ceilingProxy?` | end of generation |
| `allocation` | `wallet, agent:{gen,idx}\|null, amount, txHash, funded{total, byAgent}` | each deposit/allocate/withdraw seen on the Allocator |
| `totals` | `evals, reverted, lost, gasMon, jevUsd, blocksSpanned` | periodic |
| `error` | `scope, message` | recoverable failures, shown not hidden |

## 6. Honesty features (built in, not bolted on)

- Every number links to a tx or a block on the explorer.
- Stand-in model badge when Jev is not connected; "replay" badge when not live.
- Champion shown with dev / confirm / sealed side by side, plus the random baseline.
- The offline benchmark reports medians over seeds; the live run is labelled "one seed".
- Reverts and lost txs are counted and shown.

## 7. Repository conventions

- TypeScript strict, Bun for runtime and tests, viem for chain access, no ethers.
- `packages/core` has **no** I/O and no chain dependency: it must run in a browser test and in `bun test`.
- Contract and mirror change together, with a regenerated `data/golden.json`, in one PR. A PR that changes scoring semantics changes `SPEC_VERSION`.
- Decisions go in `docs/decisions/NNNN-title.md` (ADR style).
