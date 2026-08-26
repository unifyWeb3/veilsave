# VeilSave Implementation Report

Status: **READY WITH KNOWN BLOCKERS**

This report records the current implementation and evidence state. It does not promote local FHEVM or mock-chain results to live Sepolia evidence.

## Executive Summary

The frozen VeilSave specification is implemented across four Solidity contracts, a protocol-facing React frontend, deployment tooling, shared manifest types, recovery state, and release documentation. The implementation preserves the fixed 16-slot architecture, seven-day epochs, separate Chainlink VRF and FHE draw transactions, winner-only prize ACL, aggregate public strategy settlement, deterministic TEST YIELD fallback, immediate withdrawals, and strict request-time FIFO.

The local production gate is green. The project is not yet ready for final hackathon submission because no active Sepolia deployment manifest exists and the configured bootstrap Safe is not deployed at its supplied address. The deployment credentials and external Sepolia inputs are present and have passed read-only preflight; the remaining gates require a real reviewed Safe, deployment, and live protocol evidence.

## What Was Built

### Contracts

- `packages/contracts/contracts/ConfidentialPrizePool.sol`
  - fixed 16 public slots and stable ownership;
  - encrypted principal, eligible/pending weight, reserve, epoch prize, and claims;
  - epoch freeze/maturity and immutable snapshot commitment;
  - isolated 16-slot encrypted weighted draw;
  - public winner proof/finality and winner-only prize ACL;
  - immediate withdrawal and strict request-time FIFO queue;
  - retry-safe settlement callbacks and principal/prize separation;
  - scoped pause and loss-mode integration.
- `packages/contracts/contracts/PoolVrfAdapter.sol`
  - Chainlink VRF v2.5 direct funding;
  - request ID to epoch/commitment binding;
  - callback storage of one random word and timestamps only;
  - unknown, duplicate, empty, late, and timeout handling without reroll.
- `packages/contracts/contracts/SettlementController.sol`
  - aggregate confidential-to-public boundary;
  - exact unwrap/reconciliation and ERC-4626 investment/redemption;
  - confidential rewrap to principal claim or prize reserve;
  - retry stages, loss mode, and drained strategy replacement.
- `packages/contracts/contracts/DeterministicTestYieldVault.sol`
  - ERC-4626-compatible deterministic sponsored demonstration strategy;
  - explicit `TEST YIELD` mode and pause controls;
  - replaceable without rewriting confidential accounting.

### Frontend

The existing M12 frontend was retained and integrated with `design/claude-design/`; no parallel demo frontend was created. It includes:

- VeilSave landing page and console relationship;
- wallet/network and manifest/runtime-code validation;
- masked confidential values with explicit local reveal/remask/stale states;
- deposit, immediate/queued withdrawal, settlement recovery, draw verification, history, privacy, and winner surfaces;
- public evidence links and technically honest verification limitations;
- reload-safe operation recovery with duplicate-write protection;
- asynchronous encryption, transaction, VRF, FHE, ACL, relayer, RPC, strategy, and claim states;
- responsive desktop rail/mobile bottom navigation;
- shared sheet focus trap, Escape close, body scroll lock, and focus restoration;
- lazy loading for the console and Zama SDK/FHE assets.

### Release tooling and documentation

- Sepolia deployment, Safe bootstrap, audit, and source-verification scripts;
- schema-valid public deployment manifest type and validation;
- `.env.example` with deployment/browser secret boundaries;
- CI workflow for production and spike regression checks;
- [README.md](../../README.md), [SECURITY.md](../../SECURITY.md), [PRIVACY.md](../../PRIVACY.md), and [RUNBOOK.md](../../RUNBOOK.md);
- frozen product, architecture, execution, and design documents;
- local machine-readable metric and test-summary evidence in this directory.

## Contract Addresses

No production VeilSave contract addresses are recorded yet. The repository intentionally contains no placeholder `ACTIVE` manifest. The preserved spike addresses are experiment artifacts and must not be presented as the application deployment.

The deployment script will record the following after a real Sepolia deployment and Safe activation:

