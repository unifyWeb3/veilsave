# VeilSave Architecture

Status: Frozen MVP architecture

Target network: Ethereum Sepolia (`11155111`)

Authoritative inputs:

- `docs/research/zama-confidential-pooltogether-research-dossier.md`
- `docs/research/zama-confidential-pooltogether-technical-spike-report.md`

Where the research and spike differ, this architecture uses the measured spike result. Production application code has not been started.

## 1. Architecture Summary

VeilSave is one non-upgradeable confidential prize-linked savings pool with exactly 16 public participant slots and one seven-day epoch at a time.

Deployment begins in a no-funds `BOOTSTRAP` lock. A one-time bootstrap authority, the deployment Safe, binds the pool into the adapter/controller, verifies both reverse bindings and immutable addresses, then calls `activate()`. Activation opens epoch `1` with `openedAt = block.timestamp` and `closesAt = openedAt + 7 days`, clears every bootstrap authority irreversibly, and enables user actions. No privileged operator opens any later epoch.

The architecture has four application contracts plus an external confidential asset and standard governance components:

1. `ConfidentialPrizePool`: encrypted principal, weight, epoch, prize, and withdrawal accounting.
2. `PoolVrfAdapter`: Chainlink VRF v2.5 direct-funding request binding and storage-only fulfillment.
3. `SettlementController`: aggregate confidential/public conversion, public ERC-4626 position, harvest, redemption, and recovery.
4. `DeterministicTestYieldVault`: the default Sepolia ERC-4626 `TEST YIELD` strategy.

The public ERC-4626 strategy address may be replaced only through a 24-hour timelock, while the controller is idle and the old strategy position is fully withdrawn. Pool code, capacity, epoch cadence, confidential asset, VRF source, and fee policy are immutable.

The architecture preserves the validated boundaries:

```text
freeze 16 encrypted weights
        |
        v
request Chainlink VRF ----------> storage-only callback
        |                                  |
        +----------------------------------+
                         |
                         v
                separate FHE draw
                         |
                         v
             public encrypted-winner reveal
                         |
                         v
              KMS-proof finalization
                         |
                         v
             winner-only encrypted prize ACL
```

and:

```text
encrypted individual principal
            |
            v
encrypted aggregate settlement
            |
            v
public aggregate amount
            |
            v
SettlementController -> ERC-4626 strategy
            |
            v
public redemption -> confidential rewrap
            |
            v
principal liquidity or encrypted prize reserve
```

## 2. System Context

```text
+---------------------+
| Wallet + Web App    |
| Zama SDK / wagmi    |
+----------+----------+
           | encrypted inputs, transactions, explicit reveal permits
           v
+-----------------------------+
| ConfidentialPrizePool       |
| - 16 slots                  |
| - encrypted liabilities     |
| - epochs and FHE draw       |
| - winner/prize ACL          |
| - FIFO withdrawal tickets   |
+---+---------------------+---+
    |                     |
    | cUSDT               | immutable request binding
    v                     v
+----------------+   +------------------+
| ERC-7984 cUSDT |   | PoolVrfAdapter   |
| + wrapper      |   | Chainlink VRF    |
+-------+--------+   +------------------+
        |
        | aggregate unwrap / rewrap
        v
+--------------------------+
| SettlementController     |
| - public cost basis      |
| - retry-safe batches     |
| - timelocked strategy    |
+------------+-------------+
             |
             v
+--------------------------+
| ERC-4626 Strategy        |
| TEST YIELD by default    |
| live adapter optional    |
+--------------------------+

FHEVM/coprocessor executes ciphertext operations.
Zama relayer/KMS coordinates encryption, public proof, ACL, and user decryption.
Ethereum and public events remain the source of truth.
```

There is no trusted backend. A read-only event cache may improve UX but cannot choose winners, hold private plaintext, authorize prize access, or gate withdrawals.

## 3. Component Architecture

| Component | Responsibility | Data visible to it | Failure effect | Required? |
| --- | --- | --- | --- | --- |
| Web frontend | Encrypt inputs, submit transactions, render public state, perform explicit user reveals | User-entered and locally decrypted plaintext in browser memory | UX unavailable; contracts continue | Yes |
| Wallet | Sign transactions, typed data, and reveal permits | Account and signed intent | Lost/compromised wallet loses control/privacy | Yes |
| ERC-7984 cUSDT | Confidential custody and transfer semantics | Ciphertext balances/amounts; public wrapper actions | Transfer/wrapper pause can delay payouts | Yes |
| ConfidentialPrizePool | Core encrypted liabilities and deterministic draw | Ciphertext handles and public lifecycle state | Core correctness failure | Yes |
| PoolVrfAdapter | Chainlink-specific request and callback boundary | Public request IDs and words | Randomness delay/timeout | Yes |
| SettlementController | Aggregate conversion, strategy accounting, liquidity routing | Aggregate public amounts and strategy state | Deposit/redemption delay | Yes |
| ERC-4626 strategy | Generate/test yield and return public underlying | Public aggregate assets/shares | Illiquidity or loss | Yes |
| FHEVM/coprocessor | Execute encrypted operations | Ciphertexts and operation graph | FHE operations unavailable | Yes |
| Zama relayer/KMS | Input/proof/decryption/ACL coordination | Ciphertexts, permits, transport data | Encryption/decryption delay | Yes |
| Chainlink VRF | Public unpredictable randomness | Request and output | Draw delay/abandonment | Yes |
| Keeper | Calls permissionless progress functions | Public state only | Delay only | Optional |
| Event cache/indexer | Cache public logs and status | Public state only | Stale UI; direct RPC fallback | Optional |
| Safe + timelock | Narrow pause/strategy governance | Public proposals/actions | Strategy or availability governance risk | Yes for production-like Sepolia demo |

## 4. Contract Decomposition

### 4.1 `ConfidentialPrizePool`

**Responsibility**

- Receive actual encrypted cUSDT deposits.
- Manage 16 public slots and refundable public bonds.
- Own encrypted principal, eligible weight, pending weight, internal liquidity, prize reserve, per-epoch prize claim, and queued claim state.
- Freeze immutable epoch snapshots.
- Request and synchronize one bound VRF result.
- Run the exact measured 16-slot FHE draw.
- Verify winner public-decryption proofs and grant winner-only prize ACL.
- Process immediate withdrawals and strict FIFO tickets.
- Route aggregate investment/redemption requests to `SettlementController`.

**State owned**

- Slot owners, status, bond, and one active withdrawal ticket ID per slot.
- User encrypted ledgers.
- Epoch records and frozen arrays.
- Encrypted principal-liquidity, claim-liquidity, prize-reserve, and total-queued aggregates.
- Per-epoch remaining prize handles; no aggregate winner-credit mapping.
- Public withdrawal request sequence and one active ticket pointer per slot; a fixed 16-slot scan derives the request-time FIFO head.
- Public pause flags and immutable configuration.
- One active settlement routing tuple (`id`, kind, route, aggregate handle); historical settlement records are canonical in `SettlementController`.
- One-time bootstrap lock/authority, cleared permanently on activation.

**Key functions**

- `activate()` one time before any user funds can enter.
- `reserveSlot()` payable.
- `releaseSlot(uint8 slot)`.
- `onConfidentialTransferReceived(...)`.
- `freezeEpoch(uint64 epochId)`.
- `requestEpochRandomness(uint64 epochId)`.
- `syncEpochRandomness(uint64 epochId)`.
- `executeEncryptedDraw(uint64 epochId)`.
- `finalizeWinner(uint64 epochId, address clearWinner, bytes proof)`.
- `claimPrize(uint64 epochId)`.
- `requestWithdrawal(externalEuint64 amount, bytes proof, bool closing)`; `closing=true` uses the stored encrypted principal and ignores the external amount/proof.
- `finalizeWithdrawalRouting(uint64 requestId, bool hasRemainder, bytes proof)`.
- `serviceFifoHead()`.
- `finalizeWithdrawalCompletion(uint64 requestId, bool complete, bytes proof)`.
- `beginInvestmentSettlement(uint64 publicCap)`.
- `beginWithdrawalSettlement(uint64 publicCap)`.
- `onSettlementLiquidityReturned(uint64 settlementId, LiquidityRoute route, euint64 actualWrapped)` restricted to `SettlementController`.
- timeout/abandon/open-next-epoch functions.

**Deposit maturity at every epoch status**

- While epoch `E` is `OPEN`, a deposit joins the pending bucket that matures at `freezeEpoch(E)` and is first snapshotted for draw `E+1`.
- After epoch `E` is frozen and before epoch `E+1` opens, the prior maturity boundary has passed. A deposit still joins the single pending bucket, but it matures at `freezeEpoch(E+1)` and is first snapshotted for draw `E+2`.
- `DepositProcessed.pendingEpoch` means the first draw in which that deposit can participate. It is derived from the public status before the callback and never from a private amount.

**Access control**

- Before activation, every amount-bearing or user state-changing pool function reverts; only reads and the exact bootstrap path are available.
- User functions are self-service.
- Epoch progress, proof finalization, settlement start, settlement retry, and FIFO service are permissionless.
- `SettlementController` alone may return categorized confidential liquidity.
- Pause guardian may stop slot reservation, deposits, opening a future epoch, and new investment dispatch.
- Permissionless loss detection atomically applies all four new-risk pause scopes; the timelock cannot remove them while controller loss mode remains active.
- Pause guardian cannot stop freeze/request/draw/abandonment for an already-open epoch, withdrawals, settlement recovery, FIFO service, winner proof finalization, or prize claims.
- No winner setter, balance observer, prize redirect, or admin decrypt function exists.

