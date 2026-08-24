# Zama Confidential PoolTogether - Technical Spike Report

Research and technical-validation artifact for the Zama Developer Program Season 4 bounty.

Report date: 2026-08-17

Authoritative research baseline: [zama-confidential-pooltogether-research-dossier.md](./zama-confidential-pooltogether-research-dossier.md)

This report records disposable technical spikes only. The production application, production contracts, production frontend, and final architecture have not been started.

## Status Labels

- **PASS** - the required behavior was reproduced with evidence.
- **PASS WITH CONDITIONS** - the behavior passed, but a material limit or live dependency remains.
- **FAIL** - the attempted construction did not work as tested.
- **BLOCKED** - the test could not reach a conclusion because of an external or unavailable prerequisite.
- **OPEN** - not resolved by the current spike.
- **NOT TESTED** - intentionally outside this phase or not reached.

# Executive Summary

The core encrypted draw is viable at 16 fixed slots on the current Zama Sepolia environment. The exact multiply-high threshold, balanced prefix scan, encrypted first-crossing selection, zero handling, overflow handling, and public winner-handle reveal executed in local FHEVM tests and in a live Sepolia 16-slot draw. The measured 16-slot draw consumed 14,927,246 global HCU and 3,448,096 maximum sequential-depth HCU, leaving approximately 25.36% global-HCU and 31.04% depth margin against the currently documented 20,000,000 and 5,000,000 limits. A 32-slot transaction exceeded the global HCU limit.

The Chainlink VRF v2.5 lifecycle is also live-proven on Sepolia. The epoch was frozen before request, the request ID was bound to the epoch, the callback stored only the random word, fulfillment arrived after five observed blocks, the FHE draw ran in a separate transaction, and unused native funding was withdrawn. The first two failed attempts were corrected as request-gas-estimation failures, not funding failures.

Winner reveal and winner-only prize ACL semantics pass all six local FHEVM tests, including forged cleartext, wrong handle, wrong epoch, replay, zero-winner, public-prize-decryption, and unauthorized-user cases. A complete Sepolia relayer/KMS propagation and winner user-decryption record remains blocked by `UND_ERR_CONNECT_TIMEOUT`. This is a liveness validation gap, not a demonstrated ACL-semantic failure.

The ERC-7984 boundary, aggregate public settlement, and non-rebasing Aave-style adapter pass locally. The current Sepolia Aave USDT reserve rejects the attempted supply with official error code `51` (`SUPPLY_CAP_EXCEEDED`), so organic live Aave yield is not demonstrated. The credible demo fallback is an explicitly labeled deterministic test-yield strategy; sponsored value must never be described as organic yield.

Withdrawal semantics pass the local seven-test suite using immediate confidential liquidity, encrypted queued claims, aggregate settlement, partial settlement, retry after strategy failure, claim idempotency, and principal/prize separation. The remaining policy decision is deterministic FIFO versus pro-rata allocation when a partial settlement cannot satisfy all queued claims.

## Overall Decision

**READY WITH CONSTRAINTS** for product-definition and architecture work. The architecture may proceed around a fixed 16-slot draw, separate VRF and FHE transactions, public winner-handle reveal, winner-only prize ACL, aggregate public yield settlement, and queued withdrawals. A live winner ACL rerun is mandatory before production deployment. Production implementation has not started.

# Environment

| Item | Observed value |
| --- | --- |
| OS | Linux WSL2, kernel `6.6.87.2-microsoft-standard-WSL2` |
| Node | `22.22.3` |
| Package manager | pnpm `11.2.2` |
| Hardhat | `2.28.6` |
| Foundry | `1.7.1` |
| Solidity | `0.8.27`, Cancun EVM target |
| FHE Solidity | `@fhevm/solidity 0.11.1` |
| FHE Hardhat plugin | `@fhevm/hardhat-plugin 0.4.2` |
| FHE mock utilities | `@fhevm/mock-utils 0.4.2` |
| Relayer SDK used by spike harness | `@zama-fhe/relayer-sdk 0.4.1` |
| OpenZeppelin confidential contracts | `@openzeppelin/confidential-contracts 0.4.0` |
| OpenZeppelin contracts | `@openzeppelin/contracts 5.6.1` |
| Ethers | `6.16.0` |
| Network | Ethereum Sepolia, chain ID `11155111` |
| Test wallet | `0x5FE738227ab4219bc317812a938dEf57489d444a` |
| RPC | Configured Infura/public endpoints; one VRF resume used curl JSON-RPC transport because Node DNS was unavailable |
| Git | No Git repository exists at the workspace root |
| TypeScript check | PASS: `tsc --noEmit` |
| Local test count | 56 passing, 0 failing |

No private key, mnemonic, API key, or RPC secret is recorded in this report.

## Evidence Inventory

