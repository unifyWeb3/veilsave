# VeilSave Execution Specification

Status: Implementation-ready specification; production implementation is not authorized in this phase

Target: Ethereum Sepolia (`11155111`)

Normative references:

- `docs/product/product-spec.md`
- `docs/architecture/architecture.md`
- `docs/research/zama-confidential-pooltogether-technical-spike-report.md`

If an implementation choice conflicts with the frozen product or architecture, stop and update the specification through review. Do not silently improvise behavior.

## 1. Implementation Objective

Build one production-quality Sepolia MVP of VeilSave: a 16-slot weekly confidential prize-linked savings pool using ERC-7984 cUSDT, encrypted principal-derived weights, Chainlink VRF v2.5, a separate fixed-shape FHE weighted draw, KMS-authenticated public winner finalization, winner-only encrypted prize access, aggregate ERC-4626 settlement, and immediate-or-FIFO principal withdrawal.

The implementation is complete only when:

- every P0 bounty requirement traces to shipped behavior and a passing acceptance test;
- the final draw stays below the frozen HCU/depth release targets;
- live Sepolia winner ACL propagation/user decryption passes;
- all async states and recovery actions exist in contracts and frontend;
- source, deployment manifest, roles, configuration, and limitations are published; and
- no production claim overstates privacy, yield, or independent verifiability.

## 2. Build Order

Implementation must follow this order. Do not start the frontend draw animation or optional adapter before the preceding security gate passes.

1. **Repository foundation**
   - Create the specified workspace structure, formatting, linting, test commands, CI, environment templates, and documentation placeholders.
   - Preserve the research/spike artifacts as read-only evidence; production code must not import from `spikes/`.

2. **Dependency and version pinning**
   - Revalidate current compatible Zama/OpenZeppelin/Chainlink packages and pin exact versions and integrity lockfile.
   - Record compiler, EVM target, Node, pnpm, SDK, and package hashes.

3. **Reference models and shared types**
   - Port the plaintext weighted-draw oracle and state-machine models into production test utilities.
   - Define shared enums, deployment manifest schema, ABI type generation, and public status derivation.

4. **Confidential asset integration**
   - Validate or deploy the six-decimal ERC-7984 cUSDT/wrapper boundary.
   - Prove actual-amount callback accounting, wrap/unwrap, ACL, and failure behavior before pool accounting.

5. **Core pool and slot management**
   - Implement immutable configuration, fixed 16 slots, `0.001 ETH` bond, address-to-slot mapping, pause scopes, and release preconditions.

6. **Encrypted principal accounting**
   - Implement actual callback credit, encrypted principal, pending/eligible weight, aggregate liabilities, safe overflow handling, and user ACL.

7. **Epoch state machine and maturity**
   - Implement seven-day OPEN/FROZEN lifecycle, 16-handle snapshot, pending maturity, commitments, timeouts, terminal states, and next-epoch opening.

8. **Immediate and FIFO withdrawal path**
   - Implement encrypted debit, immediate transfer, routing boolean proof, one active ticket per slot, strict FIFO, completion boolean proof, pause-safe exits, and slot-close path.

9. **Deterministic test-yield vault**
   - Implement the ERC-4626 donation-based `TEST` strategy and explicit sponsor-yield event, without APY logic.

10. **Settlement controller**
    - Implement investment, public aggregate proof, strategy deposit/redemption, exact balance reconciliation, confidential rewrap, principal/prize routes, retries, loss mode, and 24-hour drained strategy replacement.

11. **VRF adapter**
    - Implement direct-funding request mapping, storage-only callback, duplicate/late handling, funding, and pool synchronization.

12. **Encrypted draw**
    - Port the exact validated 16-slot operation graph. Keep it isolated. Run local HCU regression before adding winner flow.

13. **Winner reveal and prize accounting**
    - Implement 96-block delay, KMS proof verification, zero-winner terminal path, exactly-once per-epoch prize authorization/rollover, winner-only ACL, and confidential prize claim.

14. **Contract integration and invariant suite**
    - Exercise asset + pool + VRF + draw + ACL + settlement + FIFO as one system, including dependency failures and pause.

15. **Sepolia pre-frontend deployment rehearsal**
    - Deploy a rehearsal stack, verify source, run full protocol path, measure HCU/gas, and fix contract issues before frontend integration.

16. **Frontend foundation**
    - Implement deployment-manifest loading, wallet/network, Zama SDK initialization, direct-RPC query layer, public event history, privacy-safe logging, and design tokens.

17. **Deposit and position UX**
    - Implement cUSDT preparation, slot reservation, encrypted deposit, masked dashboard, explicit local reveal, and maturity states.

18. **Withdrawal and settlement UX**
    - Implement immediate/routing/FIFO/settlement/claim states and permissionless recovery actions.

19. **Draw verification and winner UX**
    - Implement epoch timeline, explorer evidence, FHE draw state, public proof, finality delay, ACL propagation, prize reveal, and prize claim.

20. **Recovery, security, performance, and release hardening**
    - Complete failure simulations, accessibility/mobile review, CSP/privacy review, final Sepolia ACL rerun, final HCU/gas gate, role audit, manifest freeze, README/security/privacy/runbook documents, and reproducible demo.

## 3. Repository Structure

Create this production structure only when implementation is authorized:

```text
/
|-- apps/
|   `-- web/
|       |-- src/
|       |   |-- app/
|       |   |-- components/
|       |   |-- features/
|       |   |   |-- asset/
|       |   |   |-- deposit/
|       |   |   |-- position/
|       |   |   |-- epochs/
|       |   |   |-- winner/
|       |   |   |-- withdrawal/
|       |   |   `-- privacy/
|       |   |-- lib/
|       |   |   |-- contracts/
|       |   |   |-- fhe/
|       |   |   |-- rpc/
|       |   |   |-- privacy/
|       |   |   `-- status/
|       |   |-- styles/
|       |   `-- test/
|       |-- public/
|       `-- vite.config.ts
|-- packages/
|   |-- contracts/
|   |   |-- contracts/
|   |   |   |-- ConfidentialPrizePool.sol
|   |   |   |-- PoolVrfAdapter.sol
|   |   |   |-- SettlementController.sol
|   |   |   |-- strategies/
|   |   |   |   `-- DeterministicTestYieldVault.sol
|   |   |   |-- interfaces/
|   |   |   |-- libraries/
|   |   |   `-- test/
|   |   |-- deploy/
|   |   |-- scripts/
|   |   |   |-- health/
|   |   |   `-- recovery/
|   |   |-- test/
|   |   |   |-- unit/
|   |   |   |-- fhe/
|   |   |   |-- property/
|   |   |   |-- invariant/
|   |   |   `-- integration/
|   |   `-- hardhat.config.ts
|   `-- shared/
|       |-- src/
|       |   |-- abi/
|       |   |-- deployment/
|       |   |-- enums/
|       |   |-- schema/
|       |   `-- status/
|       `-- test/
|-- deployments/
|   `-- sepolia.json
|-- docs/
|   |-- product/
|   |-- architecture/
|   |-- design/
|   |-- spec/
|   |-- research/
|   |-- README-plan.md
|   |-- SECURITY-plan.md
|   |-- PRIVACY-plan.md
|   `-- RUNBOOK-plan.md
|-- scripts/
|   |-- verify-deployment.ts
|   `-- check-private-output.ts
|-- .env.example
|-- package.json
|-- pnpm-workspace.yaml
`-- pnpm-lock.yaml
```

Rules:

- Do not create a backend or database source of truth.
- Do not import disposable spike contracts into production.
- Share generated ABI/types through `packages/shared`; do not hand-copy them.
- Keep recovery scripts idempotent and bound to explicit deployment/request IDs.
- Store no secrets in repository files, command output, deployment manifests, or frontend variables.

## 4. Dependencies

### 4.1 Validated baseline

The technical spike passed with:

| Component | Validated version |
| --- | --- |
| Node | `22.22.3` |
| pnpm | `11.2.2` |
| Hardhat | `2.28.6` |
| Solidity | `0.8.27` |
| EVM target | Cancun |
| `@fhevm/solidity` | `0.11.1` |
| `@fhevm/hardhat-plugin` | `0.4.2` |
| `@fhevm/mock-utils` | `0.4.2` |
| `@zama-fhe/relayer-sdk` | `0.4.1` |
| `@openzeppelin/confidential-contracts` | `0.4.0` |
| `@openzeppelin/contracts` | `5.6.1` |
| ethers | `6.16.0` |

The research baseline also identified Zama SDK/React SDK `3.4.0` for the frontend.

### 4.2 Pinning policy

- At implementation start, compare current official manifests and compatibility notes with the validated baseline.
- Prefer the exact validated versions unless a security fix or compatibility requirement justifies an upgrade.
- Any Zama/OpenZeppelin version change requires rerunning all FHE semantic, ACL, HCU, and Sepolia tests.
- Pin exact package versions, compiler build, EVM target, lockfile, and package-manager version.
- Use one Hardhat deployment/test system. Do not maintain a second production deployment stack.
- Use TypeScript property/state-model tests (for example `fast-check`) for fuzz/property coverage.

### 4.3 Frontend stack

Freeze the frontend architecture to:

- React + TypeScript + Vite;
- wagmi/viem for wallet and public chain access;
- current compatible Zama React/high-level SDK for encryption/decryption;
- TanStack Query or wagmi query primitives for canonical read caching;
- `lucide-react` for icons;
- CSS Modules plus global CSS custom-property design tokens;
- no broad component framework unless design implementation proves a concrete accessibility need.

The implementation must use current Zama APIs, not obsolete `fhevmjs` tutorial patterns.

## 5. Contract Implementation Requirements

### 5.1 `ConfidentialPrizePool.sol`

- Constructor immutables: cUSDT, VRF adapter, settlement controller, timelock, pause guardian, and bootstrap authority. Epoch duration, timeouts, slot bond, ACL delay, liquidity target, and the 16-slot capacity are public compile-time constants; the constructor configuration struct must match those constants exactly.
- Constructor starts in `BOOTSTRAP` with the deployment Safe as one-time bootstrap authority and no epoch/user actions enabled. `activate()` must verify controller/adapter reverse bindings and immutable configuration, open epoch `1` at the activation timestamp, enable user actions, and clear bootstrap authority permanently.
- Capacity is compile-time `16` and cannot be passed as a deployment parameter.
- Fees are absent; do not implement fee storage or setters.
- Use checks-effects-interactions and a reentrancy guard around token callbacks/transfers and settlement callbacks.
- Normalize uninitialized encrypted values to trivial encrypted zero before arithmetic.
- Restore `allowThis` on every stored ciphertext and owner allowance on every owner-readable ciphertext.
- Use actual ERC-7984 returned/callback amounts.
- Never emit principal, weight, claim, reserve, or prize amount handles.
- Keep `executeEncryptedDraw` free of all unrelated logic.
- Expose read functions for public lifecycle state and encrypted owner handles, not plaintext values.

### 5.2 `PoolVrfAdapter.sol`

- Inherit the current supported Chainlink v2.5 direct-funding consumer base.
- Keep coordinator/wrapper and timelock configuration immutable.
- Provide bootstrap-Safe-only one-time pool binding with a permanent `poolBound` flag; clear bootstrap authority after binding.
- `requestRandomness` is pool-only and records mapping before external effects where the Chainlink interface permits.
- Callback must not call pool or FHE APIs and should not revert for unknown/duplicate/late records.
- Store first valid word only.
- Expose fulfillment timestamp/block so pool can accept a timely word synchronized later.
- `withdrawSurplus(recipient, amount)` is timelock-only, uses the caller-specified scheduled recipient/amount, and cannot occur with a pending request.

### 5.3 `SettlementController.sol`

- Non-upgradeable, bootstrap-Safe-only one-time pool binding, with immutable timelock and pause guardian; clear bootstrap authority after binding.
- Accept only the immutable cUSDT wrapper and public underlying.
- Never receive ERC-7984 operator authority over the pool. The pool, as cUSDT owner, initiates every principal unwrap and fixes the controller as public-underlying recipient.
- Use one active settlement globally.
- Store settlement IDs, stages, proofs/handles, public caps, attempts, and exact balance snapshots.
- Use balance deltas for public assets and wrapper returns.
- Separate principal cost basis from yield.
- Require strategy `asset()` match.
- Keep redemption/recovery enabled during pause/loss mode.
- Do not accept admin-supplied prize amounts.
- Strategy replacement uses one external `TimelockController` delay only. The executed call requires the timelock caller, no active settlement, old shares zero, and source/asset/mode checks available to deployment tooling.
- For redemption/harvest return, wrap the exact public balance delta directly to the pool. Rely on the wrapper's recipient permission for the pool and transient return permission for the controller, then forward that exact handle only through the route- and settlement-bound callback. The controller must not provide a free-form confidential amount or recipient.

### 5.4 `DeterministicTestYieldVault.sol`

- Implement standard ERC-4626 over the configured public six-decimal underlying.
- `sponsorTestYield(uint256 assets)` transfers public underlying into the vault and emits sponsor/amount.
- `yieldMode()` returns `TEST` and `strategyId()` is immutable/versioned.
- Do not calculate, display, or emit an APY.
- The Safe guardian may pause deposits immediately; only the timelock may unpause. Deposit pause must not disable withdraw/redeem.
- No privileged withdrawal of depositor assets.

### 5.5 Confidential asset integration

- Require public underlying `decimals() == 6`, cUSDT `decimals() == 6`, and wrapper `rate() == 1`; reject deployment otherwise.
- Verify wrapper does not wrap a rebasing/fee-on-transfer underlying unless a validated non-rebasing adapter is between them.
- Reject callbacks from any token other than the immutable cUSDT.
- Reject/return false for unknown route data without changing accounting.
- Account from the actual callback amount even when the requested input was larger.

## 6. Function-Level Requirements

### 6.1 Slot and deposit functions

| Function | Required behavior | Rejections/guards | Events |
| --- | --- | --- | --- |
| `activate()` | Before funds exist, verify adapter/controller both bind back to this pool and immutable token/governance configuration matches; open epoch 1; clear bootstrap authority forever | Wrong/cleared bootstrap caller, missing/mismatched binding/config | `PoolActivated`, `EpochOpened` |
| `reserveSlot()` | Require exactly `0.001 ETH`; assign lowest free slot; map owner; store bond | Paused reservation, duplicate owner, pool full, wrong value | `SlotReserved` |
| `requestWithdrawal(..., closing=true)` | Use the stored principal handle as the allowed amount, ignore the external ciphertext/proof, run the normal immediate/queued path, and mark the slot `CLOSING` | No slot, active ticket | `WithdrawalRequested`, `SlotClosing` |
| `releaseSlot(uint8)` | Return bond to owner after closing, terminal ticket, and all epoch references terminal; clear owner/map | Wrong owner, active liability/reference, reentrancy | `SlotReleased` |
| `onConfidentialTransferReceived(...)` | Validate token/from/route; credit actual amount; add principal and pending weight safely; update aggregates/ACL; emit the exact first eligible epoch (`E+1` when `E` is OPEN, otherwise `E+2` during the post-freeze/pre-open gap) | Deposit paused, no slot, closing slot; encrypted rejection/refund on unsafe addition without an overflow-specific public revert/event | `DepositProcessed` only, no amount |
| `principalHandle(address)` | Return ciphertext handle for authorized user-decryption flow | None; handle is not plaintext | None |
| `weightHandles(address)` | Return eligible/pending handles for the owner's explicit reveal flow | None; ACL, not plaintext branching, enforces access | None |

Deposit acceptance must use the ERC-7984 receiver's encrypted boolean return/refund semantics. The frontend must verify state; no public event may disclose a private amount or secret comparison result.

### 6.2 Epoch functions

| Function | Required behavior | Rejections/guards | Events |
| --- | --- | --- | --- |
| `freezeEpoch(uint64)` | Verify close; copy all 16 owners/weights; compute public commitment; move prize reserve into epoch prize and zero live reserve; mature pending into live eligible; set request deadline/status | Wrong epoch/status, early | `EpochFrozen` |
| `requestEpochRandomness(uint64)` | Call adapter once using epoch/commitment; store request ID and fulfillment deadline | Wrong status, expired, existing request | `EpochRandomnessRequested` |
| `syncEpochRandomness(uint64)` | Read bound adapter record; require `fulfilledAt` within the fulfillment deadline and `fulfilledAt + 24 hours` not elapsed; store word and fulfillment-derived draw deadline | Unknown/mismatch/duplicate/late or expired fulfillment | `EpochRandomnessSynchronized` |
| `executeEncryptedDraw(uint64)` | Run exact 16-slot graph; store/publicize winner handle; set 96-block delay; no other FHE work | Wrong status, expired, repeated, HCU release gate is deployment concern | `EncryptedDrawExecuted` |
| `finalizeWinner(...)` | Verify delay/status/handle/proof/slot; zero path rolls the epoch prize; nonzero path retains the per-epoch prize and allows only that winner; terminalize once | Wrong epoch/handle/clear/proof, replay, early, non-slot | `WinnerFinalized` or `EpochNoWinner`, `EpochTerminal` |
| `abandonUnrequestedEpoch` | Terminalize after request deadline; roll prize | Request exists/not expired | `EpochAbandoned`, `EpochTerminal` |
| `abandonUnfulfilledEpoch` | Terminalize only if no timely adapter fulfillment | Timely word exists/not expired | Same |
| `abandonUnexecutedEpoch` | Terminalize after `fulfilledAt + 24 hours` before winner handle, whether a timely word is still unsynchronized or already in `DRAW_READY` | No timely fulfillment, winner handle exists, not expired | Same |
| `openNextEpoch()` | Open next sequential seven-day epoch after prior terminal/abandoned | Existing OPEN/nonterminal predecessor/loss mode | `EpochOpened` |

The snapshot commitment must include chain ID, pool address, epoch ID, frozen owners, ciphertext handles, close time, and previous terminal epoch ID. It is an audit commitment, not a proof of plaintext values.

### 6.3 Prize functions

| Function | Required behavior | Rejections/guards | Events |
| --- | --- | --- | --- |
| `prizeHandle(uint64 epochId)` | Return that epoch's remaining encrypted prize handle | Unknown epoch; ACL controls decryption | None |
| `claimPrize(uint64 epochId)` | Transfer up to that epoch's remaining encrypted prize to its finalized winner; subtract actual sent; preserve any unpaid epoch remainder | Non-winner, unknown epoch; repeated call may safely transfer zero | `PrizeClaimProcessed(epochId, winner)` without amount |

Prize claim must not require prior local decryption.

### 6.4 Withdrawal functions

| Function | Required behavior | Rejections/guards | Events |
| --- | --- | --- | --- |
| `requestWithdrawal(externalEuint64, bytes, bool closing)` | For `closing=false`, validate input; for `closing=true`, use stored principal and ignore input/proof. Assign monotonically increasing request ID/FIFO sequence; cap to principal; debit once; reduce eligible then pending; attempt immediate transfer; store encrypted remainder; create versioned routing boolean and public handle | No slot, active ticket, malformed proof on normal path | `WithdrawalRequested`, `WithdrawalRoutingProofReady` |
| `finalizeWithdrawalRouting(id, bool, proof)` | Verify exact boolean handle/version; false remainder -> immediate terminal; true remainder -> `QUEUED`; preserve request-time sequence regardless of proof order | Wrong proof/value/version/status/replay | `WithdrawalRouted` |
| `serviceFifoHead()` | Fixed-scan 16 active slot pointers; reject if the oldest nonterminal request is still routing; otherwise pay oldest queued owner `min(remaining, claimLiquidity)`, update actual sent, and create versioned `remaining == 0` boolean | No queued head, older routing-pending request, reentrancy | `WithdrawalPayoutProcessed`, `WithdrawalCompletionProofReady` |
| `finalizeWithdrawalCompletion(id, bool, proof)` | Verify current bool/version; true -> terminal/pop; false -> return to QUEUED same head | Wrong head/proof/version/replay | `WithdrawalCompleted` or routing/status event |
| `withdrawalHandle(id)` | Return encrypted remainder to owner UI | None | None |

The boolean proof schema must contain exactly one boolean handle. It may reveal only whether a confidential remainder exists/is zero.

### 6.5 Settlement functions

| Function | Required behavior | Rejections/guards | Events |
| --- | --- | --- | --- |
| `beginInvestmentSettlement(cap)` | Pool computes bounded encrypted excess over 20% liquidity target; under a reentrancy guard it calls wrapper `unwrap(pool, controller, requestedAmount)`, then subtracts/adds only the wrapper's actual burn handle from/to liquid/in-flight principal and registers that request/handle with the controller | Active settlement, paused/loss mode, zero cap, batch rule not met before timeout | `SettlementStarted` |
| `finalizeInvestmentAggregate(id, clear, proof)` | Verify the exact wrapper unwrap handle/proof; finalize the same unwrap to the controller; deposit only the actual public balance delta; update shares/cost basis and reconcile pool in-flight state | Wrong request/handle/proof/amount/stage; strategy failure remains retryable | Aggregate/deposit/completion events |
| `beginWithdrawalSettlement(cap)` | Compute bounded encrypted total queued; start principal redemption settlement | Active settlement, zero cap | `SettlementStarted` |
| `finalizePrincipalRedemption(id, clear, proof)` | Verify; bound by max withdrawal; withdraw actual assets; wrap the exact received delta directly to the pool; transiently pass the mint handle through the settlement-bound `PRINCIPAL_CLAIM` callback | Wrong proof/stage; failure retryable | Redemption/return/completion events |
| `harvestYield(publicCap)` | Calculate `min(public assets - cost basis, publicCap, uint64.max, wrapper remaining capacity)`; withdraw only that formula result; wrap the actual received delta directly to the pool; pass the mint handle through the settlement-bound `PRIZE_RESERVE` callback | Zero cap/no excess, loss mode, active settlement, no wrapper capacity | `YieldHarvested` and settlement events |
| `onSettlementLiquidityReturned(id, route, actualWrapped)` | Pool-only accounting endpoint callable only by controller; verify active settlement ID, expected immutable route, and exact wrapper-return handle; credit principal-claim liquidity or prize reserve once and restore ACL | Wrong caller/ID/route/handle/stage, replay | `ConfidentialLiquidityReturned` via controller plus route-specific pool state event if needed without amount |
| `retrySettlement(id)` | Resume exact failed stage/intention without new economic input | Wrong ID/terminal/not failed | `SettlementRetried` |
| `enterLossMode()` | Permissionless when assets fall below cost basis; atomically set controller loss/investment pause and apply every pool new-risk pause scope | Condition false | `LossModeEntered`, `PauseScopesAdded` |
| `setStrategy(next)` | Execute a strategy change after the external timelock delay; require investment pause, idle controller, zero actual/tracked old shares, zero deployed-principal cost basis, exact underlying, and public mode/ID | Caller not timelock, investments not paused, active settlement, old shares/cost basis nonzero, wrong asset | `StrategyChanged` |

## 7. Data and State Requirements

### 7.1 Public state

- Immutable contract addresses and compile-time configuration constants; constructor input is checked against the constants.
- Slot address/order/status/bond.
- Epoch IDs, timestamps, enum, snapshot commitment, request ID, random word, winner handle, final winner, outcome.
- Withdrawal request ID/order/status/version and boolean proof handles.
- Settlement IDs/status/kind/cap/clear aggregate/strategy data.
- Pause, loss mode, governance proposal, and deployment metadata. Entering loss mode applies all new-risk pause scopes through the controller-to-pool callback; unpause remains unavailable while loss mode is active.

### 7.2 Encrypted state

- Slot principal, eligible weight, pending weight.
- Frozen weight handles.
- Aggregate principal/liquidity/in-flight/queued/prize values.
- Withdrawal allowed/immediate/remainder values.
- Prize reserve and each epoch's remaining prize; no aggregate winner-credit mapping.
- FHE draw total, threshold, prefixes, crossings, and winner before reveal.

### 7.3 Storage rules

- Use fixed arrays for the 16-slot draw.
- Do not store or iterate an unbounded active participant/claim array.
- Historical mappings by monotonically increasing ID are allowed if no protocol transition loops over history.
- Only one active withdrawal ticket per slot and one active settlement globally.
- `SettlementController.settlementPublic(id)` is the canonical historical settlement read. The pool stores only the active settlement ID, kind, immutable return route, and aggregate handle required to authenticate the next callback.
- `BOOTSTRAP` is a separate deployment flag, not an epoch enum value; no user funds or epoch transitions exist until `activate()` succeeds.
- Persist only draw values required across transactions.
- Version every publicly decrypted boolean handle after encrypted mutation.
- Bind every request/proof to chain, contract, epoch/ticket/settlement ID, handle, and current status.
- Store the wrapper's actual unwrap handle/request ID for investment settlements; never retain the pre-burn requested handle as the authoritative public aggregate.

### 7.4 Confidential arithmetic rules

- Normalize uninitialized handles.
- Widen before multiplication/summing where the spike does.
- Use FHE comparisons and `FHE.select`, never plaintext branching on secret values.
- Treat encrypted arithmetic as wrapping unless explicitly protected.
- A detected unsafe draw total produces the no-award safety path without exposing whether normalization occurred; it never wraps silently.
- Store `allowThis` after every encrypted mutation.

## 8. ACL Rules

### Principal

- Pool persistent access.
- Owner persistent access.
- Token transient access only for a payout transfer.
- No admin, controller, keeper, frontend, indexer, or public access.

### Eligible and pending weight

- Pool persistent access.
- Owner persistent access for explicit private weight reveal.
- Never public.

### Snapshot and draw intermediates

- Pool only.
- Never user/public.
- Winner handle alone becomes public after draw.

### Prize

- Pool persistent access.
- Token transient access on claim.
- Finalized nonzero winner persistent access after proof/delay, restored on every nonterminal claim remainder.
- Nobody else, including Safe/timelock.

### Withdrawal claim

- Pool and owner persistent access.
- Token transient on payout.
- Public receives only routing/completion boolean handles.

### Aggregate settlement

- Pool/controller/wrapper permissions only where the route requires.
- Aggregate amount becomes public by necessity.
- Never make an individual deposit/claim handle public.
- Controller has no blanket/operator permission over the pool's cUSDT. Pool initiates unwrap as owner; controller receives only the public underlying and transient access to exact rewrap return handles needed for the bound callback.

### Mandatory static review

Before release, enumerate every `FHE.allow`, `allowThis`, `allowTransient`, and `makePubliclyDecryptable` call. Each must map to this section. Any unmatched permission blocks deployment.

## 9. Event Requirements

Implement the exact event purposes/payload restrictions in Architecture Section 18.

Rules:

- Events synchronize public state, recovery, and explorer verification.
- No VeilSave-defined event duplicates a principal, weight, pending, deposit, payout, queue amount, reserve, or prize amount handle. Standard ERC-7984 token/wrapper ciphertext-handle events are unavoidable protocol metadata and must not be mistaken for plaintext disclosure.
- Winner handle, settlement aggregate handle, and public-proof boolean handle may appear because they are deliberately public-decryption inputs.
- No secret-derived custom error or event reason may reveal an amount, ordering comparison, overflow operand, or balance.
- Public aggregate strategy assets/shares/amounts are permitted and required.
- All terminal transitions emit an explicit terminal/outcome event.
- Retry events include stable request ID and attempt number.

Add an automated test that scans ABI/event definitions and rejects forbidden amount fields/names unless explicitly allowlisted as aggregate public strategy data.

## 10. State Transitions

### Epoch

Implement exactly:

```text
OPEN -> FROZEN -> RANDOMNESS_REQUESTED -> DRAW_READY -> REVEAL_PENDING -> TERMINAL
FROZEN -> ABANDONED
RANDOMNESS_REQUESTED -> ABANDONED
DRAW_READY -> ABANDONED
```

No transition leaves `TERMINAL` or `ABANDONED`. `openNextEpoch` creates a new record.

### Withdrawal

Implement exactly:

```text
ROUTING_PENDING -> IMMEDIATE_SETTLED
ROUTING_PENDING -> QUEUED
QUEUED -> PAYOUT_STATUS_PENDING
PAYOUT_STATUS_PENDING -> QUEUED
PAYOUT_STATUS_PENDING -> CLAIMED
```

### Settlement

Implement exactly:

```text
IDLE
 -> AGGREGATE_DECRYPT_PENDING
 -> STRATEGY_ACTION_PENDING
 -> REWRAP_PENDING
 -> LIQUIDITY_RETURN_PENDING
 -> COMPLETED
 -> IDLE