**Trust assumptions**

- Correct pool bytecode, FHEVM execution, ERC-7984 semantics, KMS proof verification, and external token availability.

**Upgradeability**

- Non-upgradeable. No proxy, implementation setter, delegatecall module, or storage migration hook.

**Failure recovery**

- Every external dependency transition stores an ID before waiting.
- Reverts leave the prior state authoritative.
- Abandonment is one-way and never replaces randomness.
- Exits and claims stay enabled during pause.

### 4.2 `PoolVrfAdapter`

**Responsibility**

- Encapsulate Chainlink VRF v2.5 direct-funding details.
- Accept one request per frozen epoch from the bound pool.
- Bind `requestId -> epochId + snapshotCommitment`.
- Store one fulfilled word and fulfillment block/time.
- Never execute FHE or call the pool in the callback.

**State owned**

- Immutable VRF wrapper/coordinator and timelock configuration.
- One-time bound pool address.
- Request records, word, fulfillment flag, and ignored-callback telemetry.
- Native funding balance.

**Key functions**

- `bindPool(address pool)` one time by the bootstrap authority, then clear that authority irreversibly.
- `requestRandomness(uint64 epochId, bytes32 snapshotCommitment)` only pool.
- `fulfillRandomWords(uint256 requestId, uint256[] words)` callback.
- `getFulfillment(uint256 requestId)` view.
- `fund()` payable.
- `withdrawSurplus(address payable recipient, uint256 amount)` through the timelock only when no request is pending; anyone may replenish funding afterward.

**Access control**

- Only the pool requests.
- Only the configured Chainlink wrapper/coordinator reaches the callback through the supported consumer base.
- Anyone may fund.
- No operator can change a word or associate it with another epoch.

**Upgradeability and pause**

- Non-upgradeable and not pausable for fulfillment. A pool pause may prevent opening future epochs, but it cannot stop the one bound VRF request for an epoch that was already open and frozen.

**Failure recovery**

- Unknown, duplicate, empty, and late callbacks are recorded/ignored without reverting.
- RPC loss is recovered by known request ID.
- The pool accepts a fulfillment after its call deadline only if the adapter proves that fulfillment occurred before the deadline.

### 4.3 `SettlementController`

**Responsibility**

- Own the public ERC-4626 shares and public cost basis.
- Convert encrypted aggregate cUSDT to public underlying through authenticated unwrap.
- Deposit public underlying into the configured strategy.
- Redeem principal liquidity and realized yield.
- Rewrap exact public balance deltas to cUSDT.
- Return categorized confidential liquidity to the pool.
- Preserve active settlement state across failures.
- Enforce idle/drained timelocked strategy replacement.

**State owned**

- Immutable pool, cUSDT wrapper, underlying asset, timelock, and pause guardian after one-time deployment binding.
- Current strategy address and `TEST`/`LIVE` mode.
- Public strategy shares and deployed-principal cost basis.
- One active settlement record per route; MVP permits only one active controller settlement globally.
- Loss mode, deposit/investment pause, and exact public balance reconciliation.

**Key functions**

- `bindPool(address pool)` one time by the bootstrap authority, then clear that authority irreversibly.
- `startInvestment(...)` only pool after encrypted aggregate preparation.
- `finalizeInvestmentAggregate(uint64 clearAmount, bytes proof)` permissionless.
- `startPrincipalRedemption(...)` only pool.
- `finalizePrincipalRedemption(uint64 clearAmount, bytes proof)` permissionless.
- `harvestYield(uint64 publicCap)` permissionless, formula-bound, and capped to the wrapper's remaining supported supply.
- wrapper callbacks/finalizers.
- `retrySettlement(uint64 settlementId)` permissionless.
- `setStrategy(address next)` callable only by the external timelock after its 24-hour delay, and only while idle with zero old shares and the same underlying.
- `enterLossMode()` permissionless when public assets are below deployed principal.

**Access control**

- Pool starts amount-bearing confidential routes.
- Anyone finalizes authenticated proofs or retries deterministic work.
- Timelock changes only the drained strategy pointer.
- Pause guardian stops new investment but not principal redemption or rewrap recovery.

**Trust assumptions**

- Wrapper proof correctness, ERC-4626 behavior, public asset behavior, and strategy solvency/liquidity.

**Upgradeability**

- Non-upgradeable code. Only the strategy address is deliberately mutable under the frozen policy.

**Failure recovery**

- Use actual token balance deltas and returned shares, never intended amounts.
- A failed strategy call retains active settlement/proof binding.
- A failed rewrap retains public underlying for retry.
- An unexpected asset deficit enters loss mode rather than fabricating a successful settlement.

### 4.4 `DeterministicTestYieldVault`

**Responsibility**

- Implement a simple non-rebasing ERC-4626 strategy over the same public underlying used by the cUSDT wrapper.
- Accept deposits/redemptions under standard ERC-4626 accounting.
- Increase `totalAssets` only when a sponsor explicitly donates underlying.
- Emit a clear `TestYieldSponsored` event.
- Provide deterministic test failure switches in non-production test deployments only; the public Sepolia demo deployment must not expose an admin switch that can confiscate assets.

**Mode and labeling**

- Contract metadata returns `yieldMode = TEST`.
- It publishes no APY.
- Donations are `TEST YIELD`, never organic yield.

**Upgradeability and pause**

- Non-upgradeable. The Safe guardian may pause deposits immediately; only the timelock may unpause. Redemptions remain enabled in either state.

### 4.5 External components

- A validated six-decimal ERC-7984 cUSDT and six-decimal public underlying are configured immutably. The MVP requires wrapper `rate() == 1`, so every public/encrypted accounting unit is one underlying base unit and no hidden decimal conversion exists in settlement math.
- If no suitable verified deployment exists at implementation time, the implementation may deploy the current official OpenZeppelin/Zama wrapper implementation without altering its asset semantics. This is an asset dependency, not a new product token design.
- OpenZeppelin `TimelockController` is the sole 24-hour delay mechanism for strategy changes and unpause operations; the controller does not add a second proposal clock.
- A 2-of-3 Safe owns timelock proposer/canceller and immediate pause-guardian roles. Timelock execution is open to any caller after the delay, and the timelock is its own admin.

### 4.6 Why no additional deployed helper contracts

- Draw arithmetic is an internal library or internal functions compiled into the pool.
- ACL proof verification belongs in the pool because it finalizes pool-owned state.
- FIFO routing belongs in the pool because it transforms principal liability.
- Read models and status derivation belong in frontend/shared TypeScript, not a trusted backend contract.

## 5. Data Model

### 5.1 Slot

```text
Slot {
  address owner;                    // public
  SlotStatus status;                // public: FREE, RESERVED, ACTIVE, CLOSING
  uint96 bondWei;                   // public fixed value
  uint64 activeWithdrawalId;        // public
  uint64 lastReferencedEpoch;       // public
  euint64 principal;                // encrypted
  euint64 eligibleWeight;           // encrypted
  euint64 pendingWeight;            // encrypted
}
```

There are exactly `Slot[16]`. The public owner array is the draw's deterministic address order. An empty slot has zero address and encrypted zero weight.

### 5.2 Epoch

```text
Epoch {
  uint64 id;
  EpochStatus status;
  uint64 openedAt;
  uint64 closesAt;
  uint64 frozenAt;
  uint64 requestDeadline;
  uint64 fulfillmentDeadline;
  uint64 drawDeadline;
  uint64 terminalAt;
  uint8 frozenSlotCount;
  bytes32 snapshotCommitment;
  address[16] slotOwners;
  euint64[16] weightSnapshot;
  uint256 vrfRequestId;
  uint256 randomWord;
  uint64 randomFulfilledAt;
  eaddress encryptedWinner;
  uint64 aclGrantNotBeforeBlock;
  address finalizedWinner;
  euint64 epochPrize;
  EpochOutcome outcome;
}
```

`winnerHandle` is derived as `eaddress.unwrap(encryptedWinner)`. `winnerFinalized` is derived from terminal epoch status; neither value is duplicated in storage.

Encrypted intermediate prefixes, comparisons, and threshold should remain transient in the draw transaction unless the exact measured spike persists a value. Adding persistent intermediates requires a new HCU/gas measurement.

### 5.3 Withdrawal ticket

```text
WithdrawalTicket {
  uint64 id;                         // public
  uint8 slot;                        // public
  address owner;                     // public
  uint64 createdAt;                  // public
  uint64 fifoSequence;               // public, assigned with request ID
  uint64 settlementId;               // public association, if any
  uint32 version;                    // public replay binding
  WithdrawalStatus status;           // public
  euint64 requestedAllowed;           // encrypted
  euint64 remainingClaim;             // encrypted
  ebool routingHasRemainder;           // only boolean made public
  ebool completionIsZero;              // only boolean made public
}
```

One slot may have one nonterminal ticket. Historical tickets remain addressable by ID but are never iterated as an unbounded array.

### 5.4 Settlement

```text
Settlement {
  uint64 id;
  SettlementKind kind;               // INVEST_PRINCIPAL, REDEEM_PRINCIPAL, HARVEST_YIELD
  SettlementStatus status;
  uint64 createdAt;
  uint64 publicCap;
  bytes32 aggregateHandle;
  uint64 clearAggregate;
  bytes32 wrapperRequestId;
  uint256 strategySharesBefore;
  uint256 publicAssetsRequested;
  uint256 publicAssetsReceived;
  bytes32 failureCode;
  uint32 attempt;
}
```