| Spike | Local artifact | Live artifact | Result |
| --- | --- | --- | --- |
| Encrypted draw | `spikes/encrypted-draw/test/` | `spikes/encrypted-draw/evidence/sepolia-draw.json`, `sepolia-draw-8.json` | PASS WITH CONDITIONS |
| Winner ACL | `spikes/winner-acl/test/` | `spikes/winner-acl/evidence/sepolia-winner-acl-blocked.json` | PASS WITH CONDITIONS |
| Chainlink VRF | `spikes/chainlink-vrf/test/` | `spikes/chainlink-vrf/evidence/sepolia-vrf.json` | PASS |
| Confidential asset/yield | `spikes/confidential-asset-yield/test/` | `evidence/sepolia-aave-probe.json`, `sepolia-aave-roundtrip.json` | PASS WITH CONDITIONS |
| Withdrawal/settlement | `spikes/withdrawal-settlement/test/` | Local-only by design | PASS WITH CONDITIONS |

# Spike 1 - Encrypted Weighted Draw

## Objective

Determine whether the exact bounded encrypted weighted draw from the research dossier is supported by the current FHEVM stack and fits the measured HCU and gas envelope at 8 and 16 slots.

## Implementation

The disposable contract is [EncryptedWeightedDrawSpike.sol](../../spikes/encrypted-draw/contracts/EncryptedWeightedDrawSpike.sol). It tests the required construction without using plaintext weights inside the selection path:

1. Encrypt 16 `euint64` weights for a fixed public slot order.
2. Reduce weights with a balanced `euint128` sum.
3. Detect a total above `uint64.max` and select a safe zero total/weights without secret-dependent revert.
4. Compute `floor(T * R / 2^64)` using an encrypted `euint128` product and scalar shift.
5. Compute balanced inclusive encrypted prefixes.
6. Compute `cross[i] = threshold < prefix[i]`.
7. Compute first-crossing matches from the current and previous encrypted comparison bits.
8. Select a public address into an encrypted `eaddress`.
9. Treat zero addresses as empty slots and make the final encrypted winner handle publicly decryptable.

The spike models VRF as a prior `storeRandomWord` transaction. The expensive FHE draw is never run in a VRF callback.

## Test Vectors

The deterministic vector file covers:

| Case | Input | Expected property |
| --- | --- | --- |
| A | all zero | zero address, no winner |
| B | only slot 0 nonzero | slot 0 always wins |
| C | only slot 15 nonzero | slot 15 always wins |
| D | all 16 equal | approximately uniform |
| E | slot 7 overwhelming | frequency tracks dominant weight |
| F | sparse nonzero slots | zero slots ignored |
| G | total 6 | small-domain threshold behavior |
| H | values near `uint64.max` but safe | widened multiplication and casts remain correct |
| I | `uint64` overflow | overflow is detected and sanitized |
| J | deterministic randomized vectors | oracle and first-crossing invariants |

Additional tests cover a nonzero weight assigned to an empty address, duplicate nonzero addresses, and all-zero/overflow totals.

## Plaintext Oracle Comparison

**PASS.** The independent oracle suite ran 14 tests:

- 9 deterministic vectors A-I.
- Empty-slot normalization.
- Exhaustive reduced-width multiply-high range reduction for 8-, 12-, and 16-bit domains, with per-threshold counts differing by at most one.
- 100,000 deterministic equal-weight samples; all 16 observed frequencies remained within 0.006 absolute error of `1/16`.
- 100,000 deterministic unequal-weight samples for weights 1 through 16; every observed frequency remained within 0.006 absolute error of its expected proportion.
- 1,000 randomized first-crossing invariant checks.

The FHE suite ran 15 tests and matched the oracle for every deterministic and randomized vector.

## HCU Results

| Experiment | Slots | Global HCU | Max sequential depth | Result |
| --- | ---: | ---: | ---: | --- |
| Weighted local mock | 8 | 7,142,718 | 2,525,096 | PASS |
| Weighted local mock | 16 | 14,927,246 | 3,448,096 | PASS |
| Weighted local mock | 32 | Not available; reverts `HCUTransactionLimitExceeded()` | Not available | FAIL at boundary |
| Optional 24-slot run | 24 | Not tested | Not tested | NOT TESTED |

Against the documented 20,000,000 global and 5,000,000 depth limits, the 16-slot draw leaves:

- Global margin: `5,072,754` HCU, approximately `25.36%`.
- Sequential-depth margin: `1,551,904` HCU, approximately `31.04%`.

This margin is for the spike's draw transaction and should not be consumed by unrelated production work such as large event payloads, strategy accounting, or extra FHE state transitions.

## Gas Results

| Environment | Slots | Weight-load gas | Draw gas | Draw transaction |
| --- | ---: | ---: | ---: | --- |
| Hardhat mock | 8 | 799,048 | 1,224,559 | Local measurement |
| Hardhat mock | 16 | 1,549,524 | 2,211,122 | Local measurement |
| Sepolia | 8 | 828,784 | 1,542,483 | `0x492ac2fb682d4781de317a358f739ff64a9618bfb2cf0128472b1e9878ea58f5` |
| Sepolia | 16 | 1,597,064 | 2,833,070 | `0x372be28ae9528fbef7548edcc79ee1a58687f74564c37773b63f7eb860796b35` |

