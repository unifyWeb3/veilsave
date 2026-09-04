# VeilSave

VeilSave is weekly confidential prize-linked cUSDT savings for Ethereum Sepolia.

Users save in one shared 16-slot pool, keep principal, eligibility weight, withdrawal claims, and prizes encrypted, and retain principal withdrawal rights. Each epoch uses a frozen encrypted-weight snapshot, Chainlink VRF v2.5 randomness, and a separate FHE weighted-draw transaction. The winner address becomes public after authenticated proof verification; only that winner receives permission to decrypt the prize.

> **Release status: FINAL RELEASE CANDIDATE WITH ONE PROTOCOL-CADENCE BLOCKER.** A candidate Sepolia deployment is live, Safe-activated, audited, and source-verified. Live encrypted deposit, immediate withdrawal, sponsored TEST YIELD, strict FIFO settlement, **and the full epoch-1 terminal lifecycle (freeze → VRF → isolated FHE draw → zero-winner finalization → epoch 2 opening) pass on Sepolia with genuine evidence**. Epoch 2 is staged for the weighted-winner run but closes `2026-09-11T14:03:00Z` under the immutable seven-day protocol rule, so the weighted-winner ACL/decryption gate and `ACTIVE` manifest publication cannot complete before the September 5 bounty deadline. The public site is live; until an `ACTIVE` manifest exists at `/manifest/veilsave-sepolia.json`, the console runs in bytecode-verified read-only mode (genuine Sepolia state, transaction controls disabled).

## The core demonstration

```text
PRIVATE DEPOSIT
      ↓
ENCRYPTED PRINCIPAL + WEIGHT
      ↓
WEEKLY EPOCH FREEZE
      ↓
PUBLIC CHAINLINK VRF EVIDENCE
      ↓
SEPARATE 16-SLOT FHE WEIGHTED DRAW
      ↓
AUTHENTICATED PUBLIC WINNER
      ↓
WINNER-ONLY PRIVATE PRIZE REVEAL
```

The public can inspect the freeze, randomness request and fulfillment, draw transaction, encrypted winner handle, proof finalization, and final winner. Because balances and odds remain hidden, observers cannot independently recompute the weighted result from plaintext balances.

## Product behavior

- One shared cUSDT pool with exactly 16 public participant slots.
- Seven-day epochs and one winner per funded epoch.
- A new deposit enters pending weight and matures only after one complete epoch.
- Winner probability is proportional to mature encrypted principal-derived weight.
- Principal remains withdrawable independently of the draw lifecycle.
- Available confidential liquidity pays withdrawals immediately.
- Any unpaid confidential remainder enters strict request-time FIFO.
- Individual funds enter a public strategy only through aggregate settlement.
- The current strategy is explicitly labeled **TEST YIELD**.

VeilSave provides confidential financial amounts, not anonymity. Wallet addresses, transactions, timing, slot occupancy, aggregate strategy activity, and the finalized winner are public.

## Architecture

```text
React frontend + Zama relayer SDK
                 │
                 ▼
       ConfidentialPrizePool
          │       │       │
          │       │       └── ERC-7984 cUSDT
          │       │
          │       └────────── PoolVrfAdapter ── Chainlink VRF v2.5
          │
          └────────────────── SettlementController
                                      │
                                      ▼
                           DeterministicTestYieldVault
```

