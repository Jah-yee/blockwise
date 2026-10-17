# Proposal

## 1. Problem

A trading agent that decides every block has two weaknesses that a faster model does not fix.

- **It is judged by the hand that proposed it.** A backtest run by the author, a PnL curve from one run: nothing stops the agent, or its author, from grading its own homework.
- **It forgets.** One model makes one decision and starts again. Nothing carries what worked, retires what did not, or says how far from a good answer it still is.

[Jev Trader](https://github.com/jarrodwatts/jev-trader) (Jarrod Watts, Monad) shows the first half of the picture well: a System One model, Jev, makes a typed, probabilistic decision
every Monad block and acts on it on-chain. What is missing around it is a harness: a judge the agent cannot reach, evidence that accumulates, and a way to put effort where the evidence points.
Monad has the property such a harness needs: cheap, parallel, public execution, so the judge can be a contract and a whole population can be judged at once.

## 2. Idea

**Blockwise** is a colony of small trading agents, a contract that keeps their score, and a place where you can put test MON behind the ones you believe in.

- A **strategy** is seven small integers: six weights on recent returns and one threshold. Small enough to evaluate inside the EVM.
- The **Evaluator** contract replays a frozen return series, walk-forward, in integer math, and returns a score in basis points. The **Ledger** stores every result and its lineage, write-once; only the Evaluator can write to it.
- **Proposers** (random, mutate, crossover, sweep) live off-chain and submit candidates. They cannot touch the score. A **Thompson-sampling bandit** allocates effort among them by how often their children *discover* something (beat a niche's elite or open a new niche), with credit passed back along lineage.
- Candidates live on a **map of niches** (style × activity). Each niche keeps its elite; the result is several hills, not one winner. We do not write strategies down: they are kept or dropped by what the ledger says they did.
- **Layers** spend effort where evidence points: every candidate gets a cheap dev look; each niche's elite gets one confirm look; the champion gets one sealed look, ever; and funded agents become the parents of the next generation.
- A **generation** is N `evaluate` transactions sent from many wallets at once. Monad executes independent transactions in parallel.
- **Funding**: bind a testnet wallet, deposit test MON into an escrow, allocate it to agents. It steers the next generation; the screen shows a *virtual* return; you can withdraw at any time. Real funds are roadmap, not v0.
- **Jev** is a *shadow judge*: for each candidate it predicts P(beats the champion), logged on-chain before the result exists; its authority is earned by measured calibration only.

The mechanisms (niche archive, Thompson allocation, lineage credit, path potential, the cascade of cheap-then-costly looks, look-once data roles, the authority ladder) are adapted from the
[ants](https://github.com/p-to-q/ants) research loop; Blockwise is its own project and shares no code with it. Detail: [architecture §3a](architecture.md).

## 3. Why Monad, and what we will not claim

What Monad gives us, concretely:

- **Parallel execution.** Hundreds of independent `evaluate` calls do not conflict (each writes a unique ledger slot), so a generation should land in a few blocks. We *measure and display* how many blocks it took; we do not assert it (assumption A1).
- **Cheap, fast blocks.** An evolving colony needs many round trips; sub-second blocks (documented at about 400 ms on mainnet; testnet block time to be measured) would make a generation a few seconds rather than minutes.
- **Public, ordered, append-only state.** "Whoever proposes does not score" becomes a property of the contract, and the evidence is readable by anyone, including the audience and other agents.
- **A natural home for shared memory** (the Ledger is the trail other proposers read), which is where the project can grow.

What we will **not** claim:

- That on-chain evaluation is *faster* than off-chain. A laptop evaluates a 7-parameter strategy in microseconds. The claim is about *verifiability and public parallel throughput*, not raw speed.
- That the evolved strategies make money. The series is synthetic (regime-switching returns, fixed seed). The point is the *process and its honesty*, including showing the sealed score when it disagrees with dev.
- That a funded agent earns anything. Funding is test MON in an escrow; the return shown is *virtual*; there is no payout; test MON has no value.
- That the sealed segment is secret. On a public chain data is public; "look once" is one *recorded* look per candidate. Commit-reveal is on the roadmap.
- That a summit exists or has been found. We report elites per niche and the gap to a ceiling proxy, which is a proxy.

## 4. What is new

- A judge/ledger split enforced by contract permissions rather than convention.
- A map of niches with elites, allocated by Thompson sampling on discovery with lineage credit, on a public ledger anyone can audit.
- Calibration of an AI judge measured on an append-only chain, with a prediction-before-result rule enforced on-chain (JudgeLog).
- A live demonstration of parallel EVM as an *evaluation farm*, with a wallet-funded steering mechanism on top.

## 5. Scope

**v0 (hackathon, must ship by 18:00 freeze):** Evaluator + Ledger on Monad testnet; wallet fan-out of ≥ 100 evaluations per generation; operators, niche archive and Thompson bandit; confirm and sealed looks; live view with the block-by-block grid and the map; replay;
the `Allocator` escrow with wallet connect, allocation and steering; the honest panel.

**v0 stretch:** JudgeLog and the Jev shadow judge with the live calibration meter; path potential; the ceiling proxy.

**After the hackathon:** see [roadmap.md](roadmap.md): commit-reveal sealed data, real market data, a live per-block stage, a live arena where champions paper-trade against the Kuru book (read-only, using the Jev Trader pipeline), multi-environment compute allocation, agent proposers that read the ledger, and real funds only after a real market, settlement, an audit and risk limits.

## 6. Success criteria

For the audience (a 30-second watch):

1. They see a population evaluated *in a few blocks*, with the block numbers on screen and links to the explorer.
2. They understand "the judge is a contract; the searcher cannot cheat; the result is a map, not one winner".
3. They see an honest result: a champion with dev, confirm and sealed scores, the elites per niche, a baseline it did or did not beat, and the gap to the ceiling proxy.
4. They can connect a wallet, fund an agent, and see what their allocation does (steering, virtual return), and withdraw.

For us (checked, not felt):

- ≥ 100 evaluations in one generation, with the distribution of landing blocks recorded.
- On-chain scores equal the off-chain mirror's scores on all golden vectors and on a spot-check of live results.
- Every number on screen can be traced to a transaction.
- The escrow returns every deposit to its depositor, in tests that include a reentrancy attempt and a fuzz.

## 7. Risks (and what we do about them)

| Risk | Mitigation |
|---|---|
| Public RPC rate limits throttle a burst of transactions | JSON-RPC batching, several endpoints round-robin, a dedicated provider key; measure first with 20 txs |
| Gas is charged on the gas **limit**, so a loose limit wastes funds | Measure `gasUsed`, set limit = used × 1.15; show gas spend live |
| A burst does not land in few blocks | Show the real distribution; the demo is honest either way; tune wallets and pacing |
| The evolved champion fails on sealed data | Show it. That is the design working |
| The bandit does no better than random at 2× | Report it with the same prominence ([benchmark](benchmark.md)) |
| Funding contract bug | Minimal escrow, tests with reentrancy and fuzz, testnet only, burner wallets, SECURITY says unaudited; cut order keeps it simple if time is short |
| Users read "funded" as "invested" | Labels: *virtual*, *test MON*, *no payout*, on every funding surface |
| Jev API unavailable or slow on the day | Shadow judge is optional; a mock model keeps the pipeline and UI identical, labelled "stand-in" |
| Testnet unavailable | Replay mode from a recorded run, clearly labelled |