The FHE HCU measurement matched between the mock host and Sepolia for the tested operation. Ordinary gas was higher on Sepolia and must be measured again with the final contract shape.

## Scale Results

The credible MVP boundary is 16 fixed slots. Eight slots is a tested smaller fallback, but it is not required by the measured HCU result. Thirty-two slots is not a credible single-transaction boundary under the current limit. No unbounded participant array should be introduced.

## Failures

- The optional 32-slot test reached the documented HCU boundary and reverted with `HCUTransactionLimitExceeded()`.
- The spike does not prove that adding final production ACL writes, prize accounting, or more complex state transitions inside the same transaction will fit the 16-slot margin.
- Public winner proof finalization is intentionally validated in Spike 2, not folded into this measured draw transaction.

## Verdict

**PASS WITH CONDITIONS.** Gate A: **GO**. A 16-slot encrypted weighted draw is technically viable on Sepolia with a material but finite margin. The architecture must freeze at 16 slots unless a new measurement validates any expansion.

# Spike 2 - Winner Reveal + ACL

## Objective

Prove the transition from an encrypted winner to a public, KMS-authenticated winner address and then to winner-only encrypted prize decryption.

## Implementation

The disposable contract is [WinnerRevealAclSpike.sol](../../spikes/winner-acl/contracts/WinnerRevealAclSpike.sol). It follows:

```text
encrypted eaddress winner
    -> FHE.makePubliclyDecryptable(winner)
    -> SDK publicDecrypt and KMS proof
    -> FHE.checkSignatures(handles, cleartext, proof)
    -> finalized winner address
    -> FHE.allow(encryptedPrize, winner)
    -> winner user decryption
```

The prize is never marked publicly decryptable. The contract itself retains access for internal state, while the finalized winner receives the only persistent external prize permission.

## Tests

**PASS locally: 6 tests.** The suite proves:

| Test | Result |
| --- | --- |
| Valid public winner proof finalizes and winner decrypts prize | PASS |
| Forged clear winner is rejected | PASS |
| Proof for another encrypted handle is rejected | PASS |
| Proof submitted for an unknown epoch is rejected | PASS |
| Replay after finalization is rejected | PASS |
| Zero winner reaches a terminal no-winner state without prize access | PASS |

The positive case also rejects user decryption by the admin/controller, another participant, an arbitrary wallet, and the keeper. Public decryption of the prize is rejected. Before the ACL grant, even the winner cannot decrypt the prize.

## Propagation Observations

The latest Sepolia attempt was blocked by `UND_ERR_CONNECT_TIMEOUT` before a complete evidence record could be produced. Therefore:

- ACL propagation latency: **NOT OBSERVABLE WITH CURRENT TOOLING**.
- Live winner user-decryption latency: **NOT OBSERVABLE WITH CURRENT TOOLING**.
- Local winner-only permission semantics: **PASS**.
- Live relayer/KMS liveness: **BLOCKED**, not disproven.

The blocked record is [sepolia-winner-acl-blocked.json](../../spikes/winner-acl/evidence/sepolia-winner-acl-blocked.json). A live rerun is mandatory before production deployment and should record the delay between finalization receipt, ACL propagation, and successful winner decryption.

## Verdict

**PASS WITH CONDITIONS.** Gate B: **GO WITH DELAY**. The contract-side proof and ACL construction is validated locally, but the final product must present an explicit asynchronous decryption state and must not promise immediate prize reveal.

# Spike 3 - Chainlink VRF v2.5 Lifecycle

## Current Sepolia Configuration

The configuration was checked against the current official Chainlink supported-networks documentation on 2026-08-16:

| Setting | Value |
| --- | --- |
| Chain ID | `11155111` |
| Coordinator | `0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B` |
| Direct-funding wrapper | `0x195f15F2d49d693cE265b4fB0fdDbE15b1850Cc1` |
| 500-gwei key hash | `0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae` |
| Request confirmations used | `3` |
| Callback gas in spike | `100,000` |
| Documented maximum callback gas | `2,500,000` |
| Words requested | `1` |

The direct-funding wrapper owns coordinator/key-hash configuration; the key hash is not placed in the consumer request calldata.

## Lifecycle

The live contract was `0xC3C61C2b03DABBE6bD9b2a0f9aacb581b0dE1C10`.

| Stage | Transaction | Block | Gas | Result |
| --- | --- | ---: | ---: | --- |
| VRF request | `0x89d3c0801b3b675dc9c511255154571298a6c07e1b2d716b48a668836ba72aad` | 11,502,872 | 165,855 | PASS |
| Fulfillment/callback | `0x5d96742b427d09fa34cb11293e8c16e9beaf4e2b085bc92a5554338e508139da` | 11,502,877 | 130,752 | PASS |
| Separate draw execution | `0x62bc09d539eac6400369ec3bc61631cbfafe7a52823bbae9cfa45e6ad20d7188` | 11,503,298 | 35,338 | PASS |
| Unused native withdrawal | `0x1c87cdac2a84534d00a48be319b452340caef8b14ddada94f6813991339585e7` | 11,503,300 | 28,742 | PASS |

