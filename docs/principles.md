# Principles

Blockwise inherits the discipline of [ants](https://github.com/p-to-q/ants) and the lessons of the Meta-Harness line of work. A principle
that names no enforcement point is a wish and does not belong here. Each entry says what it forbids and where it is enforced.

| # | Principle | Forbids | Enforced by |
|---|---|---|---|
| 1 | **Whoever proposes does not score.** Proposers submit specs; only the judge computes and records scores. | A proposer writing, editing or deleting a score | `Ledger.onlyEvaluator`; `Ledger.bind` is one-time; proposers have no write path to the Ledger's storage (only `onlyEvaluator` functions write it) |
| 2 | **The spec grammar is the only door.** Out-of-range specs revert; they are never clamped or repaired. | Out-of-grammar or malformed candidates entering the evidence | `Evaluator._validate` (weights in [-64, 63], threshold in [0, 8191]) |
| 3 | **A limit is a wall, not a price.** Ranges and gas limits constrain the search; they are not terms in the objective. | Trading limit violations off against score | `BadParam` reverts; fixed per-tx gas limit; no penalty terms in the score |
| 4 | **Evidence is append-only and carries its identity.** Every record is write-once, in an `epoch` (series, split, cost, spec version). Results from different epochs are never mixed. | Updating or deleting evidence; comparing across epochs | `Ledger` write-once slots; `Evaluator.epoch`; UI and tools key on epoch |
| 5 | **Look once.** Data has a role: dev (many looks), confirm (one recorded look per candidate), sealed (one recorded look per candidate, by its proposer). | Tuning on confirm or sealed data; spending a look twice | `Ledger.recordConfirm/recordSealed` write-once; `Evaluator._bound` binds a look to the evaluated params and to the proposer |
| 6 | **Many comparisons demand a larger doubt.** A search that tries thousands of candidates will find lucky ones. | Declaring a dev winner without a held-out check | Cascade: only top-k by dev get a confirm look; champion is chosen on confirm, not dev; sealed is reported next to dev |
| 7 | **A clever proposer must beat a cheaper one at equal budget.** Every operator, and the portfolio itself, is compared with random search at the same (and at 2×) evaluation budget, over several seeds, reporting medians. | Believing an operator because it looked good once | Offline benchmark with the conformance-tested mirror (`packages/core`); the UI shows the baseline curve |
| 8 | **Judges earn authority.** A non-deterministic judge (Jev, an LLM) starts in *shadow* (logged, not acted on), becomes *advisory* (may reorder), then *delegated* (may skip, with an exploration quota) only by measured calibration. It never overrides integrity or the sealed look. | Trusting a model because it sounds right | `JudgeLog` refuses a prediction once the result exists; calibration is computed from `JudgeLog` + `Ledger` |
| 9 | **Judge the path, not only the point, and keep several hills.** Keep lineage (operator, parent). Credit operators by discovery rate with credit passed back along lineage, not by one lucky child. Keep an elite per niche, not one winner. | Allocating budget by the single best score; a monoculture | `Meta{operator,parentGen,parentIdx}` in every evaluation; niche archive and Thompson allocation in `packages/core` (architecture §3a) |
| 10 | **Failure is a normal outcome.** Reverts, dropped txs and RPC errors are recorded and survivable; the orchestrator resumes from chain state without double counting. | Treating a revert as an exception; losing a generation to one bad RPC | Idempotent `(proposer, gen, idx)` keys; `AlreadyRecorded` is a normal result; orchestrator rebuilds state from events |
| 11 | **Say what it is.** A check that was not run is written "not run", with the reason. Stand-in models are labelled. Replays are labelled. Sealed data is public on a public chain; say so. | Overclaiming; hiding a loss; passing a mock off as Jev | UI badges; `docs/` limits sections; PR template asks for "Not run" |
| 12 | **Start small, then scale.** Seven integers, one series, one contract set today. Scale comes from configuration (more wallets, more series, more environments), not a rewrite. | Premature generality | Epoch-based design: a new series or spec version is a new deployment, not a migration |

## Lessons we take from Meta-Harness (and where they show up)

- **Give the proposer the raw history, not a summary.** The Ledger and its events are the experience; an agent proposer reads them directly (roadmap: agent proposer).
- **Constrain outputs and safety, not the diagnosis procedure.** Proposers are free in *how* they search, strict in *what* they may emit (the grammar).
- **Evaluate outside the proposer.** The judge is a different party (a contract); a proposer cannot reach it.
- **Prefer single-mechanism, additive changes.** One operator change per experiment, measured against the control.
- **Log everything in a navigable format.** Events carry gen, idx, operator, parent; the replay recorder writes JSONL.

## Taste

A table before a paragraph, a number before an adjective. Every general statement is followed by a number, a file or a test.
Printable output. Plain names. If a module needs a diagram to be understood, split it.
