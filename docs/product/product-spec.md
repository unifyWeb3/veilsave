# VeilSave Product Specification

Status: Architecture frozen for implementation handoff

Target: Zama Developer Program Season 4, Ethereum Sepolia (`11155111`)

Product category: Confidential prize-linked savings

This document defines the MVP product. It does not authorize production implementation.

## 1. Product Name

Names are scored from 1 (weak) to 5 (strong).

| Candidate | Memorability | Confidentiality association | Savings association | Trust | Demo clarity | Total / 25 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **VeilSave** | 4.5 | 4.5 | 5.0 | 4.0 | 5.0 | **23.0** |
| CipherPool | 4.0 | 5.0 | 3.5 | 3.5 | 4.5 | 20.5 |
| QuietVault | 4.0 | 4.0 | 4.0 | 4.5 | 4.0 | 20.5 |

**Recommended working name: VeilSave.** It states the product's two important ideas without implying anonymity: financial amounts are concealed, and the primary action is saving. The name is a working label and is not an architectural dependency.

## 2. Product Positioning

VeilSave is a weekly confidential prize-linked savings pool for wallet users who want stable-value principal, private financial amounts, and a chance to receive a yield-funded prize.

The central promise is:

> Save cUSDT, keep your amount encrypted, remain free to withdraw principal, and participate in a publicly traceable weekly draw whose prize amount only the winner can decrypt.

Only the finalized winner receives decryption permission for the prize ciphertext. Public aggregate strategy flows can still let observers infer or bound values through side information; VeilSave promises encrypted onchain values and narrow ACLs, not immunity from every external inference.

VeilSave is not anonymous banking. Wallet addresses, transactions, timing, slot participation, draw activity, winner identity, and public strategy settlements remain visible.

## 3. Problem

Public blockchains make it easy to verify transactions but also expose financial balances and positions. Existing prize-linked savings systems generally require public balances or ticket counts, while private systems can make users trust an operator to calculate results offchain.

The product problem is to combine:

- stable-value savings;
- principal withdrawal rights;
- yield-funded prizes;
- encrypted balances, weights, and winnings;
- proportional winner selection over encrypted weights;
- a public randomness and execution trail; and
- winner-only prize access.

The product must do this without claiming full address anonymity, using a trusted backend to choose winners, or exceeding the validated FHE capacity.

## 4. Solution

VeilSave provides one Sepolia cUSDT pool with 16 fixed public participant slots and seven-day epochs.

- Users reserve one public slot with a refundable `0.001 ETH` Sepolia slot bond.
- Users transfer an encrypted cUSDT amount into the pool.
- Principal, mature draw weight, pending draw weight, queued withdrawals, prize reserve, and per-epoch prizes remain encrypted.
- Deposits made during epoch `E` become eligible after epoch `E` closes and participate in the draw at the end of epoch `E+1`.
- At close, the pool freezes 16 encrypted eligible-weight handles before requesting Chainlink VRF v2.5 randomness.
- The callback stores only the VRF word. A separate transaction runs the validated 16-slot FHE weighted draw.
- The encrypted winner handle becomes publicly decryptable and is finalized only after a valid KMS proof.
- The finalized winner receives the only external ACL permission for the encrypted prize.
- Principal withdrawals pay immediately from confidential liquidity where possible. Any unpaid encrypted remainder enters a strict request-time FIFO queue.
- Individual deposits cross into a public ERC-4626 strategy only as aggregate settlements.

There is one winner and one encrypted prize per funded epoch. There are no prize tiers.

## 5. Target User

The primary user is a crypto-wallet user who:

- saves stable-value assets rather than trading actively;
- does not want their savings amount publicly readable;
- accepts that their address and transaction activity remain public;
- likes a proportional chance to receive prizes funded by strategy yield;
- expects principal access without waiting for a draw to finish;
- values a visible randomness and finalization trail;
- understands wallet signatures and Sepolia transactions; and
- can tolerate asynchronous encryption, decryption, VRF, and settlement steps when their state is explained honestly.

One persona is sufficient for the MVP. Institutional custody, social recovery, non-crypto onboarding, and anonymous users would materially change the requirements and are not included.

## 6. Product Principles

### Privacy by default

Financial values are masked by default. The application never decrypts a balance, weight, or prize merely to simplify rendering. Reveals require an explicit user action and a narrowly scoped wallet permit.

### Verifiable, not blindly trusted

The public can inspect the frozen epoch, Chainlink request and fulfillment, separate FHE draw transaction, encrypted winner handle, KMS proof finalization, and final winner. The UI must also state that observers cannot recompute the weighted result from hidden plaintext balances.

### Principal first

Principal and prize liabilities are separate. Prize funding never silently consumes principal, and prize liquidity never pays principal claims. Strategy impairment is surfaced and stops new risk-taking.

### Honest asynchronous UX

Encryption, transaction confirmation, VRF fulfillment, public decryption, ACL propagation, strategy settlement, and confidential claims are separate states. The UI never compresses them into a false instant-success state.

### Permissionless liveness

