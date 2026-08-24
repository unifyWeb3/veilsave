# VeilSave Security

Status: implementation security baseline complete; final live Sepolia validation pending.

VeilSave is a confidential-amount savings application, not an anonymity system. This document describes the controls implemented in the current worktree and the evidence required before a public production release.

## Scope

The security scope includes:

- `ConfidentialPrizePool`;
- `PoolVrfAdapter`;
- `SettlementController`;
- `DeterministicTestYieldVault`;
- the Zama FHEVM/relayer/KMS boundary;
- the ERC-7984 cUSDT wrapper and public underlying;
- Chainlink VRF v2.5;
- the Safe/timelock/guardian deployment model;
- encrypted frontend state and explicit reveal actions; and
- aggregate strategy settlement and strict FIFO withdrawal claims.

The disposable `spikes/` harnesses are evidence, not deployed production code. Production source-boundary checks reject imports from spikes and embedded private-key literals.

## Security status

Local evidence currently passes:

- 55 production contract tests, including M0-M11 suites;
- 56 preserved spike regression tests;
- 30 web tests;
- production source-boundary and secret checks;
- production-shaped local FHE draw measurement;
- frontend route, responsive, reduced-motion, focus, and accessible-control audits.

The following are not yet evidenced and block a production claim:

- final deployed contract addresses and verified source;
- final production-shaped Sepolia HCU/depth/gas;
- live winner public-decryption proof and 96-block finality;
- live winner-only ACL propagation and user decryption;
- live immediate withdrawal;
- live FIFO partial settlement, retry, and claim; and
- complete Sepolia deposit-to-prize-to-withdrawal run.

## Threat controls

| Threat                               | Control                                                                                                                                      | Evidence / operational check                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Unauthorized winner selection        | Winner is derived by fixed encrypted draw over frozen weights and stored VRF word; no setter/backend path exists                             | M7 vectors/oracle suite, M10 forbidden-function check, live draw audit      |
| VRF reroll or input mutation         | One request per epoch, request-to-commitment binding, callback stores randomness only, timeout is terminal                                   | M6 lifecycle tests; observe request ID and frozen commitment on Sepolia     |
| Callback denial of service           | VRF callback performs no large FHE computation and ignores unknown, duplicate, or empty fulfillments                                         | M6 tests; live callback receipt                                             |
| Forged winner proof                  | `FHE.checkSignatures` binds the public cleartext to the exact encrypted handle and finalization state                                        | M8 forged cleartext/handle/epoch/replay tests; live KMS proof               |
| Unauthorized prize decryption        | Prize stays encrypted; ACL is granted only to finalized winner after delay; admin, keeper, relayer, and public paths have no prize authority | M8 six-case ACL suite; live winner/non-winner decryption negatives          |
| Double winner finalization           | Epoch state and finalized flag are checked; finalization is one-way                                                                          | M8 replay test and epoch state assertions                                   |
| Wrong epoch or nonparticipant winner | Proof must identify the current epoch and clear winner must be a frozen slot owner                                                           | M8 wrong-epoch/nonparticipant tests                                         |
| Encrypted overflow                   | Checked/saturating arithmetic and overflow-safe total handling; overflow produces no winner rather than a wrapped winner                     | M7 overflow vectors and randomized oracle tests                             |
| Public balance leakage               | Financial values are encrypted; public events contain addresses, IDs, status, commitments, and handles only where required                   | Event review, privacy tests, frontend source audit                          |
| Amount over-credit                   | Pool credits the actual ERC-7984 callback amount, not the user-requested amount                                                              | M1 tests and asset spike                                                    |
| Principal/prize mixing               | Separate encrypted principal liability, claim liquidity, and prize reserve; prize reserve cannot pay principal claims                        | M5/M9/M10 accounting tests                                                  |
| Phantom principal or over-credit     | Conservation invariant covers deposits, live principal, claims, payouts, and in-flight amounts                                               | M10 conservation test and live reconciliation                               |
| Double withdrawal claim              | Ticket state, version, current handle, FIFO head, and completion proof are checked                                                           | M4/M10 tests; live repeated-claim attempt                                   |
| FIFO bypass                          | Request-time sequence and unresolved older routing ticket block later service; only the head can consume liquidity                           | M4/M10 randomized partial FIFO tests; live A/B partial settlement           |
| Strategy insolvency                  | Public balance reconciliation, loss-mode detection, new-risk pause, retryable exits, and drained-strategy requirement                        | M5/M10 loss/replacement tests; live strategy audit                          |
| Strategy failure                     | Settlement records retry stage and intent; failed strategy/wrapper operations do not burn claims                                             | M5/M9 retry tests; live induced/recovered failure where possible            |
| Reentrancy                           | `ReentrancyGuard`, effects-before-external-call discipline, and callback routing checks                                                      | M10 strategy and bond-return reentrancy tests                               |
| Slot reuse corruption                | Stable owner mapping and `lastReferencedEpoch`; slots cannot be reused while historical references remain                                    | M3 tests and live slot lifecycle audit                                      |
| HCU denial of service                | Fixed 16-slot compile-time arrays and isolated draw transaction; release gates are 17M global / 4M depth                                     | M7 production metric and spike evidence; final Sepolia measurement required |
| Pause trapping funds                 | Guardian pauses new risk; permissionless exits and retryable settlement remain available; timelock unpauses except during loss mode          | M10 loss-mode test; runbook pause checks                                    |
| Governance compromise                | Immutable core; Safe/timelock controls pause and drained strategy replacement; no winner, weight, capacity, VRF, or prize-decrypt setters    | M11 rehearsal and M10 governance tests                                      |
| Admin prize access                   | Admin controls do not receive user or prize decryption ACLs                                                                                  | M8/M10 negative tests and live ACL audit                                    |
| RPC/relayer/KMS outage               | UI shows loading, unavailable, retryable, and terminal states; operations are bound by IDs and persisted in a privacy-safe allowlist         | Web recovery tests, operation store tests, runbook                          |
| Frontend compromise                  | Reveals require explicit user action; plaintext is session-only and invalidated after state changes; browser cannot bypass onchain ACL       | Privacy tests and browser review                                            |
| Reorg or stale proof                 | Transaction receipt reconciliation, request/epoch/handle binding, finality delay, and manifest code-hash validation                          | Transaction utilities, M8 delay checks, deployment audit                    |

