# CLI reference

Status: **planned**. Nothing here is implemented; this is the interface the code will be written to, modelled on the
[ants CLI](https://github.com/p-to-q/ants/blob/main/docs/cli.md): read commands first, `--json` everywhere, meaningful exit codes, so a person or another agent can drive it.
When a command ships, its row in [surfaces.md](surfaces.md) moves to `experimental` with the test that ran.

The binary is `blockwise` ([decision 0007](decisions/0007-name-and-positioning.md)). Run through Bun until packaged: `bun run orch <command>`.

```bash
blockwise <command> [flags]
blockwise              # no command: the terminal interface on a terminal (tui.md), the line shell in a pipe; onboarding the first time
blockwise --version
```

## Principles

1. **Reads are free and safe.** `status top best show diff log epochs judge sql export` never send a transaction and never write to the chain; they read the local mirror or the chain.
2. **Anything that spends gas says so first.** `smoke`, `run`, `wallet fund`, `freeze`, `seal` print the budget (`txs × gasLimit × price`), refuse if the wallet cannot cover it (exit 4), and need `--yes` unless run from the interactive interface.
3. **Testnet only.** Every command that signs refuses a chain id other than 10143 unless `BLOCKWISE_ALLOW_OTHER_CHAIN=1` (exit 5).
4. **Secrets are never printed.** Addresses yes, keys and mnemonics no, in output, logs and JSON.
5. **The chain is the source of truth; the mirror is a projection.** A local SQLite file (`mirror.sqlite`) caches events for speed and queries; `blockwise doctor` can rebuild it from the chain.
6. **A failure is a normal outcome.** A revert or a dropped tx is data: it is counted, shown and exits 0 unless the command's goal failed.

## Common flags

| flag | default | meaning |
|---|---|---|
| `--domain PATH` | resolved | domain contract ([contracts.md](contracts.md) Part B) |
| `--workdir DIR` | resolved | holds `mirror.sqlite`, `blockwise.lock`, `runs/*.jsonl`, `PAUSE` |
| `--chain NAME` | `monad-testnet` | named chain config (chain id 10143) |
| `--epoch HEX` | the deployment's epoch | filter reads to one epoch (never mixed) |
| `--json` | off | machine output on read commands and `doctor`, `judge`, `bench` |
| `--yes` | off | confirm a spending command non-interactively |
| `--seed N` | 0 | used by `run`, `bench` |

## Flag-less resolution

First match wins; what was filled in is printed to stderr as `using domain=... workdir=... chain=...` (suppressed by `--json`).

| item | 1 | 2 | 3 | fallback |
|---|---|---|---|---|
| domain | `--domain` | `$BLOCKWISE_DOMAIN` | `[run] domain` in `~/.blockwise/config.toml` | `domains/trading-v1.toml`, else exit 1 `no domain found` |
| workdir | `--workdir` | `$BLOCKWISE_WORKDIR` | `[run] workdir` in the config | newest `runs/*/mirror.sqlite`, else `runs/default` |
| secrets | `~/.blockwise/testnet.json` (mode 0600) | `$MNEMONIC` | none | exit 1 `no wallet; run blockwise onboard` |

## Exit codes

| code | when |
|---|---|
| 0 | success (also `run` that stopped for any reason: budget, signal, pause) |
| 1 | reference not found (`show`), no domain, no wallet, other usage error |
| 2 | `doctor`: any FAIL; `status`: mirror disagrees with chain; epoch mismatch with the deployment |
| 3 | `run`: another `run` holds `<workdir>/blockwise.lock` (message names its pid) |
| 4 | a spending command refused: the wallet cannot cover the budget |
| 5 | wrong chain id for a signing command |

## Commands

| command | purpose | writes? | spends gas? |
|---|---|---|---|
| `onboard` | create `~/.blockwise`, generate or import a testnet mnemonic, show the funding address, write `config.toml`, derive worker addresses | `~/.blockwise` | no |
| `doctor` | health check (below) | no | no |
| `wallet` | `status` (balances), `fund` (distribute MON to workers), `sweep` (return it) | chain (`fund`, `sweep`) | yes |
| `deploy` | deploy Ledger, Evaluator, bind, JudgeLog; write `config/deployments.testnet.json` | chain, file | yes |
| `smoke` | N txs from K workers; prints the landing-block histogram, gas used, latency (assumptions A1 to A6) | chain, `runs/` | yes |
| `run` | the generation loop; emits the event stream; `--gens`, `--per-gen`, `--workers`, `--arm portfolio\|random\|mutate…`, `--judge off\|stand-in\|jev` | chain, mirror, `runs/*.jsonl` | yes |
| `status` | counts, epoch, chain head, mirror vs chain check (JSON) | no | no |
| `top` | live dashboard / whole state as JSON (`--once --json`) | no | no |
| `best` | leaderboard with dev, confirm, sealed side by side | no | no |
| `show REF` | one candidate (`GEN:IDX` or tx hash): spec, tx, scores, lineage, judge prediction | no | no |
| `diff A B` | what differs between two candidates (params, scores, lineage) | no | no |
| `log` | recent events (`-n 50`) | no | no |
| `epochs` | every epoch seen: deployment, dates, candidates | no | no |
| `map` | the niche map: elites, labels, discovery rates, diagnostics, ceiling proxy; `--json` | no | no |
| `fund` | `--suggest` prints the suggested split (read-only); `--status` shows allocations. Allocating itself is signed in the web view, not here | no | no |
| `ceiling` | run the offline ceiling-proxy search with the mirror; writes `docs/results/` with `--out` | `--out` | no |
| `judge` | calibration report: Brier vs base rate, reliability table, authority level; `--json` | no | no |
| `bench` | offline equal-budget comparison with the TypeScript mirror: portfolio vs random 1× and 2×, many seeds, medians and IQR | `docs/results/` with `--out` | no |
| `freeze` | freeze the champion (recorded off-chain with its params hash; required before `seal`) | mirror | no |
| `seal` | spend the one sealed look for the frozen champion | chain | yes |
| `replay FILE` | stream a recorded JSONL through the same event path, labelled replay | no | no |
| `serve` | start the SSE endpoint and the web view (`--port`) | no | no |
| `ui` / `home` | the terminal interface / one screen printed and exit ([tui.md](tui.md)) | no | no |
| `sql` (alias `query`) | one read-only SELECT over the mirror; `--format table\|json\|jsonl\|csv`, `--schema` | no | no |
| `export` / `workspace --out DIR` | the mirror as plain files (`candidates.jsonl`, `frontier.json`, `failures.jsonl`, `SKILL.md`) for an agent or `grep` | `--out` | no |
| `hint TEXT` | note for proposers (never changes a gate or a budget) | one local event | no |
| `pause` / `resume` | create / delete `<workdir>/PAUSE`; the loop finishes its step and idles | flag file | no |

### doctor

Checks, each OK / WARN / FAIL, `--json` available, exit 2 on any FAIL:

| check | FAIL when |
|---|---|
| tools | Bun < 1.1 or Foundry missing |
| wallet | secrets file missing, or its mode is not 0600 |
| chain | RPC unreachable, or chain id ≠ 10143 |
| funds | the master wallet cannot cover the configured run budget |
| deployment | addresses missing, no code at an address, or `Ledger.evaluator` is not the Evaluator |
| epoch | the deployment's `epoch()` differs from the one computed from `data/series/v1.json` |
| conformance | `data/golden.json` disagrees with the TypeScript mirror (and, when `forge` is present, with the Solidity test) |
| mirror | `mirror.sqlite` disagrees with chain events (WARN: rebuildable with `blockwise status --rebuild`) |
| judge | `TYPESAFE_AI_API_KEY` set but the model is unreachable (WARN: falls back to `stand-in`, labelled) |
| rpc | one of the configured endpoints errors or exceeds the rate cap in a short probe (WARN) |

### run

```bash
blockwise run --gens 10 --per-gen 200 --workers 20 --arm portfolio --seed 1 --judge stand-in --yes
```

Behaviour (to be verified by tests, not yet true): one `run` per workdir (`flock` on `blockwise.lock`; a second exits 3). Before starting, the budget is printed and checked.
SIGTERM and SIGINT set a stop flag: the current generation's in-flight transactions are awaited and recorded, nothing half-recorded is invented, the next start resumes from chain state.
Stdout is the last step result (`budget`, `idle`, `paused:user`, `done:<gen>`).

### Output conventions

Plain tables, numbers before adjectives, no ANSI colour in pipes. `--json` returns one object per command with stable keys; fields added later never change an existing key's meaning.
Reference formats: candidate `GEN:IDX` (proposer implied by the wallet set), tx `0x…`, block `n`.

## For other agents

Every read command has `--json` and meaningful exit codes. `blockwise top --once --json` (whole state), `best --json`, `show REF --json`, `log -n 50 --json`, `judge --json`, `doctor --json`.
`workspace --out DIR` writes the history as files for an agent that prefers `grep` over an API (the Meta-Harness way, see [principles](principles.md)). Controls: `hint`, `pause`, `resume`.
An agent must not write to the mirror directly, and must never be given a key; spending commands need `--yes` and a human-held wallet.
