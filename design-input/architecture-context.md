# VeilSave Architecture Context for Design

## Components visible to the UI

- `ConfidentialPrizePool`: slots, encrypted accounting, epochs, draw, winner finalization, prize ACL, withdrawals.
- `PoolVrfAdapter`: request ID binding and storage-only Chainlink VRF callback.
- `SettlementController`: aggregate public settlement, confidential rewrap, FIFO funding, and strategy replacement lifecycle.
- `DeterministicTestYieldVault`: donation-funded ERC-4626 strategy explicitly labeled `TEST YIELD`.
- ERC-7984 cUSDT/wrapper boundary.
- Zama encryption, relayer/KMS public decryption, and winner-only user decryption.

There is no trusted winner backend and no database source of truth. The frontend derives canonical status from chain reads, events, the reviewed deployment manifest, and privacy-safe local operation records.

## Public and encrypted state

Encrypted:

- principal per slot;
- pending and eligible weight;
- epoch snapshot handles and draw intermediates;
- prize reserve and prize amount;
- withdrawal request/remainder/claim;
- internal confidential liquidity and reserve values.

Public:

- wallet and contract addresses;
- slot ownership/existence and fixed capacity;
- epoch state and timestamps;
- transaction hashes;
- snapshot commitment/handle references where required for verification;
- VRF request, fulfillment, and stored random-word reference;
- FHE draw transaction and encrypted winner handle reference;
- final winner address;
- aggregate strategy settlement amount/timing and public strategy state;
- pause, failure, retry, and terminal states.

Ciphertext handles are public metadata, not plaintext. Do not render them as if they reveal value.

## Epoch lifecycle

`OPEN → FROZEN → VRF_REQUESTED → VRF_FULFILLED/DRAW_READY → DRAW_EXECUTED → WINNER_REVEAL_PENDING → FINALITY_DELAY → WINNER_FINALIZED → PRIZE_READY → TERMINAL`

Important branches:

- VRF timeout is terminal for that frozen epoch; no reroll.
- FHE draw failure is retryable with the same frozen inputs and stored word.
- Winner proof must bind epoch, request, handle, state, and clear address.
- Zero winner is a valid terminal result only for zero total eligible weight.
- Prize ACL propagation and winner user-decryption are separate asynchronous states.

## Withdrawal lifecycle

`REQUESTED → ROUTING_PROOF_PENDING → IMMEDIATE_SETTLED`

or

`REQUESTED → ROUTING_PROOF_PENDING → QUEUED → SETTLEMENT_REQUESTED → SETTLEMENT_READY/PARTIAL → CLAIMABLE → CLAIMED`

FIFO order is fixed at request time. Failed strategy redemption or rewrap must keep the same settlement/ticket retryable. Partial liquidity advances earlier claims and leaves unpaid encrypted remainder intact.

## Verification limitation

The public can verify freeze timing, request ID binding, Chainlink fulfillment, separate FHE execution, authenticated public-decryption proof, and final winner. Because weights remain encrypted, the public cannot independently calculate odds or reproduce the winner from plaintext balances. Design must state this directly.

## Security implications for UI

- Block writes on wrong chain, untrusted manifest, or runtime-code mismatch.
- Never put plaintext values, raw proofs, keys, signatures, or prize handles in logs, URLs, telemetry, notifications, or error-report payloads.
- Do not retry a write blindly when transaction state is unknown; reconcile by transaction hash and chain state.
- Show permissionless lifecycle/recovery actions where contracts allow them.
- Pause banners must distinguish deposit/draw/strategy scopes and preserve available exits.
- Treat browser compromise as a confidentiality risk and keep revealed values session-local.

## Timing that needs explicit UI

- wallet and chain confirmation;
- local encryption;
- ERC-7984 callback accounting;
- epoch maturity;
- VRF fulfillment and timeout;
- FHE draw execution;
- KMS public-decryption proof;
- 96-block winner finality delay;
- ACL propagation and local prize decryption;
- public strategy redemption, confidential rewrap, FIFO allocation, and claim.