The request price was `266022555629747` wei. The callback stored a single random word and performed no FHE work. Fulfillment was observed five blocks after the request. The request ID was bound to epoch 1 and the final status was `DrawExecuted`.

## Security Tests

The local seven-test suite proves:

- Freeze before request.
- One request per epoch.
- Request ID binding when fulfillments arrive out of order.
- Unknown, duplicate, empty, and late callbacks do not corrupt the epoch.
- Direct callback spoofing is rejected.
- Expiry is terminal and does not expose a reroll.
- Draw execution is separate from callback fulfillment.

## Failure Handling

Two earlier Sepolia transactions exhausted the complete RPC-estimated `160,369` gas limit. Raw transaction inspection showed selector `0xcc0ec08e`, which decodes to `requestRandomness(uint64)`, with zero native value. The native consumer funding had already succeeded; the original `sepolia-vrf-failed-funding.json` diagnosis was corrected to [sepolia-vrf-request-oog-failures.json](../../spikes/chainlink-vrf/evidence/sepolia-vrf-request-oog-failures.json). Setting an explicit bounded `500,000` gas limit allowed the next request to succeed.

The live run also experienced RPC connection loss during polling. The fixed epoch was recovered by contract address and request ID, then finalized without re-requesting randomness. This is evidence for a recovery procedure: operators must resume a known request, never reroll based on an incomplete client observation.

## Verdict

**PASS.** Gate C: **GO**. Use Chainlink VRF v2.5 direct funding or a funded subscription, freeze all outcome-affecting state first, bind request IDs explicitly, keep the callback storage-only, and execute FHE separately. Current addresses and funding parameters must be rechecked immediately before deployment.

# Spike 4 - Confidential Asset / Yield

## ERC-7984 Boundary

The disposable asset harness validates the official OpenZeppelin Confidential Contracts `0.4.0` behavior:

- Public six-decimal asset wraps into an ERC-7984 confidential representation.
- `confidentialTransferAndCall` passes the actual encrypted amount returned by the token implementation.
- An over-request that cannot be fulfilled returns encrypted zero and does not over-credit the pool.
- A callback rejection attempts refund and leaves encrypted accounting unchanged.
- Principal ACL is granted to the depositor, not to an arbitrary observer.
- The receiver accounts using the callback amount, never the user's requested plaintext intention.

The local suite contains seven passing tests.

## Aggregate Settlement

The harness proves the required privacy boundary:

```text
individual encrypted deposits
    -> encrypted aggregate
    -> public unwrap request
    -> public clear aggregate with KMS proof
    -> ERC-4626 deposit
    -> public strategy shares
```

Only the aggregate settlement amount crosses the public strategy boundary. Individual principal state remains encrypted. The aggregate amount and timing are still public metadata and must be described honestly in the product.

## Aave Investigation

The live read probe confirmed deployed Sepolia code and address-book values:

| Contract | Address |
| --- | --- |
| Aave V3 Pool | `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951` |
| Sepolia USDT | `0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0` |
| aUSDT | `0xAF0F6e8b0Dc5c913bbF4d14c22B4E78Dd14310B6` |
| Faucet | `0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D` |

A disposable non-rebasing adapter was deployed at `0x9Db6213f3E74De4A106504d222553bcDC94670B0`, with deployment transaction `0x56fca25bdec60a49e328afc9a0009d13a34f18b0491403bd8813b7d1f83d1f7c` and approval transaction `0x490db08ec1cd8ca72229327deb67745a00070bcb08d4a59648d4dfc58afcff76`.

The attempted Aave supply reverted with error code `51`. The official Aave V3 core error source decodes this as `SUPPLY_CAP_EXCEEDED`. No state-changing Aave supply completed, so the adapter's live round trip and live interest accrual are not proven.

## Yield Observations

- Address existence, normalized income, and reserve liquidity do not prove that a demo deposit will earn visible interest.
- The local adapter proves fixed public shares over an Aave-style rebasing balance and successful redemption.
- Sponsored mock accrual proves the accounting path only. It is not organic yield.
- The current Sepolia reserve condition makes an Aave-first demo unreliable without a new live market state.

## Fallback

Use the official/mock confidential asset boundary and a deterministic prefunded ERC-4626 test strategy for technical and UX validation. Label the value as sponsored test yield or demo liquidity. Do not imply that it came from Aave or from organic protocol interest. Keep the strategy interface replaceable so a live Aave route can be revalidated later.

## Verdict

**PASS WITH CONDITIONS.** Gate D: **GO WITH TEST-YIELD FALLBACK**. The confidential asset and aggregate settlement model is viable; organic Aave yield is currently blocked by reserve configuration.

# Spike 5 - Withdrawal / Settlement

## Immediate Withdraw

