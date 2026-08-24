# VeilSave

VeilSave is weekly confidential prize-linked cUSDT savings for Ethereum Sepolia.

Users save in one shared 16-slot pool, keep principal, eligibility weight, withdrawal claims, and prizes encrypted, and retain principal withdrawal rights. Each epoch uses a frozen encrypted-weight snapshot, Chainlink VRF v2.5 randomness, and a separate FHE weighted-draw transaction. The winner address becomes public after authenticated proof verification; only that winner receives permission to decrypt the prize.

> **Release status: READY WITH KNOWN BLOCKERS.** The production contracts, integrated frontend, local FHE/security suites, deployment tooling, and documentation are implemented. No active production manifest or contract addresses are published yet. Final Sepolia deployment, source verification, production-shaped live HCU/gas measurement, winner ACL propagation/user decryption, and the full live deposit-to-withdrawal acceptance run remain mandatory.

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
- Web suite: 13 files / 30 tests: PASS.
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

This leaves approximately 25.4% global-HCU and 31.0% depth headroom against the documented absolute limits. The standalone 16-slot Sepolia spike also passed at the same HCU/depth values, but the final production-shaped Sepolia transaction is still a release gate.

Detailed evidence is recorded in [docs/implementation/implementation-report.md](docs/implementation/implementation-report.md).

## Sepolia deployment

No final VeilSave production addresses are published in this repository yet. Do not treat spike contracts or audit-only fixtures as the application deployment.

Deployment requires the values in [.env.example](.env.example), current official address revalidation, a funded deployer, a reviewed Safe, and an immutable source revision. The production sequence is:

1. Run the complete local gate.
2. Revalidate Zama, cUSDT/wrapper, Chainlink VRF, Safe, and RPC inputs.
3. Deploy the timelock, TEST YIELD vault, settlement controller, VRF adapter, and pool.
4. Execute the generated Safe bind/bind/activate batch in exact order.
5. Run the post-deploy code/configuration/role audit.
6. Verify all sources on Sepolia Etherscan.
7. Run the live deposit, maturity, VRF, draw, winner ACL/decryption, immediate withdrawal, FIFO partial settlement, retry, and claim acceptance sequence.
8. Record final production-shaped HCU/depth/gas evidence.
9. Publish an `ACTIVE` manifest only after every evidence hash is available.

See [deployments/README.md](deployments/README.md) and [RUNBOOK.md](RUNBOOK.md).

## Demo sequence after deployment

1. Connect a funded Sepolia wallet and show the honest privacy boundary.
2. Acquire/wrap cUSDT and reserve one of 16 slots.
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
- Final Sepolia deployment/source verification is pending.
- Live winner ACL propagation and winner-only user decryption are pending.
- Final production-shaped Sepolia HCU/depth/gas measurement is pending.
- Full Sepolia immediate/queued/FIFO/retry acceptance is pending.

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
