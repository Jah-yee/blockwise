# Blockwise

**A colony of trading agents you can fund, judged on-chain.**

[Start here](#start-here) · [How it works](#how-it-works) · [What you will see](#what-you-will-see) · [Verification](#verification) · [Quick start](#quick-start) · [Documentation](#documentation) · [Roadmap](#roadmap) · [中文](README.zh-CN.md)

Status: **v0, built for Monad Blitz Shanghai (2026-10-17).** Testnet only: test MON, no real funds, no financial advice. The contracts compile; nothing has been tested or deployed yet ([surfaces](docs/surfaces.md)).

> There is a tide in the affairs of men,
> Which, taken at the flood, leads on to fortune;
> Omitted, all the voyage of their life
> Is bound in shallows and in miseries.
> — Shakespeare, *Julius Caesar*, IV.iii
>
> 乐观时变……趋时若猛兽挚鸟之发。
> — 司马迁，《史记·货殖列传》（白圭）

A block is a tide. Most trading agents meet it late: after the fact, in a backtest, scored by the same hand that proposed them.
Blockwise puts a colony of small, cheap, fallible agents in front of the tide and lets a contract keep the score. The contract is the
only thing allowed to write the ledger, so no agent can grade itself. Nobody writes the strategies down: they are kept, or dropped, by what the ledger says they did.
And you may bring a wallet and put test MON behind the agents you believe in.

"Wise" in block-wise means *by the block*; it also means judgement: every verdict here is made by something that cannot be argued with.

## Start here

| I want to | go to |
|---|---|
| see what it is and why | [proposal](docs/proposal.md) · [faq](docs/faq.md) |
| fund an agent (testnet) | [Funding](#funding) · [architecture §3b](docs/architecture.md) |
| know how the colony searches | [How it works](#how-it-works) · [architecture §3a](docs/architecture.md) |
| know what it holds true | [principles](docs/principles.md) |
| see what runs, and how far to trust it | [surfaces](docs/surfaces.md) |
| understand the parts, the scoring spec and the event stream | [architecture](docs/architecture.md) · [contracts](docs/contracts.md) |
| use the CLI or the terminal interface | [cli](docs/cli.md) · [tui](docs/tui.md) |
| know what we rely on about Monad, and how it is checked | [monad-notes](docs/monad-notes.md) |
| understand Jev, Jev Trader and the shadow judge | [jev](docs/jev.md) |
| see the demo and the screen | [presentation](docs/presentation.md) |
| help build it | [roadmap](docs/roadmap.md) · [CONTRIBUTING](CONTRIBUTING.md) |

## How it works

Four kinds of thing, kept apart on purpose: what **proposes**, what **judges**, what **holds funds**, what **shows**.

| | a bot you run yourself (for example Jev Trader) | Blockwise |
|---|---|---|
| who decides | one model, one decision per block, no memory | a colony of small agents; a bandit allocates effort among their proposers; Jev joins as a *shadow* judge until its calibration is measured |
| who judges | the bot, or a script on the same machine | a contract the proposers cannot reach; only the bound Evaluator can write the Ledger |
| evidence | logs | an append-only, write-once Ledger of results and lineage, in an epoch that names the data and the rules |
| the answer | one best | a map of niches, each keeping its own elite: several hills, not one |
| held-out data | "we tested it" | dev (many looks) → confirm (one look) → sealed (one look, ever), shown side by side |
| your say | you run it and watch | you **fund** agents with test MON; funding steers the next generation's parents; you can withdraw at any time |
| failure | an exception | a normal outcome: reverts and dropped transactions are counted and displayed |
| the claim about Monad | "10,000 TPS" | the block numbers a generation actually landed in, on screen, linked to the explorer |

- **Strategies** are seven small integers: six weights on recent returns and a threshold. Small enough to evaluate inside the EVM.
- **The judge** replays a frozen return series in integer arithmetic and writes the score to the Ledger.
- **A generation** is hundreds of independent `evaluate` calls sent from many wallets at once. Monad runs independent transactions in parallel, so a generation should land in a handful of blocks.
  That is assumption A1 in [monad-notes](docs/monad-notes.md): **not yet measured**. The screen shows the measured number.
- **Jev**, a System One model, predicts which candidates will win *before* the results exist; the prediction is logged on-chain and refused afterwards. Its authority is earned by calibration, never granted.

### Layers: effort goes where the evidence points

Effort moves between layers by promotion, not by decree. Cheap looks first, rarer and costlier ones for the few that earn them.

| Layer | Who gets in | Cost | Decides |
|---|---|---|---|
| L0 explore | every candidate, hundreds per generation | one dev evaluation | which niches show promise; fills the archive |
| L1 confirm | the elite of each niche, one look each | one confirm evaluation | which elites generalise |
| L2 sealed | the champion, once | one sealed look | what may be claimed |
| Funding | agents *you* pick from the L1 survivors | test MON in escrow | steers which agents become parents of the next generation |

### The map

Candidates are placed on a coarse map by two traits: *style* (the sign of the weights' sum: momentum, reversion, neutral) and *activity* (how often it trades). Each cell keeps its best candidate, its **elite**; the result is the set of elites, not one winner.
Proposers are allocated by **Thompson sampling on discovery rate** (a child improves its cell or opens a new one), with credit passed back along lineage to the operator that made the ancestor, and a floor so no operator is starved.
A niche is also judged by its **path** (velocity and acceleration of its best), only to decide where to explore, never to rank the answer.
We do not assume a summit exists. An offline search with the TypeScript mirror gives a *ceiling proxy*, an altimeter for "how far from the top are we?", and is labelled a proxy, not a proof. Details and the maths: [architecture §3a](docs/architecture.md). The mechanisms are adapted from [ants](https://github.com/p-to-q/ants).

### Funding

Connect a wallet on Monad testnet, deposit test MON into the `Allocator` escrow, and allocate it to agents in the Ledger.

- **Withdrawable at any time.** The escrow never pays out to anyone but the depositor; there is no pool, no lock and no payout from other users' deposits.
- **It steers.** Funded agents become parents of the next generation in proportion to the allocation (a capped share of the generation).
- **It suggests, you sign.** The screen can propose a split across the niche elites (more to agents that generalised, capped per agent); nothing moves until you sign the transaction.
- **It shows a virtual return.** Allocation × the agent's held-out score, labelled *virtual*: it is computed from a synthetic series, there is no payout, and test MON has no value.
- **Real funds are on the roadmap, not in v0.** Real money needs a real market, settlement, an audit and risk limits. Until then this is a mechanism on a testnet, and the docs say so.

## What you will see

A single screen; motion is the content ([presentation](docs/presentation.md)). **A sketch of the planned screen, not output from a run:**

```
 Blockwise  ● live   block 71,750,141   epoch 0x3fa9…   [Jev: stand-in]   gen 6 / 10      wallet 0x7a…c1  funded 12.0
 ┌ population ─────────────────────┐  ┌ map: style × activity ───────────────────────┐
 │ ▒▒▓▓░░▒▒██▒░░▓▒▒░▓▓▒░▒▒▓░░▒▓▒▒░  │  │   low   mid   high    ▲ elite per niche      │
 │ ░▒▒▓▒░▓▓▒▒░▒▒█▓▒░░▒▒▓▒▒░▓▒░░▒▒░  │  │ mom  ▒     ▓▲    ░      ceiling proxy ┄┄ +640│
 └─────────────────────────────────┘  │ rev  ░     █▲    ▒      champion  +412 / +158 / −37│
 landed in blocks  ▮▮▮▮▮▮▮▮▮   N evals in B blocks     └────────────────────────────────────┘
 gas 24.1 MON   Jev $0.0031   Brier 0.19 vs 0.25
 funding  agent 6:12  ▮▮▮▮▮▮ 8.0 (virtual +0.13)   agent 5:07  ▮▮ 4.0 (virtual −0.02)        [fund]
```

- a grid of strategies, one cell per candidate, that **lights up as evaluations land**;
- the map of niches with each elite, the champion's dev / confirm / sealed side by side (if it overfits, you see that), and the ceiling proxy;
- the best score per generation against random search at equal budget;
- counters: evaluations, blocks spanned, gas, Jev spend; and the Jev calibration meter, labelled *shadow* until it has earned more;
- the funding panel: who is funded, by how much, and the virtual return, labelled as such.

## Verification

Written before the checks exist, so that "not run" is a stated fact and not a silence.

| Claim | Checked by | State |
|---|---|---|
| Only the bound Evaluator can write the Ledger; records are write-once | Foundry tests ([contracts](docs/contracts.md), "Tests the contracts must pass") | **not run** |
| The TypeScript mirror and the Solidity Evaluator agree on every score | golden vectors, 200 specs, three roles | **not run** |
| The Allocator escrow only ever returns a deposit to its depositor, and withdraw is always possible | Foundry tests incl. a reentrancy attempt and a fuzz of deposit/allocate/withdraw sequences | **not written** |
| A generation lands in a few blocks | `smoke` at 20, 100, 200 evaluations ([monad-notes](docs/monad-notes.md) A1) | **not run** |
| The colony beats random search at equal budget, and the niche archive beats a single global elite | the pre-registered [benchmark](docs/benchmark.md) | **not run** |
| Jev is better than the base rate | shadow log, Brier score ([open questions](docs/open.md) 5) | **not run** |

## First measurement

None yet. Every number will be measured, dated, and recorded in [monad-notes](docs/monad-notes.md) with the command that produced it. The only things measured so far are the testnet's chain id (10143),
block gas limit (150,000,000), base fee floor (100 gwei) and priority fee (2 gwei), on 2026-10-17.

## Layout

```
contracts/          Foundry project: Ledger, Evaluator, JudgeLog (written); Allocator (planned)
domains/            Domain contracts (task declarations), see docs/contracts.md Part B
config/             Deployment addresses per chain (no secrets)
fixtures/           Sample event streams for building the UI without a chain
runs/               Local run directories (mirror database, recordings); gitignored
packages/core/      Pure TypeScript, no I/O: spec, strategy mirror, series, proposers, archive, bandit, event types
packages/chain/     viem glue: clients, ABIs, wallet fan-out, ledger reader
apps/orchestrator/  Bun process: runs generations, serves SSE, records replays
apps/web/           Live view and wallet funding (React, served by Bun)
data/               Frozen return series and golden test vectors
docs/               Everything else
```

## Quick start

Requirements: [Bun](https://bun.sh) ≥ 1.1, [Foundry](https://getfoundry.sh) ≥ 1.8, git.

```bash
git clone --recurse-submodules <this repo> && cd blockwise
bun install
cd contracts && forge build && forge test && cd ..   # forge-std is a git submodule: use --recurse-submodules, or `git submodule update --init`
bun test packages/core
```

Testnet wallet (never commit keys, see [SECURITY](SECURITY.md)): keep the mnemonic in `~/.blockwise/testnet.json` (mode 0600) or an untracked `.env` (`cp .env.example .env`).
Monad testnet: chain id `10143`, public RPC `https://testnet-rpc.monad.xyz`. Test MON from the faucet linked on the event page.
Use a burner wallet for anything you connect to the web view.

## Documentation

| | |
|---|---|
| [Principles](docs/principles.md) | the twelve rules, and where each is enforced |
| [Architecture](docs/architecture.md) | parts, scoring spec of record, search mechanics, funding, event stream, cost model |
| [Contracts](docs/contracts.md) | the smart contracts and the domain contract |
| [Monad notes](docs/monad-notes.md) | what we rely on: measured, documented or assumed |
| [Jev](docs/jev.md) | Jev Trader as we read it, and the shadow judge |
| [Presentation](docs/presentation.md) | the screen and the demo script |
| [CLI](docs/cli.md) · [TUI](docs/tui.md) | the interface, written before the code |
| [Surfaces](docs/surfaces.md) · [Changes](docs/changes.md) | what exists and how far to trust it; what changed |
| [Operations](docs/operations.md) · [Data](docs/DATA.md) | budget, failure modes, the series |
| [Open questions](docs/open.md) · [Benchmark](docs/benchmark.md) | what is unknown and the protocol that settles it |
| [Roadmap](docs/roadmap.md) · [Decisions](docs/decisions/README.md) | the plan and the reasons |

## Roadmap

Dated plan, workstreams and the issue backlog: [docs/roadmap.md](docs/roadmap.md).

- [ ] contracts tested, gas measured, TypeScript mirror conformance-tested
- [ ] testnet smoke: 20, 100, 200 evaluations; the landing-block histogram recorded
- [ ] generation loop, niche archive, Thompson bandit, confirm and sealed looks, live view, replay
- [ ] `Allocator` escrow, wallet connect, funding steers the next generation
- [ ] Jev shadow judge and its calibration meter
- [ ] path potential for niches; ceiling proxy from the offline search
- [ ] a live per-block stage (agents marked to market every block), if it earns its place
- [ ] sealed data as commit-reveal; real return series; multiple environments
- [ ] real funds: a real market (Kuru), settlement, audit, risk limits. **Not before all of the above, and not in v0.**

## Acknowledgements

The mechanisms of this colony, and the discipline around them (propose / judge / execute kept apart, look once at held-out data, compare every clever method with a cheaper one at equal budget),
are adapted from [ants](https://github.com/p-to-q/ants) by the same author and from the Meta-Harness line of work. The idea of a typed, calibrated decision every block is
[Jev Trader](https://github.com/jarrodwatts/jev-trader) (Jarrod Watts) on TypeSafe's Jev model. The ground it stands on is [Monad](https://www.monad.xyz).
Blockwise is its own project and shares no code with any of them.

## License

Apache-2.0, see [LICENSE](LICENSE). Documentation CC-BY-4.0.

<p align="center"><sub>In time, if the ledger says so.</sub></p>