The local suite proves that a user can submit an encrypted withdrawal request while normal pool actions are active. When confidential principal liquidity is available, the pool pays immediately, caps an over-request at the user's principal, reduces draw weight, and does not touch prize reserve.

## Queued Withdraw

When local confidential liquidity is insufficient, the unpaid amount becomes an encrypted queued claim. Principal and draw weight are reduced once at request time. The claim remains valid across asynchronous settlement and strategy failure.

## Settlement

The local harness proves:

- Multiple users contribute to one encrypted aggregate settlement amount.
- A public cap bounds the settlement request.
- The aggregate can leave an ERC-4626 strategy and return through confidential wrapping.
- Partial settlement leaves each unpaid encrypted claim valid.
- New deposits can be paused without disabling existing exits.

## Claim

Users claim against confidential claim liquidity. A second claim is an encrypted zero operation and cannot transfer value twice. Claims do not require public disclosure of the user's total balance.

## Retry

A strategy withdrawal failure leaves the active settlement handle and the user queue intact. After the strategy reopens, the same proof can finalize successfully. No user claim is burned by a failed settlement.

## Invariants

The seven local tests enforce these invariants:

1. Principal does not increase without received funds.
2. Principal does not decrease without payout or an irrevocable queued claim.
3. Prize reserve cannot satisfy principal debt.
4. Draw weight never exceeds live principal.
5. Settlement cannot create funds.
6. Claims cannot be paid twice.
7. Failure leaves a retryable claim.
8. Pausing deposits does not permanently trap existing withdrawals.

The harness intentionally uses a deterministic mock strategy, not live Aave liquidity. Its partial-settlement policy is first-come; final architecture must choose deterministic FIFO or pro-rata behavior and test it explicitly.

## Verdict

**PASS WITH CONDITIONS.** Gate E: **GO WITH QUEUED REDEMPTION**. “Withdraw at any time” must mean permissionless initiation in every normal state, not an unconditional promise of synchronous underlying settlement.

# Cross-Spike Findings

1. **The draw is the binding compute boundary.** Keep the FHE draw transaction isolated and fixed at 16 slots. Do not combine VRF callback work, public proof verification, strategy accounting, or large event/state transitions with it.
2. **Randomness and FHE must be separate state transitions.** The live VRF recovery demonstrated why request IDs and terminal epoch state matter when RPC polling fails.
3. **Winner privacy is a two-stage property.** The winner handle can be public-decrypted; the prize handle must remain private until `FHE.allow(prize, winner)` after verified finalization.
4. **Relayer/KMS availability is user-visible.** Both encryption and decryption are asynchronous. The frontend needs durable pending, retry, timeout, and “proof submitted but ACL not yet available” states.
5. **Confidential values do not imply confidential metadata.** Addresses, slot order, draw timing, aggregate settlement caps, public winner announcements, and transaction patterns remain visible.
6. **Aave cannot be a hidden assumption.** The testnet reserve currently rejects supply. The architecture must support a labeled test-yield fallback without changing the confidential accounting boundary.
7. **Queued exits are a product feature, not an error path.** They preserve principal claims when public liquidity or strategy redemption is asynchronous.
8. **Current local FHE tests are stronger than network liveness evidence.** The local mock proves contract semantics; it does not prove relayer uptime, ACL propagation latency, or live strategy liquidity.

# Confirmed Facts

- The current harness compiles with Solidity `0.8.27`, FHEVM Solidity `0.11.1`, Hardhat plugin `0.4.2`, and OpenZeppelin Confidential Contracts `0.4.0`.
- Required encrypted types and operations for the bounded draw exist.
- A 16-slot exact construction runs on Sepolia with measured HCU and gas.
- A 32-slot single transaction exceeds the measured global HCU boundary.
- Public winner proof verification and winner-only ACL semantics pass six local FHEVM tests.
- Chainlink VRF v2.5 direct-funding request, fulfillment, separate draw, and recovery flow pass live on Sepolia.
- ERC-7984 callback accounting, aggregate public unwrap, and rewrap semantics pass seven local tests.
- Current Sepolia Aave USDT supply is blocked by official error `SUPPLY_CAP_EXCEEDED` in the attempted route.
- Immediate and queued withdrawal accounting passes seven local tests.
- The final TypeScript check and all 56 local tests pass.

# Strong Inferences

- A fixed 16-slot epoch-based pool is the strongest credible bounty MVP.
- Chainlink VRF is preferable to `FHE.randEuint64()` as the sole public randomness source because the VRF request and fulfillment are independently recognizable and publicly auditable.
- A public winner address after KMS proof is compatible with encrypted weights, but winner privacy after reveal is necessarily address-level disclosure, not full metadata privacy.
- The product should use a modular confidential pool, a separate aggregate settlement boundary, a public strategy adapter, and a queued redemption state machine.
- A deterministic test-yield fallback is safer for the deadline than waiting on an unstable testnet Aave reserve, provided the UI and documentation label it precisely.

# Remaining Open Questions