| Contract                      | Responsibility                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ConfidentialPrizePool`       | Slots, encrypted principal/weights, epochs, isolated FHE draw, winner proof/finalization, prize ACL, withdrawals, and FIFO claims                      |
| `PoolVrfAdapter`              | One request per frozen epoch, request-to-snapshot binding, native direct funding, and callback storage of one random word only                         |
| `SettlementController`        | Aggregate decrypt/unwrap, ERC-4626 deposit/redemption, confidential rewrap, exact reconciliation, retries, loss mode, and drained strategy replacement |
| `DeterministicTestYieldVault` | Replaceable ERC-4626 demonstration strategy whose externally sponsored value is labeled TEST YIELD                                                     |

The core pool, VRF adapter, and configuration are immutable after a one-time Safe-controlled bind/bind/activate sequence. Strategy replacement requires paused investment, no active settlement, a fully drained old strategy, the same underlying asset, and execution through a 24-hour timelock.

## Draw lifecycle

1. Mature encrypted eligible weights are copied into a fixed 16-slot snapshot.
2. Snapshot state is frozen before randomness is requested.
3. `PoolVrfAdapter` requests one Chainlink VRF word and binds the request ID to the epoch commitment.
4. The callback stores the word and fulfillment metadata only.
5. A separate transaction widens the low 64 random bits, performs multiply-high range reduction, runs a balanced encrypted prefix scan, and selects the first crossing with encrypted address selection.
6. Only the encrypted winner address is made publicly decryptable.
7. After a 96-block delay, a KMS-authenticated proof finalizes the public winner.
8. The pool grants the epoch prize handle to that winner only.

No backend calculates the winner, no plaintext balance oracle is used in the contracts, and no reroll is possible after the frozen request lifecycle begins.

## Withdrawals and principal protection

The pool keeps principal and prize liabilities separate.

- A withdrawal request is encrypted and capped against encrypted principal without a secret-dependent revert.
- Eligible weight is reduced before pending weight; an already frozen snapshot is unchanged.
- Confidential principal liquidity pays as much as possible immediately.
- A public proof reveals only whether an encrypted remainder exists.
- A nonzero remainder receives a sequence at request time and joins strict FIFO.
- Aggregate public strategy redemption returns funds, which are rewrapped as cUSDT.
- Only the FIFO head can consume confidential claim liquidity; a partial head remains first.
- Completion proofs are bound to the current handle, value, state, and version.

Strategy or wrapper failure preserves the original settlement and claim for permissionless retry. Prize reserve is never used to satisfy principal debt.

## TEST YIELD disclosure

The default Sepolia strategy is a deterministic donation-based ERC-4626 vault.

**TEST YIELD means sponsored demonstration funds. It is not organic protocol yield, Aave yield, market interest, or an APY.**

Aave Sepolia USDT supply was tested and rejected with `SUPPLY_CAP_EXCEEDED`. The strategy interface remains replaceable, but a live strategy must pass fresh asset, solvency, redemption, and yield validation before activation.

## Privacy boundary

Encrypted by design:

- user principal;
- eligible and pending weights;
- frozen weight handles and draw intermediates;
- withdrawal request and remaining claim amounts;
- pool principal/claim liquidity and prize reserve;
- per-epoch prize amounts.

Public by design:

- wallet and contract addresses;
- transaction existence and timing;
- slot ownership/status and epoch timing;
- freeze commitment and VRF lifecycle;
- random word and FHE draw transaction;
- ciphertext handles used as references;
- final winner address;
- aggregate strategy settlement amounts and timing.

See [PRIVACY.md](PRIVACY.md) for ACLs, metadata leakage, browser boundaries, and exact non-claims.

## Repository layout

```text
apps/web/                    Integrated React frontend
packages/contracts/          Production Solidity contracts, deployment tooling, tests
packages/shared/             Shared protocol enums and deployment-manifest types
deployments/                 Public manifest schema and deployment process
docs/                        Frozen product, architecture, execution, design, and reports
design/claude-design/        Authoritative visual/interaction reference package
spikes/                      Preserved technical validation harnesses and evidence
```

Production code never imports from `spikes/`; CI checks that boundary and scans production source for embedded private keys.

## Toolchain

- Node `22.22.3`
- pnpm `11.2.2`
- Solidity `0.8.27`
- Hardhat `2.28.6`
- `@fhevm/solidity` `0.11.1`
- `@fhevm/hardhat-plugin` `0.4.2`
- `@fhevm/mock-utils` `0.4.2`
- `@zama-fhe/relayer-sdk` `0.4.1`
- OpenZeppelin confidential contracts `0.4.0`
- OpenZeppelin contracts `5.6.1`
- React `19.2.8`

Versions are pinned in the workspace manifests and lockfiles.

## Local setup

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm --filter @veilsave/web build
pnpm test:spikes
```