Any address may progress deterministic epoch, proof-finalization, settlement, queue-service, and recovery transitions where the destination and result are already bound. An optional keeper is a convenience, not an authority.

### Fixed scope

The MVP optimizes for a reliable 16-slot demonstration. It does not generalize into a multi-pool, multi-strategy, multi-winner protocol.

### Honest privacy boundaries

The product says "private amount, public activity." It never says "anonymous," "invisible," or "everything is private."

## 7. Core Loop

| Stage | User action | Contract action | Encrypted data | Public data | Visible UI state | Failure and retry | Terminal state |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Connect wallet | Connect and approve Sepolia | None | None | Wallet address, chain | Connected or wrong network | Reconnect or switch network | Wallet ready |
| Obtain confidential asset | Acquire test USDT and wrap it as cUSDT | Wrapper locks public asset and mints confidential balance | cUSDT balance after wrapping | Wrap amount, addresses, transaction | cUSDT ready; wrap privacy warning | Retry faucet/wrap after rereading balances | Spendable cUSDT |
| Reserve a slot | Pay fixed refundable bond | Assign lowest free one of 16 slots | None | Owner, slot, fixed bond | Slot reserved | Retry after receipt reconciliation; pool-full state is terminal until a slot opens | Active slot |
| Deposit | Enter amount, encrypt locally, sign, submit | ERC-7984 transfer-and-call credits actual received amount to principal and pending weight | Requested amount, actual amount, principal, pending weight | Sender, contracts, timing, target epoch | Encrypting, submitted, confirmed, pending maturity | Fresh proof after rejection; never duplicate before state reread | Deposit credited |
| Save privately | Optionally reveal principal and weight values | Keep principal and weights under pool/user ACL | Principal, eligible weight, pending weight | Epoch schedule, slot, strategy state | Masked principal and eligibility | Retry offchain reveal; no state mutation | Active savings position |
| Mature eligibility | No action required | At freeze, snapshot current eligible weight and add pending weight to future eligible weight | Snapshot, eligible, pending | Epoch close and snapshot commitment | Pending becomes next-epoch eligible | Permissionless freeze retry until deadline | Frozen epoch and matured future weight |
| Request VRF | Any user may progress | Bind one request ID to frozen epoch | None | Request ID, funding, deadline | Randomness requested | Fund adapter or retry same request call; never request a second word | Bound VRF request |
| Fulfill VRF | No user action required | Adapter callback stores one word and fulfillment time only | None | Fulfillment, word, request ID | Randomness fulfilled; 24-hour execution window starts | Poll/recover by request ID; timeout abandons without reroll | Stored word or terminal abandonment |
| Execute draw | Any user may call | Run fixed 16-slot FHE weighted draw in a separate transaction | Total, threshold, prefixes, crossings, winner | Draw transaction and winner handle | Draw executing, then reveal pending | Retry same snapshot/word until fixed draw deadline | Encrypted winner handle |
| Reveal winner | Any user retrieves and submits public proof | Verify KMS proof after finality delay and bind clear winner | Prize remains encrypted | Proof transaction, winner address | Proof pending, finality wait, winner finalized | Retry same handle/proof flow; no expiry after draw | Final winner or no-winner terminal |
| Grant prize access | Winner waits for ACL propagation | Bind the existing encrypted epoch prize to the finalized winner and allow only that winner | Per-epoch prize | ACL/finalization transaction exists | Prize private, ACL propagating | Winner retries user decryption; no onchain replay | Winner authorized |
| Reveal or claim prize | Winner explicitly reveals and/or claims | Transfer the remaining confidential epoch prize and retain any unpaid remainder on token failure | Prize amount and transfer | Claim transaction and recipient | Revealed locally or claim pending | Retry token transfer or decryption; amount never becomes public | Prize received or durable private epoch claim |
| Withdraw principal | Enter amount and encrypt | Pay from principal liquidity; record encrypted remainder | Amount, remaining principal, queue claim | Request transaction and later routing status | Immediate portion processed or queued | Retry proof/transaction after state reread | Immediate settlement or FIFO ticket |
| Settle queue | Any user may progress | Redeem aggregate public strategy assets, rewrap, and fund claims | Individual claims, confidential returned liquidity | Aggregate amount, strategy activity | Settlement requested, strategy pending, liquidity returned | Retry same settlement after strategy/relayer recovery | Claim liquidity available |
| Next epoch | Any user opens after terminal | Open next seven-day epoch with already matured eligible state | Eligible and pending ledgers | New epoch ID and times | New draw countdown | Retry idempotently | New OPEN epoch |

## 8. Core User Flows

### 8.1 First-time user

1. The user opens the pool overview, connects a wallet, and is asked to switch to Sepolia if necessary.
2. The UI checks the deployment manifest, cUSDT contract, pool status, available slot count, SDK readiness, RPC health, and relayer reachability.
3. The user obtains public test USDT from the configured source if needed.
4. The user wraps public USDT into cUSDT. The UI states: "The wrap amount is public. Transfers inside VeilSave use confidential amounts."
5. The user reserves the lowest free slot by posting the fixed public `0.001 ETH` refundable bond.
6. Before deposit, the UI presents the short privacy copy: "Your savings amount stays encrypted. Your wallet address and transactions remain public."
7. The user enters the deposit flow.