| Question | Status | Required action |
| --- | --- | --- |
| Live winner ACL propagation and winner user-decryption latency | BLOCKED | Rerun unchanged winner script when Zama relayer/KMS is reachable |
| Exact final-production draw HCU after pool accounting/ACL additions | OPEN | Measure final draw transaction before deployment; keep margin budget |
| Live Aave supply and non-zero interest | BLOCKED by reserve cap | Recheck current reserve or use labeled fallback |
| Partial settlement allocation | OPEN | Choose FIFO or pro-rata and add invariant tests |
| Wallet replacement/recovery after winner finalization | OPEN | Define explicit reauthorization/recovery policy without broad prize ACL |
| Long-term ACL reorg policy for prize values | OPEN | Choose a value-at-risk threshold and confirmation delay |
| Live public RPC reliability | OPEN | Use a production RPC with failover and observable retry state |

# Architecture Implications

## Option A - Modular confidential pool plus aggregate strategy batcher

```text
wallet/frontend
    | encrypted ERC-7984 deposit/withdraw
    v
confidential pool (principal, draw weight, queued claims, prize reserve)
    | epoch snapshot
    v
VRF request -> random word storage -> separate 16-slot FHE draw
    | encrypted winner handle
    v
public KMS winner reveal -> permissionless finalization -> winner-only prize ACL
    |
    +--> aggregate confidential unwrap -> public ERC-4626/Aave adapter
    +--> confidential rewrap -> queued claim liquidity
```

This is the recommended option. It isolates HCU-heavy work, makes failed operations resumable, and matches the tested boundaries. It still has public aggregate settlement metadata and requires explicit keeper/relayer observability.

## Option B - Integrated epoch pool and net settlement controller

One contract owns deposits, snapshots, draw state, aggregate strategy settlement, and claims. This reduces deployment count but increases state-machine coupling, draw gas pressure, upgrade risk, and recovery complexity. It should not be the first production shape after the spikes.

## Option C - Confidential wrapper around a non-rebasing yield-share token

The pool treats public ERC-4626 shares as the strategy asset and wraps user-facing balances through ERC-7984. This makes share accounting clean, but it still needs an aggregate public boundary and a credible strategy. It is a good adapter boundary, not a replacement for the pool state machine.

## Recommendation

Proceed with Option A conceptually, retaining the Option C non-rebasing adapter boundary. Do not freeze exact contract ownership, upgradeability, or deployment topology until the live winner ACL rerun and final-production HCU measurement are complete.

# Recommended MVP Boundary

## MUST HAVE

- One Sepolia pool and one six-decimal confidential asset.
- Fixed 16 public slots with encrypted principal-derived weights.
- Epoch freeze, Chainlink VRF request, callback-only word storage, and separate FHE draw.
- Public winner handle reveal with KMS proof verification.
- Winner-only encrypted prize decryption.
- Immediate confidential withdrawal plus encrypted queued redemption.
- Aggregate public strategy boundary with explicit metadata disclosure.
- Deterministic failure/retry state transitions.
- Local, property-oriented, ACL, and Sepolia integration evidence.
- Deployment, source, environment, and recovery documentation.

## SHOULD HAVE

- A labeled deterministic test-yield fallback.
- A permissionless draw/finalization/settlement keeper path with retry UI.
- FIFO or pro-rata partial settlement policy, chosen explicitly.
- HCU/gas telemetry in the deployment runbook.
- Clear masked-value and asynchronous decryption UX.
- A public draw verification page showing VRF request, fulfillment, state commitment, and winner proof transaction.

## COULD HAVE

- Multiple prize tiers after the one-winner path is stable.
- More than one pool only after a new HCU and operational budget.
- A verified live Aave adapter if the Sepolia market becomes usable.
- Historical draw analytics that avoid reconstructing private balances.

## DO NOT BUILD

- More than 16 slots in the first production demo.
- Offchain plaintext winner selection.
- A custom ZK winner proof, custom KMS, or custom randomness system.
- Multiple assets, cross-chain support, governance, NFTs, social features, or a generalized participant registry.
- Rebasing-token wrappers without a validated non-rebasing share adapter.
- Public decryption of balances, weights, or prize amounts.
- A VRF callback that performs the full FHE draw.

# Go / No-Go Gates

| Gate | Required evidence | Result | Constraint |
| --- | --- | --- | --- |
| A - Draw | 16-slot encrypted weighted draw | **GO** | Fixed 16 slots; budget final production HCU |
| B - Winner privacy | Winner-only prize decryption | **GO WITH DELAY** | Local PASS; live relayer/KMS rerun mandatory |
| C - Randomness | Non-selective public VRF lifecycle | **GO** | Recheck current addresses/config before deployment |
| D - Asset/yield | Confidential asset boundary and credible yield route | **GO WITH TEST-YIELD FALLBACK** | Aave supply currently blocked by cap 51 |
| E - Withdrawal | Safe immediate/queued principal exits | **GO WITH QUEUED REDEMPTION** | Choose deterministic partial-settlement allocation |

