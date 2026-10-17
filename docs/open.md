# Open questions

Research threads, not release scope. Each has a test that would settle it; none is settled. Newest first. A null result is reportable.
Format after [ants `docs/open.md`](https://github.com/p-to-q/ants/blob/main/docs/open.md).

## 1. Does a generation of evaluations really land in a few blocks?  *(assumption A1, not measured)*
The central demo claim. **Settles it:** `smoke` at 20, 100, 200 evaluations from 10 to 25 wallets; record the landing-block histogram, spread in blocks and the failure rate
([monad-notes.md](monad-notes.md)). Risk: the public RPC rate limit, not the chain, may stretch a burst over many seconds; then the honest statement is the measured spread, and the fix is batching or more endpoints.

## 2. Does the search beat random at equal budget?
The portfolio (random, mutate, crossover, sweep, allocated by a bandit) against random search at 1× and 2× the evaluations. **Settles it:** [benchmark.md](benchmark.md): ≥ 20 seeds, medians and IQR, evaluated on confirm and sealed, not on dev. The space is small (seven integers); random search at 2× may be hard to beat. Risk: a null result. It is reportable and we show it.

## 3. Does the dev winner survive confirm and sealed?
Selection pressure on dev should overfit. **Settles it:** the same benchmark: dev-to-confirm and dev-to-sealed gap at equal dev score, per arm. The sealed segment is 32 steps long, so a sealed score is noisy; report an interval, not a point.

## 4. Is the synthetic series a fair test?
The generator fixes regimes, drift and noise; its sealed segment has a different regime mix than dev. Whether results transfer to anything real is **unknown and not claimed**. **Settles it:** a second series with another seed (new epoch) and, later, real return series (roadmap v0.5). Negative control: a shuffled series should show no skill (roadmap #22).

## 5. Is Jev better than the base rate at predicting winners?
**Settles it:** shadow predictions logged before results ([jev.md](jev.md)); Brier score against a base-rate predictor over ≥ N resolved predictions, plus a reliability table. Compare with the stand-in (a deterministic heuristic) and a random judge. A numeric prompt may leave Jev at the base rate; a null result is a valid outcome.

## 6. Is on-chain evaluation worth its gas?
Not a speed question: a laptop is faster. The claim is verifiability and public parallel throughput. **Settles it:** measured gas per evaluation and per generation (A2) against what the audience gets for it; and whether anyone reuses the Ledger (roadmap v1.0). If nobody needs a public, ordered judge, the on-chain part is only a demo, and we say so.

## 7. Can the sealed segment be made secret on a public chain?
Commit-reveal: commit a hash of the sealed returns at deploy, reveal them at the first sealed look. **Settles it:** a prototype in roadmap v0.3 and a test that a proposer cannot read the sealed returns before its look. Limit: the first look reveals the data to everyone, so only the first look per series is truly sealed.

## 8. Does reading the ledger beat a summary of it?  *(from Meta-Harness, via ants open question 9)*
An agent proposer that reads Ledger events as raw history against a one-shot LLM proposer and the portfolio at equal evaluations and equal model calls, ≥ 3 seeds. **Settles it:** roadmap v0.6. Control: an arm given the same tokens of random ledger rows (is it reading failures, or just more context?).

## 9. Does the bandit credit rule do anything?
Credit = recent archive gain with an exploration floor. **Settles it:** leave-one-operator-out ablation and a bandit vs uniform-allocation arm at equal budget; ants has not shown this either ([ants open.md](https://github.com/p-to-q/ants/blob/main/docs/open.md) question 2 and the note on operators).

## 10a. Does the niche map beat one global elite?
Style × activity is a guess at what matters. **Settles it:** `portfolio` vs `global_elite` and `evo_niche` ([benchmark](benchmark.md)); the number of occupied niches over time; whether niche elites differ in confirm score. If the map does nothing, say so and simplify to one archive.

## 10b. Do velocity and acceleration of a niche predict anything?
Path potential is borrowed from ants, where it is also untested ([ants open.md](https://github.com/p-to-q/ants/blob/main/docs/open.md) question 4). **Settles it:** rank correlation of early path statistics with the elite's final score, among the top niches only; potential-weighted parents vs uniform parents at equal budget. A null result is reportable.

## 10c. How far is the colony from the top?
The ceiling proxy bounds only what a big offline search finds, not what exists. **Settles it:** the gap per role, reported with the number of offline evaluations; several independent offline searches that agree (or do not) on the peak, which also tells how many basins there are.

## 10d. Does funding steering help or just add noise?
Steered parents are chosen by humans. **Settles it:** a run with steering vs without at equal budget; compare confirm and sealed of the champion. Humans may fund overfitters: the suggested split subtracts half the overfit gap, and whether that helps is itself a measurement.

## 10. What does the unique-slot design buy?
We assume unique slots avoid re-execution conflicts. **Settles it:** an A/B with a shared counter in the hot path (a deliberately bad variant) to see whether landing spread worsens (A3 in monad-notes). If it makes no difference, the design note in [ADR 0003](decisions/0003-unique-slots-and-fanout.md) must say so.

## 11. What still depends on human discipline?
Choosing the sealed look's timing, reading the failure log, choosing what to claim on the slide. Listed here so nobody mistakes them for guarantees.