Wrong network, unavailable faucet, failed wrap, full capacity, or insufficient bond must stop the flow before encrypted deposit preparation.

### 8.2 Deposit

1. The amount field exists only in browser memory and must not enter URL parameters, logs, analytics, or error reporting.
2. The UI checks that the account owns a slot and that deposits are not paused.
3. The SDK encrypts the amount for the correct token, pool, chain, and signer context.
4. The wallet signs/submits `confidentialTransferAndCall`.
5. The token transfers and calls the pool with the actual encrypted amount.
6. The pool credits only the actual amount accepted by the token, never the typed intention.
7. Principal and pending weight increase; current eligible weight does not. If the current epoch is `OPEN`, the first eligible draw is the next epoch. If the current epoch is already frozen/terminal and the next epoch has not opened, that maturity boundary has passed, so the first eligible draw is the epoch after the next one.
8. A confirmed transaction is shown as "processing" until the callback/accounting state is reread.
9. Success copy: "Deposit recorded. It becomes eligible after one complete epoch."
10. On encryption failure, regenerate locally. On wallet rejection, keep the amount field locally. On revert or uncertain receipt, reread principal/transaction state before offering retry.

### 8.3 Active savings

The dashboard shows:

- `****** cUSDT` as the default principal display;
- current eligibility as `Private` rather than zero;
- the epoch in which pending funds mature;
- next close time;
- public slot number;
- strategy mode, health, and public aggregate activity;
- withdrawal availability; and
- an explicit `Reveal on this device` action.

Local reveal states are: permit required, permit signing, decrypting, revealed, stale, remasked, unavailable, and error. Revealed values automatically become stale after any deposit, withdrawal, maturity, claim, or account/network change. The application does not persist plaintext values beyond the active session.

### 8.4 Draw

The draw surface uses a durable stepper:

1. Epoch open.
2. Close reached.
3. Snapshot frozen.
4. VRF requested.
5. VRF fulfilled.
6. Random word synchronized.
7. FHE draw executing.
8. Winner handle ready.
9. Finality delay.
10. Winner proof verified.
11. Epoch terminal.

Every public step has a transaction or request link. Failed draw execution retains the same snapshot and random word. The 24-hour execution deadline starts from the adapter's recorded VRF fulfillment time, not from a later UI/synchronization action. A terminal timeout rolls the prize forward and permanently rejects late execution; it never creates a reroll.

### 8.5 Winner

1. The finalized public address sees a winner notification.
2. The UI shows the freeze, VRF, draw, handle, proof, and finalization evidence before asking for any prize reveal.
3. The prize remains `****** cUSDT` while the winner ACL propagates.
4. The UI distinguishes `Winner finalized` from `Prize permission available`.
5. The winner selects `Reveal prize`, signs a scoped permit, and decrypts locally.
6. The user may claim without revealing. Claim transfers confidential cUSDT and shows no public amount.
7. A failed transfer keeps an encrypted unpaid credit and provides retry.
8. There is no admin wallet recovery and no prize expiry. Loss of the winning key can make the prize inaccessible.

### 8.6 Non-winner

After finalization the user sees:

- the public winning address;
- `No prize this epoch`;
- principal still masked and intact except for the user's own withdrawals;
- pending/eligible state for the next epoch; and
- the next draw time.

No loser receives prize ACL, and the UI never tries to decrypt a zero prize for every participant.

### 8.7 Immediate withdrawal

1. The user enters and locally encrypts an amount.
2. The pool caps it against encrypted principal without a secret-dependent revert.
3. Eligible weight is reduced first, then pending weight. A previously frozen snapshot is unchanged.
4. The pool transfers as much as confidential principal liquidity permits.
5. The encrypted unpaid remainder is stored in a withdrawal ticket.
6. A publicly decryptable boolean, not the amount, determines whether the ticket is fully immediate or must join the queue.
7. Any caller may submit the boolean proof. A zero remainder makes the ticket `IMMEDIATE_SETTLED`.
8. The UI can show the user's received amount only through the user's own local decryption.

### 8.8 Queued withdrawal

1. A nonzero unpaid remainder is proven only as the boolean fact `has queued remainder` and enters strict request-time FIFO.
2. Each slot may have only one active withdrawal ticket. The user can submit another after the prior ticket is terminal.
3. The ticket stores an encrypted remaining claim. The public sees owner, request ID, order, status, and timing, not amount.
4. Any caller may start a capped aggregate strategy redemption against encrypted total queued debt.
5. The aggregate amount is publicly decrypted because the ERC-4626 strategy requires a public amount.
6. Strategy assets return, are rewrapped as cUSDT, and become confidential principal claim liquidity.
7. Only the FIFO head is serviced. It receives `min(encrypted claim, encrypted liquidity)`.
8. A publicly decryptable completion boolean determines whether the ticket remains head or becomes `CLAIMED` and advances the queue.
9. A partial settlement pays the oldest ticket first; later tickets wait.
10. Strategy or wrapper failure leaves the ticket and settlement retryable without a second principal debit.

