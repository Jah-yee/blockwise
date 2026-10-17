# FAQ

Objections we expect, and the honest answers. Modelled on [ants `docs/faq.md`](https://github.com/p-to-q/ants/blob/main/docs/faq.md).

**Why put the judge on a blockchain? A laptop evaluates seven integers in microseconds.**
Correct, and we do not claim on-chain is faster. We claim three other things: the separation "whoever proposes does not score" becomes a permission anyone can check (only the bound Evaluator can write the Ledger); the evidence is public and ordered, so other agents and the audience can read it; and a generation of evaluations is a live, measurable demonstration of Monad's parallel execution. If nobody needs a public judge, the on-chain part is a demo, and [open question 6](open.md) says so.

**Are the strategies profitable?**
No claim. The series is synthetic (seeded regime-switching returns), the strategy family is deliberately tiny, and costs are a fixed 3 bp. The point is the process and its honesty, including showing the sealed score next to dev.

**Isn't the sealed data public, then? It is on a public chain.**
Yes. "Look once" is enforced as one *recorded* look per candidate, not as secrecy. A commit-reveal scheme is planned ([open question 7](open.md)); until then, nobody should read the sealed segment's score as secret.

**Could you rig the series so the search looks good?**
We could, by choosing the seed and regimes. That is why the generator and seed are fixed and public (`data/series/v1.json`), the benchmark is [pre-registered](benchmark.md), random search at 2× is the bar, a shuffled-series negative control is planned, and the sealed number is on screen.

**What is Jev doing here, and does it help?**
It is a shadow judge: it predicts, before evaluation, whether a candidate will beat the current best; the prediction is logged on-chain before the result exists; calibration is computed from the log. It starts with no authority and earns it only by measured calibration. It may be no better than the base rate; if so, we show that ([jev.md](jev.md), [open question 5](open.md)).

**Why not just use Jev Trader?**
Jev Trader trades real funds on mainnet with one model and one decision per block. It is a fine demo of fast typed decisions. We reuse its ideas (typed question, dry-run, honest dashboard, SSE) and add what it lacks: memory across decisions, retirement of bad ideas, and a measure of whether the model's calls are any good. We do not trade, and we do not touch mainnet.

**Is it really "a few blocks"?**
Unknown until test A1 runs ([open question 1](open.md)). The screen shows the measured landing blocks; if the burst spreads, that is what is displayed.

**Why seven integers and not a neural net?**
Integers keep the judge exact, cheap and trivially mirrored (golden vectors). It is a tiny model in the ants sense. A different family is a new epoch and a new Evaluator, via a [domain contract](contracts.md).

**How is this related to ants?**
ants is the research loop in Python (propose, judge, execute; the proposer cannot edit the evaluator). Blockwise is the same discipline with the judge and ledger on Monad. See [principles.md](principles.md).

**Can I put real money behind an agent?**
Not in v0. Funding is test MON in a testnet escrow; the return shown is *virtual* (computed from a synthetic series), nothing is paid out, and test MON has no value. Real funds need a real market, settlement, an independent audit and risk limits, which are roadmap items, not promises.

**What does funding actually do, then?**
It steers: funded agents become parents of the next generation in proportion to the allocation (a capped share). You can withdraw at any time; the escrow pays only the depositor.

**Is this ants?**
No. It adapts ants' mechanisms (niche archive, Thompson allocation, lineage credit, path potential, cheap-then-costly looks, look-once data) to a chain and to trading agents, and credits it. It shares no code with it.

**Who can write to the Ledger?**
Only the Evaluator (bound once). Anyone can call `evaluate` and get a record under their own address; nobody can write a score directly.

**Can I add my own proposer?**
Yes: anything that emits specs inside the grammar can call `evaluate` from its own wallet. Roadmap v1.0 makes this a documented interface.
