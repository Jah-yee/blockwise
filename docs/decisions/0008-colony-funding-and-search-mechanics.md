# 0008 A colony you can fund; ants' mechanisms adapted

**Status:** accepted (2026-10-17, maintainer: "a colony of trading agents you can fund, judged on-chain"; fund with test MON today, real funds on the roadmap)

## Context

"Proving ground" read as a sandbox, not something people can use. The maintainer wants people to bind a wallet and allocate, as an advanced counterpart to running Jev Trader themselves, and wants the colony to carry ants-like behaviour: effort automatically going where it is most promising, strategies emerging rather than being written down, and a sense of a landscape with paths. An earlier draft of this change proposed three resource pools; on re-reading ants that was not faithful: ants' "layers" are (a) a cascade of fidelities where effort moves by promotion, and (b) search mechanisms (a portfolio of operators under a Thompson-sampled bandit, quality-diversity niches, lineage credit, path kinematics, a ceiling proxy).

## Decision

1. **Layers are promotion, not pools.** L0 explore (every candidate, dev), L1 confirm (niche elites, one look), L2 sealed (champion, one look), plus funding as a steering input. No separate budgets per layer; effort follows evidence.
2. **Adapt, do not copy, ants' mechanisms:** niche archive (style × activity) with an elite per niche; Thompson sampling on discovery rate with descendant credit through lineage and a floor; stagnation burst and tabu; path potential (velocity, acceleration) for exploration only; honest controls (random 1× and 2×, per-niche evolution, global elite); a ceiling proxy as altimeter. Specified in architecture §3a, initial numbers marked and tunable.
3. **The ledger records results and lineage, nothing more.** No separate "facts" layer. Strategies are never written down as rules: they are the elites and the evidence behind them.
4. **Funding is a testnet escrow that steers.** `Allocator` holds test MON and weights, pays only the depositor, always allows withdraw, has no owner/pause/proxy/oracle; funded agents become parents of a capped share of the next generation; a suggested split is advice the user signs; the return shown is virtual. Architecture §3b, SECURITY.
5. **Real funds are roadmap v0.9, conditional** on a real market, settlement, an independent audit and risk limits. v0 documents and UI say *test MON, virtual, no payout* wherever funding appears.
6. **No claim beyond evidence.** That the niche map, the bandit or the potential help is open (open.md 10a to 10d) and settled only by the pre-registered benchmark.

## Consequences

(+) A usable story for the audience and a mechanism people can touch. (+) Mechanisms grounded in an existing, documented design. (+) Honest controls built in.
(−) More to build today: an escrow with tests, wallet connect, a map. The roadmap cut order protects the core: if escrow tests are not green, ship without funding and say so.
(−) Users may read "funded" as "invested": every funding surface carries the labels. (−) The niche bins and initial numbers are guesses to be tuned on the first runs.