### 8.9 Failure states

| State | Human-readable explanation | Safe action | Terminal? |
| --- | --- | --- | --- |
| Wrong network | "VeilSave is deployed on Ethereum Sepolia." | Switch network; invalidate stale permits and proofs | No |
| Wallet rejection | "The wallet did not approve this step. No new transaction was sent." | Retry when ready | No |
| Encryption failure | "The private amount could not be prepared for this contract." | Check SDK/account/network and generate a fresh proof | No |
| Transaction reverted | "The transaction failed and the pool state may be unchanged." | Reread state and receipt before retrying | No |
| Receipt uncertain or replaced | "The wallet submission is not yet canonical." | Reconcile nonce and canonical receipt; do not duplicate | No |
| FHE operation pending | "Encrypted computation is still being processed." | Poll the bound transaction/state | No |
| FHE draw reverted | "The draw transaction failed, but its snapshot and random word are unchanged." | Retry the same draw before deadline | No until fixed deadline |
| VRF pending | "Randomness was requested and has not been fulfilled yet." | Wait; anyone may monitor/fund the adapter | No |
| VRF timeout | "Randomness did not arrive before the fixed deadline. This epoch awards no prize." | Finalize abandonment and continue; no reroll | Yes for that epoch |
| Winner proof pending | "The winner handle exists, but its authenticated public proof is not finalized." | Retry public decryption/submission for the same handle | No |
| Finality delay | "The result is waiting for the configured block-confirmation delay." | Wait for 96 blocks | No |
| ACL propagation pending | "The winner is finalized, but prize permission has not reached the decryption service yet." | Retry user decryption; never refinalize prize | No |
| Strategy unavailable | "The public yield strategy cannot accept or return assets right now." | Pause new investment and retry the same settlement | No |
| Strategy impaired | "Public strategy assets are below recorded deployed principal." | Stop deposits/investment/harvest, attempt controlled exit, disclose loss mode | No silent terminal write-off |
| Insufficient confidential liquidity | "Only part of the private withdrawal could be paid immediately." | Finalize routing into FIFO | No |
| Queued settlement pending | "The encrypted claim is waiting for aggregate strategy liquidity." | Any caller may progress the active settlement | No |
| Claim failure | "The confidential payout did not complete; the unpaid claim remains recorded." | Retry service/transfer, then prove completion boolean | No |
| Relayer unavailable | "The encryption or decryption service is temporarily unreachable." | Keep onchain state unchanged and retry later | No |
| RPC unavailable | "The application cannot read the canonical Sepolia state." | Switch configured RPC/failover; never infer success | No |
| Pool full | "All 16 public slots are reserved." | Wait for a released slot | Yes until capacity changes naturally |
| Lost wallet | "VeilSave cannot reauthorize another address to private balances or prizes." | Use the original wallet if recoverable | Yes if key is lost |

## 9. Privacy Promise

### Guaranteed confidential values

"Confidential" in this section means the value is stored and processed as ciphertext, is never intentionally published as plaintext, and is protected by the stated ACL. It does not mean public wrapper amounts, aggregate settlements, timing, or other side information can never reveal a bound or support an inference.

- cUSDT transfer amounts inside the confidential token layer;
- user principal;
- current eligible weight;
- pending weight;
- epoch weight snapshots;
- encrypted total, threshold, prefixes, and crossing bits;
- internal principal liquidity and prize reserve;
- queued withdrawal and prize-credit amounts; and
- prize amount, with external access granted only to the finalized winner.

### Public information

- wallet and contract addresses;
- chain, transaction existence, timing, function, gas, and logs;
- standard ERC-7984 ciphertext handles emitted by token/wrapper transfer or unwrap events, which are not plaintext amounts but can aid correlation;
- slot reservation, owner, order, and capacity;
- epoch IDs, schedule, status, and snapshot commitment;
- Chainlink request ID, fulfillment, and random word;
- draw and proof-finalization transactions;
- encrypted winner handle and final winner address;
- withdrawal request order and completion status;
- public aggregate strategy settlement amount and timing;
- strategy shares, assets, health, and yield mode; and
- public wrap and unwrap amounts.

### Approved short copy

Primary disclosure:

> Your savings amount stays encrypted. Your wallet address and transactions remain public.

Action disclosure:

> Private amount, public activity.

Winner disclosure:

> The winner address is public. The prize is never publicly decrypted; only the winner receives decryption access.

Strategy disclosure for fallback:

> TEST YIELD: sponsored demo funds in a deterministic test vault. This is not live protocol yield or an APY.

Strategy disclosure for a validated live adapter:

> LIVE STRATEGY YIELD: returns come from the configured public strategy and can vary or become unavailable.

Withdrawal disclosure:

> Your claim amount stays encrypted. Aggregate strategy redemptions and queue timing are public.

