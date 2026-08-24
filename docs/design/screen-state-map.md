# VeilSave Screen State Map

This map defines what each screen must render from canonical chain/RPC/relayer state. Visual design must not collapse distinct protocol states into a generic spinner.

## Global states

| State | User explanation | Available action |
| --- | --- | --- |
| Wallet disconnected | Connect a wallet to create or inspect a private position. | Connect wallet |
| Wrong network | VeilSave operates on Sepolia for this release. | Switch network |
| Manifest unavailable | Verified deployment configuration cannot be loaded. | Retry; do not enable writes |
| Code-hash mismatch | The configured contract does not match the reviewed deployment. | Block writes and retry configuration |
| RPC unavailable | Public chain state cannot be refreshed. Existing funds are not changed. | Retry or use configured fallback RPC |
| Relayer/KMS unavailable | Encryption or decryption services are temporarily unavailable. | Preserve operation state and retry |
| Stale data | Displayed public state is older than the latest known block. | Refresh before writing |
| Protocol paused | The reason and exact paused scope are public. Exit/recovery actions remain visible where allowed. | Use allowed exit or wait for recovery |

## Pool overview

| Condition | Required presentation |
| --- | --- |
| OPEN | Countdown, occupied slots, strategy label, connect/open-dashboard action |
| FROZEN or later | Freeze indicator, current draw stage, next eligibility explanation |
| Capacity available | Show public open-slot count |
| Capacity full | Explain fixed 16-slot capacity; no waitlist feature |
| TEST YIELD | Persistent explicit `TEST YIELD` label and sponsor-funding explanation |
| LIVE STRATEGY YIELD | Show only after deployment manifest and strategy checks identify a validated live adapter |

## Dashboard position

Every confidential value supports these states independently:

| State | Presentation |
| --- | --- |
| Masked | Stable placeholder such as `•••••• cUSDT` plus explicit Reveal control |
| Revealing | Local-decryption progress without changing adjacent layout |
| Revealed | Session-local plaintext with Hide control |
| Stale | Keep value masked or mark revealed value stale; require refresh before action |
| Unavailable | Explain missing ACL, unsupported browser, or service outage |
| Error | Show retry without logging ciphertext, proof, or plaintext |

Position states:

- no slot and no position;
- slot reserved, no confirmed deposit;
- deposit confirming;
- pending weight for a named future epoch;
- eligible position;
- epoch frozen with snapshot fixed;
- withdrawal routing pending;
- immediate withdrawal settled;
- active FIFO ticket;
- slot release available after all liabilities and tickets are cleared.

## Deposit operation

| State | UI behavior | Recovery |
| --- | --- | --- |
| Asset unavailable | Explain cUSDT preparation requirement. | Open asset preparation |
| Slot unavailable | Disable deposit; explain 16-slot capacity. | Refresh occupancy |
| Draft | Validate six decimals and wallet capacity locally. | Edit/cancel |
| Encrypting | Keep amount local; no transaction exists yet. | Retry encryption |
| Signature pending | Wallet is awaiting approval. | Reopen only after rejection/timeout |
| Submitted | Track transaction hash and replacement. | Retry read, not duplicate write |
| Callback pending | Token transfer exists; accounting callback is not final. | Resume tracking |
| Confirmed | Show actual credited transfer and maturity epoch privately. | Return to dashboard |
| Reverted/rejected | Explain whether no transfer occurred or a refund path ran. | Retry from safe checkpoint |

Maturity copy must distinguish deposits made during `OPEN E` (first eligible in `E+1`) from deposits after freeze but before the next open transition (first eligible in `E+2`).

## Epoch and draw

| Protocol state | Required label | Retry authority |
| --- | --- | --- |
| OPEN | Accepting next-epoch savings | Any valid depositor |
| FROZEN | Inputs fixed | Permissionless lifecycle caller |
| VRF_REQUESTED | Randomness requested | Observe until timeout |
| VRF_FULFILLED / DRAW_READY | Randomness stored; FHE draw callable separately | Any caller |
| DRAW_EXECUTING | FHE transaction submitted | Track replacement/finality |
| DRAW_EXECUTED | Encrypted winner produced | Any reveal initiator after policy allows |
| WINNER_REVEAL_PENDING | Public decryption/proof pending | Retry same epoch/handle only |
| FINALITY_DELAY | Wait through 96 blocks | No bypass |
| WINNER_FINALIZED | Winner address authenticated | Prize ACL propagation tracking |
| PRIZE_READY | Winner may reveal privately | Finalized winner only |
| TERMINAL | Final result or terminal zero/timeout | No reroll |
| VRF terminal timeout | Epoch ends without a result | Open next epoch; never request replacement randomness for the same frozen draw |

## Winner and prize

| State | Winner view | Other users/public view |
| --- | --- | --- |
| Winner unknown | Proof lifecycle only | Same |
| Winner finalized | Public winner address | Public winner address |
| ACL pending | Explain that permission propagation is asynchronous | No prize access |
| Prize reveal ready | Reveal control | No prize handle or amount |
| Prize revealed | Local plaintext and claim control | No amount |
| Prize claimed | Confidential receipt confirmation | Public claim transaction existence only |
| Reveal failure | Preserve winner status and retry | No additional disclosure |

## Withdrawal and settlement

| State | Required presentation | Recovery |
| --- | --- | --- |
| Request encrypting/signing | Operation progress | Retry before submission |
| Routing proof pending | Immediate/queued branch is not known yet | Resume proof/finalization |
| Immediate settled | Confidential transfer confirmation | Done |
| FIFO queued | Request ID and immutable queue order | Observe or trigger permissionless settlement |
| Settlement requested | Aggregate public redemption pending | Resume tracking |
| Strategy unavailable | Principal claim remains recorded | Retry same settlement ID |
| Partial settlement | Earlier FIFO claims may advance; unpaid remainder remains encrypted | Retry settlement later |
| Claimable | Confidential claim action available | Claim |
| Claim submitted | Track transaction/replacement | Resume tracking |
| Claim failed | Ticket remains claimable unless chain state proves otherwise | Retry claim |
| Claimed | Completion confirmation; no second payout | Done |

## Operation persistence

For every write, persist a privacy-safe local operation record containing operation kind, chain ID, wallet, epoch/request/ticket identifier when public, transaction hash, current step, and last checked block. Never persist plaintext confidential values, decryption keys, raw proofs, or reusable signatures.
