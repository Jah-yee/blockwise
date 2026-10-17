# Contributing

Welcome. This is a hackathon project that we intend to keep, so the rules are light but real.

## Read first (10 minutes)

1. [docs/proposal.md](docs/proposal.md): what and why.
2. [docs/principles.md](docs/principles.md): the rules the code enforces.
3. [docs/architecture.md](docs/architecture.md): especially §1 (the spec of record) and §5 (the event contract).
4. [docs/roadmap.md](docs/roadmap.md): pick an issue; today's timeline and workstreams are there.

## Setup

```bash
bun install
cd contracts && forge install && forge build && forge test && cd ..
bun test packages/core
```

Requirements: Bun ≥ 1.1, Foundry ≥ 1.8 (solc 0.8.28 is fetched by Foundry), git. On networks with a proxy, set `HTTPS_PROXY`.

## Workflow

- Branch from `main`: `feat/<area>-<short>`, `fix/<area>-<short>`, `docs/<short>`. One issue per PR where possible.
- **Conventional Commits** with an area scope: `feat(contracts): ...`, `fix(chain): ...`, `docs(roadmap): ...`.
- Open a PR early (draft is fine). CI runs `forge test`, `bun test`, and the typecheck. Keep the PR template's checklist honest.
- Do not force-push shared branches. Do not push to `main` directly once CI exists.
- Squash-merge, with the issue linked.

## Ownership boundaries (to avoid stepping on each other today)

| Area | Path | Rule |
|---|---|---|
| contracts | `contracts/` | Changing scoring semantics bumps `SPEC_VERSION` and updates `docs/architecture.md` §1 and `data/golden.json` in the **same PR** |
| core | `packages/core/` | **No I/O, no chain, no `viem`.** Must run under `bun test` and in a browser |
| chain | `packages/chain/` | Depends on core and viem; no UI code |
| orchestrator | `apps/orchestrator/` | Emits only events defined in `packages/core/src/events.ts` |
| web | `apps/web/` | Consumes only that event stream; must work from a recorded JSONL |
| docs | `docs/` | Facts about Monad go in `monad-notes.md` as **measured / documented / assumed** |

If you need to change an interface that another area depends on (the event schema, the ABI, the spec), open an issue first and tag the owners.

## Code conventions

- TypeScript strict; `noUncheckedIndexedAccess` is on. Bun for runtime and tests; viem (not ethers) for chain access.
- Solidity 0.8.28, `via_ir`, NatSpec on every external function, custom errors, no loops that depend on user-controlled length in the hot path.
- Prefer a table before a paragraph and a number before an adjective, in docs and in code comments. Comment *why*, not *what*.
- Deterministic where it can be: seeded RNGs only; no `Math.random()` in `packages/core`.
- Never swallow errors silently. A revert or a dropped tx is data: record it and surface it.

## Tests

- **Contracts:** Foundry tests in `contracts/test/`. Every revert path has a test. Run `forge test --gas-report` for changes to `evaluate`.
- **Core:** `bun test packages/core`. Property tests for operators (always valid specs). Golden vectors for the mirror.
- **Conformance:** `data/golden.json` is produced by `bun run gen:golden` from the TypeScript mirror and consumed by the Solidity test. A failure means the two implementations disagree; the spec of record is `docs/architecture.md` §1.
- **Not run?** Write "Not run: reason" in the PR. Never claim a check you did not run.

## Secrets and funds

Testnet keys only, and **never** in the repo, in issues, in PRs, in logs or in screenshots. See [SECURITY.md](SECURITY.md). Use `.env` (gitignored) or `~/.blockwise/testnet.json` (mode 0600).
Do not run anything in this repo against Monad mainnet.

## Docs decisions

Significant choices go in `docs/decisions/NNNN-title.md` (context, decision, consequences). Superseded decisions stay, marked superseded.

## Code of conduct

Be kind, be specific, assume good faith. Disagree about ideas, not people. Credit others' work. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) 2.1.