# Reproduction Guide

From `/home/unify/zamaS4/spikes`:

```sh
pnpm install --frozen-lockfile
./node_modules/.bin/tsc --noEmit

./node_modules/.bin/hardhat --config encrypted-draw/hardhat.config.ts test
./node_modules/.bin/hardhat --config winner-acl/hardhat.config.ts test
./node_modules/.bin/hardhat --config chainlink-vrf/hardhat.config.ts test
./node_modules/.bin/hardhat --config confidential-asset-yield/hardhat.config.ts test
./node_modules/.bin/hardhat --config withdrawal-settlement/hardhat.config.ts test
```

Expected local result: 29 draw tests, 6 winner-ACL tests, 7 VRF tests, 7 asset/yield tests, and 7 withdrawal tests: **56 passing**.

Live draw and VRF commands require the existing Hardhat secret configuration and a funded Sepolia wallet. Never put secrets in source or command output:

```sh
DRAW_SLOTS=16 ./node_modules/.bin/hardhat --config encrypted-draw/hardhat.config.ts run encrypted-draw/scripts/sepolia-draw.ts --network sepolia --no-compile
./node_modules/.bin/hardhat --config chainlink-vrf/hardhat.config.ts run chainlink-vrf/scripts/sepolia-vrf.ts --network sepolia --no-compile
./node_modules/.bin/hardhat --config winner-acl/hardhat.config.ts run winner-acl/scripts/sepolia-winner-acl.ts --network sepolia --no-compile
```

The VRF resume fallback used for the measured live epoch was:

```sh
VRF_CONTRACT_ADDRESS=<known-fixed-contract> ./node_modules/.bin/hardhat --config chainlink-vrf/hardhat.config.ts run chainlink-vrf/scripts/sepolia-vrf-curl-resume.ts --no-compile
```

The resume script must only be used with a known fixed request/epoch. It is a recovery tool, not a reroll mechanism.

The evidence artifacts are disposable and intentionally separated from any future production application directory.

# Sources

The research dossier contains the complete source inventory and source-use notes. The following are the primary sources used by this validation report.

## Zama