Inference disclosure:

> Public wrap and aggregate strategy amounts may let observers infer or bound a private value, especially when only one user is active.

Prohibited copy includes "everything is private," "anonymous," "invisible transactions," "guaranteed no-loss," and any claim that test yield is organic.

## 10. Economics

### Principal

Principal enters through the actual encrypted cUSDT amount accepted by ERC-7984 transfer-and-call. The pool owes that amount as encrypted principal until it is paid immediately or converted once into an irrevocable encrypted withdrawal claim.

There is no protocol fee in the MVP. No admin can introduce one.

### Confidential liquidity buffer

The pool targets 20% of aggregate principal as confidential liquid cUSDT. Investment dispatch may move only encrypted liquidity above that target into the public strategy. This target improves immediate withdrawals but is not a guarantee because withdrawals can arrive together or the strategy can be impaired.

### Yield

Individual encrypted deposits are aggregated before crossing to the public strategy. The settlement controller records public deployed principal. Public strategy assets above that deployed-principal cost basis are yield. The MVP has no separate loss buffer. Only successfully redeemed and rewrapped yield can enter the encrypted prize reserve.

The Sepolia MVP defaults to a deterministic donation-based ERC-4626 test vault. Its externally funded increase is labeled `TEST YIELD`. It publishes no APY and makes no organic-yield claim.

### Prize reserve

Yield returned as cUSDT is credited to a separate encrypted prize reserve. At freeze, the pool moves the full current reserve into that epoch's encrypted prize and resets the live reserve to encrypted zero. Yield arriving later therefore funds a later epoch.

The public strategy withdrawal that funds the reserve is observable. The contract never publicly decrypts the prize, but a known reserve history or a correlated test-yield sponsorship can make the amount inferable. Product copy and verification screens must disclose this side-information limit and must not equate ciphertext confidentiality with guaranteed inference resistance.

The epoch record is the sole prize claim ledger: no separate aggregate winner-credit mapping exists. Finalization grants the winner access to that epoch's remaining prize handle. A zero-winner or abandoned epoch moves the unchanged epoch prize back into the live reserve exactly once. Epoch prizes remain confidential and non-expiring, and multiple wins are claimed by epoch.

### Winner probability

For the frozen 16-slot epoch:

```text
w_i = eligible encrypted weight of slot i
T   = sum of all eligible encrypted weights
P(i wins | T > 0) = w_i / T
```

Weights are principal-derived and never calculated from public ticket counts. One address owns at most one slot.

### Eligibility

A deposit made during epoch `E` enters `pendingWeight`. At the close of `E`, the already mature `eligibleWeight` is snapshotted for `E`, and pending weight is added to live eligible weight for the next epoch. Therefore a new deposit cannot enter the draw that is about to close and remains in the pool for at least one complete epoch before its first possible draw.

Mature principal remains eligible in later epochs until withdrawn.

### Withdrawal

Withdrawal is permissionless in every normal epoch state. A frozen snapshot is not changed by a later withdrawal. Future eligible and pending weights are reduced against live principal. Immediate liquidity is used first; the remainder becomes an encrypted FIFO claim.

"Withdraw at any time" means the user can initiate the principal exit at any time. It does not promise synchronous strategy redemption.

### Prize timing

There is one scheduled draw per seven-day epoch, subject to asynchronous finalization. There is one winner at most. No multiple tiers, runner-up prizes, or prize expiry exist in the MVP.

## 11. Eligibility Model

The slot's live accounting obeys:

```text
eligibleWeight + pendingWeight <= principal
```

The normal case is equality. It may be a strict inequality only during a retry-safe intermediate transfer transition explicitly covered by the architecture state machine.

Rules:

- New deposits increase principal and pending weight.
- Freeze snapshots current eligible weight for all 16 public slots.
- Freeze then matures pending weight by adding it to live eligible weight and resetting pending to encrypted zero.
- A deposit while epoch `E` is `OPEN` first participates in draw `E+1`.
- A deposit after `E` has frozen but before `E+1` opens joins the new pending bucket and first participates in draw `E+2`; the previous maturity boundary is never applied retroactively.
- The public deposit event/UI shows this exact first eligible epoch without revealing amount.
- Withdrawal reduces live eligible weight first, then pending weight.
- Withdrawal after snapshot does not alter the frozen epoch.
- A slot cannot be reassigned while any nonterminal epoch references its owner.
- A slot can be released only after `requestWithdrawal(..., closing=true)`, a terminal withdrawal ticket, and terminal epoch references.
- The public slot bond is separate from principal and returns only to the slot owner.

The first deployed epoch may have zero mature weight. The deployment/demo plan must seed positions early enough that the demonstrated epoch contains mature participants; it must not bypass maturity.

## 12. Winner Model

### Normal case

The contract selects exactly one first-crossing slot with probability proportional to its encrypted eligible weight. The public slot order is deterministic and frozen before randomness.

### Edge cases