- timelock controller;
- deterministic TEST YIELD vault;
- settlement controller;
- PoolVrfAdapter;
- ConfidentialPrizePool; and
- all external Zama, cUSDT, underlying, Chainlink, Safe, and governance inputs.

## Deployment Transactions

Not available. M11 deployment rehearsal passes locally. The current deployment environment contains the required RPC, deployer, Etherscan, token, Zama, and VRF inputs; the configured `SAFE_ADDRESS` currently has no Sepolia runtime code, so the deployment script aborts before the first application deployment transaction.

### Read-only Sepolia preflight (2026-08-26)

- RPC chain ID: `11155111` (PASS).
- Deployer address: `0x5FE738227ab4219bc317812a938dEf57489d444a` (public address; do not treat this as a secret).
- Deployer balance: `7.489172139675241547 Sepolia ETH` at preflight (PASS).
- Official Sepolia cUSDT wrapper/underlying, six-decimal/unit-rate boundary, Zama callable addresses, and pinned SDK verifier domains: PASS.
- Chainlink wrapper: configured and enabled; gas-price-aware native quote returned positive (`~0.00028 Sepolia ETH` for the 100,000-gas/one-word configuration).
- Configured Safe `0x429F46ADdDe54E4b05493C87d121efb75e3e9711`: **BLOCKED — no runtime bytecode**.
- Deployment command was run in fail-fast mode and exited before deploying any VeilSave contract or broadcasting an application deployment transaction.

The required live sequence is documented in [RUNBOOK.md](../../RUNBOOK.md): deploy, execute Safe bind/bind/activate, audit bindings and roles, verify source, publish an active manifest, and then run the complete acceptance flow.

## Test Results

### Production contract suite

Command:

```bash
pnpm --filter @veilsave/contracts exec hardhat test
```

Result: **55 passing** across the M0 foundation, M1-M3 pool/asset/epoch, M4 FIFO, M5 settlement/TEST YIELD, M6 VRF, M7 draw, M8 winner ACL/prize, M9 cross-contract lifecycle, M10 security/property/invariant, and M11 deployment rehearsal suites.

Notable coverage:

- actual ERC-7984 callback amount and route rejection;
- 16-slot capacity, maturity, snapshot immutability, and slot reuse;
- immediate withdrawals and request-time FIFO partial settlement;
- principal conservation and prize separation;
- strategy failure/retry, loss mode, reentrancy, and drained replacement;
- VRF binding, timeout, late/duplicate/spoofed fulfillment, and no reroll;
- encrypted draw vectors, overflow, empty slots, duplicate addresses, and randomized oracle comparison;
- forged/wrong/replayed winner proofs and winner-only ACL/claim;
- full deposit → TEST YIELD → VRF → draw → ACL/prize → queued redemption lifecycle.

### Web suite

Command:

```bash
pnpm --filter @veilsave/web test
```

Result: **30 passing in 13 files**.

Coverage includes manifest/runtime validation, wallet/network states, privacy-safe operation storage, explicit confidential-value reveals and invalidation, public history range handling, recovery utilities, draw timeline copy, and the shared sheet keyboard/focus contract.

### Preserved spike regression

Command:

```bash
pnpm test:spikes
```

Result: **56 passing**:

| Evidence area | Tests | Result |
| --- | ---: | --- |
| Encrypted draw and independent oracle | 29 | PASS |
| Winner ACL | 6 | PASS locally; live propagation previously timed out |
| Chainlink VRF lifecycle | 7 | PASS |
| Confidential asset/yield boundary | 7 | PASS; Aave live supply remains blocked |
| Withdrawal settlement | 7 | PASS |

### Repository and build gates

- `pnpm check`: PASS (format, typecheck, compile, production tests, boundary/secret checks).
- `pnpm --filter @veilsave/web build`: PASS.
- Source-boundary and secret scan: PASS.
- Production web preview route audit: PASS on landing, dashboard, draw, history, and privacy at desktop and 390px mobile.
- No horizontal overflow in audited routes; desktop rail and mobile bottom navigation are correct.
- Accessibility audit: no unnamed visible controls, duplicate IDs, or sub-44px visible mobile controls.
- Reduced-motion audit: motion durations collapse to `1ms`.

