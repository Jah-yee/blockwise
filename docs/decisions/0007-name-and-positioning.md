# 0007 Name and positioning

**Status:** accepted (2026-10-17, maintainer); the tagline was revised the same day (see point 2)

## Context

The project began as the idea of putting a fast, calibrated decision model (Jev, as in Jev Trader) inside a harness that validates, retires and remembers, on a chain fast enough to host it.
The first draft was named for its mechanism (a colony, evolution) and described as "ants on Monad". The maintainer objected on two grounds: the project only *borrows ideas* from ants and is otherwise unrelated to it,
and the name carried neither timeliness (acting every block) nor trading.

## Decision

1. **Name: Blockwise.** It carries "block by block" (timeliness, the chain) and "wise" (judgement, which is what the judge contract and the shadow judge are for). Trading and the colony of agents are carried by the line beneath it, which always travels with the name.
2. **Line under the name:** ~~"A proving ground for trading agents, judged on-chain."~~ Superseded by [0008](0008-colony-funding-and-search-mechanics.md): **"A colony of trading agents you can fund, judged on-chain."** Chinese: "一群可以被资助的交易 agent，由链上合约裁判。"
3. **Not a "desk".** A trading desk implies real capital, real traders and a live market. Blockwise has none of these: a population of tiny strategies is scored by a contract on a synthetic series, and that is all v0 claims. "Proving ground" says what it is: agents prove themselves or are retired, in public.
4. **Relation to ants:** acknowledged, not advertised. The discipline (propose, judge, execute; evidence the proposer cannot edit; look once) is taken from it and credited in the README; Blockwise is its own project.
5. **Hosting:** the maintainer's personal GitHub account (`Jah-yee`), public. Not published until the maintainer says so.

## Alternatives considered

| Name | Why not |
|---|---|
| Antfarm | Names the mechanism, not the point; collides on GitHub (`snarktank/antfarm`) and npm |
| Pismire | Lineage-only; hard to say; the word's etymology (from "piss") is awkward on stage |
| Kairos | Apt ("the opportune moment") but needs explaining; the maintainer preferred a more direct name |
| TradeWise | Carries trading but not the block or the chain; generic |
| Tickwise, Blockdesk, Blockfloor, Blocktape | Each carries one property less well than Blockwise, or overstates (desk) |

## Consequences

Rename pass done in one change (package names `@blockwise/*`, CLI `blockwise`, `~/.blockwise/`, env `BLOCKWISE_*`). The repository directory is `blockwise/`.
The npm names `blockwise` and `onblock` are taken by unrelated packages; we publish no npm package, so this only affects search. An open question remains whether v0 should add a per-block live stage ("every block") or stay a batch proving ground; until it exists, no document claims per-block judging.
