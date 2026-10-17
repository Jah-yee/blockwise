# Operations

How to run it, what it costs, and what breaks. Status: **planned**; every number below that is not marked measured is a guess to replace
([monad-notes.md](monad-notes.md)). Modelled on [ants `docs/operations.md`](https://github.com/p-to-q/ants/blob/main/docs/operations.md).

## Before a run

| Step | Command | Pass condition |
|---|---|---|
| Wallet | `blockwise onboard` | `~/.blockwise/testnet.json` exists with mode 0600; address printed |
| Fund | faucet (event page), then `blockwise wallet status` | balance covers the run budget (below) |
| Deploy | `blockwise deploy` | three addresses in `config/deployments.testnet.json`; `doctor` deployment check OK |
| Health | `blockwise doctor` | no FAIL |
| Smoke | `blockwise smoke --txs 20 --workers 10`, then 100 | landing histogram recorded in monad-notes; `GAS_LIMIT` set from measured `gasUsed` |

## Budget

Monad charges gas on the **limit**, so the limit is the cost. At the measured testnet base fee floor (100 gwei) and an assumed 300,000 gas limit per evaluation:

| Item | Formula | Example |
|---|---|---|
| One evaluation | `gasLimit × (baseFee + priority)` | 300,000 × 102 gwei = 0.0306 MON |
| A generation | evaluations × the above | 200 → 6.1 MON |
| Confirm looks | top-k per generation, same cost | 8 → 0.24 MON |
| Funding the workers | one transfer per worker (21,000 gas each, plus the amount) | 20 workers → ~0.04 MON of gas |
| A 10-generation run | 10 × (6.1 + 0.24) + funding | ≈ 64 MON |

The faucet reportedly gives 100 test MON per claim, with more later; the first run therefore fits in one claim with margin. `run` prints this budget and exits 4 if the wallet cannot pay it.
Tightening the limit to a measured need is the cheapest saving.

## Files and where state lives

| Path | What | Source of truth? |
|---|---|---|
| chain (Ledger, JudgeLog, events) | evidence | **yes** |
| `config/deployments.testnet.json` | addresses, explorer URL | yes for addresses |
| `~/.blockwise/testnet.json` | mnemonic (0600) | secret, never in the repo |
| `runs/<name>/mirror.sqlite` | projection of chain events | no: rebuildable |
| `runs/<name>/*.jsonl` | recorded event stream (replay) | no |
| `runs/<name>/blockwise.lock`, `PAUSE` | single-instance lock, pause flag | no |

## Failure modes

| Failure | Symptom | Response |
|---|---|---|
| RPC rate limit or reset (seen from this network) | sends error, receipts late | batch sends, rotate endpoints, retry **reads**; never blind-retry a send (nonce): re-derive pending state from the chain |
| A transaction reverts (`AlreadyRecorded`, `BadParam`) | `tx_landed.status = reverted` | counted and shown; `AlreadyRecorded` after a resume means "already done", not an error |
| A transaction is dropped | no receipt after a bounded number of blocks | status `lost`, counted; resend with the same nonce only after checking the chain |
| Wallet out of funds mid-run | sends fail | stop the generation, show "Running low on funds"; `run` resumes after funding |
| Process killed | partial generation | restart: state is rebuilt from chain events (principle 10); a generation is complete when all its `(gen, idx)` keys are recorded or accounted for |
| Mirror disagrees with chain | `doctor` WARN, `status` exit 2 | `blockwise status --rebuild` |
| Testnet down on demo day | no blocks | switch to `replay` of a recorded run, badge visible, say so |
| Jev unavailable | judge calls fail | run continues with the labelled `stand-in`; nothing in the search depends on it |

## Demo-day checklist

1. Funded wallet with a margin of at least 50%; workers funded; `doctor` green on the machine that will present.
2. A recorded replay of a full run saved (`runs/<name>/*.jsonl`) and verified to play.
3. Three screenshots taken for the submission (the grid mid-generation, the champion panel, the tape with an explorer link).
4. Explorer links resolve; block numbers on screen match the explorer.
5. Network plan B: phone hotspot; RPC endpoints list tested from the venue network.
6. Freeze at 18:00; tag the commit; nothing else changes.
