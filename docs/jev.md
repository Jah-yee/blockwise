# Jev, Jev Trader, and the shadow judge

## 1. What Jev Trader is (read from `github.com/jarrodwatts/jev-trader`, 2026-10-17)

| | |
|---|---|
| Purpose | A live public dashboard of an AI making a real trade decision every Monad block |
| Network | **Monad mainnet** (chain id 143), Kuru MON-USDC order book. Not testnet. Minimum order 200 MON |
| Loop | Each block: read the book (one `eth_call`, ~18 ms), ask the model "buy or sell?", post one post-only limit order one tick inside the touch, cancel the previous one, all in one `batchUpdate` |
| Model | TypeSafe's Jev, a "System One" model: no text out, typed answers with probabilities, ~70 to 500 ms. Called through the AI SDK: `experimental_evaluate` with `@ai-sdk/typesafe-ai`, model id `jev-latest` |
| Question asked | A `choice` question (buy/sell) with `instructions` (question, goal, timing, inputs) and per-choice `criteria`. Probabilities of each option come back with the choice |
| Cost | Configured at ~$0.042 per million input tokens; the project's own pitch is that inference costs less than gas |
| Hot path | Exactly two RPC round trips per block; no `eth_estimateGas`, no gas-price lookup, static EIP-1559 fees (cap 400 gwei, priority 2 gwei); receipts and fee refresh happen off the hot path |
| Safety rails | Dry-run when no `PRIVATE_KEY` (real book, real decisions, simulated fills), a mock model stand-in when no Jev key, a position cap, a "late" state when the model misses a block |
| Output | HTTP `GET /`, `GET /history`, SSE `GET /events` (`block`, `quote`, `fill`, `ping`). A Next.js dashboard consumes it |
| Stack | Bun, TypeScript, ethers v5, `@kuru-labs/kuru-sdk`, AI SDK; web in Next.js |

### What is limiting about it (our opening)

- **One model, one decision, no memory.** Nothing carries lessons from block to block, and nothing retires a bad idea.
- **No measure of whether the calls are good.** The dashboard shows PnL, but PnL on a small sample is noise; calibration is not measured.
- **One market.**
- **Mainnet, real funds.** Not something to point at on a hackathon testnet.

### What we reuse from it (design, not code)

| Idea | Where it lands in Blockwise |
|---|---|
| Typed question to a System One model, probabilities back | The shadow judge (section 2) |
| Hot path with two round trips, static fees, no per-block estimation | Fan-out: estimate gas once, fix the limit, pre-assign nonces |
| Dry-run and stand-in model as first-class states, clearly labelled | `mode: replay`, `model: stand-in` badges |
| Honest dashboard: losses shown as plainly as gains, counters for cost | The counters row; "AI costs less than gas" comparison as Jev spend next to gas spend |
| One screen, motion is the content, tabular numerals, no decoration | [presentation.md](presentation.md) |
| SSE as the single interface between engine and UI; replay from a recording | Orchestrator event stream is the replay format |
| `scripts/probe-rpc-caps.ts` style probing of RPC limits | A1, A4 in [monad-notes.md](monad-notes.md) |

### What we deliberately do not do

- We do not trade on mainnet or touch real funds from this repo.
- We do not claim anything about Kuru on testnet. Whether a usable testnet book exists is **unverified**; v0 does not depend on it.

## 2. The shadow judge

Jev is exactly the kind of judge ants calls *non-deterministic*: fast, cheap, calibrated-by-training, but not something to trust blindly.
Blockwise gives it a role where being wrong is cheap and being calibrated is measurable.

**Question** (typed, binary): *"Will this candidate's dev score exceed `threshold`?"* where `threshold` is the champion's dev score at the start of the generation.
**State** given to the model: the candidate's seven integers, its operator and parent's dev score (if any), the current champion's spec and score, the last few generations' best scores, and the
archive's size. Compact and numeric, in the style of jev-trader's `TradeState`.
**Answer**: a probability `pBps` in 0..10000.

**Protocol**

1. Before any candidate in a generation is sent to the Evaluator, the orchestrator asks the judge and calls `JudgeLog.predict(key, threshold, pBps)`.
2. `JudgeLog` refuses the call if `Ledger` already holds that key (a judge cannot "predict" a result that exists).
3. After the generation lands, `JudgeLog.resolve(key, judge)` yields `(resolved, outcome, pBps)`.
4. Calibration is computed from those triples: **Brier score**, a **reliability table** (bins of pBps vs observed frequency), and **lift over a base-rate predictor**.

**Authority ladder** (principle 8)

| Level | Allowed | Promotion requires |
|---|---|---|
| shadow (start) | Predictions are logged and displayed. No effect on the search | n/a |
| advisory | May reorder the candidates within a generation (all are still evaluated) | Brier better than the base-rate predictor by a margin, over ≥ N resolved predictions (N set in config), and monotone reliability |
| delegated | May skip the bottom of the ranking, with a fixed exploration quota evaluated anyway so calibration keeps being measured | Sustained advisory performance; never overrides E0/E7 integrity or the sealed look |

During the hackathon the judge is in **shadow** the whole time: we evaluate everything, which keeps the calibration measurement clean (skipping would create selection bias
because skipped candidates never resolve). The UI shows the meter and the current level, and says "shadow" in words.

**Honest limits**: a binary question about a candidate's score against a moving threshold is a hard task for a language-free model with a numeric prompt; Jev may be near the base rate.
A null result is a valid, displayable outcome ("Jev adds nothing here yet"), and it is more credible than a rigged win.

## 3. Wiring (sketch, for whoever builds it)

```ts
// apps/orchestrator/src/judge/jev.ts  (optional dependency: ai, @ai-sdk/typesafe-ai)
import { experimental_evaluate } from "ai";
import { typeSafeAi } from "@ai-sdk/typesafe-ai";

const QUESTIONS = {
  beats: {
    type: "choice",
    instructions: { question: "...", goal: "...", timing: "...", inputs: "..." },
    criteria: { yes: "Dev score will exceed the threshold.", no: "It will not." },
  },
} as const;
// answer.probabilities.yes * 10000 → pBps
```

Rules: the key comes from the environment (`TYPESAFE_AI_API_KEY`), never the repo; when absent the pipeline runs a **mock judge** and the UI labels it `stand-in`; the judge never has a write path to the Evaluator or Ledger (it can only call `JudgeLog.predict`).

## 4. Beyond v0 (vision, not scope)

- **Live arena:** champions emit buy/sell signals against the real Kuru MON-USDC book via the jev-trader data pipeline in **dry-run** mode (paper trading, no funds), compared against Jev-alone and against a mock, with the same calibration accounting.
- **Per-block decision with memory:** replace "one model, one decision" with "a few proposers + the Ledger as shared memory + Jev as a calibrated judge", which is the harness jev-trader lacks.
- **Multiple environments** (series, markets), with compute allocated among them by the same bandit and shown as separate "colonies".
