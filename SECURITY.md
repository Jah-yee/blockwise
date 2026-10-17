# Security

Blockwise is a **testnet** hackathon project. v0 holds and moves **test MON only**, which has no value. It must never hold or move real funds.

## Keys

- Testnet private keys and mnemonics live **outside the repo**: `~/.blockwise/testnet.json` (mode 0600) or an untracked `.env`.
- `.env`, `*.key`, `keystore/`, `~/.blockwise/` contents are gitignored. Do not paste a key into an issue, a PR, a chat, a log or a screenshot.
- The orchestrator never prints a key or mnemonic. Logs show addresses only.
- If a key leaks: treat the address as burned, stop using it, move any funds, rotate. Testnet MON is free, but a leaked pattern is a bad habit.
- API keys (for example `TYPESAFE_AI_API_KEY`) are environment variables only, never committed.

## Wallets in the web view

- The web view never asks for, receives or stores a private key or mnemonic. Funding transactions are signed in the user's own wallet.
- Connect **a burner wallet** that holds only test MON. Do not connect a wallet that holds anything of value, even to a testnet page.
- The view requests only the chain id and account address, and asks the wallet to switch to Monad testnet (chain id 10143). It refuses to send on any other chain.
- Every funding action shows the contract address, the amount and the function in plain words before the wallet prompt, and says *test MON, virtual return, no payout*.

## Scope

- **Do not run anything in this repo against Monad mainnet.** The deploy, fan-out and funding tools refuse chain ids other than 10143 unless `BLOCKWISE_ALLOW_OTHER_CHAIN=1` is set deliberately.
- The jev-trader project this work learns from trades real funds on mainnet. We do not.
- **Real funds are out of scope for v0** and are a roadmap item that requires a real market, settlement, an independent audit and risk limits. Nothing in this repository is a custody, investment or advice product.

## Contracts (v0 limits, stated)

- Unaudited. Permissions are minimal by design (only the bound Evaluator writes the Ledger; one-time `bind`), but a second review is on the roadmap (#28).
- The planned `Allocator` is an **escrow**: it holds deposited test MON and per-agent weights, pays only the depositor, never another user, and `withdraw` must always work. It has no owner withdrawal, no admin pause that traps funds, no upgrade proxy, and no oracle. Required tests before it is deployed: only-depositor payout, withdraw at any time, reentrancy attempt, and a fuzz of deposit/allocate/reallocate/withdraw sequences (roadmap).
- The sealed return segment is public on-chain data; "look once" limits *recorded* looks, it does not provide secrecy (commit-reveal planned).
- `Evaluator.evaluate` is callable by anyone and writes a slot keyed by the caller; this is intended and bounded by gas.
- Virtual returns shown in the UI are computed off-chain from a synthetic series and are not backed by any payout.

## Reporting

Open a GitHub issue for non-sensitive problems. For anything involving a leaked secret, contact a maintainer directly rather than posting details.