Only one active settlement exists in the MVP, preventing cross-route ambiguity.

`SettlementController.settlementPublic(id)` is the canonical historical settlement read. The pool stores only the active settlement ID, kind, immutable return route, and aggregate handle needed to authenticate the next callback, then clears the active ID on completion.

### 5.5 Encrypted aggregate accounting

The pool maintains distinct `euint64` values for:

- aggregate live principal liability;
- confidential principal liquidity;
- principal in transfer to settlement;
- confidential FIFO claim liquidity;
- aggregate queued principal debt;
- prize reserve;
- per-epoch remaining prizes; and
- any prize transfer remainder.

The settlement controller maintains public `deployedPrincipal` and strategy shares because public strategy positions are already observable.

### 5.6 Bootstrap lifecycle

`BOOTSTRAP` is a deployment lifecycle flag, not an epoch status.

```text
contracts deployed with common Safe bootstrap authority
  -> adapter.bindPool(pool)
  -> controller.bindPool(pool)
  -> pool.activate() verifies both bindings/configuration
  -> epoch 1 OPEN
  -> bootstrap authority cleared forever in all three contracts
```

Before activation, slots, deposits, withdrawals, settlements, epoch actions, and VRF requests are disabled and no user funds may enter. If configuration is wrong, abandon the unfunded deployment and redeploy; bootstrap cannot retarget a bound adapter/controller or edit immutable configuration.

## 6. Public Versus Encrypted State

| State | Representation | Pool access | User access | Public access |
| --- | --- | --- | --- | --- |
| Slot owner/order | `address[16]` | Yes | Yes | Yes |
| Slot bond/status | Public scalar/enum | Yes | Yes | Yes |
| Principal | `euint64` | Persistent | Owner persistent | Never |
| Eligible/pending weight | `euint64` | Persistent | Owner persistent | Never |
| Weight snapshot | `euint64[16]` | Persistent | None required | Never |
| Total/threshold/prefix/cross | Encrypted transient | Draw only | None | Never |
| VRF request/word | Public scalar | Yes | Yes | Yes |
| Winner before reveal | `eaddress` | Persistent | None | Handle only after draw |
| Final winner | `address` | Yes | Yes | Yes |
| Epoch prize | `euint64` | Persistent | Finalized winner only after grant | Never |
| Prize reserve/per-epoch claim | `euint64` | Persistent | Finalized epoch winner only | Never |
| Withdrawal request/remainder | `euint64` | Persistent | Owner | Never |
| Routing/completion condition | `ebool` | Persistent | Same authenticated public proof | Boolean only through authenticated public proof |
| Aggregate settlement handle | `euint64` | Pool/controller | None | Publicly decryptable by necessity |
| Aggregate strategy amount | Public integer | Yes | Yes | Yes |
| Strategy shares/assets/mode | Public | Yes | Yes | Yes |

No plaintext private amount appears in events, custom errors, analytics, deployment manifests, or URLs.

## 7. Epoch State Machine

### 7.1 Onchain enum

```text
OPEN
  -> FROZEN
  -> RANDOMNESS_REQUESTED
  -> DRAW_READY
  -> REVEAL_PENDING
  -> TERMINAL

FROZEN | RANDOMNESS_REQUESTED | DRAW_READY
  -> ABANDONED
```

`TERMINAL` and `ABANDONED` are final. Detailed public UI states such as `VRF_FULFILLED`, `DRAW_EXECUTED`, `WINNER_FINALIZED`, and `PRIZE_READY` are derived from the adapter record and epoch fields rather than adding redundant mutable enum states.

### 7.2 Transitions

| From | Function/event | Preconditions | Effects | To |
| --- | --- | --- | --- | --- |
| OPEN | `freezeEpoch` | `block.timestamp >= closesAt` | Copy 16 owner/weight handles; commit; move reserve into epoch prize and zero live reserve; mature pending into live eligible; set request deadline | FROZEN |
| FROZEN | `requestEpochRandomness` | Before request deadline; no request | Adapter creates one request bound to epoch/commitment; store fulfillment deadline | RANDOMNESS_REQUESTED |
| RANDOMNESS_REQUESTED | Adapter callback | Known request; one word | Adapter stores word only; pool status unchanged | RANDOMNESS_REQUESTED |
| RANDOMNESS_REQUESTED | `syncEpochRandomness` | Adapter fulfillment matches, occurred before fulfillment deadline, and its draw deadline has not elapsed | Store word/reference; set `drawDeadline = fulfilledAt + 24 hours` | DRAW_READY |
| DRAW_READY | `executeEncryptedDraw` | Before draw deadline; final draw HCU release gate passed | Run fixed FHE algorithm; store/publicize winner handle; set ACL delay block | REVEAL_PENDING |
| REVEAL_PENDING | `finalizeWinner` | Valid handle/order/proof; after 96 blocks; not finalized | Set public winner; credit/roll prize exactly once; winner-only ACL | TERMINAL |
| FROZEN | `abandonUnrequestedEpoch` | Request deadline passed, no request | Roll prize; reject later request | ABANDONED |
| RANDOMNESS_REQUESTED | `abandonUnfulfilledEpoch` | No timely fulfillment | Roll prize; reject late pool synchronization | ABANDONED |
| RANDOMNESS_REQUESTED | `abandonUnexecutedEpoch` | Timely adapter fulfillment exists but was not synchronized/executed by `fulfilledAt + 24 hours` | Roll prize; reject later synchronization/execution | ABANDONED |
| DRAW_READY | `abandonUnexecutedEpoch` | Draw deadline passed, no encrypted winner | Roll prize; reject execution | ABANDONED |
| TERMINAL/ABANDONED | `openNextEpoch` | No current OPEN epoch and not loss-paused | Open next sequential seven-day epoch | next epoch OPEN |

### 7.3 Time policy

- Epoch duration: 7 days, immutable.
- Frozen-to-request deadline: 24 hours.
- VRF fulfillment deadline: 24 hours from accepted request.
- Timely-fulfillment-to-draw deadline: 24 hours from the adapter's recorded `fulfilledAt`, whether or not a caller has synchronized the word yet.
- Winner public-proof retry: no expiry after `REVEAL_PENDING`.
- Winner ACL grant delay: 96 blocks after the draw transaction.
- Prize claim: no expiry.

### 7.4 Timeout safety

- No timeout creates a second VRF request.
- No terminal epoch can reopen.
- A late callback may remain recorded by the adapter but cannot update an abandoned pool epoch.
- A draw revert leaves `DRAW_READY` unchanged until success or objective deadline.
- Abandonment before an encrypted winner exists rolls the prize forward.
- After `REVEAL_PENDING`, the outcome is never abandoned; proof/decryption remains retryable indefinitely to prevent cancellation after a result may be knowable.

## 8. Withdrawal State Machine

### 8.1 Ticket lifecycle

```text
REQUESTED (transaction intent)
    |
    v
ROUTING_PENDING
    | public proof: no encrypted remainder
    +--------------------------> IMMEDIATE_SETTLED [terminal]
    |
    | public proof: encrypted remainder exists
    v
QUEUED (strict FIFO)
    |
    | aggregate settlement returns confidential liquidity
    v
SERVICE_AVAILABLE (derived for FIFO head)
    |
    | confidential transfer attempt
    v
PAYOUT_STATUS_PENDING
    | public proof: remainder nonzero
    +--------------------------> QUEUED (same head, retryable)
    |
    | public proof: remainder zero
    v
CLAIMED [terminal]
```

### 8.2 Global settlement lifecycle

```text
IDLE
  -> AGGREGATE_DECRYPT_PENDING
  -> STRATEGY_REDEMPTION_PENDING
  -> REWRAP_PENDING
  -> LIQUIDITY_RETURN_PENDING
  -> READY
  -> IDLE

Any nonterminal stage -> FAILED_RETRYABLE -> same stage
```

### 8.3 FIFO rules

- FIFO order is the successful `requestWithdrawal` order, using its monotonically increasing public request ID/sequence.
- One active ticket per slot bounds active queue size to 16.
- The head is the lowest-sequence nonterminal ticket found by a fixed scan of the 16 active slot pointers; no unbounded queue or history scan exists.
- An older `ROUTING_PENDING` ticket blocks service of later queued tickets until its permissionless public routing proof is finalized. Out-of-order proof submission never changes priority.
- Only a head whose status is `QUEUED` can be serviced.
- Service may be called by anyone, but the recipient is fixed to the ticket owner.
- Service pays `min(encryptedRemaining, encryptedClaimLiquidity)`.
- A public-decryptable `remaining == 0` boolean is version-bound and is the only secret-derived value used to advance the public queue.
- A false completion proof keeps the ticket at the head.
- A stale proof, wrong ticket, wrong handle, wrong version, or replay is rejected.
- Prize reserve is never included in claim liquidity.

## 9. VRF Lifecycle

### 9.1 Frozen configuration

- Provider: Chainlink VRF v2.5 direct funding, matching the live-proven spike path.
- Words: 1.
- Request confirmations: 3 for the Sepolia bounty deployment.
- Callback gas limit: 100,000 unless current Chainlink requirements force a revalidated increase.
- Request transaction uses an explicit bounded gas limit; it must not rely blindly on an RPC estimate.
- Wrapper/coordinator addresses are deployment inputs and must be revalidated.