`pnpm check` runs formatting checks, workspace TypeScript, Solidity compilation, all production contract/web tests, and source-boundary/secret checks.

The frontend requires browser-safe runtime values:

```bash
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://your-reviewed-sepolia-rpc
VITE_DEPLOYMENT_MANIFEST_URL=https://your-host/veilsave-sepolia.json
VITE_BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
```

The console refuses to expose transaction controls until the active manifest is schema-valid and the runtime bytecode hashes match the manifest.

## Current test evidence

Verified on the current worktree:

- Full production repository check: PASS.
- Contract suite: 9 suites (M0/M1-M3/M5/M6/M7/M8/M9/M10/M11), 55 tests: PASS, 0 failing.
- Web suite: 15 files / 39 tests: PASS.
- Preserved spike regression: 56 tests: PASS.
- Production web build: PASS.
- Production-preview route/responsive audit: PASS on landing, dashboard, draw, history, and privacy surfaces at desktop and 390px mobile widths.
- Focused accessibility audit: no unnamed visible controls, no duplicate IDs, no visible mobile targets below 44px, correct reduced-motion behavior.
- Shared sheet regression: dialog semantics, initial focus, forward/reverse Tab trapping, Escape close, body scroll restoration, and launcher-focus restoration: PASS.

Current production-shaped local draw measurement:

| Metric               |     Observed |        Release target |    Documented absolute limit |
| -------------------- | -----------: | --------------------: | ---------------------------: |
| Global HCU           | `14,927,246` |       `<= 17,000,000` |                 `20,000,000` |
| Sequential-depth HCU |  `3,448,096` |        `<= 4,000,000` |                  `5,000,000` |
| Local mock gas       |  `2,081,929` | Informational locally | Sepolia measurement required |

This leaves approximately 25.4% global-HCU and 31.0% depth headroom against the documented absolute limits. The standalone 16-slot Sepolia spike also passed at the same HCU/depth values.

Live Sepolia epoch-1 draw measurement (`live-epoch-1-evidence.json`, draw `0x7c3e4939805a1ffd41af76151751aeb9445388c6553f143b2272a03c1f3102ed`):

| Metric               |        Observed |       Release target |
| -------------------- | --------------: | -------------------: |
| Global HCU           |    `14,927,694` |       `<= 17,000,000` |
| Sequential-depth HCU |     `3,448,128` |        `<= 4,000,000` |
| Draw gas used        |     `2,774,598` |       `<= 3,500,000` |
| VRF callback gas     |       `152,041` | `<= 250,000` envelope |

The live values sit inside every release budget with ~12% global-HCU and ~14% depth margin.

Detailed evidence is recorded in [docs/implementation/implementation-report.md](docs/implementation/implementation-report.md).

## Sepolia deployment

The following addresses are the current **candidate release deployment**. They are not an `ACTIVE` frontend manifest and must not be presented as a completed production release until the remaining live gates pass.

| Component | Sepolia address |
| --- | --- |
| ConfidentialPrizePool | `0x6e543f7e6f3175824a2C36E37c09829200195D4d` |
| PoolVrfAdapter | `0x23bD336d4E42Aa70DAea529C0EB75Ca98e3CeeEC` |
| SettlementController | `0x8CF1984Aa1F3eE119aDCa5901DD58C28fb19589c` |
| DeterministicTestYieldVault | `0x70d70205a992aE5e02e628EEcD8AE54Ce65Da529` |
| TimelockController | `0x6aE428EE7f575720A7d696e566193A7484A8ff84` |
| Governance Safe (2-of-3) | `0x429F46ADdDe54E4b05493C87d121efb75e3e9711` |
| cUSDT | `0x4E7B06D78965594eB5EF5414c357ca21E1554491` |

Completed candidate-deployment evidence:

- Safe bind/bind/activate bootstrap and authority erasure;
- runtime/configuration/governance audit;
- Etherscan source verification for all five deployed contracts;
- encrypted deposit and next-epoch pending weight;
- immediate confidential withdrawal;
- aggregate investment plus sponsored deterministic TEST YIELD harvest;
- two-participant strict request-time FIFO, partial settlement, retry, ordered claims, and double-claim rejection.

