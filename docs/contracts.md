# Contract reference

The word "contract" means two different things in this project. Both are specified here.

| Term used in these docs | Meaning | Where |
|---|---|---|
| **smart contract** (or the contract by name: Ledger, Evaluator, JudgeLog) | Solidity code deployed on Monad | Part A |
| **domain contract** | The ants-style declaration of a task domain: typed space, caps, data roles, cascade, budgets, chain settings. Same role as [ants `contracts.md`](https://github.com/p-to-q/ants/blob/main/docs/contracts.md) | Part B |

In ants a new domain is a *gym* plus a *contract*. Here the gym is the Evaluator smart contract and the contract is the domain contract file.
Status of everything below: see [surfaces.md](surfaces.md). The Solidity sources compile and have **not** been tested yet.

---

## Part A. Smart contracts (`contracts/src/`)

Solidity 0.8.28, `via_ir`, EVM `cancun`. Deployment order: `Ledger` → `Evaluator(ledger, returns, devEnd, confirmEnd)` → `ledger.bind(evaluator)` → `JudgeLog(ledger)`.

### Ledger

Append-only evidence store. Every write is once-only; there is no update and no delete.

| Function | Who | Effect | Reverts with |
|---|---|---|---|
| `bind(address evaluator)` | deployer, once | Sets the only address that may write | `NotOwner`, `AlreadyBound` |
| `recordDev(key, proposer, dev, trades, operator, paramsHash)` | Evaluator | Writes the dev record for `key` | `NotEvaluator`, `AlreadyRecorded` |
| `recordConfirm(key, score, trades)` | Evaluator | Writes the confirm look; needs a dev record | `NotEvaluator`, `NotRecorded`, `AlreadyRecorded` |
| `recordSealed(key, score, trades)` | Evaluator | Writes the sealed look; needs a dev record | same |
| `keyOf(proposer, gen, idx)` | anyone (pure) | `keccak256(abi.encode(proposer, gen, idx))` | |
| `exists(key)`, `getDev(key)`, `getConfirm(key)`, `getSealed(key)` | anyone (view) | Read records | |

Storage layout (one slot per record, least significant bits first):

| Record | Bits | Field |
|---|---|---|
| dev | 0 to 159 | proposer address |
| | 160 to 191 | dev score, `int32` two's complement, basis points |
| | 192 to 207 | trades, `uint16` |
| | 208 to 215 | operator id, `uint8` (0 random, 1 mutate, 2 crossover, 3 sweep) |
| | 216 to 255 | first 40 bits of `keccak256(abi.encode(params))`: binds later looks to the same params |
| confirm / sealed | 255 | set flag |
| | 0 to 31 | score, `int32` |
| | 32 to 47 | trades, `uint16` |

A dev record exists iff its slot is non-zero; this relies on `proposer != 0`, which holds because `msg.sender` is never the zero address.
The key contains the proposer, so nobody can occupy another proposer's slot, and each evaluation writes a **unique slot**, which keeps evaluations independent for parallel execution.

### Evaluator

The fixed judge. Semantics of the walk-forward are normative in [architecture.md](architecture.md) §1.

| Item | Value |
|---|---|
| Constants | `LAGS=6`, `PARAMS=7`, `COST_BPS=3`, `FIRST_EARN=6`, `W_MIN=-64`, `W_MAX=63`, `THR_MAX=8191`, `SPEC_VERSION=1` |
| Immutables | `ledger`, `length` (N), `devEnd`, `confirmEnd`, `epoch` |
| Constructor | `Evaluator(Ledger, int16[] returns, uint16 devEnd, uint16 confirmEnd)`; reverts `BadSeries` unless `devEnd > FIRST_EARN + LAGS`, `confirmEnd > devEnd`, `confirmEnd + 1 < N`, `N ≤ 65535` |

| Function | Who | Effect | Reverts with |
|---|---|---|---|
| `evaluate(gen, idx, int16[7] p, Meta m) → int32 dev` | anyone | Validates `p`, scores the dev range, writes the Ledger (key binds `msg.sender`), emits `Evaluated` | `BadParam(k)`, plus the Ledger's `AlreadyRecorded` |
| `score(int16[7] p) → (int32 dev, uint16 trades)` | anyone (view) | Free dry run on the dev range; used by pre-screens and tests | `BadParam(k)` |
| `confirm(gen, idx, p) → int32` | the proposer | One recorded look at the confirm range | `NotRecorded`, `ParamsMismatch`, `BadParam`, `AlreadyRecorded` |
| `sealedLook(gen, idx, p) → int32` | the proposer | The one recorded look at the sealed range | same |

`Meta` is `{uint8 operator, uint32 parentGen, uint32 parentIdx}` (lineage; `0/0` means no parent). There is no `sealed` preview function on purpose.

Events:

```
Evaluated(uint32 indexed gen, uint32 indexed idx, address indexed proposer, int32 dev, uint16 trades, uint8 operator, uint32 parentGen, uint32 parentIdx, int16[7] params)
Confirmed(uint32 indexed gen, uint32 indexed idx, address indexed proposer, int32 score, uint16 trades)
Sealed   (uint32 indexed gen, uint32 indexed idx, address indexed proposer, int32 score, uint16 trades)
```

`epoch = keccak256(abi.encode(uint16 SPEC_VERSION, uint8 COST_BPS, uint16 devEnd, uint16 confirmEnd, int16[] returns))`.

Gas: **unmeasured**. Expect the cost to be dominated by loading the series (one cold `SLOAD` per 16 returns), the loop over the earn range, and one new storage slot in the Ledger. Monad charges on the limit, so the limit must be set from a measured `gasUsed` (assumption A2 in [monad-notes.md](monad-notes.md)).

### JudgeLog

Prediction-before-result log for AI judges (principle 8, [jev.md](jev.md)).

| Function | Who | Effect | Reverts with |
|---|---|---|---|
| `predict(key, int32 threshold, uint16 pBps)` | any judge | Stores `P(dev > threshold)` in basis points with the block number; emits `Predicted` | `BadProbability`, `AlreadyScored`, `AlreadyPredicted` |
| `get(key, judge)` | anyone | `(threshold, pBps, atBlock, found)` | |
| `resolve(key, judge)` | anyone | `(resolved, outcome, pBps)`; `resolved` is false until the Ledger holds the result | |

Layout: bit 255 set flag, bits 0..15 `pBps`, 16..47 threshold, 48..127 block number.

### Tests the contracts must pass before any number from them counts (not yet written)

| Forbidden or required | Foundry test |
|---|---|
| A caller other than the bound Evaluator writes the Ledger | reverts `NotEvaluator` |
| Rebinding the Evaluator | reverts `AlreadyBound` |
| Overwriting a dev, confirm or sealed record | reverts `AlreadyRecorded` for each |
| A look with different params, or by another address | reverts `ParamsMismatch` / `NotRecorded` (key binds the caller) |
| Out-of-grammar spec | `BadParam(k)` for every k at both bounds and just outside them |
| TypeScript mirror and Solidity disagree | golden-vector test: 200 specs, all three roles, `dev`, `confirm` and sealed scores and trade counts equal |
| A prediction after the result exists | `JudgeLog` reverts `AlreadyScored` |
| Gas | `forge test --gas-report` for `evaluate` pasted in the PR; sets `gas_limit_per_eval` |

### Allocator (planned, not yet written)

Testnet escrow for funding ([architecture §3b](architecture.md)). Deploy after `Ledger`: `Allocator(ledger)`.

| Function | Who | Effect | Reverts with |
|---|---|---|---|
| `deposit()` payable | anyone | Credits `msg.value` to the caller's free balance | |
| `allocate(agentKey, amount)` | depositor | Moves `amount` from free balance to the agent's weight; the agent must have a Ledger dev record and a confirm look | `NotEnough`, `UnknownAgent`, `NotConfirmed` |
| `reallocate(fromKey, toKey, amount)` | depositor | Moves allocation between agents | same |
| `withdraw(amount)` | depositor | Pays `amount` of the caller's free balance to the caller; always callable | `NotEnough` |
| `unallocate(agentKey, amount)` | depositor | Returns allocation to the free balance | `NotEnough` |
| views | anyone | balances, per-agent totals, per-user allocations | |

Invariants to test: only the depositor is ever paid; the sum of free balances and allocations equals the contract balance; `withdraw` cannot be blocked by anyone (no owner, no pause, no proxy, no oracle); reentrancy on `withdraw` fails (checks-effects-interactions plus a guard); a fuzz of arbitrary deposit, allocate, reallocate, unallocate, withdraw sequences preserves the sum invariant.
Events: `Deposited(user, amount)`, `Allocated(user, agentKey, amount)`, `Unallocated(user, agentKey, amount)`, `Withdrawn(user, amount)`. The Allocator never writes the Ledger and never influences a score.

### Permissions at a glance

| Actor | May | May not |
|---|---|---|
| Proposer | call `evaluate`, `confirm`, `sealedLook` for its own keys | write any score, touch another proposer's key, spend a look twice |
| Judge (Jev or other) | call `JudgeLog.predict` before a result exists | affect `Evaluator` or `Ledger` |
| Deployer | call `Ledger.bind` once | rebind, write, delete |
| Depositor | deposit, allocate, reallocate, withdraw its own balance | touch anyone else's balance |
| Anyone | read everything | |

---

## Part B. Domain contract (`domains/*.toml`, planned)

A domain contract fixes what a domain is, so a second domain (another series, another strategy family, another market) is a new file and a new Evaluator deployment, not a code change in the core. It mirrors the ants contract sections and adds a `[chain]` section. It is **documentation of intent until the loader exists**; the v0 values are hard-coded in `packages/core/src/spec.ts` and `Evaluator.sol`, and the first loader must make them agree (conformance test).

Example for the v0 domain (`domains/trading-v1.toml`):

```toml
[task]
name        = "tiny linear strategies on a synthetic regime series"
domain      = "trading_v1"
description = "7 int16 params; walk-forward; score = PnL in bp"
series      = "data/series/v1.json"           # hashed into the epoch
spec_version = 1

[objective]
primary   = "dev"                              # name of the score used by search
direction = "max"
# A cap is a wall, not a price (principle 3). Here the walls are the grammar ranges below and the per-call gas limit.
gas_limit_per_eval = 0                         # 0 = measure at smoke time and write it back (A2)

[cascade]
stages          = ["dev", "confirm", "sealed"]
confirm_top_k   = 8                            # per generation
champion_by     = "confirm"                    # champion chosen on confirm, not dev
sealed_looks    = 1                            # per candidate, by its proposer

[roles]                                        # earn ranges, see architecture section 1
dev     = [6, 128]
confirm = [128, 160]
sealed  = [160, 192]

[space.w0]  # one table per parameter; the space is closed (exactly these keys)
type = "int16"
min  = -64
max  = 63
# w1 .. w5 identical

[space.thr]
type = "int16"
min  = 0
max  = 8191

[chain]
chain_id       = 10143
allow_other    = false                         # tools refuse other chains unless BLOCKWISE_ALLOW_OTHER_CHAIN=1
workers        = 20
per_generation = 200
generations    = 10
fee            = { max_fee_gwei = 400, priority_fee_gwei = 2 }
```

Rules the loader must enforce (fail closed, like ants): file at most 1 MiB; `[roles]` ranges contiguous and increasing with `dev` start ≥ `FIRST_EARN`; every `[space.*]` bound inside the Solidity grammar; unknown keys rejected; `chain_id` must match the connected chain; `allow_other = true` is refused unless the environment override is set. The domain contract's hash joins the epoch bookkeeping off-chain; the on-chain epoch stays the hash given above.

### What changes if the contract changes

| Change | Consequence |
|---|---|
| A bound, a role range, the series or the cost | New epoch: new deployment, results never mixed |
| Number of workers, generations, per-generation size, `confirm_top_k` | No epoch change: these shape the run, not the measurement |
| `gas_limit_per_eval` | No epoch change; re-measure after any contract change |