## FHE HCU / Gas Measurements

The current production-shaped local measurement is preserved in [local-draw-metric.json](local-draw-metric.json).

| Metric | Observed | Release target | Absolute documented limit | Margin to target |
| --- | ---: | ---: | ---: | ---: |
| Global HCU | `14,927,246` | `17,000,000` | `20,000,000` | `2,072,754` |
| Sequential depth HCU | `3,448,096` | `4,000,000` | `5,000,000` | `551,904` |
| Local mock gas | `2,081,929` | Reviewed Sepolia envelope | Network-specific | Not a live result |

This is a local Hardhat FHEVM measurement from the exact production-shaped `ConfidentialPrizePool` draw test. It is below both release targets. The standalone 16-slot Sepolia spike independently recorded the same HCU/depth values. A final Sepolia measurement of the deployed production-shaped draw and ordinary gas remains mandatory.

The draw transaction intentionally excludes strategy accounting, snapshot/maturity work, withdrawal logic, prize accounting, ACL mutations, verbose encrypted state, and unrelated FHE operations.

## VRF Evidence

Local M6 and preserved Sepolia spike evidence prove:

- freeze before request;
- one request bound to the epoch commitment;
- callback stores randomness only;
- separate draw execution;
- fulfillment and confirmation lifecycle;
- terminal timeout and no reroll; and
- unknown/duplicate/spoofed callback resistance.

The preserved live VRF spike is in `spikes/chainlink-vrf/evidence/sepolia-vrf.json` and recorded a successful Sepolia request, fulfillment, separate draw, and withdrawal on August 16, 2026. It is evidence for the VRF pattern, not evidence that the current production contracts are deployed at those addresses. The current application deployment still requires a fresh live run and manifest.

## Winner ACL / Decryption Evidence

Local M8 and winner-ACL spike tests pass:

- winner proof is handle/epoch/cleartext bound;
- wrong cleartext, wrong handle, wrong epoch, nonparticipant, zero winner, and replay are rejected;
- only the finalized winner can decrypt and claim;
- public prize decryption and admin/keeper/arbitrary-wallet access are rejected.

The latest preserved live attempt is explicitly `BLOCKED` by Zama relayer/KMS connection timeout (`spikes/winner-acl/evidence/sepolia-winner-acl-blocked.json`). No live winner-only user decryption claim is made. A fresh run must record finalization transaction, 96-block delay, ACL propagation interval, winner decryption success, and unauthorized negative checks.

## Withdrawal / FIFO Evidence

Local M4/M5/M9/M10 and withdrawal-spike suites pass immediate payout, encrypted queued claims, partial settlement, strict request-time FIFO, retry-safe strategy failure, no double claim, and principal/prize separation.

The current production contracts have not yet completed the required live Sepolia immediate withdrawal plus FIFO partial settlement/retry/claim run. That run must use at least request A before request B, insufficient aggregate liquidity, A-first partial allocation, a retry, and final claims with no public user amount.

## Yield Strategy Evidence

`DeterministicTestYieldVault` is the active conceptual MVP strategy. Its funds are externally sponsored and must remain labeled **TEST YIELD**. Local tests prove aggregate settlement, strategy accounting, harvest boundaries, retry, loss mode, and replacement constraints.

The Aave Sepolia probe observed code and reserves, but the current USDT reserve rejected supply with `SUPPLY_CAP_EXCEEDED`. Therefore:

- no Aave address is hardcoded as the active strategy;
- no APY or organic-yield claim is made;
- a future live strategy must pass a fresh non-rebasing share/round-trip/solvency/yield validation before activation.

## Frontend Status

The Claude Design package was inspected and reconciled against the frozen product/architecture. Its tokens, typography, semantic privacy/verification colors, wordmark, icons, slot grid, masked values, privacy callouts, console shell, sheets, timelines, evidence rows, queue/recovery patterns, responsive behavior, and motion guidance were reused or faithfully adapted.