### 9.2 Request binding

The request record includes:

```text
requestId
epochId
snapshotCommitment
requestedAt
fulfillmentDeadline
fulfilled
randomWord
fulfilledAt
```

The pool accepts only the request ID stored in that epoch. Fulfillment order is irrelevant.

### 9.3 Callback responsibilities

The callback may only:

- authenticate the Chainlink caller through the supported consumer base;
- check whether the request is known;
- store the first word and fulfillment metadata;
- ignore/record duplicates or late callbacks; and
- emit a compact event.

It must not:

- call the FHE draw;
- call the pool;
- mutate weights, slots, prize state, or settlement state;
- revert because the pool is paused/terminal; or
- accept user-supplied draw inputs.

### 9.4 Retry and timeout

- A failed request transaction may be retried only while the epoch remains `FROZEN` and has no request ID.
- Once a request ID exists, no second request is possible.
- RPC/poller failure resumes the known request.
- If no fulfillment occurred by the fixed deadline, the epoch is abandoned and later words cannot be used.
- A timely fulfillment may be synchronized later because the adapter stores `fulfilledAt`.
- Synchronization does not extend the draw deadline. If `fulfilledAt + 24 hours` has passed, anyone may abandon the unexecuted epoch even when no synchronization transaction occurred.

## 10. FHE Draw

### 10.1 Exact algorithm

The production implementation must port the operation graph validated by Spike 1, not redesign it.

For exactly 16 slots:

1. Read the frozen encrypted eligible-weight handles and frozen public slot addresses.
2. Normalize empty slots to encrypted zero.
3. Sum weights safely using the validated balanced `euint128` reduction.
4. Detect a total outside the validated `uint64` selection domain and sanitize to the no-award path without a secret-dependent revert.
5. Take the stored VRF word's public low 64 bits `R`.
6. Widen the safe encrypted total `T` to `euint128`.
7. Compute `product = wideT * R` using encrypted-by-public scalar multiplication.
8. Compute `threshold = cast_euint64(product >> 64)`.
9. Compute the validated balanced inclusive encrypted prefix scan.
10. Compute `cross[i] = threshold < prefix[i]` for all 16 slots.
11. Compute first crossing:

```text
match[0] = cross[0]
match[i] = cross[i] AND NOT(cross[i - 1])
```

12. Select each public slot address through encrypted `eaddress` selection.
13. Produce one encrypted winner address, or encrypted zero when no valid crossing exists.
14. Persist only the encrypted winner needed for reveal.
15. Call `FHE.makePubliclyDecryptable(encryptedWinner)`.
16. Emit the epoch ID and winner handle, then end the transaction.

### 10.2 Correctness requirements

- `P(slot i) = w_i / T` for `T > 0`, subject only to negligible 64-bit range-reduction discretization.
- Zero-weight and empty slots cannot win.
- `T = 0` produces zero winner.
- One nonzero slot always wins.
- No plaintext weight, total, threshold, prefix, crossing, or prize amount is produced.
- No secret-dependent revert, branch, array index, loop count, event, or gas shape is introduced.

### 10.3 Draw transaction exclusions

The draw transaction must not include:

- Chainlink request or callback work;
- snapshot construction or pending-weight maturity;
- strategy accounting, harvest, redemption, wrap, or unwrap;
- withdrawal routing, FIFO allocation, or claim transfer;
- winner proof verification;
- winner prize authorization or rollover arithmetic;
- `FHE.allow(prize, winner)`;
- verbose encrypted state/events;
- historical analytics state;
- new FHE operations not present in the measured graph; or
- any attempt to support more than 16 slots.

## 11. ACL and Decryption

### 11.1 Permission matrix

| Ciphertext | Pool | Settlement/controller/token | User | Public |
| --- | --- | --- | --- | --- |
| Principal | Persistent | Token only for transient transfer | Owner persistent | Never |
| Eligible/pending weight | Persistent | None | Owner persistent | Never |
| Epoch snapshot | Persistent | None | None | Never |
| Draw intermediates | Transaction/internal | None | None | Never |
| Encrypted winner | Persistent | None | None before reveal | Public after draw only |
| Per-epoch remaining prize | Persistent | Token transient on claim | Finalized epoch winner persistent | Never |
| Queued claim | Persistent | Token transient on payout | Owner persistent | Never |
| Routing/completion boolean | Persistent | None | None required | Authenticated boolean only |
| Aggregate unwrap amount | Pool/controller as needed | Wrapper/controller | None | Public by necessity |

Every stored ciphertext reused later receives `FHE.allowThis`. Every user permission is explicit and narrow. When a prize claim mutates a remaining epoch-prize handle, the pool must restore only that epoch's finalized-winner permission on the new handle. Transient token permissions are granted only for the transaction performing the confidential transfer.

### 11.2 Winner reveal flow

```text
encrypted winner
  -> make publicly decryptable
  -> wait 96 blocks before prize authorization
  -> public SDK/KMS decryption request
  -> clear winner + KMS proof
  -> FHE.checkSignatures
  -> verify epoch, request, handle, status, and slot
  -> finalize winner once
  -> bind the existing epoch prize as that winner's claim
  -> FHE.allow(epochPrize, winner)
  -> winner user-decrypts after ACL propagation
```

### 11.3 Validation and replay protection

`finalizeWinner` must reject:

- unknown or non-`REVEAL_PENDING` epoch;
- finalization before `aclGrantNotBeforeBlock`;
- handle list not exactly equal to the epoch winner handle;
- cleartext order/ABI mismatch;
- forged KMS proof;
- clear address not authenticated by the handle;
- nonzero address not present in the frozen slot owner array;
- duplicate finalization;
- prize already assigned/rolled; and
- zero winner attempting to receive ACL.

A valid zero winner terminalizes as `NO_WINNER` and rolls the epoch prize forward.

### 11.4 ACL propagation and wallet policy

- UI treats a successful finalization receipt as `ACL propagation pending`, not immediate decryptability.
- Winner user-decryption retries do not mutate contract state.
- Live Sepolia propagation latency must be measured before production deployment.
- Prize and principal permissions are address-specific.
- There is no admin reauthorization, wallet migration, social recovery, or expiry in MVP.
- Lost keys can permanently make principal or prize inaccessible.

## 12. Yield Strategy Boundary

### 12.1 Interface

The configured strategy must implement ERC-4626 over the exact public underlying associated with cUSDT and expose immutable metadata:

```text
asset() -> address
deposit(assets, receiver) -> shares
withdraw(assets, receiver, owner) -> shares
redeem(shares, receiver, owner) -> assets
maxWithdraw(owner) -> assets
totalAssets() -> assets
yieldMode() -> TEST | LIVE
strategyId() -> bytes32
```

The controller uses actual balance deltas in addition to return values.

### 12.2 Deposit route

1. Pool computes encrypted investable principal above the 20% confidential liquidity target.
2. Dispatch is preferred after at least two distinct public contributing slots since the last investment, or becomes permissionless after a 24-hour maximum wait.
3. A public cap bounds the aggregate.
4. The aggregate handle becomes publicly decryptable.
5. KMS proof authenticates the clear aggregate.
6. cUSDT unwrap produces public underlying.
7. Controller deposits exact received underlying into ERC-4626.
8. Public deployed-principal cost basis increases by exact assets deposited.
9. Pool's in-flight encrypted principal transition becomes settled.

Singleton/low-anonymity dispatch after the timeout is allowed for liveness but must be flagged in the UI.

### 12.3 Redemption route

1. Pool prepares `min(encryptedTotalQueued, publicCap)`.
2. KMS proof authenticates the public aggregate.
3. Controller bounds redemption by `maxWithdraw` and available shares.
4. Strategy returns public underlying; actual received delta is authoritative.
5. Controller reduces deployed-principal cost basis by principal assets actually returned, never below zero.
6. Exact underlying is wrapped to cUSDT.
7. cUSDT returns to the pool with a route tag for principal claim liquidity.
8. Pool credits only the actual encrypted callback amount.
9. Any unmet encrypted claim remains queued.

### 12.4 Yield harvest

```text
public gross assets = strategy convert/redeemable assets owned by controller
public deployed principal = controller cost basis
gross yield = max(gross assets - deployed principal, 0)
harvestable this call = min(gross yield, publicCap, uint64.max, wrapper remaining capacity)
```

Anyone may call a formula-bound harvest with a public cap. The cap can reduce work but cannot increase the amount beyond actual yield or wrapper capacity. The controller withdraws only the formula result, rewraps the exact amount, and routes it to encrypted prize reserve. An admin cannot type an arbitrary prize amount into the pool.

Prize movement is exact and one-way per transition:

- freeze: `epochPrize = prizeReserve`, then `prizeReserve = encrypted zero`;
- nonzero winner finalization: retain `epochPrize` in the epoch and grant only that winner ACL;
- zero-winner or abandonment: add `epochPrize` back to `prizeReserve`, zero the epoch handle, and mark the rollover complete; and
- claim: subtract only the actual confidential amount transferred from that epoch's remaining prize.

There is no aggregate winner-credit mapping and no cross-epoch claim arithmetic.

### 12.5 Loss handling

If public gross strategy assets fall below public deployed principal:

- anyone may enter `LOSS_MODE`;
- the controller atomically asks the pool to apply every new-risk pause scope, stopping new slots, deposits, investment dispatch, yield harvest, and new epoch opening;
- timelock unpause is rejected while controller loss mode remains active;
- existing draw proof finalization, withdrawals, redemptions, queue service, and prize claims remain available;
- controller attempts an orderly strategy exit using available liquidity;
- missing principal remains an encrypted debt and is not silently written down, converted to prize, or reported as paid;
- recapitalization may be accepted only as clearly labeled public recovery funding, never yield;
- the UI discloses strategy impairment and does not promise a settlement date.

The Sepolia test-yield strategy must be tested not to lose principal under its defined behavior. A real strategy needs a separate risk acceptance before activation.

### 12.6 Strategy replacement

Replacement requirements:

- scheduled and executed through the external 24-hour timelock, which is the only delay clock;
- new investment paused;
- no active settlement;
- old strategy `maxWithdraw`/shares fully redeemed;
- controller public shares equal zero;
- controller deployed-principal cost basis equals zero;
- public underlying reconciled and rewrapped/returned as needed;
- new strategy `asset()` equals the immutable underlying;
- new strategy mode and ID are public;
- source is verified and deployment manifest updated; and
- frontend refuses a manifest/contract mode mismatch.

The confidential pool and ledgers do not change.

### 12.7 Custody and token-movement boundary

The pool remains the holder of confidential principal. `SettlementController` is never approved as an ERC-7984 operator for the pool and cannot spend arbitrary pool cUSDT.

For an investment settlement:

1. Under a reentrancy guard, the pool records the investment intent and calls the immutable wrapper's `unwrap(pool, controller, requestedAmount)` path as the token owner.
2. The wrapper's actual burned/unwrap handle, not the requested handle, becomes the authoritative aggregate and unwrap request ID.
3. In the same transaction, the pool subtracts only that actual handle from confidential principal liquidity, adds only that handle to in-flight principal, and registers the request/handle with the controller. Any requested-but-unburned difference remains in confidential principal liquidity.
4. Any caller may submit the bound public-decryption proof to finalize the same unwrap. Public underlying is sent directly to the controller.
5. The controller deposits only the actual public balance delta into the strategy and records the actual shares/cost basis.

For principal redemption or yield harvest:

1. The controller withdraws public underlying and measures the actual received balance delta.
2. The controller calls the immutable wrapper to mint cUSDT directly to the pool from that exact public amount.
3. The wrapper's mint semantics grant the recipient pool permission on the returned encrypted handle and transiently return that exact handle to the calling controller. The controller forwards it through `onSettlementLiquidityReturned(settlementId, fixedRoute, actualWrapped)`.
4. The pool credits only that actual returned handle to the route-specific encrypted ledger and restores `allowThis` and any required owner ACL.

Every step is atomic until it reaches an external asynchronous boundary. A revert before an unwrap request or returned-liquidity callback is stored rolls back the whole transaction. The pool verifies caller, active settlement ID, expected immutable route, and exact returned handle before crediting; no controller callback may supply a free-form amount, recipient, or relabeled route.

## 13. Settlement Architecture

### 13.1 Settlement kinds

| Kind | Source liability | Public action | Confidential destination |
| --- | --- | --- | --- |
| `INVEST_PRINCIPAL` | Liquid principal above buffer | Unwrap and ERC-4626 deposit | Strategy shares/public cost basis |
| `REDEEM_PRINCIPAL` | Aggregate queued principal debt | ERC-4626 withdraw and wrap | FIFO claim liquidity |
| `HARVEST_YIELD` | Public assets above deployed cost basis | Withdraw excess and wrap | Encrypted prize reserve |

Kinds cannot be relabeled after creation.

### 13.2 Retry safety

- One active settlement globally avoids double-use of public assets.
- Each stage records exact IDs and balance snapshots before external interaction.
- KMS proofs bind the stored aggregate handle and expected clear ABI.
- Failed proof verification leaves state unchanged.
- Failed strategy call retains the clear aggregate and proof association.
- Failed rewrap retains public underlying in controller custody for the same settlement.
- Callback credits actual encrypted received amount.
- Completion clears active state only after both public and encrypted reconciliation.
- A retry increments attempt count but not economic intent.

### 13.3 Partial settlement under FIFO

- The public redemption may be less than aggregate queued debt due to cap or strategy liquidity.
- Returned confidential liquidity is not preallocated pro-rata.
- FIFO head service consumes it first.
- A partially paid head remains head through its authenticated completion boolean.
- Later tickets remain intact and retain order.
- Another aggregate redemption can replenish claim liquidity.

### 13.4 Principal/prize separation

- Principal investment and redemption adjust deployed-principal cost basis.
- Yield harvest does not reduce deployed-principal cost basis.
- Prize reserve cannot be selected as withdrawal liquidity.
- Principal callback route cannot credit prize reserve.
- Prize callback route cannot credit principal or claim liquidity.
- Route tags, caller checks, active settlement IDs, and invariants enforce separation.

## 14. Privacy Model

### 14.1 Guaranteed confidentiality boundary

Under the FHEVM, ACL, contract, and browser assumptions, individual principal, weights, pending amounts, snapshots, claims, reserves, and prizes remain encrypted. Only the owner receives principal/claim permissions, and only the finalized winner receives prize permission.

### 14.2 Public metadata

Public observers can see:

- participating addresses and slot order;
- all transaction senders, times, gas, and called functions;
- wrapper shield/unshield amounts;
- deposit and withdrawal activity existence;
- queue order and completion booleans;
- epoch schedule and status;
- VRF request/word;
- draw and proof transactions;
- final winner;
- public strategy assets/shares; and
- aggregate settlement amounts and timing.

### 14.3 Aggregate leakage

Aggregate strategy amounts are necessary public plaintext. A singleton batch, a batch with known participants, repeated distinctive amounts, or timing correlation may reveal or bound an individual's amount. The two-contributor preference and 24-hour delay reduce but do not eliminate this risk. Liveness wins after the maximum wait, with an explicit low-anonymity warning.

### 14.4 Winner identity

The winner address becomes public because the bounty requires a publicly verifiable result and the KMS proof authenticates the encrypted winner handle's plaintext. Prize amount remains encrypted. Winner identity privacy after reveal is not promised.

### 14.5 Transaction correlation

VeilSave does not hide an immediate public USDT wrap followed by a cUSDT deposit, repeated participation, withdrawal timing, public claim completion, or device/network metadata. Users may reduce simple correlation by holding cUSDT before depositing, but the product makes no anonymity guarantee.

### 14.6 Browser boundary

The browser sees plaintext when the user types or reveals an amount. XSS, malicious extensions, compromised dependencies, wallet compromise, screen capture, or stolen IndexedDB transport keys can expose it. Required controls include strict CSP, minimal dependencies, no private analytics, short scoped permit TTLs, explicit reveals, session-only plaintext, and account/network invalidation.

### 14.7 Verification limitation

The public verifies an authenticated execution trail under Ethereum, Chainlink, FHEVM, and Zama KMS trust. Hidden weights prevent independent plaintext recomputation. This is not a custom zero-knowledge proof of the entire weighted computation.

### 14.8 Value inference versus decryption authority

The contracts never make principal, weights, claims, reserves, or prize handles publicly decryptable. That ACL guarantee does not eliminate side-information inference. Public wrapper amounts, aggregate strategy actions, a known-zero reserve history, singleton batches, or a publicly sponsored test-yield amount can reveal or bound a private value. In particular, a prize funded from a fully observable reserve history may be inferable even though only the winner can decrypt its ciphertext. The UI and documentation must state this limitation and must never describe ciphertext access control as full information-theoretic secrecy.

## 15. Threat Model