Epoch 1 closed `2026-09-02T15:15:00Z` and terminalized live on `2026-09-04` with a PASS zero-eligible-weight rollover: frozen 2-slot snapshot verified against pre-freeze handles, one VRF request bound to the snapshot commitment, callback storing randomness only (152,041 gas), isolated 16-slot FHE draw inside all budgets, KMS-authenticated zero-winner finalization after the 96-block delay with early/wrong-clear/wrong-epoch/replay negatives proven, participant and public prize-decryption rejection proven, prize rolled forward, and epoch 2 opened. Epoch 2 (both deposits now eligible, `PARTICIPANT_WINNER` staged) closes `2026-09-11T14:03:00Z` under the immutable seven-day protocol constant, so the weighted-winner and winner-only ACL/decryption run follows after the bounty deadline. The create-only release command refuses to publish a manifest before both epochs and every negative/privacy/performance gate pass.

See [deployments/README.md](deployments/README.md) and [RUNBOOK.md](RUNBOOK.md).

## Demo sequence after active release

1. Connect a funded Sepolia wallet and show the honest privacy boundary.
2. Acquire/wrap cUSDT (Sepolia ETH from any public faucet; permissionless mock-USDT `mint` plus wrap — see `RUNBOOK.md` §8) and reserve one of 16 slots.
3. Encrypt and submit a deposit; show the masked position and next-epoch maturity.
4. Show multiple occupied slots without revealing amounts.
5. Freeze the epoch, request VRF, and inspect request/fulfillment evidence.
6. Execute the separate FHE draw and show its measured cost.
7. Publicly decrypt/finalize the winner after the 96-block delay.
8. Show that non-winner financial values remain private.
9. Have the winner explicitly reveal the prize locally and claim confidentially.
10. Demonstrate immediate withdrawal and a queued FIFO remainder/settlement path.
11. Finish on the public history/verification trail.

## Known limitations and mandatory blockers

- Fixed 16-slot capacity; 32 slots exceeded the global HCU boundary.
- The product hides amounts, not addresses, timing, transaction graph, or aggregate strategy activity.
- The winner address is intentionally public.
- Public aggregate settlement can reveal or bound individual amounts through timing or singleton batches.
- Browser, wallet, RPC, Zama relayer/KMS, Chainlink, external cUSDT/wrapper, and strategy availability remain trust/availability dependencies.
- TEST YIELD is sponsored; no organic-yield or APY claim is made.
- A lost winning wallet key can make a private prize inaccessible.
- Candidate Sepolia deployment, Safe activation, audit, and source verification pass; `ACTIVE` release publication remains pending.
- Live epoch-1 zero-winner rollover passes with full negatives; participant and public prize-decryption rejection proven for the zero-winner path.
- Weighted-winner ACL propagation and winner-only user decryption are staged for epoch 2 but BLOCKED before the deadline by the seven-day protocol cadence (epoch 2 closes `2026-09-11T14:03:00Z`).
- Live production-shaped Sepolia HCU/depth/gas measurement passes on the epoch-1 draw (see table above); the release HCU/gas/ACL reports are generated from epoch 2 by `release:manifest` and remain pending with it.
- Public site is live at `https://veilsave.vercel.app` (homepage plus console; the console shows genuine bytecode-verified Sepolia state read-only until an `ACTIVE` manifest is published at `/manifest/veilsave-sepolia.json`, at which point deposit/withdrawal/claim controls unlock with no code change).
- Public repository publication and final submission checks are pending.

VeilSave is not **READY FOR SUBMISSION** until those live gates pass.

## Documentation

- [Product specification](docs/product/product-spec.md)
- [Architecture](docs/architecture/architecture.md)
- [Execution specification](docs/spec/execution-spec.md)
- [Design brief](docs/design/design-brief.md)
- [Security model](SECURITY.md)
- [Privacy model](PRIVACY.md)
- [Operations runbook](RUNBOOK.md)
- [Implementation report](docs/implementation/implementation-report.md)

## License

No repository license has been selected yet. Do not assume redistribution rights until the project owner adds one.