nonterminal -> FAILED_RETRYABLE -> prior pending stage
```

Transition tests must assert allowed and forbidden pairs, state writes, events, and unchanged state after revert.

## 11. Invariants

The following are release-blocking invariants:

### Accounting

1. User principal increases only by actual cUSDT received.
2. Principal decreases only by actual immediate payment or an irrevocable encrypted ticket created once.
3. For each user, cumulative actual principal deposits equal live principal plus unpaid withdrawal claims plus cumulative actual principal payouts; slot bond and prizes are excluded from this identity.
4. `eligibleWeight + pendingWeight <= principal` outside explicitly modeled atomic intermediate state.
5. Frozen snapshot never changes after `freezeEpoch`.
6. Prize reserve/per-epoch prize never satisfies principal debt.
7. Principal liquidity/settlement return never credits prize unless route is authenticated yield harvest.
8. Strategy settlement cannot create assets; public balance deltas reconcile.
9. Public deployed-principal cost basis increases/decreases only with actual principal strategy flows.
10. Harvested yield never exceeds public strategy assets above deployed-principal cost basis.
11. Aggregate queued principal debt equals the sum of nonterminal encrypted ticket remainders, subject only to an explicitly modeled atomic mutation.
12. Sum of encrypted ticket payments never exceeds returned confidential claim liquidity.
13. Investment accounting subtracts from liquid principal and adds to in-flight principal only the wrapper's actual burn handle; any unburned requested difference remains liquid.
14. Controller cannot burn or transfer pool cUSDT outside a pool-initiated, settlement-bound unwrap, and every returned cUSDT handle is credited exactly once to its immutable principal/prize route.

### Draw

15. At most one VRF request per epoch.
16. Used request ID maps to the same epoch/snapshot commitment.
17. Callback performs no FHE work.
18. At most one encrypted draw execution succeeds per epoch.
19. `T > 0` selects exactly one positive-weight nonzero slot.
20. `T = 0` selects zero winner.
21. Zero-weight/empty slots never win.
22. Winner/prize finalization occurs at most once.
23. A terminal timeout never enables another random word.

### ACL/privacy

24. Principal decrypts only for owner.
25. Snapshot/intermediates never decrypt for users/public.
26. Prize decrypts only for finalized winner.
27. Admin/keeper/relayer/frontend/indexer have no prize access.
28. Only allowlisted public handles are public-decryptable.

### Withdrawal/FIFO

29. One active ticket per slot.
30. A ticket's principal debit occurs once.
31. FIFO sequence is assigned in the withdrawal request transaction and never changes with proof timing.
32. An older `ROUTING_PENDING` ticket prevents service of every later queued ticket.
33. Only the lowest-sequence queued head receives claim liquidity.
34. False completion proof cannot advance head.
35. True completion proof advances exactly once.
36. Failed strategy/transfer/proof leaves unpaid claim and order intact.
37. Repeated claim after completion transfers encrypted zero/no funds.

### Governance/liveness

38. Pause never blocks progression of an already-open epoch, existing withdrawals, redemptions, proof finalization, queue service, or prize claims.
39. Strategy cannot change with shares, active settlement, wrong asset, or before the external timelock.
40. No role can change capacity, fees, cadence, randomness, frozen weights, winner, or prize recipient.
41. Before activation no user funds/state can enter; after activation every bootstrap authority is permanently disabled and cannot rebind any component.

## 12. Test Plan

### 12.1 Unit tests

Test every function, modifier, constructor constraint, enum transition, timeout boundary, event, and negative guard.

Required unit groups:

- slot reserve/duplicate/full/wrong bond/release/reentrancy;
- bootstrap unauthorized/wrong-binding activation, every pre-activation user-action rejection, and irreversible authority clearing;
- actual deposit amount, zero/rejected callback, wrong token/route, pause;
- principal/pending/eligible mutation and maturity;
- epoch timing, snapshot commitment, terminal/open-next;
- VRF request mapping/callback/synchronization/timeout;
- winner proof/delay/finalization/zero winner/prize claim;
- withdrawal routing, head service, versions, completion;
- strategy deposit/redeem/harvest/loss/replacement;
- all pause scopes and irreversible bootstrap locks.

### 12.2 FHE semantic tests

- Actual ERC-7984 encrypted transfer amount and ACL.
- Exact 1:1 base-unit wrap/unwrap behavior and deployment rejection for non-six-decimal or non-unit-rate configuration.
- Safe increase/decrease and uninitialized normalization.
- Eligible-first then pending withdrawal reduction.
- Snapshot immutability after live withdrawal.
- Exact weighted draw vectors A-J from the spike.
- Winner public decryption/KMS proof.
- Winner-only prize user decryption; all negative actors.
- Routing/completion boolean public proof with wrong handle/value/version/replay.
- Aggregate settlement public proof and exact rewrap.
- Pool-owned unwrap, actual wrapper burn-handle reconciliation, absence of controller token-operator authority, and route-bound direct-to-pool rewrap callback.

### 12.3 Property-based tests

- Plaintext oracle matches multiply-high threshold for exhaustive reduced bit widths.
- Exactly one first crossing for positive total.
- Selection frequency tracks arbitrary valid weight vectors.
- Scaling every weight by a common positive factor preserves probabilities where no overflow occurs.
- Zero weights do not alter probabilities.
- Slot permutation only permutes outcome labels.
- Withdraw/deposit sequences preserve liability invariants.
- FIFO model and contract transition traces match across randomized requests, liquidity returns, retries, and failures.

### 12.4 Fuzz tests

- `euint64` boundaries, near-overflow sums, zero, maximum, and requested-over-principal.
- All 16 slot occupancy patterns, sparse weights, duplicates rejected, slot close/reopen timing.
- Epoch calls around every timestamp/block boundary.
- Request IDs, reordered callbacks, duplicate callbacks, late callbacks.
- Malformed cleartext/proof/handle arrays.
- Public settlement caps, strategy `maxWithdraw`, partial balance deltas, repeated retries.
- Public strategy assets/yield above `uint64.max`, wrapper capacity exhaustion, and capped multi-harvest recovery without overflow.
- Queue versions and stale completion proofs.

### 12.5 Invariant tests

Implement a stateful randomized actor suite covering all 41 invariants in Section 11. At minimum include actors: 16 users, arbitrary caller/keeper, bootstrap authority, guardian, timelock, malicious non-winner, wrapper, strategy, and VRF coordinator harness.

### 12.6 Integration tests

- Public underlying -> cUSDT wrap -> slot -> encrypted deposit.
- Epoch maturity -> freeze -> VRF request/callback/sync -> draw -> proof -> ACL -> prize claim.
- Deposit after freeze affects later epochs only: an `OPEN E` deposit first participates in `E+1`, while a post-freeze/pre-next-open deposit first participates in `E+2`.
- Withdrawal before and after snapshot.
- Invest aggregate -> sponsor test yield -> harvest -> prize reserve.
- Full immediate withdrawal.
- Partial immediate -> routing proof -> FIFO -> redemption -> service -> completion.
- Multiple FIFO tickets with partial liquidity, out-of-order routing proofs, an older unclassified request, and strict request-time ordering.
- Strategy failure/retry and wrapper/relayer simulated failure.
- Pause/loss mode with exits still functioning.

### 12.7 Sepolia tests

Run and capture transaction/evidence records for:

1. cUSDT wrap and encrypted deposit.
2. Owner principal user decryption and unauthorized negative test where supported.
3. Maturity/freeze for a 16-slot-shaped epoch.
4. Chainlink request, fulfillment, and pool synchronization.
5. Final 16-slot draw HCU/depth/gas.
6. Public winner proof after 96 blocks.
7. Winner-only prize decryption after observed ACL propagation.
8. Prize claim.
9. Immediate principal withdrawal.
10. Queued withdrawal, public aggregate redemption, confidential return, FIFO completion.
11. Same-settlement retry after controlled strategy failure on a rehearsal/test strategy.

### 12.8 Failure tests

- RPC unavailable/stale/reorged receipt.
- Zama relayer encryption unavailable.
- KMS public decryption unavailable.
- ACL grant not propagated.
- VRF underfunded request, callback delay, duplicate/late fulfillment.
- Draw transaction revert before deadline.
- Strategy deposit/redeem pause and insufficient liquidity.
- Wrapper unwrap/rewrap failure.
- FIFO head absent, false completion, stale proof, recipient offline.
- Frontend account/network switch mid-flow.

### 12.9 Privacy/output tests

- Scan event ABI, source logging, frontend console calls, analytics hooks, URLs, errors, screenshots, and test fixtures for private amounts.
- Verify masked default and explicit reveal.
- Confirm plaintext is not persisted to localStorage/session analytics.
- Confirm test-yield labels and public verification limitation appear in every relevant view.
- Confirm privacy copy distinguishes decryption authority from inference and covers known-reserve, singleton-batch, and public test-yield correlation cases.

## 13. Deployment Plan

### 13.1 Required environment

Server/deployment environment variables, never committed:

```text
SEPOLIA_RPC_URL
DEPLOYER_PRIVATE_KEY
ETHERSCAN_API_KEY
SAFE_ADDRESS
TIMELOCK_MIN_DELAY_SECONDS=86400
```

All Chainlink/Zama/token/strategy addresses are resolved into a reviewed deployment input file immediately before deployment, not placed in `.env.example` as permanent defaults.

Frontend public variables:

```text
VITE_CHAIN_ID=11155111
VITE_RPC_URL
VITE_DEPLOYMENT_MANIFEST_URL
VITE_BLOCK_EXPLORER_URL
```

Contract addresses and strategy mode come from the signed/versioned deployment manifest, not independent environment variables that can drift.

### 13.2 Deployment manifest schema

Include:

- schema version;
- product/contract release version and source commit;
- chain ID and deployment block;
- every contract/external address and runtime code hash;
- verified-source URL;
- cUSDT underlying/decimals/wrapper rate/config;
- strategy address, ID, mode, asset, deployment block;
- VRF wrapper/coordinator/request confirmations/callback gas/words;
- pool capacity, cadence, deadlines, bond, ACL delay, liquidity target;
- Safe/timelock/guardian roles, including Safe proposer/canceller, open executor, and timelock self-admin;
- HCU/depth/gas evidence file hashes; and
- live ACL validation evidence hash/date.

### 13.3 Deployment order

Use the exact order in Architecture Section 21.3. One-time binding and role setup must be completed in one reviewed deployment session before public activation. The deployer must end with no privileged role beyond any explicitly documented Safe membership.

### 13.4 Post-deploy checks

- Chain/code hashes match manifest.
- Pool/controller/adapter bindings are locked, pool is active, epoch 1 opened at activation, and every bootstrap authority is zero/disabled.
- Capacity/fees/configuration are immutable and correct.
- Safe/timelock roles match policy; deployer roles removed.
- cUSDT round trip and callback succeed.
- Strategy asset/mode/source match.
- VRF adapter funded and request works.
- Source verified for every app contract.
- Full Sepolia acceptance sequence passes.
- Frontend refuses wrong chain or manifest/code mismatch.

### 13.5 Aave policy

Do not activate or label an Aave strategy unless a new current-state run proves:

- correct official addresses and code;
- supply succeeds;
- adapter receives non-rebasing shares;
- redemption succeeds with exact reconciliation;
- nonzero strategy return is observed or the UI makes no return claim;
- loss/liquidity behavior passes tests; and
- timelock replacement prerequisites are satisfied.

`SUPPLY_CAP_EXCEEDED` remains the current blocker.

## 14. Frontend Implementation Requirements

### 14.1 Routes/screens

- `/`: pool overview and connected dashboard as the first screen, not a marketing landing page.
- `/draws/:epochId`: public draw verification and winner status.
- `/history`: compact epoch/settlement history.
- `/privacy`: formal privacy boundary and trust disclosure.
- Deposit, withdraw, slot, prize-reveal, and recovery actions use focused dialogs/drawers rather than separate marketing pages.

### 14.2 Data source

- Read canonical contract state directly through configured RPC.
- Use events for history and optimistic discovery, then confirm with current state.
- Mark cache stale after account/network change, new block gap, reorg, or relevant transaction.
- Optional indexer/cache must have direct-RPC fallback and cannot supply private values or authoritative status.

### 14.3 Confidential-value component contract

Every private value component supports:

```text
masked
permit-required
permit-signing
decrypting
revealed
stale
unavailable
error-retryable
remasked
```

- Masked display: `****** cUSDT` or `Private`, never `0` for unknown/uninitialized.
- Reveal requires explicit action and names the contract permit scope.
- Plaintext remains component/session memory only.
- Deposit/withdraw/prize changes mark reveal stale.
- Account/network change clears reveal immediately.

### 14.4 Transaction operation model

Persist nonprivate operation metadata locally:

- operation type;
- public request/epoch/ticket/settlement ID;
- tx hash and replacement hash;
- expected next public state;
- last checked block/time; and
- retry action.

Do not persist plaintext amount, encrypted input proof, decryption output, transport private key, or secret-bearing error object.

### 14.5 Required user states

- Wallet: disconnected, wrong network, rejected, changed account.
- SDK: loading, ready, unsupported, relayer unavailable.
- Asset: faucet/unavailable, wrap pending/failed/ready.
- Slot: available, reserving, reserved, full, closing, releasable.
- Deposit: editing, encrypting, proof ready, signing, submitted, confirmed, callback/state verified, failed.
- Position: masked, reveal flow, pending/eligible/frozen, stale.
- Draw: every public state in the frozen timeline.
- Winner: proof pending, finality wait, finalized, ACL propagating, reveal, claim.
- Withdrawal: request, routing proof, immediate, queued, FIFO position, settlement stage, service, completion proof, terminal.
- Protocol health: RPC, relayer/KMS, VRF funding, strategy/loss, pause.

### 14.6 Public verification copy

Render verbatim:

> Balances and odds remain hidden. The public can verify the randomness and authenticated execution trail, but cannot independently recompute the weighted result from plaintext balances.

Do not use "cryptographically proves all balances were correct" or equivalent stronger language.

### 14.7 Privacy/security implementation

- Strict CSP with no unsafe inline script in production.
- No third-party analytics/session replay on pages handling private values.
- Redact wallet/RPC errors before reporting.
- No amount in URL, DOM data attribute, console, telemetry, toast ID, or notification payload.
- Explicit permit TTL and scope display using current SDK defaults/guidance.
- Support manual remask and clear on tab/session lifecycle as designed.

## 15. Design Integration Requirements

The design must implement `docs/design/design-brief.md` without inventing product behavior.

- Use an operational dashboard layout, not a marketing hero.
- First viewport identifies VeilSave and exposes the actual pool state/actions.
- Use public status timelines, tables, and compact panels rather than decorative card stacks.
- Use Lucide icons for familiar actions and tooltips for unfamiliar icons.
- Use 8px or smaller radii unless accessibility requires otherwise.
- No nested cards, gradient-orb decoration, misleading vault imagery, fake APY chart, or animated plaintext prize leak.
- Stable dimensions for timeline nodes, icon controls, address rows, and private-value fields.
- Do not scale fonts by viewport width or use negative letter spacing.
- Validate desktop/mobile widths and long addresses/status copy for overlap.
- Respect `prefers-reduced-motion`; draw animation never substitutes for status evidence.

Design review must compare every screen/state against product and contract enum coverage.

## 16. Error and Recovery Implementation

### 16.1 Contract rules

- Store stable IDs before waiting on external systems.
- Reverts leave authoritative state unchanged.
- Retry functions reuse stored intent and cannot accept a new amount, word, winner, or recipient.
- Terminal states reject late success.
- Secret comparisons return encrypted state/boolean proof, not distinct plaintext reverts.
- Paused state preserves exits/recovery.

### 16.2 Frontend rules

- Wallet submission is not success; wait for canonical receipt and state verification.
- On uncertain receipt, query nonce/hash/state before enabling retry.
- Encryption retry creates a new proof; onchain retry uses existing IDs where applicable.
- Public proof retrieval failure does not resubmit draw or settlement state.
- User-decryption failure does not resubmit ACL/finalization.
- Show the exact safe action from Product Section 8.9.
- Include explorer link, stable ID, last successful stage, and retry scope in recovery panels.

### 16.3 Recovery scripts

Provide read-first, explicit-ID scripts for:

- resume known VRF request/epoch;
- synchronize a fulfilled word;
- retry draw for fixed epoch;
- retrieve/submit winner proof for fixed handle;
- inspect ACL propagation and retry winner user-decryption;
- resume settlement at stored stage;
- service/finalize FIFO head;
- verify pause-safe withdrawals; and
- verify manifest/code/roles.

Scripts must refuse unknown chain, missing manifest, nonmatching contract/request bindings, or terminal state. They must never request replacement randomness.

## 17. Security Checklist

### Before contract merge

- [ ] External call and reentrancy review.
- [ ] Actual-amount accounting review.
- [ ] Encrypted overflow/underflow review.
- [ ] Every `allow*` and public-decrypt call mapped to ACL spec.
- [ ] State transition and replay binding review.
- [ ] Bootstrap binding/activation/authority-erasure review.
- [ ] Slot reuse and one-ticket bound review.
- [ ] Principal/prize/route separation review.
- [ ] Callback storage-only review.
- [ ] No secret-dependent public branch/error/event/gas-shape review.
- [ ] Governance capability diff proves forbidden powers absent.

### Before Sepolia deployment

- [ ] Dependency advisories and exact versions reviewed.
- [ ] Current Zama/Chainlink/token/wrapper/strategy configuration verified.
- [ ] Timelock/Safe addresses and role grants independently checked.
- [ ] Source verification metadata reproducible.
- [ ] VRF funding budget and explicit request gas tested.
- [ ] Strategy loss/redeem/replace behavior tested.
- [ ] CSP, dependency, logging, and analytics privacy review completed.

### Before public production-like demo

- [ ] Independent code review of draw, ACL, accounting, settlement, and governance.
- [ ] Final HCU/depth/gas release gate passed.
- [ ] Live winner-only decryption and negative ACL evidence passed.
- [ ] FIFO public boolean flow passed live.
- [ ] Pause still permits every exit/recovery.
- [ ] `TEST YIELD` label appears in manifest, contract metadata, UI, and docs.
- [ ] Known limitations and wallet-loss risk published.

## 18. Performance Checklist

- [ ] Fixed 16 slots; no dynamic draw iteration.
- [ ] Draw global HCU <= `17,000,000`.
- [ ] Draw sequential-depth HCU <= `4,000,000`.
- [ ] Draw ordinary gas <= `3,500,000`, or documented approved exception with >=30% network headroom.
- [ ] 32-slot regression remains rejected/not deployable.
- [ ] No strategy/prize/withdrawal/proof logic in draw transaction.
- [ ] Snapshot/maturity HCU/gas measured separately.
- [ ] FIFO routing/service/completion HCU measured separately.
- [ ] Settlement proof/rewrap gas measured under maximum bounded amounts.
- [ ] VRF callback stays within configured 100,000 gas and performs no FHE.
- [ ] Frontend bundle excludes unused crypto/UI dependencies and supports SDK fallback behavior.
- [ ] Draw/status layout has stable dimensions under loading/error/long-address states.
- [ ] Async operations remain recoverable after browser reload using public IDs only.

## 19. Definition of Done

### Milestone gates

| Milestone | Definition of done |
| --- | --- |
| M0 Foundation | Exact versions pinned; CI/lint/type/test commands pass; no secrets; manifest schema exists |
| M1 Asset | Six-decimal cUSDT actual-amount wrap/deposit/unwrap/rewrap and ACL tests pass |
| M2 Accounting | Slots, bonds, principal, pending/eligible, maturity, pause, and conservation invariants pass |
| M3 Withdrawal | Immediate + strict FIFO routing/completion/retry/loss/pause tests pass with max 16 active tickets |
| M4 Settlement | Test vault, aggregate proof, public strategy, rewrap, routes, harvest, loss, replacement tests pass |
| M5 VRF | Live-compatible request/fulfillment/sync/timeout/no-reroll suite passes |
| M6 Draw | Exact 16-slot oracle/property/FHE suite passes and HCU targets pass locally |
| M7 Winner | KMS proof, 96-block delay, zero-winner, exactly-once prize, winner-only ACL suite passes |
| M8 Integration | Full local system and all failure simulations pass; all invariants remain true |
| M9 Sepolia | Full live evidence including final HCU/gas, ACL/user decrypt, and FIFO path passes |
| M10 Frontend | All defined screens/states/recovery actions/privacy checks/accessibility/mobile checks pass |
| M11 Release | Verified source, immutable roles, manifest, docs, demo, runbook, and final security review complete |

### Documentation deliverables at release

- `README.md`: product, confidentiality value, architecture, demo, deployment, limitations.
- `SECURITY.md`: threat/trust model, role policy, reporting.
- `ARCHITECTURE.md`: deployed component/state/data flows and ADR links.
- `PRIVACY.md`: hidden/public/aggregate/browser boundaries.
- `RUNBOOK.md`: deployment, VRF, draw, ACL, strategy, FIFO, pause/loss recovery.

### P0 traceability matrix

| Bounty requirement | Product requirement | Architecture component | Execution requirement | Acceptance test |
| --- | --- | --- | --- | --- |
| BR-01 Shared pool | PR-01 One cUSDT pool with 16 slots | `ConfidentialPrizePool` + ERC-7984 cUSDT | ER-01 Asset integration, slots, actual deposit accounting | AT-01 Sepolia wrap/deposit and 16-slot shared state |
| BR-02 Principal withdrawable | PR-02 Initiate exit in every normal state; immediate or FIFO | Pool withdrawal tickets + controller redemption | ER-02 Immediate transfer, routing proof, FIFO, pause-safe recovery | AT-02 Withdraw before/during/after draw; partial strategy liquidity; retry |
| BR-03 Yield-generated prizes | PR-03 Strategy excess funds separate encrypted prize reserve | Settlement controller + ERC-4626 strategy + prize route | ER-03 Cost basis, formula-bound harvest, `TEST`/`LIVE` labels | AT-03 Sponsor test yield -> harvest -> encrypted prize; no principal mixing |
| BR-04 Periodic draws | PR-04 One draw per seven-day sequential epoch | Epoch state machine | ER-04 Open/freeze/timeouts/terminal/next epoch | AT-04 Multi-epoch maturity and draw transition tests |
| BR-05 Encrypted deposits | PR-05 Local encryption and actual confidential transfer | ERC-7984 token callback + pool | ER-05 `fromExternal`/transfer-and-call, no plaintext outputs | AT-05 Calldata/event inspection and owner decrypt |
| BR-06 Encrypted balances | PR-06 Principal/weights masked and owner-only | Pool encrypted ledgers + ACL | ER-06 `euint64` state, owner/pool permissions, negative decrypt | AT-06 Owner succeeds; public/admin/other user fail |
| BR-07 Encrypted winnings | PR-07 Encrypted reserve/credit/claim | Pool prize accounting + cUSDT | ER-07 Never publicize prize; confidential claim | AT-07 Prize stays masked/onchain encrypted and transfers confidentially |
| BR-08 Winner selection over encrypted balances | PR-08 `P(i)=w_i/T`, mature encrypted weights | 16-slot FHE draw | ER-08 Exact spike algorithm, fixed snapshot, no plaintext oracle in contract | AT-08 Vectors/property/statistical/FHE/Sepolia draw tests |
| BR-09 Publicly verifiable draw lifecycle | PR-09 Freeze -> VRF -> FHE tx -> handle -> KMS proof -> winner | Epoch, VRF adapter, event model, verification UI | ER-09 Bound requests, storage callback, explorer timeline, limitation copy | AT-09 Explorer-linked end-to-end evidence and wrong-binding negatives |
| BR-10 Winner-only prize decryption | PR-10 Only finalized winner reveals prize | Winner proof + prize ACL | ER-10 96-block delay, exact proof, `FHE.allow` winner only | AT-10 Winner decrypts; loser/admin/keeper/relayer fail live/local |
| BR-11 Sepolia deployment | PR-11 Reproducible public deployment | Deployment model/manifest/verified contracts | ER-11 Revalidate inputs, deploy order, source verification, health checks | AT-11 Chain `11155111`, code hashes, full live acceptance run |

### Major technical-constraint traceability

| Constraint | Frozen implementation requirement | Blocking check |
| --- | --- | --- |
| Fixed 16 slots | Compile-time array/constant | Source/static test and HCU run |
| Separate VRF/FHE transactions | Adapter callback stores only; pool draw separate | Callback trace and transaction evidence |
| Winner ACL delay | 96-block finalization gate plus propagation UI | Early rejection and live latency evidence |
| Aggregate strategy boundary | Only authenticated aggregate clear amounts cross | Event/calldata and privacy test |
| Test-yield fallback | `yieldMode=TEST`, sponsor event, no APY | Contract/manifest/UI label test |
| Queued withdrawals | One active encrypted FIFO ticket per slot | Partial/retry/pause integration suite |
| Final HCU validation | <=17M global and <=4M depth | Local and Sepolia release gate |

### Global release definition

The product is done only when every milestone and traceability row is green, all required documentation exists, and the known live gates are evidenced. A polished UI does not compensate for a failed ACL, HCU, settlement, or privacy gate.

## 20. Explicit Non-Goals

The implementation agent must not build:

- more than 16 slots;
- dynamic/unbounded participant or active-claim arrays;
- multiple pools, assets, live strategies, winners, or prize tiers;
- public balance, weight, total, claim amount, reserve, or prize decryption;
- offchain plaintext winner selection or trusted winner backend;
- a custom randomness source, KMS, MPC, or ZK proof system;
- VRF callback FHE work;
- PoolTogether V5 TWAB/tier/liquidation/auction/cross-chain machinery;
- rebasing aToken wrapping without the validated non-rebasing ERC-4626 boundary;
- protocol fees or admin fee setters;
- core proxy upgrades;
- admin prize/balance recovery or reauthorization;
- prize expiry;
- NFTs, transferable tickets, governance token, DAO, referrals, clubs, teams, chat, or social graph;
- leverage, yield routing/optimization, insurance, bridges, or mainnet deployment;
- a generalized backend/indexer/analytics platform;
- automatic private-value reveal or private-value telemetry; or
- production claims that `TEST YIELD` is organic or that hidden weights are independently plaintext-verifiable.

**Execution specification status: READY FOR A SEPARATE IMPLEMENTATION PHASE. PRODUCTION IMPLEMENTATION HAS NOT STARTED.**
