# Monad notes: what we rely on, and how we verify it

Rule: a fact is either **measured** (we ran it, with the date), **documented** (a source says so, link it, we have not confirmed), or **assumed** (we need
it to be true; there is a test that settles it). Never write an assumption as a fact.

## Measured (2026-10-17, public testnet RPC `https://testnet-rpc.monad.xyz`)

| Fact | Value | How |
|---|---|---|
| Chain id | 10143 (`0x279f`) | `eth_chainId` |
| Block gas limit | 150,000,000 | `eth_getBlockByNumber("latest")` |
| Base fee | 100 gwei (looks like a floor) | same block |
| `eth_gasPrice` | ~102 gwei | `eth_gasPrice` |
| `eth_maxPriorityFeePerGas` | 2 gwei | `eth_maxPriorityFeePerGas` |
| Public RPC reachable | yes, intermittently from this network (SSL resets seen) | repeated calls |

## Documented (Monad docs and Jev Trader's repo; not yet confirmed by us)

| Claim | Source | Why we care |
|---|---|---|
| Gas is charged on the **gas limit**, not gas used | Monad docs, "Differences from Ethereum" / "Gas on Monad"; also stated in jev-trader's `.env.example` | Loose limits waste funds; measure `gasUsed` and set limit = used × 1.15 |
| Mainnet: 200M block gas limit, 500M gas/s, 400 ms blocks | Monad docs (search snippet; page fetch failed from this network) | Capacity of a generation per block. Testnet limit is 150M, measured above |
| jev-trader quotes ~300 ms blocks | jev-trader `SPEC.md` | Conflicts with the 400 ms figure; **measure block timestamps ourselves** |
| Public mainnet RPC rate cap ~25 rps | jev-trader `.env.example` comment | A burst of hundreds of sends will hit this; testnet cap unverified |
| Monad base fee floor 100 gwei; priority fee hardcoded at 2 gwei | jev-trader `.env.example` | Matches what we measured on testnet |
| Parallel (optimistic) execution; asynchronous execution decoupled from consensus | Monad docs | Basis of the "a generation lands in a few blocks" demo |
| EVM-compatible; Solidity toolchain mostly reusable | Monad docs, event page | We use Foundry; evm_version `cancun` |

Sources to re-read before relying on any of the above: `docs.monad.xyz` (developer-essentials: differences, gas on Monad, testnet), the
Monad Blitz workshop material, and `github.com/jarrodwatts/jev-trader` (`SPEC.md`, `.env.example`, `src/chain.ts`, `src/market.ts`, `scripts/probe-rpc-caps.ts`,
which probes RPC limits and is worth running against testnet).

## Assumed, with the test that settles each

| # | Assumption | Test | Pass condition |
|---|---|---|---|
| A1 | N independent `evaluate` txs from K wallets land in few blocks | `bun run orch smoke --txs 20 --workers 10`, then 100, then 200 | Landing-block histogram recorded; span reported (we do not pre-judge the number) |
| A2 | An `evaluate` call costs ~200k to 300k gas | `forge test --gas-report`; then live `gasUsed` | Measured; set `GAS_LIMIT` = max(gasUsed) × 1.15 |
| A3 | Evaluations do not conflict (unique slots) so there is no re-execution slowdown | Compare landing spread with and without ledger write (A/B) | No significant difference; if there is, note it |
| A4 | Public RPC accepts JSON-RPC batches of ~50 sends | probe batch size 10, 25, 50, 100 | Largest size without errors; otherwise multiple endpoints |
| A5 | The faucet gives enough MON (reported: 100 per claim, more later) | Check wallet balance after claim | Budget = evals × gasLimit × gasPrice fits balance |
| A6 | A wallet can hold many pending txs with pre-assigned nonces | Send 10 per wallet without waiting | All included, in nonce order |
| A7 | `eth_call` of `score(p)` is cheap enough for pre-screens | Time 100 calls | p50 < 100 ms |

Record results as dated rows in the "Measured" table above. If an assumption fails, change the design (more endpoints, fewer wallets, smaller N), not the claim on screen.

## Gas budget worked example (to be replaced by measured numbers)

Let `G` = gas limit per evaluation (guess 300,000), price 102 gwei:

- one evaluation reserves `G × price` = 0.0306 MON;
- a generation of 200 evaluations reserves ≈ 6.1 MON;
- 100 MON from one faucet claim funds ≈ 16 generations of 200, before confirm/sealed calls and funding transfers.

Because Monad charges on the limit, the reserve *is* the cost. Tightening `G` from 300k to a measured 230k cuts it by about a quarter.

## Network and tooling facts

- Testnet RPC: `https://testnet-rpc.monad.xyz` (also tried: Ankr `https://rpc.ankr.com/monad_testnet`, dRPC `https://monad-testnet.drpc.org`, both answered `eth_chainId`).
- Explorer: the base URL lives in `config/deployments.testnet.json` (read by `packages/chain`), not hard-coded in the UI; verify before the demo that tx links resolve.
- Foundry 1.8.5, solc 0.8.28, `via_ir = true` (needed: stack depth in the evaluation loop).
- This network blocks or resets some TLS connections intermittently; use the configured proxy where needed and retry reads; never retry a send blindly (nonce).