## Trust model

### Cryptographic and protocol trust

Users trust the Zama FHEVM executor, ACL, KMS/decryption verifiers, and relayer availability to execute and prove encrypted operations. FHE confidentiality does not make a compromised browser safe after the user explicitly reveals a value.

### Smart-contract trust

Users trust the reviewed Solidity implementation, compiler/toolchain versions, and the deployed runtime bytecode matching the signed manifest. The core pool is immutable in the MVP; deployment-time bindings are one-time and erased after Safe activation.

### Strategy trust

The deterministic test vault is externally sponsored demonstration infrastructure. It is not evidence of organic yield. Any future live strategy requires separate asset, solvency, redemption, loss, and yield validation.

### Oracle trust

Chainlink VRF supplies the random word under its own coordinator/wrapper guarantees. VeilSave does not select or reroll randomness. VRF availability failure can terminally abandon an epoch without creating a replacement draw.

### Zama availability trust

Public winner proof and user decryption require relayer/KMS availability. A relay outage should delay or make an operation retryable; it must not grant broad prize access or mutate frozen inputs.

### Frontend and wallet trust

The frontend is a transaction and decryption client, not a winner authority. Wallets can expose addresses and signed transactions. A malicious or compromised browser can read a value the user explicitly reveals.

### Governance trust

The Safe and timelock can pause risk-taking and, after a 24-hour delay, replace a fully drained strategy. They cannot choose winners, edit frozen weights, reroll VRF, increase capacity, or decrypt other users' balances/prizes.

## Governance and pause policy

- Safe is the bootstrap authority, pause guardian, and timelock proposer/canceller.
- Timelock has a 24-hour minimum delay, self-administered role, and open executor.
- Guardian can pause slot reservation, deposits, epoch opening, and investment risk.
- Timelock can remove pauses only when loss mode is not active.
- Settlement controller can atomically enter loss mode when withdrawable strategy assets fall below deployed principal.
- Strategy replacement requires paused investment, no active settlement, zero old shares/deployed principal, same underlying asset, and timelock execution.
- No upgradeable proxy path exists in the MVP.

## Operational requirements before release

1. Revalidate every external address and code hash on Sepolia.
2. Execute and independently review the Safe bind/bind/activate batch.
3. Verify source for all five deployed contracts, including the timelock.
4. Fund and observe the VRF adapter using a bounded request gas limit.
5. Run the complete winner ACL and unauthorized-decryption matrix live.
6. Measure the final draw's HCU, sequential depth, and ordinary gas.
7. Run immediate and queued FIFO withdrawals with partial settlement and retry.
8. Publish the manifest only after evidence hashes and timestamps are recorded.
9. Keep private keys, wallet permits, plaintext values, and relay credentials out of logs, events, analytics, and reports.

## Responsible disclosure

Do not report vulnerabilities in public issues with exploitable details. Use the repository owner's private security channel or the hosting platform's private security-advisory mechanism. The exact maintainer contact must be configured before public submission; no contact address is fabricated in this repository.

## Non-claims

VeilSave does not claim anonymous savings, hidden wallet addresses, invisible transaction timing, a private transaction graph, or a plaintext-recomputable public proof of a weighted result whose balances remain encrypted.