| Case | Frozen behavior |
| --- | --- |
| `T = 0` | Encrypted winner resolves to zero address; epoch becomes terminal with no winner; prize rolls forward |
| One participant with positive weight | That participant wins for every random word |
| Equal positive weights | Each slot has equal probability, subject only to negligible 64-bit range-reduction discretization |
| Dominant weight | Probability remains proportional; no hidden whale cap is introduced |
| Withdraw after snapshot | Frozen weight remains eligible for that epoch; live future weight and principal decrease |
| Join immediately before close | Deposit enters pending weight and cannot affect the closing draw |
| Pending weight exists | It is excluded from the current snapshot and matures for a later epoch |
| Empty slot | Address is zero and weight is encrypted zero; it cannot win |
| Aggregate exceeds validated `uint64` total | Safety path normalizes to no award and rolls prize without revealing whether the zero winner came from zero total or safety normalization; no wrapping arithmetic is accepted |
| Draw timeout before encrypted winner exists | Epoch is abandoned once; same prize rolls forward; no second random request |
| Winner reveal service outage | Same encrypted handle remains retryable indefinitely; no prize expiry or reroll |

The public winner is the address authenticated as the plaintext of the encrypted winner handle. The public cannot see or recompute individual weights.

## 13. Withdrawal Model

### FIFO versus pro-rata decision

| Criterion | Strict request-time FIFO | Pro-rata |
| --- | --- | --- |
| Fairness | Honors time priority; later users cannot race settled liquidity | Shares scarcity across all claims but can feel unfair to early requests |
| Explainability | Familiar queue: oldest request is paid first | Requires explaining ratios, rounds, and repeated residuals |
| Contract complexity | Bounded one-head service and completion proof | Requires encrypted total ratios, division/rounding, and per-claim allocation |
| FHE cost | Encrypted `min`, subtract, and boolean completion per service | Higher fixed scan plus arithmetic; encrypted division by encrypted total is unsupported |
| Determinism | Exact public request order | Deterministic only after detailed dust and rounding rules |
| User expectation | Matches withdrawal queue language | May surprise a user whose early request is diluted by later requests |
| Testability | Simple model, one active ticket per slot, exact invariants | Larger state space and cumulative rounding cases |
| Production safety | Smallest new cryptographic surface; failures leave head intact | Greater HCU and accounting risk beyond the validated spike |

**Frozen decision: strict request-time FIFO.**

The oldest active withdrawal request receives priority once its routing proof establishes a queued remainder. Request order is assigned when `requestWithdrawal` succeeds, never when a later proof is submitted. A partially paid head stays first. A still-unclassified older request blocks service of later queued tickets until anyone finalizes its public routing proof. This accepts bounded head-of-line waiting in exchange for exact request-time fairness and lower cryptographic/accounting risk.

### Ticket rules

- One active withdrawal ticket per slot.
- A ticket receives a monotonically increasing public request ID and FIFO sequence in the request transaction.
- The amount and unpaid remainder are encrypted.
- A public boolean proof routes the ticket to `IMMEDIATE_SETTLED` or `QUEUED` without revealing amount.
- Routing proofs may be finalized out of order, but they never change request-time priority.
- The effective head is the lowest-sequence nonterminal ticket across the fixed 16 active slot pointers. If it is still `ROUTING_PENDING`, later queued tickets cannot be serviced.
- Queue completion uses a public boolean proof bound to the current remaining-claim handle and ticket version.
- Failed transfers or proofs do not advance the queue.
- Anyone may service the head, but payment is hardcoded to its owner.
- A completed claim cannot be paid again.

## 14. Error and Recovery Behavior

All asynchronous operations use these meanings:

- **Initiated:** a request is durably identified.
- **Pending:** the same request is awaiting an external or later deterministic step.
- **Fulfilled:** the external result exists and is bound to the request.
- **Failed:** the current attempt did not complete.
- **Retryable:** the same request and inputs remain authoritative.
- **Terminal:** no further state-changing success is valid for that request.

Recovery rules:

- Encryption failure creates no onchain state and requires a fresh proof.
- A reverted transaction is never assumed to have partially succeeded.
- RPC uncertainty is resolved by canonical receipt and state reads, not a duplicate transaction.
- VRF recovery resumes the bound request ID; it never requests replacement randomness.
- FHE draw retries use the identical snapshot and stored word.
- Winner proof retries use the identical epoch and winner handle.
- ACL/user-decryption retries are offchain and never recreate prize authorization.
- Strategy retries preserve the active settlement ID, public aggregate proof, and encrypted claims.
- Claim retries preserve unpaid encrypted remainder and FIFO position.
- Pausing may stop reservations, deposits, opening future epochs, or new investment, but never progression of an already-open epoch, existing withdrawal requests, settlement recovery, FIFO service, prize claims, or proof finalization.
- No failure silently converts principal into prize reserve or burns a claim.

## 15. MVP Scope

### MUST HAVE

