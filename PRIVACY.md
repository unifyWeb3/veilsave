# VeilSave Privacy Boundary

VeilSave provides **confidential financial amounts with public protocol activity**.

It does not provide anonymity, hidden addresses, invisible transaction timing, or a private transaction graph. The finalized winner address is intentionally public so the result can be authenticated and inspected.

## What remains encrypted

| Value                                        | Default visibility   | Intended ACL                                         |
| -------------------------------------------- | -------------------- | ---------------------------------------------------- |
| User principal                               | Encrypted and masked | Pool and that user                                   |
| Eligible weight                              | Encrypted and masked | Pool; optionally that user for explicit local reveal |
| Pending weight                               | Encrypted and masked | Pool; optionally that user for explicit local reveal |
| Frozen weight snapshot                       | Encrypted handle     | Pool only                                            |
| Draw total, threshold, prefixes, comparisons | Encrypted/transient  | Pool computation only                                |
| Withdrawal request and remaining claim       | Encrypted            | Pool and claimant where required for local reveal    |
| Confidential principal/claim liquidity       | Encrypted aggregate  | Pool and settlement components required by the route |
| Prize reserve and epoch prize                | Encrypted            | Pool; finalized winner only for that epoch prize     |

The frontend renders these values masked by default. A user reveal is explicit, account/chain/handle scoped, and kept in memory for the active session. A state-changing transaction makes an existing reveal stale.

## What is public

- Wallet addresses and contract addresses.
- Slot existence, ownership/status, and the fixed 16-slot capacity.
- Slot bond payment and return.
- Transaction hashes, callers, timing, gas, and success/failure.
- Epoch ID, open/close/freeze/timeout state, and timestamps.
- Frozen slot count and snapshot commitment.
- Chainlink request ID, fulfillment, and random word.
- The FHE draw transaction and encrypted winner handle reference.
- Winner proof/finalization transaction and final winner address.
- Withdrawal request ID, owner, sequence, and state.
- Settlement ID, public cap, aggregate clear amount, strategy transactions, and timing.
- Strategy address, shares/assets, health, loss mode, and TEST YIELD sponsorship.

Ciphertext handles are public references. They are not plaintext balances, but observers can correlate a handle with a transaction, epoch, or operation.

## ACL rules

### Principal and weights

The pool must retain computation permission. The owning user receives only the access required to decrypt their own position. No admin, keeper, indexer, frontend operator, or generic relayer receives user-wide financial access.

### Snapshot and draw intermediates

Frozen weights and intermediate FHE values remain pool-only. They are not made publicly decryptable to improve UX or analytics.

### Winner

The encrypted winner address is the only draw result made publicly decryptable. The public proof is checked against the exact epoch handle and expected state before finalization.

### Prize

The prize ciphertext is never made public. After the winner is finalized, the pool grants permission only to that address. Admin, guardian, timelock, keeper, frontend, other participants, and the public do not receive prize ACL.

### Aggregate settlement

Only the aggregate amount needed to cross the confidential/public strategy boundary is publicly decrypted. Individual allocations remain encrypted. Returned public assets are rewrapped into cUSDT and routed to principal claim liquidity or prize reserve according to the bound settlement kind.

## Public winner rationale

A public winner gives users and judges an inspectable terminal result without revealing the prize amount or any participant's balance. The public can verify the randomness and authenticated execution trail, but cannot independently recompute the weighted result from plaintext balances because those balances are intentionally unavailable.

## Aggregate leakage

Public strategy settlement leaks aggregate amount and timing. Privacy can weaken when:

- only one participant contributed to a batch;
- a participant's deposit or withdrawal timing is already known;
- a distinctive amount is correlated across wrap, settlement, and redemption;
- repeated batches allow differencing; or
- public strategy balances bound the confidential pool's total position.

Batching and delayed dispatch can reduce some correlation, but cannot eliminate it. Liveness eventually takes priority over waiting indefinitely for a larger anonymity set, and the UI must disclose low-anonymity aggregate dispatch.

## Transaction correlation

Observers can see that a wallet reserved a slot, sent a confidential-token transaction, requested a withdrawal, finalized a proof, claimed a prize, or progressed a permissionless operation. VeilSave does not hide:

- who paid transaction gas;
- when a wallet interacted;
- which contracts were called;
- whether a slot is occupied;
- the winner's address; or
- the public asset route used by the aggregate strategy.

## Side information

Encryption cannot prevent inference from information revealed elsewhere. Examples include a user announcing their amount, a public wrap of the same distinctive amount, a singleton settlement, a wallet's offchain disclosure, or a known prize sponsorship. The privacy promise is narrow ACL-controlled onchain amount confidentiality, not immunity from every statistical or social inference.

## Browser, wallet, and frontend boundary

- Encryption and permitted decryption occur in the user's browser with wallet participation.
- A compromised frontend can display a malicious transaction or read plaintext after an explicit reveal.
- A compromised wallet can expose signatures, addresses, or keys.
- Revealed values must not be written to URLs, local storage, analytics, error reports, console logs, or crash telemetry.
- Recovery storage contains only a public allowlist of operation identifiers/status, never plaintext amounts, input proofs, decryption permits, or private keys.
- The deployment manifest and runtime bytecode hashes are validated before transaction controls become available.

Users should verify the application origin, wallet transaction target, network, and manifest status before signing.

## Local reveal UX

Important confidential values support these states:

- masked;
- permit/signature required;
- decrypting;
- revealed locally;
- stale after an onchain mutation;
- remasked;
- unavailable/retryable; and
- failed without an onchain state change.

The application never decrypts all balances automatically to populate a dashboard. Prize reveal is an explicit winner action. A winner may claim a confidential prize without first displaying its plaintext amount.

## Logging and evidence rules

Allowed in public operational evidence:

- chain ID, block, transaction and request IDs;
- contract address and runtime code hash;
- epoch/settlement/withdrawal IDs and public states;
- HCU/depth/gas measurements;
- proof success/failure classification; and
- ACL latency timestamps without plaintext prize.

Forbidden in logs/reports:

- plaintext principal, weight, withdrawal, reserve, or prize values associated with a user;
- private keys, mnemonics, wallet permits, input proofs, or decryption secrets;
- populated RPC credentials or relayer authentication; and
- a copied browser state containing revealed confidential values.

## Exact non-claims

Do not describe VeilSave as:

- anonymous;
- address private;
- transaction-graph private;
- invisible onchain;
- fully metadata private;
- "everything is private"; or
- publicly recomputable from hidden plaintext balances.

Recommended short copy:

> Your savings amount stays encrypted. Your wallet address and transactions remain public.

> Balances and odds stay hidden. Anyone can inspect the randomness and authenticated execution trail, but cannot recompute the weighted result from plaintext balances.
