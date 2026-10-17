# Presentation and demo

The judging is a live audience vote. A viewer who sees the screen for 30 seconds, with no context, must come away with three
things: **a lot of work lands on-chain in a few blocks; the judge is a contract the searcher cannot cheat; the result is honest.**
We design the screen for that, in the manner of jev-trader's `SPEC.md`: one screen, motion is the content, everything verifiable.

## 1. Principles

- **One screen, no navigation, no login.** Desktop 16:9 first; stacks vertically at 390 px.
- **Motion is the content.** The grid changes every block; the viewer feels the rhythm of the chain. Animate only `transform` and `opacity`.
- **Everything is real and linkable.** Block numbers, tx hashes and the wallet link to the explorer. If a number is not traceable, it does not go on screen.
- **Honest.** Dev, confirm and sealed side by side. Baseline on the same chart. Reverts counted. `stand-in` and `replay` badges. A loss is shown as plainly as a win.
- **Legible when compressed.** Big numbers, high contrast, tabular numerals, no thin type, no hover-only meaning (the screen may be recorded).
- **Restraint.** Dark, one accent. Buy/long = green and sell/short = red are not used here; instead *score* is a single sequential scale from dim to bright accent, so the
  grid reads as "heat". No gradients as decoration, no blinking indicators.

## 2. Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Blockwise  ● live      block 71,750,141      epoch 0x3fa9…      [Jev: stand-in]   gen 6 / 10      │  header
├──────────────────────────────────────────────┬───────────────────────────────────────────────┤
│                                              │  GENERATION CURVE                              │
│   POPULATION GRID  (200 cells)               │   best dev per generation                      │
│   each cell = one candidate                  │   ── portfolio   ┄┄ random 1×   ┄┄ random 2×   │
│   dim → lights up when its tx lands          │                                                │
│   cell colour = dev score (sequential)       │  CHAMPION                                      │
│   a ring marks the current archive top-k     │   dev +412   confirm +158   sealed  −37  ◄ shown│
│   the block number the cell landed in is     │   spec [ 12  −7  31  0  −4  9 | 880 ]        │
│   the "row" it flickers in                   │                                                │
├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ LANDED IN BLOCKS   ▮▮▮▮▮▮▮▮▮   151 evals in 4 blocks   (histogram of blocks, newest right)    │  the Monad moment
├──────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ COUNTERS: evals 1,204 · reverted 0 · gas 24.1 MON · Jev $0.0031 │  JEV  shadow · Brier 0.19 vs 0.25 │
├──────────────────────────────────────────────┴───────────────────────────────────────────────┤
│ TX TAPE   gen·idx · operator · dev · block · tx 0x…  (last 12, slide in from the top)          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Components and what each proves

| Component | Data (event types) | Proves |
|---|---|---|
| Header | `hello`, `block`, `generation_start` | It is live, on this chain, in this epoch |
| Population grid | `tx_sent`, `tx_landed` | Parallelism: many cells light up in the same block. The grid is the hero |
| Landing histogram + "N evals in B blocks" | `generation_end.blocks` | The Monad claim, measured, not asserted |
| Generation curve + baseline | `generation_end`, `baseline` | The search beats (or does not beat) random at equal budget |
| Map of niches | `map` | The answer is several hills with an elite each, plus the ceiling proxy (how far from the top) |
| Champion panel | `confirm`, `sealed` | Look-once discipline; overfitting is visible |
| Funding panel | `allocation` | Who is funded and by how much; the virtual return, labelled *virtual*; withdraw is always visible |
| Counters | `totals` | Cost is real: gas and (if connected) Jev spend sit side by side |
| Jev meter | `judge`, `calibration` | The AI judge earns authority by calibration, and is labelled shadow/advisory/delegated |
| TX tape | `tx_landed`, `confirm`, `sealed` | Everything links to the chain |

States: **live**, **replay** (plays a recorded run at real speed, badge says replay), **late/RPC down** (header dot red, freeze with "reconnecting"), **stand-in** (amber model badge), **out of funds** (banner; generation refused, shows the budget).

## 3. Demo script (about 3 minutes; the first 30 seconds carry the vote)

| t | On screen | Say |
|---|---|---|
| 0:00 | Header and an empty grid | "Seven numbers is a trading strategy. We evolve them. The judge is a contract." |
| 0:10 | Press "evolve": ~200 cells light up within a few blocks, histogram appears | "200 candidates, one generation. They land in {B} blocks. Here are the block numbers." |
| 0:30 | Curve ticks up; baseline stays lower | "Search versus random at the same budget." |
| 0:50 | Click one tx on the tape → explorer | "Every score is a transaction. The searcher can't write the score; only the Evaluator can write the Ledger." |
| 1:10 | Run to the last generation; champion panel shows dev / confirm / sealed | "We picked on confirm, and the sealed number is the one look we get. It is {honest value}." |
| 1:40 | Jev meter | "A System One model predicted winners before results existed; the chain logged it; it's {shadow} until it earns more." |
| 2:10 | Connect a burner wallet, fund an agent, the next generation's parents change; show withdraw | "You decide where the next effort goes. It is test MON, the return is virtual, and you can take it back." |
| 2:40 | Vision slide | "Same loop, with a live market arena and many environments. Repo is open." |

Fallback: if the testnet is down, switch to replay of the recorded run (badge visible) and say so.

## 4. Vision slide (one visual, five bullets)

1. A contract as the judge: proposers can't cheat. 2. Parallel EVM as an evaluation farm. 3. AI judges that earn authority on-chain. 4. Ledger as shared memory for many agents.
5. Next: sealed-data commit-reveal, real market arenas (paper trading on Kuru data via the Jev Trader pipeline), multi-environment compute allocation.

## 5. Visual tokens (suggested; keep them in one CSS file)

- Background `#0b0c10`, panel `#14161c`, text `#e8e9ee`, muted `#8a8f9c`.
- One accent (Monad purple family, e.g. `#836ef9`) for emphasis and the sequential scale (dim → bright of the same hue).
- Score scale: 7 steps, perceptually even, colour-blind safe because it varies in lightness not hue.
- `font-variant-numeric: tabular-nums` on every changing number. No middle dots or dashes in rendered strings if we keep jev-trader's typographic rule (their choice; ours is optional).

## 6. Engineering notes for the UI

- Driven only by the SSE stream; replay is the same code with a different source.
- 100 to 300 cells: render in a `<canvas>` or plain divs with `transform`/`opacity` transitions; no layout thrash.
- Keep the last ~2,000 events in memory; the orchestrator's `/history` serves a late joiner.
- A visible "evals landed this block" counter is cheap and is the thing people point at.