- One Sepolia VeilSave pool.
- One six-decimal ERC-7984 cUSDT-like asset.
- Exactly 16 fixed public slots and one slot per address.
- Fixed refundable public slot bond.
- Seven-day sequential epochs and one-full-epoch maturity.
- Encrypted principal, eligible weight, pending weight, prize reserve, per-epoch prize claims, and queued claims.
- Actual-amount ERC-7984 transfer-and-call accounting.
- Frozen 16-slot encrypted snapshots before randomness.
- Chainlink VRF v2.5 request ID binding and storage-only callback.
- Separate validated 16-slot FHE weighted draw transaction.
- Public winner handle reveal and KMS-proof finalization.
- Winner-only prize ACL and explicit asynchronous reveal.
- One encrypted prize and at most one winner per epoch.
- Immediate confidential withdrawal and strict FIFO queued withdrawal.
- Aggregate public settlement through a replaceable ERC-4626 strategy.
- Deterministic `TEST YIELD` fallback, clearly labeled.
- Permissionless progress and retry transitions.
- Public draw verification surface and explorer links.
- Honest privacy, strategy, wallet-loss, and metadata disclosures.

### SHOULD HAVE

- 20% encrypted confidential-liquidity target.
- Two-participant aggregate preference with a 24-hour maximum wait and low-anonymity warning.
- Direct-RPC event history with stale-state detection.
- Public protocol-health panel for VRF, relayer, strategy, and settlement status.
- Optional keeper automation using the same permissionless functions.
- Mobile wallet, keyboard, screen-reader, and reduced-motion coverage.
- HCU/gas telemetry attached to the deployed draw version.

### COULD HAVE

- Opt-in notifications that contain no financial amount.
- Read-only historical distribution summaries that do not reconstruct private balances.
- A separately validated live Aave adapter after supply, redemption, and nonzero return succeed on current Sepolia.
- A public operations-funding balance indicator.

### DO NOT BUILD

- More than 16 slots or an unbounded participant array.
- More than one pool, asset, strategy at a time, winner, or prize tier.
- Public balances, public weights, public prize amounts, or plaintext winner computation.
- PoolTogether V5 TWAB, liquidation, auctions, tiers, or cross-chain machinery.
- Custom VRF, custom KMS, custom MPC, or custom ZK winner proof.
- A trusted winner backend or mandatory centralized keeper.
- NFTs, transferable tickets, referrals, teams, governance token, DAO, chat, or social graph.
- Leverage, strategy routing, yield optimization, insurance, bridges, or mainnet deployment.
- Automatic balance/prize decryption or private-value analytics.
- Admin recovery that can decrypt or redirect another user's position or prize.
- A rebasing-token wrapper without a separately validated non-rebasing share adapter.

## 16. Non-Goals

- Address anonymity or hidden transaction graphs.
- Hiding slot membership, deposit timing, winner identity, or aggregate strategy actions.
- Guaranteed synchronous withdrawals.
- Guaranteed yield, APY, strategy solvency, or zero loss.
- Supporting lost-wallet recovery.
- Supporting fee collection.
- Scaling the draw beyond the measured fixed 16-slot operation.
- Independently recomputable plaintext weighted results.
- A generalized confidential vault protocol.

## 17. Differentiators

1. **Truthful verification timeline.** VeilSave makes the VRF request, fulfillment, fixed FHE execution, encrypted winner handle, KMS proof, and final winner understandable without claiming that hidden weights are publicly recomputable.
2. **Confidential value with principal-first recovery.** Principal, odds, claims, and prizes remain encrypted while withdrawals remain permissionlessly initiable and retryable through strategy outages.
3. **Honest asynchronous privacy UX.** Masked defaults, explicit local reveals, ACL propagation states, aggregate leakage labels, and wallet-loss boundaries are product behavior rather than README footnotes.

## 18. Demo Flow

The reproducible demo uses a pre-deployed Sepolia epoch whose participant deposits have already matured and whose finality delays can be shown without waiting live.

1. Connect a funded Sepolia wallet.
2. Show the pool overview and the disclosure: "Your savings amount stays encrypted. Your wallet address and transactions remain public."
3. Show cUSDT acquisition/wrap status and its public wrap boundary.
4. Reserve or show an existing public slot.
5. Deposit an encrypted cUSDT amount.
6. Show the masked principal and pending maturity, then explicitly reveal only the demo user's own value.
7. Show several public slots with every financial value masked.
8. Open the draw page for a mature epoch and show the freeze transaction/commitment.
9. Show the bound Chainlink request and fulfillment with the public word.
10. Execute or show the separate FHE draw transaction and measured 16-slot HCU evidence.
11. Show the encrypted winner handle and the exact public-verification limitation.
12. Finalize the KMS proof after the configured 96-block ACL safety delay.
13. Show the public winner and a non-winner whose principal remains private.
14. As the winner, show `ACL propagating`, then explicitly decrypt the private prize locally.
15. Claim the prize confidentially without publishing its amount.
16. Request a principal withdrawal. Demonstrate either immediate payment or the FIFO queue.
17. If queued, show the public aggregate test-strategy redemption, confidential rewrap, and head claim.
18. End on the explorer-linked verification history and the `TEST YIELD` label.