Mock-only chain actions and unsupported concepts (APY, anonymity, extra pools, tiers, governance/NFT/social features, auto-reveal, rerolls, and capacity over 16) were rejected. The existing protocol-facing frontend was adapted in place; no parallel frontend was created.

## Security Validation

The security/property/invariant suite passes locally. It covers conservation, principal/prize separation, encrypted overflow, snapshot integrity, slot reuse, winner authorization, replay, FIFO ordering, strategy failure/loss, governance limits, reentrancy, and proof binding. See [SECURITY.md](../../SECURITY.md) for the threat/control matrix and release conditions.

## Known Limitations

- Fixed 16-slot capacity is an intentional HCU boundary.
- Amount confidentiality does not hide addresses, timing, transaction graph, or aggregate settlement metadata.
- Winner address is public by design.
- Public aggregate settlement may leak bounds through correlation.
- TEST YIELD is sponsored demonstration value, not organic yield or APY.
- Zama relayer/KMS, RPC, wallet, Chainlink, cUSDT/wrapper, and strategy availability are external dependencies.
- Losing the winner wallet key can make a private prize inaccessible.
- The frontend cannot independently recompute a weighted result from plaintext balances that remain encrypted.

## Remaining Risks and Mandatory Gates

| Gate | Current status | Required evidence |
| --- | --- | --- |
| Product/architecture alignment | PASS locally | Frozen docs mapped to contracts/frontend; no drift identified |
| Local security/invariants | PASS | 55 production contract tests + 56 spike tests |
| Local 16-slot FHE budget | PASS | `14,927,246` global / `3,448,096` depth / target margins |
| Sepolia deployment and source verification | BLOCKED | Replace the non-contract `SAFE_ADDRESS`, then deploy, bootstrap, audit, and verify sources |
| Live winner ACL/decryption | BLOCKED | Stable relayer/KMS and fresh production deployment |
| Live final HCU/depth/gas | PENDING | Production-shaped deployed draw measurement |
| Live immediate withdrawal | PENDING | Sepolia transaction and reconciliation evidence |
| Live FIFO partial settlement/retry | PENDING | A-before-B partial/retry/claim evidence |
| Live full acceptance | PENDING | Deposit → maturity → freeze → VRF → draw → winner → prize → withdrawals |

## Reproduction Instructions

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:spikes
pnpm --filter @veilsave/web build
pnpm --filter @veilsave/contracts exec hardhat test test/integration/M9CrossContractLifecycle.test.ts
pnpm --filter @veilsave/contracts exec hardhat test test/security/M10SecurityInvariants.test.ts
pnpm --filter @veilsave/contracts exec hardhat test test/draw/M7EncryptedWeightedDraw.test.ts --grep "production release targets"
```

For deployment and live recovery, follow [RUNBOOK.md](../../RUNBOOK.md). Never substitute spike addresses for an application manifest.

## Submission Checklist

- [x] Frozen product, architecture, execution, and design documents exist.
- [x] Four production contracts compile and pass local tests.
- [x] Integrated responsive frontend builds and passes local/browser audits.
- [x] 16-slot local production-shaped HCU/depth targets pass.
- [x] TEST YIELD is explicit in code, UI, README, and architecture.
- [x] Strict FIFO and retry-safe local settlement pass.
- [ ] Current Sepolia deployment exists and is source-verified.
- [ ] Active manifest contains real addresses, code hashes, and evidence hashes.
- [ ] Final deployed draw HCU/depth/gas gate passes.
- [ ] Live winner ACL propagation and winner-only decryption pass.
- [ ] Live immediate withdrawal and FIFO partial settlement/retry pass.
- [ ] Complete Sepolia acceptance run passes.
- [ ] Final submission package and public demo links are prepared.

Until every unchecked item is evidenced, the correct status is **READY WITH KNOWN BLOCKERS**, not **READY FOR SUBMISSION**.
