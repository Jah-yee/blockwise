# Using a Jev key with Blockwise

The Jev judge is **optional**. Without a key everything works; the judge is then the deterministic **stand-in** and every surface says `stand-in`.

## Where to get a key

Jev is TypeSafe's model, called through the TypeSafe AI API (`https://api.typesafe.ai/v1`, the same API the Jev Trader project uses via `@ai-sdk/typesafe-ai`).
Request an API key from TypeSafe (their site / account page; we do not issue keys and cannot get one for you). Treat it as a password.

## Setting it

| What | How |
|---|---|
| Key | `export TYPESAFE_AI_API_KEY=...` in your shell (not in a repo, not in a command line argument) |
| Model | `export JEV_MODEL_ID=jev-latest` (default `jev-latest`; the API also lists pinned ids such as `jev-1.14.0`) |
| Base URL (rare) | `TYPESAFE_AI_BASE_URL` (default `https://api.typesafe.ai/v1`; used for tests against a local mock) |
| Prices for the cost counter | `JEV_USD_PER_MTOK_IN`, `JEV_USD_PER_MTOK_OUT` (default 0.042 USD per million tokens for both; the output price is an assumption) |

Optional helper: `blockwise init` writes `~/.blockwise/config.json` (mode 0600) with the RPC URL and Jev model. The key is read from the environment, or from stdin with `--key-stdin`, never echoed, and **never written to config.json**.
Only with `--save-key` is it kept, alone, in `~/.blockwise/jev.key` (mode 0600). Environment variables always win over files.

```bash
printf '%s' "$TYPESAFE_AI_API_KEY" | blockwise init --key-stdin --save-key --yes
blockwise run --judge jev --yes
```

## What it is used for

Before a generation's candidates are sent to the chain, up to 20 of them are put to Jev as one typed yes/no question: "will this candidate's dev score exceed the threshold (the champion's score so far)?". The answer is a probability, kept in basis points, in a `judge` event.
The prompt contains the candidate's seven integers, its operator, the threshold and recent best scores. It contains no key, no address, no environment.

## What it can NOT do

- It never signs or sends a transaction, and has no access to a wallet, mnemonic or RPC.
- It never changes a score, the order of candidates, the search or the sealed look. Authority is **shadow**: predictions are displayed and scored (Brier vs the base rate) afterwards, nothing more.
- A prediction is not written on-chain (the `JudgeLog.predict` path is off by default).
- It cannot stall a run: each prediction has a hard deadline (default 8 s, `--judge-timeout SECONDS`, covering retries), at most 4 run in parallel, and one batch deadline per generation. A failure is a **miss**: counted, shown as an `error` event (scope `judge`) with the reason, and the generation goes on. Misses are not hidden, because skipped predictions would bias calibration.

## Cost

One call is roughly 300 to 600 input tokens. At the assumed 0.042 USD per million tokens that is about 0.00002 USD per prediction, so 20 per generation over 10 generations is a few hundredths of a cent. The running total is `jevUsd` in the `totals` event (computed from the token counts the API returns). Real price and limits are TypeSafe's; check your account. **Not run: real Jev API** in this repository's tests (a local mock server covers the client).

## If something is wrong

| Message | Meaning |
|---|---|
| `--judge jev needs TYPESAFE_AI_API_KEY ... using the stand-in` | no key found; the run continues with the labelled stand-in |
| `jev judge missed N/M predictions (timeout 3, http 2)` | those candidates have no prediction; HTTP 401/403 means check the key |
| judge events say `stand-in` | no real call produced them |