The narrated core should fit within 8-10 minutes by using already-confirmed transactions for slow external steps. No step is simulated as instant; previously completed evidence is clearly identified.

## 19. Acceptance Criteria

### Functional

- [ ] A user can reserve exactly one of 16 slots and recover the bond after a valid close.
- [ ] ERC-7984 deposit credits only the actual encrypted amount received.
- [ ] Deposit increases encrypted principal and pending weight, not current eligible weight.
- [ ] Pending weight matures only after one complete epoch.
- [ ] Mature principal remains eligible until withdrawn.
- [ ] Freeze creates an immutable 16-slot address/weight snapshot before VRF request.
- [ ] One VRF request is bound to one epoch.
- [ ] Callback stores one word and performs no FHE draw.
- [ ] Separate draw produces one encrypted winner or zero winner.
- [ ] Valid KMS proof finalizes exactly once.
- [ ] One encrypted epoch prize is credited exactly once or rolled forward.
- [ ] Winner can reveal and claim; non-winners cannot.
- [ ] Withdrawal can be initiated in every normal epoch state.
- [ ] Immediate withdrawal uses only principal liquidity.
- [ ] Unpaid remainder becomes one encrypted ticket.
- [ ] FIFO order is request-time deterministic and partial head settlement blocks later tickets.
- [ ] Failed strategy redemption and claim remain retryable.
- [ ] Next epoch can open after terminal success or abandonment.

### Privacy

- [ ] No principal, weight, pending amount, claim amount, reserve, or prize plaintext appears in calldata, VeilSave-defined events, errors, application logs, URLs, or analytics; unavoidable standard ERC-7984 ciphertext-handle events are documented as public metadata.
- [ ] Values are masked by default and reveal requires explicit user action.
- [ ] Principal is decryptable only by its owner and required contracts.
- [ ] Weights and snapshots are never public-decryptable.
- [ ] Only winner handle and necessary aggregate settlement handles/booleans become public-decryptable.
- [ ] Prize is never public-decryptable and only the finalized winner receives external ACL.
- [ ] UI states public metadata and aggregate leakage accurately.
- [ ] UI states that public wrap/aggregate strategy flows may let observers infer or bound private values, including a prize, without granting them decryption authority.

### Security

- [ ] Wrong epoch, request, handle, clear winner, or proof is rejected.
- [ ] VRF cannot be rerolled or selectively replaced.
- [ ] Draw, winner finalization, prize authorization/rollover, withdrawal debit, and claim cannot execute twice.
- [ ] Encrypted overflow uses a safe no-award path and never wraps silently.
- [ ] A slot cannot be duplicated or reused while referenced.
- [ ] Admin, keeper, relayer, frontend, indexer, and non-winners fail prize-decryption tests.
- [ ] Pausing never traps existing exits or claims.
- [ ] Strategy losses cannot be hidden as yield or charged to prize reserve accounting.

### Performance

- [ ] The final 16-slot draw is no more than 17,000,000 global HCU.
- [ ] The final 16-slot draw is no more than 4,000,000 sequential-depth HCU.
- [ ] Final Sepolia gas is measured and fits the configured transaction/block envelope with margin.
- [ ] No draw transaction includes strategy, withdrawal, prize-credit, or large ACL work.
- [ ] UI remains stable across expected relayer, VRF, and RPC latency.

### Deployment

- [ ] Deployment targets Sepolia chain ID `11155111`.
- [ ] All Zama, token, wrapper, VRF, and strategy addresses are revalidated at deployment time.
- [ ] Contracts are source-verified and match a versioned manifest.
- [ ] VRF is funded and a full request/fulfillment is proven.
- [ ] Live winner ACL propagation and winner user-decryption are rerun successfully.
- [ ] Test yield and live yield modes cannot be confused in configuration or UI.

### UX

- [ ] Wrong network, rejected signature, encryption failure, revert, stale state, RPC outage, relayer outage, VRF delay, draw retry, proof delay, ACL delay, strategy failure, queue wait, and claim failure have distinct states and actions.
- [ ] Confirmed transaction is not shown as credited until state is reread.
- [ ] No unavailable ciphertext is rendered as zero.
- [ ] Public verification includes explorer links and the exact limitation statement.
- [ ] Mobile and desktop layouts do not clip masked values, statuses, or addresses.
- [ ] All controls are keyboard accessible and status changes are announced accessibly.

### Final P0 product check

- [ ] Shared pool.
- [ ] Principal withdrawable by immediate or queued path.
- [ ] Yield-generated or explicitly labeled test-yield prizes.
- [ ] Periodic draws.
- [ ] Encrypted deposits.
- [ ] Encrypted balances.
- [ ] Encrypted winnings.
- [ ] Winner selection over encrypted balances.
- [ ] Publicly verifiable draw lifecycle.
- [ ] Winner-only prize decryption.
- [ ] Reproducible Sepolia deployment.

**Product specification status: READY FOR PRODUCTION IMPLEMENTATION SPECIFICATION - BUT DO NOT IMPLEMENT YET.**
