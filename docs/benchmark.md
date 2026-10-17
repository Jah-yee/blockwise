# Benchmark protocol (written before any run)

Pre-registered in the spirit of [ants `docs/benchmark.md`](https://github.com/p-to-q/ants/blob/main/docs/benchmark.md): the arms, seeds, stopping rule and what counts as a null result are fixed **before** results exist. Changing this file after a run starts a new protocol version and the old results stay labelled with the old one.

Status: protocol only. **No arm has been run.** Numbers appear in `docs/results/` with the commit hash and epoch, never in prose here.

## Question

Does the portfolio (random, mutate, crossover, sweep with a bandit) find strategies that generalise better than random search at the same and at twice the evaluation budget, on a series it was not tuned on?

## Setting

| Item | Value |
|---|---|
| Series | `data/series/v1.json` (epoch recorded with every result); a second series with a different seed is run as a separate epoch |
| Evaluator | the TypeScript mirror (`packages/core`), conformance-tested against the Solidity Evaluator on `data/golden.json`; **the live on-chain run is one seed and is labelled so** |
| Budget | B = 1,200 dev evaluations per arm (e.g. 6 generations of 200); the 2× control gets 2,400 |
| Confirm | top-8 per generation by dev get one confirm look; the champion is the best confirm score among them |
| Sealed | the champion's single sealed look, once per run |
| Seeds | 20 per arm, seeds 1 to 20 |

## Arms

| Arm | What it does |
|---|---|
| `random1x` | uniform random specs from the grammar, B evaluations (the control) |
| `random2x` | the same with 2B evaluations (the bar a clever proposer must beat, principle 7) |
| `mutate` | mutate-only from the archive |
| `evo_niche` | per-niche elitist evolution, no bandit, no lineage credit (a single global incumbent is a strawman on a map of niches; this is the fair simple baseline) |
| `global_elite` | the portfolio with one global elite instead of the niche archive (tests whether the map matters) |
| `portfolio` | all four operators, bandit-allocated with the exploration floor |
| `portfolio_noxover`, `portfolio_nosweep`, `portfolio_nomutate` | leave-one-operator-out ablations |
| `ceiling` | an offline multi-start hill-climb of about 10^6 mirror evaluations, not an arm: a reference for "how far from the top", reported separately and labelled a proxy |
| `uniform` | the four operators with fixed equal shares (tests whether the bandit matters) |
| `portfolio_judge` | `portfolio` with the shadow judge advisory (reordering only), only once the judge has earned it ([jev.md](jev.md)); not run in v0 |

## Reported quantities

Per arm, over seeds, as median and interquartile range: best dev; confirm of the champion; **sealed of the champion**; dev-to-sealed gap; evaluations to first reach a fixed dev threshold (the 75th percentile of `random1x` best dev); operator credit shares over time.
No mean-only tables. No single-seed claims. Dev is reported but never used to rank arms.

## Decision rule

| Outcome | Reading |
|---|---|
| `portfolio` sealed median above `random2x` sealed median and the paired difference is positive in at least 14 of 20 seeds | A supported, limited claim: better at equal budget on this series |
| Otherwise | A null result: the clever proposer did not beat the cheaper one. Reported with the same prominence |

The 14 of 20 threshold is a sign-test style bar chosen before running, not a calibrated significance level; with 20 seeds and many comparisons (arms × quantities) a single pass is **not** a proof. Multiplicity is controlled by reporting every comparison made, in a fixed order, and by naming only one primary comparison: `portfolio` vs `random2x` on champion sealed score. Secondary, reported in this order: `portfolio` vs `evo_niche`; `portfolio` vs `global_elite`; `portfolio` vs the ceiling proxy (gap, not a test).

## Stopping rule and validity

- The protocol runs to completion once started; arms are not dropped for looking bad.
- A run whose epoch differs from the registered one is excluded and listed as excluded.
- Seeds that crash are rerun with the same seed; a seed that cannot complete is reported as failed, not replaced.
- Negative control: the same arms on a **shuffled** series (roadmap #22); any arm with sealed skill above zero there flags a bug or a leak.
- Sealed looks are spent once per (arm, seed); the sealed segment is short (32 steps) so each sealed number is noisy, which is why we use medians over seeds.

## What this does not show

Real-market profit, anything beyond this synthetic series and strategy family, or that a bandit is better than a hand-tuned schedule. The result is about the *process*, on a fixed small problem, with an evaluator that cannot be edited by the searcher.