- [Supported encrypted types](https://docs.zama.org/protocol/solidity-guides/smart-contract/types.md) - encrypted widths and `eaddress`.
- [Encrypted operations](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md) - arithmetic, comparison, select, casts, shifts.
- [Encrypted inputs](https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs.md) - external handles, proofs, sender/contract binding.
- [ACL](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl.md) - `allow`, `allowThis`, transient and public permissions.
- [ACL reorg handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md) - Gateway ordering and reorg considerations.
- [Public decryption/oracle](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md) - public cleartext and `FHE.checkSignatures`.
- [HCU](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md) - HCU costs and limits.
- [Random encrypted values](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/random.md) - current FHE random API and limits.
- [Hardhat guide](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat.md) - current Hardhat workflow.
- [Foundry guide](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry.md) - current Foundry workflow.
- [SDK configuration](https://docs.zama.org/protocol/sdk/guides/configuration.md) - relayer and network setup.
- [SDK security model](https://docs.zama.org/protocol/sdk/concepts/security-model.md) - browser, relayer, KMS, and transport-key trust.
- [SDK permit model](https://docs.zama.org/protocol/sdk/concepts/permit-model.md) - scoped user decryption permits.
- [FHEVM Hardhat template manifest](https://github.com/zama-ai/fhevm-hardhat-template/blob/main/package.json) - versions used as baseline.
- [Current SDK manifest](https://github.com/zama-ai/sdk/blob/main/packages/sdk/package.json) - high-level SDK version baseline.
- [React/wagmi SDK example](https://github.com/zama-ai/sdk/tree/main/examples/react-wagmi) - wallet and explicit reveal patterns.
- [VaultPositionCard example](https://github.com/zama-ai/sdk/blob/main/examples/react-wagmi/src/components/VaultPositionCard.tsx) - masked values and async UX.
- [Confidential batcher](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-batcher/contracts/BatcherConfidentialUpgradeable.sol) - aggregate settlement state machine.
- [ERC-7984 implementation](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-wrapper/contracts/token/ERC7984Upgradeable.sol) - callback and actual-amount semantics.
- [ERC-7984 ERC-20 wrapper](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-wrapper/contracts/extensions/ERC7984ERC20WrapperUpgradeable.sol) - wrap/unwrap boundary and limitations.
- [Confidential wrapper guide](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md) - wrapper behavior and policy caveats.
- [Zama Sepolia addresses](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md) - current testnet confidential-app addresses.
- [Confidential Vault architecture](https://docs.zama.org/protocol/confidential-vault/concepts/architecture.md) - aggregate confidential-to-public boundary.
- [Confidential Vault withdrawal](https://docs.zama.org/protocol/confidential-vault/guides/withdraw.md) - asynchronous redemption and recovery patterns.

## PoolTogether

- [PrizeVault.sol](https://github.com/GenerationSoftware/pt-v5-vault/blob/main/src/PrizeVault.sol) - principal-preserving vault and yield-buffer concepts.
- [PrizePool.sol](https://github.com/GenerationSoftware/pt-v5-prize-pool/blob/main/src/PrizePool.sol) - draw lifecycle and prize accounting.
- [TwabERC20.sol](https://github.com/GenerationSoftware/pt-v5-vault/blob/main/src/TwabERC20.sol) - time-weighted balance concept.
- [PoolTogether Chainlink VRF adapter](https://github.com/GenerationSoftware/pt-v5-chainlink-vrf-v2-direct/blob/main/src/ChainlinkVRFV2Direct.sol) - request/fulfillment adapter boundary.
- [PoolTogether RNG contracts](https://github.com/GenerationSoftware/pt-v5-rng-contracts) - RNG consumer separation.

## Ethereum

- [ERC-4626](https://eips.ethereum.org/EIPS/eip-4626) - public vault asset/share interface.
- [EIP-4399](https://eips.ethereum.org/EIPS/eip-4399) - `PREVRANDAO` context.
- [EIP-4788](https://eips.ethereum.org/EIPS/eip-4788) - beacon-root availability.

## OpenZeppelin

- [OpenZeppelin Confidential Contracts v0.4.0](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts/tree/v0.4.0) - ERC-7984 interfaces and utilities.

## Other technical references

- [Chainlink VRF v2.5 supported networks](https://docs.chain.link/vrf/v2-5/supported-networks) - current Sepolia configuration.
- [Chainlink VRF v2.5 security](https://docs.chain.link/vrf/v2-5/security) - freeze-before-request, request binding, confirmation, callback, and reroll guidance.
- [Aave V3 Sepolia address book](https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3Sepolia.sol) - Pool, USDT, and aUSDT addresses.
- [Aave Pool developer reference](https://aave.com/docs/developers/smart-contracts/pool) - supply and withdraw interaction model.
- [Aave V3 core Errors.sol](https://github.com/aave/aave-v3-core/blob/782f51917056a53a2c228701058a6c3fb233684a/contracts/protocol/libraries/helpers/Errors.sol) - error code 51 meaning `SUPPLY_CAP_EXCEEDED`.

# Final Recommendation

## Overall Status

**READY WITH CONSTRAINTS**

## Recommended Product Shape

Build one Sepolia confidential prize-linked savings pool with a six-decimal ERC-7984 asset, a fixed 16-slot epoch, encrypted principal-derived weights, Chainlink VRF randomness, a separate FHE draw transaction, public winner-handle verification, winner-only prize decryption, aggregate public strategy settlement, and immediate-or-queued principal withdrawal.

## Recommended Participant Capacity

**16 fixed slots.** Keep an 8-slot deployment configuration available only as an operational fallback. Do not promise 24 or 32 slots without a new HCU measurement.

## Recommended Randomness

**Chainlink VRF v2.5 direct funding or subscription, with the current Sepolia configuration rechecked at deployment.** Freeze the epoch before requesting; bind `requestId` to the epoch; store the word only in the callback; execute the FHE draw separately; make timeout terminal and non-rerollable.

## Recommended Yield Route

**Aggregate confidential unwrap into a public ERC-4626 adapter.** Attempt Aave only as a replaceable strategy after a fresh live-capacity check. For the bounty demo, use an explicitly labeled deterministic test-yield fallback if Aave remains capped. Never call sponsor-funded value organic yield.

## Recommended Withdrawal Model

**Immediate confidential payout when principal liquidity exists, otherwise an encrypted queued claim settled through aggregate public redemption and confidential rewrap.** Choose FIFO or pro-rata allocation before production contracts are frozen.

## Critical Constraints

- The draw transaction must remain within the measured 16-slot HCU budget.
- The VRF callback must not run the large FHE computation.
- Only the winner handle is public-decryptable; prize handles remain private.
- Live winner ACL propagation must be measured before deployment.
- Aggregate strategy settlement reveals public amount/timing metadata.
- Aave Sepolia supply is currently blocked by reserve supply cap.
- All asynchronous operations require retryable, terminal, and observable state transitions.
- Participant slots and epoch snapshots must not be reused while referenced by a non-terminal epoch.

## Remaining Risks

1. Zama relayer/KMS outage or delayed ACL propagation can delay winner reveal.
2. Final production accounting may consume the 16-slot HCU margin if combined with the draw.
3. Testnet Aave liquidity and yield conditions can change without notice.
4. Public aggregate settlement leaks amount, timing, and strategy relationships.
5. Partial settlement policy can create fairness disputes if not deterministic.

## Next Phase

Proceed to product definition and architecture freeze with the constraints above. Before production deployment, rerun the winner ACL script on Sepolia, measure final production draw HCU/gas, choose FIFO or pro-rata claims, revalidate Chainlink/Aave addresses and funding, and write the failure-recovery runbook.

**PRODUCTION IMPLEMENTATION HAS NOT STARTED.**