| Threat | Mitigation | Mandatory test | Operational control |
| --- | --- | --- | --- |
| Unauthorized winner access | Winner derived only by fixed FHE path and KMS proof | Forged winner, non-slot winner, wrong handle | Verify source/manifest and proof alerts |
| Unauthorized prize decryption | Prize never public; allow only finalized winner | Loser/admin/keeper/relayer/frontend negative decrypt | ACL audit and live rerun |
| Prize/value inference from public aggregates | Honest inference disclosure; contributor batching preference; no plaintext private events; preserve encrypted carryover where it arises | Singleton/known-reserve correlation cases and copy review | Flag low-anonymity settlements and `TEST YIELD`; never claim inference resistance |
| Double prize claim | Encrypted credit safe-decrease and exactly-once outcome | Repeated claim and transfer failure | Event/status monitor |
| Double draw | Epoch state and one draw transition | Repeat draw before/after terminal | Alert duplicate attempts |
| Replay | Epoch/request/handle/version/finalized bindings | Replayed winner, routing, completion, settlement proofs | Retain request history |
| Wrong epoch/request | Explicit mapping and status checks | Out-of-order and unknown callbacks/proofs | Explorer-linked request map |
| Slot reuse/duplicate | Address-to-slot map; terminal-reference release gate | Duplicate reserve and premature reuse | Capacity/slot health view |
| Slot squatting | Fixed refundable bond and one slot/address | Reservation/bond/release tests | Monitor long-idle slots; no forced admin theft |
| Requested amount over-credit | Credit actual ERC-7984 callback amount | Over-request, zero transfer, callback refund | Token/pool reconciliation |
| External cUSDT/wrapper pause, upgrade, or blocklist | Revalidate official code, roles, pause/blocklist policy, and round-trip behavior before deployment; disclose external dependency | Wrapper pause/blocklist/role-configuration rehearsal where available | Monitor code hash, roles, and token availability; pause new risk only, keep recovery retryable |
| Encrypted overflow/underflow | Widen, safe comparisons/select, no secret revert | Boundary fuzz and aggregate overflow path | Deployment supply/cap validation; no secret-derived public overflow branch |
| Principal/prize mixing | Separate ledgers/routes/liquidity | Attempt principal payout from prize and inverse | Reconcile route totals |
| Strategy insolvency | Public cost basis, loss mode, no hidden yield | Asset deficit and partial liquidity | Health threshold and pause |
| HCU denial of service | Fixed 16 operation graph and release targets | Local/Sepolia HCU regression | Block deployment on budget failure |
| VRF manipulation/reroll | Freeze first; one request; terminal timeout | Second request, late word, selective cancel | Funding/timeout alerts |
| Callback failure | Storage-only nonreverting callback | Unknown/duplicate/late/empty callback | Callback gas/funding monitor |
| Draw execution censorship | Permissionless caller and fixed deadline | Different callers, revert/retry | Optional keeper and public retry button |
| Relayer/KMS outage | Immutable handles and indefinite proof/reveal retry | Simulated unavailable service | Status page and retry runbook |
| ACL propagation/reorg | 96-block grant delay and live validation | Early finalization rejection/reorg simulation | Confirmation monitor |
| Browser compromise | CSP, dependency hygiene, explicit reveal, no analytics | XSS/privacy review and log scan | SRI/build provenance where applicable |
| Admin compromise | No upgrade/winner/decrypt powers; narrow pause/strategy timelock | Role capability tests | 2-of-3 Safe, 24-hour review window |
| Bootstrap hijack or premature deposits | No-funds bootstrap lock; Safe-only exact reverse binding; activation verifies code/config and clears bootstrap authority | Unauthorized bind/activate, wrong reverse binding, pre-activation user-action tests | One reviewed deployment session and post-activation zero-authority check |
| Pause traps funds | Exit/recovery functions unpausable | Every exit while paused | Runbook and pause reason event |
| FIFO bypass/front-running | Public immutable head; hardcoded recipient | Later claim/service attempt | Queue monitor |
| Partial settlement double debit | Principal debited once; ticket persists | Repeated settle/claim/failure fuzz | Settlement reconciliation |
| Public proof wrong order | Exact one-handle schemas and typed helpers | Reordered/malformed ABI vectors | Client version/ABI lock |
| Strategy adapter substitution | Same asset, drained old position, timelock | Activation with shares/active settlement/wrong asset | Verified source and proposal alert |
| Stale frontend/indexer | Direct RPC canonical reread | Missed event and reorg tests | Multiple RPCs, stale badge |

## 16. Trust Model

### Cryptographic and protocol trust

- Zama FHE scheme and ACL protect encrypted values.
- FHEVM/coprocessor correctly executes the encrypted operation graph.
- Zama KMS signatures authenticate public decryption and user re-encryption.
- Ethereum orders and finalizes contract state.

### Smart contract trust

- Users trust verified immutable pool, VRF adapter, and settlement-controller bytecode.
- The external cUSDT/wrapper may have its own pause, blocklist, upgrade, or asset-policy authority depending on the current official deployment. Its code hash, roles, policy, and exit behavior must be revalidated before deployment; it can delay or block transfers independently of the core pool.
- Users also trust the configured strategy bytecode and its public asset behavior.
- Bugs can violate accounting or liveness even when cryptography works.

### Strategy trust

- The public ERC-4626 strategy can pause, lose value, lack liquidity, or behave unexpectedly.
- `TEST YIELD` only demonstrates mechanics.
- A future live adapter requires fresh due diligence and live round-trip evidence.

### Oracle and VRF trust

- Chainlink VRF proof/coordinator and confirmation policy provide the public random word.
- Availability failure can abandon an epoch but cannot select replacement randomness.

### Zama relayer/KMS availability

- Outage delays encryption, public winner proof, ACL observation, and user decryption.
- It cannot lawfully select another winner under contract state, but availability is a material dependency.

### Frontend trust

- The frontend handles plaintext before encryption and after reveal.
- A malicious frontend can misstate intent or leak values; wallets and verified addresses remain critical.
- Contracts remain usable directly if the frontend is unavailable.

### Admin and governance trust

- Safe/timelock can pause risk-taking and replace a drained strategy.
- They cannot upgrade core code, choose winner, change frozen weights, reroll, decrypt values, redirect prize, add fees, or raise capacity.

No centralized operator is trusted for winner selection.

## 17. Admin and Upgrade Model

### 17.1 Frozen policy

**Decision: immutable core with a narrowly timelocked strategy pointer.**

| Capability | Authority | Delay | Limits |
| --- | --- | ---: | --- |
| Pause reservations/deposits/future epoch opening/new investment | 2-of-3 Safe guardian | Immediate | Cannot block progression of an already-open epoch, exits, recovery, finalization, or claims |
| Unpause | Timelock | 24 hours | Safe proposes/cancels; execution is permissionless after delay; rejected while controller loss mode remains active |
| Change strategy | Timelock | 24 hours | Investment paused, controller idle, old actual/tracked shares zero, deployed-principal cost basis zero, same asset |
| Change fees | Nobody | N/A | Fees fixed at zero |
| Change participant capacity | Nobody | N/A | Constant 16 |
| Change epoch duration/timeouts/bond | Nobody | N/A | Immutable deployment configuration |
| Change randomness source/config | Nobody | N/A | New deployment required |
| Upgrade pool/adapter/controller | Nobody | N/A | Non-upgradeable |
| Withdraw VRF surplus | Timelock | 24 hours | No pending request; recipient and amount fixed in the scheduled call |
| Choose winner/weights/prize recipient | Nobody | N/A | No such function |
| Decrypt user/prize values | Nobody through admin role | N/A | ACL forbids it |

### 17.2 Irreversible actions

- Binding the pool into adapter/controller.
- Activating the pool, opening epoch 1, and clearing all bootstrap authority.
- Locking immutable addresses/configuration.
- Freezing an epoch snapshot.
- Creating its VRF request ID.
- Making a winner handle publicly decryptable.
- Finalizing a winner or no-winner outcome.
- Assigning/rolling the epoch prize.
- Completing a withdrawal ticket.
- Releasing a slot/bond.

## 18. Event Model

VeilSave-defined events contain public lifecycle data only. They do not duplicate `euint64` principal, weight, claim, reserve, prize, deposit, or payout amount handles. The external ERC-7984 token/wrapper may emit standard ciphertext-handle events such as confidential transfers and unwrap requests; those handles are not plaintext, are required by the token protocol, and remain observable/correlatable public metadata.

### 18.1 Pool events

```text
PoolActivated(address indexed bootstrapAuthority, uint64 indexed firstEpochId)
PauseScopesAdded(uint8 indexed scopes, uint8 newMask)
PauseScopesRemoved(uint8 indexed scopes, uint8 newMask)

SlotReserved(address indexed owner, uint8 indexed slot)
SlotClosing(address indexed owner, uint8 indexed slot, uint64 indexed withdrawalId)
SlotReleased(address indexed owner, uint8 indexed slot, uint96 bondWei)

DepositProcessed(address indexed owner, uint8 indexed slot, uint64 indexed pendingEpoch)

EpochOpened(uint64 indexed epochId, uint64 openedAt, uint64 closesAt)
EpochFrozen(uint64 indexed epochId, bytes32 indexed snapshotCommitment, uint8 frozenSlotCount, uint64 requestDeadline)
EpochRandomnessRequested(uint64 indexed epochId, uint256 indexed requestId, uint64 fulfillmentDeadline)
EpochRandomnessSynchronized(uint64 indexed epochId, uint256 indexed requestId, uint256 randomWord, uint64 drawDeadline)
EncryptedDrawExecuted(uint64 indexed epochId, bytes32 indexed winnerHandle, uint64 aclGrantNotBeforeBlock)
WinnerFinalized(uint64 indexed epochId, address indexed winner)
EpochNoWinner(uint64 indexed epochId)
EpochAbandoned(uint64 indexed epochId, AbandonReason reason)
EpochTerminal(uint64 indexed epochId, EpochOutcome outcome)

EpochPrizeAuthorized(uint64 indexed epochId, address indexed winner)
PrizeClaimProcessed(uint64 indexed epochId, address indexed winner)

WithdrawalRequested(uint64 indexed requestId, uint8 indexed slot, address indexed owner)
WithdrawalRoutingProofReady(uint64 indexed requestId, bytes32 indexed booleanHandle, uint32 version)
WithdrawalRouted(uint64 indexed requestId, WithdrawalRoute route, uint64 fifoSequence)
WithdrawalPayoutProcessed(uint64 indexed requestId, uint32 version)
WithdrawalCompletionProofReady(uint64 indexed requestId, bytes32 indexed booleanHandle, uint32 version)
WithdrawalCompleted(uint64 indexed requestId, address indexed owner)
```

Winner and proof boolean handles are emitted because public decryption needs them. No VeilSave-defined pool event emits an amount handle.

### 18.2 VRF events

```text
PoolBound(address indexed pool)
VrfFunded(address indexed funder, uint256 amount)
VrfRequestCreated(uint256 indexed requestId, uint64 indexed epochId, bytes32 snapshotCommitment, uint256 price)
VrfFulfilled(uint256 indexed requestId, uint64 indexed epochId, uint64 fulfilledAt)
VrfFulfillmentIgnored(uint256 indexed requestId, uint64 indexed epochId, IgnoreReason reason)
VrfSurplusWithdrawn(address indexed recipient, uint256 amount)
```

