# Glossary

Plain words for people new to web3 or to this project.

| Term | Meaning here |
|---|---|
| **Ant / candidate / spec** | A trading strategy: seven small integers `[w0..w5, thr]`. "Spec" is the formal word, "ant" the friendly one |
| **Generation** | One batch of candidates evaluated at once (default ~200). Evolution is a sequence of generations |
| **Proposer / operator** | Off-chain code that invents candidates: `random`, `mutate`, `crossover`, `sweep` |
| **Portfolio / bandit** | The allocator that gives each operator a share of the next generation by Thompson sampling on its discovery rate, with descendant credit and a floor |
| **Niche / map** | One of nine cells defined by style (sign of the weights' sum: momentum, neutral, reversion) and activity (trades low, mid, high). The map is the set of niches |
| **Elite** | The best candidate in a niche (highest dev score). The result is the set of elites, not one winner |
| **Archive** | The niche map with its elites and lineage, rebuilt from Ledger events |
| **Discovery rate** | The fraction of an operator's proposals that beat their niche's elite or fill an empty niche. Drives the bandit |
| **Descendant credit** | Credit passed back along lineage to the operator that produced an elite's ancestors, discounted by distance |
| **Potential** | A niche's prospect from the velocity and acceleration of its best score; used only to allocate exploration |
| **Ceiling proxy** | The best score reachable by a large offline search with the TypeScript mirror; an altimeter, not a proof of optimality |
| **Allocator / funding** | The testnet escrow in which users deposit test MON and allocate it to agents; steers parents of the next generation; pays only the depositor |
| **Virtual return** | A display-only figure: allocation × the agent's confirm score; no payout exists |
| **Evaluator** | The judge contract: replays the frozen return series, returns a score in basis points. The only writer of the Ledger |
| **Ledger** | Append-only, write-once evidence store. Readable by anyone |
| **JudgeLog** | On-chain log of predictions by AI judges, accepted only before the result exists |
| **Epoch** | The identity of an experiment: series, split, cost, spec version. A different epoch is a different experiment; never compare across them |
| **Dev / confirm / sealed** | Data roles. Dev: searched on, many looks. Confirm: one recorded look per top candidate. Sealed: one recorded look for the champion |
| **Look** | An evaluation on a role's data that is recorded. "Look once" means one recorded look |
| **Cascade** | The funnel from many cheap looks (dev) to few expensive, rarer ones (confirm, sealed) |
| **Champion** | The best candidate by *confirm* score among the niche elites, frozen before its sealed look |
| **Basis point (bp)** | 1/100 of a percent. Returns and scores are integers in bp, so there is no floating point on-chain |
| **Shadow / advisory / delegated** | The three authority levels of an AI judge: logged only; may reorder; may skip with an exploration quota |
| **Brier score** | Mean squared error of probability predictions; lower is better; a base-rate predictor sets the bar to beat |
| **Fan-out** | Sending many transactions at once from many wallets |
| **Nonce** | A wallet's transaction counter. Transactions from one wallet execute in nonce order, so one wallet is not parallel |
| **Gas limit / gas used** | The cap you set vs what was consumed. **Monad charges on the limit**, so a loose cap wastes funds |
| **Parallel EVM** | Monad runs non-conflicting transactions in parallel and resolves conflicts; independent `evaluate` calls (unique slots) do not conflict |
| **Testnet / faucet** | A free-to-use copy of the chain for development; a faucet hands out test MON for gas |
| **eth_call** | A read-only simulation of a contract call: free, not recorded. Used for the dry-run `score(p)` |
| **SSE** | Server-Sent Events: a one-way stream from the orchestrator to the web page |
| **Replay** | Playing a recorded event stream through the same UI code, labelled as replay |
| **System One model (Jev)** | A model that returns typed decisions with probabilities quickly, with no free text. Here it is used as a shadow judge |
| **ants** | The earlier research-loop project this builds on: propose → judge → execute, with evidence the proposer cannot edit |