The random word is readable from adapter state and pool synchronization event.

### 18.3 Settlement events

```text
PoolBound(address indexed pool)
InvestmentPauseChanged(bool paused, address indexed caller)
SettlementStarted(uint64 indexed settlementId, SettlementKind kind, uint64 publicCap, bytes32 aggregateHandle)
SettlementAggregateFinalized(uint64 indexed settlementId, uint64 clearAggregate)
StrategyDepositCompleted(uint64 indexed settlementId, uint256 assets, uint256 shares)
StrategyRedemptionCompleted(uint64 indexed settlementId, uint256 requestedAssets, uint256 receivedAssets, uint256 sharesBurned)
ConfidentialLiquidityReturned(uint64 indexed settlementId, uint8 route, bytes32 returnedHandle)
YieldHarvested(uint64 indexed settlementId, uint256 publicAssets)
SettlementFailed(uint64 indexed settlementId, SettlementStatus stage, bytes32 failureCode, uint32 attempt)
SettlementRetried(uint64 indexed settlementId, uint32 attempt)
SettlementCompleted(uint64 indexed settlementId)
LossModeEntered(uint256 deployedPrincipal, uint256 withdrawableAssets)
StrategyChanged(address indexed previousStrategy, address indexed nextStrategy, uint8 yieldMode, bytes32 strategyId)
TestYieldSponsored(address indexed sponsor, uint256 assets)
StrategyDepositPauseChanged(bool paused, address indexed caller)
```

Aggregate public amounts are deliberately visible because the public strategy already reveals them.
Strategy scheduling/cancellation is observed through the standard `TimelockController` `CallScheduled`/`Cancelled` events; `SettlementController` emits only the executed `StrategyChanged` result.

## 19. Error and Recovery Model

| Operation | Initiated | Pending/fulfilled evidence | Retryable failures | Terminal condition |
| --- | --- | --- | --- | --- |
| Input encryption | User starts SDK action | Local proof object | SDK/relayer/browser error; generate fresh proof | User cancels or transaction accepted |
| Deposit transaction | Tx hash | Canonical receipt plus ledger reread | Revert/replacement/RPC outage | Actual callback credit or canonical failure |
| VRF request | Stored request ID | Adapter fulfillment record | RPC polling, funding before request; no replacement after ID | Timely word synchronized or epoch abandoned |
| FHE draw | `DRAW_READY` epoch | Successful draw tx and winner handle | Revert/HCU transient submission issue with same inputs | `REVEAL_PENDING` or fixed abandonment |
| Winner public reveal | Winner handle | KMS proof and finalization tx | Relayer/KMS/proof submission | Winner/no-winner terminal; no expiry after handle exists |
| Prize ACL | Winner finalization | Successful user decryption | Propagation, permit, account, relayer errors | Winner decrypts/claims or credit remains indefinitely |
| Investment settlement | Settlement ID/handle | Clear proof, unwrap, strategy deposit | Proof, wrapper, strategy, rewrap stage | Fully reconciled completion or loss-mode recovery |
| Principal redemption | Settlement ID/handle | Public withdrawal and confidential return | Strategy liquidity, proof, wrapper failures | Returned liquidity reconciled; unmet claims persist |
| Withdrawal routing | Ticket and boolean handle | Authenticated boolean proof | KMS/proof service | Immediate terminal or FIFO queued |
| FIFO payout | Head service attempt | Completion boolean proof | Token transfer, no liquidity, KMS proof | Claimed terminal; false remains head |
| RPC/indexer read | Read request | Canonical block number | Endpoint failure/stale cache | Fresh canonical read |

Errors and custom reverts may include public IDs, caller, enum state, and deadlines. They must not include plaintext amounts or derive distinct public errors from secret comparisons.

## 20. HCU Budget

### 20.1 Measured baseline

| Metric | Production-shaped local measurement | Release target | Documented absolute limit |
| --- | ---: | ---: | ---: |
| Global HCU | `14,927,246` | `17,000,000` | `20,000,000` |
| Sequential depth HCU | `3,448,096` | `4,000,000` | `5,000,000` |
| Local draw gas | `2,081,929` | `3,500,000` | Deployment-time block/tx policy |

The measurement came from the M7 production draw test after the M10 accounting/governance changes. The draw transaction itself was not modified; Sepolia gas and live ACL/decryption still require the M11/M18 reruns.

### 20.2 Release targets

- Final production-shaped draw global HCU: **no more than 17,000,000**.
- Final production-shaped draw sequential depth: **no more than 4,000,000**.
- Reserved headroom against documented limits: at least 3,000,000 global (15%) and 1,000,000 depth (20%).
- Final Sepolia gas target: no more than 3,500,000 unless the current network block limit provides at least 30% headroom and a written review approves a different value.

If either HCU target is exceeded, production deployment is blocked. The response is to remove nonessential draw work or reproduce a new spike; capacity does not increase and absolute limits are not treated as the budget.

### 20.3 Forbidden budget consumption

Do not add strategy work, snapshot maturity, withdrawals, prize arithmetic, winner ACL grants, proof verification, analytics, verbose events, dynamic arrays, or unrelated encrypted calculations to `executeEncryptedDraw` without rerunning local and live HCU/depth measurements and updating this architecture.

## 21. Deployment Model

### 21.1 Network and immutable configuration

| Parameter | Frozen MVP value |
| --- | --- |
| Network | Ethereum Sepolia |
| Chain ID | `11155111` |
| Capacity | 16 slots, compile-time public constant |
| Epoch duration | 7 days, compile-time public constant |
| Slot bond | `0.001 ETH`, compile-time public constant |
| Request deadline after freeze | 24 hours, compile-time public constant |
| VRF fulfillment deadline | 24 hours, compile-time public constant |
| Draw execution deadline | 24 hours, compile-time public constant |
| Winner ACL delay | 96 blocks, compile-time public constant |
| VRF confirmations | 3 |
| VRF words | 1 |
| Callback gas | 100,000, revalidated |
| Confidential liquidity target | 20% of encrypted aggregate principal |
| Preferred batch contributors | 2 |
| Maximum batch wait | 24 hours |
| Fees | 0, immutable |
| Strategy mode at launch | `TEST` |
| Strategy change delay | 24 hours |

### 21.2 Revalidated deployment inputs

The following were observed by the spike and are not permanent constants:

- Chainlink direct-funding wrapper: `0x195f15F2d49d693cE265b4fB0fdDbE15b1850Cc1`.
- Chainlink coordinator: `0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B`.
- Chainlink 500-gwei key hash: `0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae`.
- Aave V3 Pool: `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`.
- Sepolia USDT: `0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0`.
- aUSDT: `0xAF0F6e8b0Dc5c913bbF4d14c22B4E78Dd14310B6`.

The deployment process must query current official Zama/Chainlink/Aave sources and onchain code/config. Aave remains disabled unless a new supply/redemption/yield validation succeeds.

### 21.3 Deployment order

1. Freeze dependency versions and compiler/EVM configuration.
2. Validate public underlying, cUSDT wrapper/token, decimals, ACL behavior, and wrap/unwrap round trip.
3. Establish the 2-of-3 Safe and deploy/configure the 24-hour timelock: Safe proposer/canceller, open executor, timelock self-admin.
4. Deploy and verify `DeterministicTestYieldVault` over the matching public underlying.
5. Deploy unbound `SettlementController` with Safe bootstrap authority, timelock, asset, wrapper, and strategy configuration.
6. Deploy unbound `PoolVrfAdapter` with Safe bootstrap authority and revalidated Chainlink configuration.
7. Deploy bootstrap-locked `ConfidentialPrizePool` with the same authority and immutable token, adapter, controller, and governance addresses. Pass the expected configuration struct; construction succeeds only when every value equals the compiled public constant.
8. Configure timelock roles, pause guardian, and strategy approvals; verify forbidden roles are absent.
9. From the Safe, bind the exact pool address once in adapter and controller; verify reverse bindings and immutable getter/code hashes.
10. From the Safe, call pool `activate()`. Confirm epoch 1 opened and bootstrap authority is zero/disabled in all three contracts.
11. Fund VRF adapter and sponsor the test vault with explicitly labeled test yield.
12. Verify all contract source and publish one deployment manifest.
13. Run post-deploy asset, deposit, maturity, VRF, draw, winner proof, ACL/decryption, withdrawal, settlement, and role checks.

### 21.4 No hardcoded mutable external state

Frontend and scripts read a versioned deployment manifest containing chain ID, code hashes, addresses, strategy mode, deployment blocks, and verified source links. Current network addresses are never copied into source as timeless assumptions.

## 22. Observability

Minimum observability is an event-driven status layer plus direct contract reads.

### Required views

- Current epoch/status/deadlines.
- VRF funding, request ID, fulfillment, and synchronization.
- Draw transaction and winner handle.
- Winner finality delay, proof, finalization, and ACL/decryption health.
- Strategy mode, address, assets, shares, deployed cost basis, and loss mode.
- Active settlement ID, kind, stage, attempt, and public aggregate.
- Derived oldest active withdrawal request, public ticket statuses, and active ticket per connected user.
- Pause scopes and scheduled timelock calls.
- RPC/indexer freshness and last canonical block.

### Alerts

- VRF balance below estimated next-request cost.
- Frozen/request/draw state approaching deadline.
- Callback fulfilled but not synchronized.
- Repeated draw reverts or HCU regression.
- Reveal pending beyond service objective.
- ACL finalization succeeded but live winner decrypt still failing.
- Strategy assets below deployed principal.
- Settlement stuck/retrying.
- FIFO head not progressing after liquidity return.
- Manifest/code hash mismatch.

No general analytics platform, private-value telemetry, or trusted backend is required.

## 23. Architectural Decision Records

### ADR-001: Why 16 slots?

**Context:** Weighted FHE selection has linear work and finite HCU/depth limits. Spike 1 measured 16 slots at `14,927,246` global and `3,448,096` depth; 32 slots exceeded the global limit.

**Decision:** Fix the MVP at exactly 16 slots and a constant-shape draw.

**Alternatives considered:** 8 slots, 24/32 slots, unbounded array, offchain selection.

**Consequence:** Capacity is visibly limited and needs slot management, but the core bounty mechanism is live-proven. Any expansion requires a new spike and architecture revision.

### ADR-002: Why Chainlink VRF?

**Context:** The product needs recognizable, unpredictable, publicly auditable randomness. Current FHE random APIs do not provide the same collected public entropy/proof narrative.

**Decision:** Use Chainlink VRF v2.5 on Sepolia.

**Alternatives considered:** `FHE.randEuint64`, `prevrandao`, commit/reveal, custom randomness.

**Consequence:** Draws depend on funded asynchronous oracle availability, but request/fulfillment and anti-reroll evidence are public.

### ADR-003: Why separate VRF callback and FHE draw?

**Context:** The 16-slot draw is near the HCU boundary and callbacks must be reliable/nonreverting.

**Decision:** Callback stores only the word; pool synchronization and FHE draw are separate permissionless transactions.

**Alternatives considered:** Run draw in callback; callback into pool; offchain draw.

**Consequence:** More visible asynchronous states and transactions, with substantially better callback reliability and retry behavior.

### ADR-004: Why public winner reveal?

**Context:** The bounty requires a publicly verifiable result, while weights must remain hidden.

**Decision:** Make only the final encrypted winner address publicly decryptable and authenticate it with KMS proof.

**Alternatives considered:** Private winner notification, public balances, custom ZK proof.

**Consequence:** Winner identity is public; balances and prize remain confidential. Verification is authenticated execution, not plaintext recomputation.

### ADR-005: Why winner-only prize ACL?

**Context:** Encrypted winnings are meaningful only if non-winners and privileged actors cannot decrypt them.

**Decision:** Keep prize handles private and call `FHE.allow` only for the proof-finalized nonzero winner after the delay.

**Alternatives considered:** Public prize, admin-mediated delivery, broad observer role.

**Consequence:** ACL/KMS propagation becomes a visible dependency and lost winner keys have no admin recovery.

### ADR-006: Why aggregate public strategy settlement?

**Context:** ERC-7984 individual values are encrypted, while existing ERC-4626/Aave strategies require public amounts.

**Decision:** Cross the boundary only through authenticated aggregate amounts in a separate controller.

**Alternatives considered:** Public individual deposits, confidential strategy implementation, wrapping rebasing aTokens.

**Consequence:** Individual pool values remain encrypted, but aggregate amount/timing and strategy position are public and correlation risk remains.

### ADR-007: Why queued withdrawals?

**Context:** Principal can be deployed in an asynchronous public strategy and confidential liquidity may be insufficient.

**Decision:** Pay immediately where possible and convert the unpaid amount once into an encrypted retryable claim.

**Alternatives considered:** Block withdrawal, always-liquid pool, always-queued withdrawal, prize-funded exits.

**Consequence:** "Withdraw at any time" means permissionless initiation, with honest settlement delay and stronger principal accounting.

### ADR-008: Why FIFO settlement?

**Context:** Partial strategy liquidity needs a deterministic allocation policy. Pro-rata allocation requires encrypted totals/division, rounding rules, and more FHE work.

**Decision:** Use strict request-time FIFO. Assign order in `requestWithdrawal`, derive the oldest active request with a fixed 16-slot scan, block later service behind an older unclassified request, use head-first partial payment, and advance with public completion booleans.

**Alternatives considered:** Claim race/first caller, pro-rata, admin-selected batches.

**Consequence:** Earlier requests have priority and head-of-line blocking is possible. The policy is simple, testable, and does not reveal amounts.

### ADR-009: Why immutable core contracts?

**Context:** Upgrade authority would enlarge trust over encrypted balances and winner logic. The MVP has a narrow, measured scope.

**Decision:** Pool, VRF adapter, settlement code, capacity, cadence, randomness source, and zero fees are immutable. Only a fully drained strategy pointer is timelock-replaceable.

**Alternatives considered:** UUPS/timelocked upgradeable system, fully immutable strategy, broad admin controller.

**Consequence:** Core bugs require a new deployment and migration plan, but no admin can rewrite winner or ACL logic. Strategy outages can be addressed without changing confidential accounting.

### ADR-010: Why a test-yield fallback?

**Context:** The Aave Sepolia USDT supply attempt failed with `SUPPLY_CAP_EXCEEDED`; waiting on testnet market state would make the demo unreliable.

**Decision:** Launch the Sepolia MVP with a donation-based deterministic ERC-4626 vault labeled `TEST YIELD`. Keep the same interface for a later validated live strategy.

**Alternatives considered:** Claim Aave yield without proof, idle vault, abandon yield demonstration.

**Consequence:** Accounting and prize generation remain reproducible and honest, while organic yield is not claimed until separately proven.

## 24. Known Constraints

- Exactly 16 slots; no dynamic expansion.
- One pool, asset, strategy at a time, epoch, winner, and prize.
- One-full-epoch deposit maturity.
- Sequential epochs may lengthen when external steps are delayed.
- Public participant addresses, transaction graph, winner, queue order, and aggregate strategy activity.
- Aggregate settlement can reveal or bound individual amounts.
- Direct-funding VRF requires native balance and current configuration.
- Winner proof and ACL/user decryption depend on Zama service availability.
- Strategy withdrawal may be asynchronous or impaired.
- Strict FIFO can cause head-of-line waiting.
- No wallet recovery, prize expiry, or admin rescue/decryption.
- No core upgrades or fee changes.
- Test yield is sponsored and not an APY.
- Final production-shaped draw must pass HCU/gas gates again.

## 25. Remaining Risks

1. Live Sepolia winner ACL propagation and winner user-decryption are not yet evidenced because the latest relayer/KMS attempt timed out.
2. Final pool integration may raise draw HCU/gas; deployment is blocked above the release targets.
3. The strict FIFO completion-boolean flow extends the withdrawal spike and requires its own local FHE and Sepolia validation.
4. Current cUSDT/wrapper addresses and policies may change before implementation/deployment.
5. Chainlink direct-funding price/configuration and public RPC reliability can change.
6. Aave Sepolia remains unavailable until a fresh supply/redemption/yield round trip succeeds.
7. Public aggregate settlement and completion statuses create unavoidable correlation leakage.
8. Strategy insolvency can delay nominal principal claims; the MVP has no insurance promise.
9. Browser compromise can expose typed or revealed values despite onchain encryption.
10. Immutable-core defects require a replacement deployment rather than an upgrade.

### Mandatory pre-production validations

- Rerun live winner public proof, 96-block delay, ACL propagation, and winner-only user decryption on Sepolia.
- Measure final 16-slot draw global HCU, sequential-depth HCU, and ordinary gas on the production-shaped pool.
- Validate the new strict FIFO routing/completion-boolean state machine locally and on Sepolia.
- Revalidate cUSDT/wrapper, Zama, Chainlink, RPC, and strategy addresses/configuration.
- Prove full deposit, maturity, draw, winner, prize claim, immediate withdrawal, queued redemption, retry, and pause-exit flows.
- Verify every deployed source, role, immutable, and manifest code hash.

### Architecture freeze quality audit

| Quality gate | Frozen result |
| --- | --- |
| Simplicity | Four application contracts are retained because the pool, VRF callback boundary, public settlement boundary, and deterministic test strategy have distinct failure/trust domains. Draw helpers remain internal libraries; no backend or extra deployed helper is required. |
| HCU safety | The exact 16-slot operation graph is isolated, release-capped at 17M global/4M depth, and blocks deployment until final local and Sepolia measurement passes. |
| Privacy | No individual amount is intentionally published; ACLs are narrow; aggregate and side-information inference is explicitly disclosed rather than overstated. |
| Security | Safe/timelock roles cannot choose a winner, alter frozen inputs, reroll randomness, decrypt values, add fees, or upgrade core code. |
| Liveness | Progress and retry paths are permissionless; timeouts are terminal and non-rerollable; pause preserves existing draws, exits, proofs, settlement recovery, and claims. |
| UX | Every encryption, transaction, VRF, FHE, proof, ACL, strategy, FIFO, RPC, and relayer state maps to a visible status and safe action. |
| Demo | A mature pre-deployed epoch supports an 8-10 minute explorer-linked flow without pretending external latency is instant. |
| Scope | One Sepolia pool, one asset, 16 slots, one winner, one prize, and one active strategy remain the complete MVP. |

**Architecture status: FROZEN FOR IMPLEMENTATION HANDOFF. PRODUCTION IMPLEMENTATION HAS NOT STARTED.**
