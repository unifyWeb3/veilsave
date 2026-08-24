# VeilSave Operations Runbook

This runbook is for the reviewed Sepolia release. It assumes the frozen architecture, fixed 16-slot capacity, separate VRF/FHE transactions, winner-only prize ACL, aggregate public settlement, TEST YIELD fallback, and strict request-time FIFO.

Never paste private keys, populated environment files, input proofs, decryption permits, or plaintext confidential values into an issue, terminal report, evidence artifact, or deployment manifest.

## 1. Preflight

Required deployment-only values are documented in `.env.example`:

- `SEPOLIA_RPC_URL`;
- `DEPLOYER_PRIVATE_KEY`;
- `ETHERSCAN_API_KEY`;
- `SAFE_ADDRESS`;
- current cUSDT/wrapper and underlying addresses;
- current Zama executor, ACL, KMS, input, and decryption verifier addresses;
- current Chainlink coordinator/wrapper addresses;
- `RELEASE_VERSION` and reviewed `SOURCE_COMMIT`; and
- `TIMELOCK_MIN_DELAY_SECONDS=86400`.

Before any write:

1. Confirm the RPC reports chain ID `11155111`.
2. Confirm deployer balance is above `MIN_DEPLOYER_BALANCE_WEI`.
3. Confirm every external address has runtime code.
4. Confirm cUSDT and underlying both use six decimals and wrapper rate one.
5. Confirm Zama inputs match the compiled `@fhevm/solidity 0.11.1` Sepolia configuration.
6. Confirm the VRF wrapper exposes `link()` and native request pricing.
7. Confirm the Safe is the reviewed bootstrap authority and guardian.
8. Run `pnpm check` and `pnpm test:spikes` from the reviewed source revision.

## 2. Deployment and one-time bootstrap

Run from the repository root after loading deployment-only variables into the shell:

```bash
pnpm --filter @veilsave/contracts deploy:sepolia
```

The script deploys, in order:

1. OpenZeppelin timelock with a 24-hour delay, Safe proposer/canceller, open executor, and self-admin.
2. `DeterministicTestYieldVault`.
3. `SettlementController`.
4. `PoolVrfAdapter`.
5. `ConfidentialPrizePool`.

It writes `deployment-draft.json` and `safe-bootstrap-batch.json` under the configured deployment output directory. The deployer cannot bind or activate the application contracts.

Import the generated Safe batch and execute exactly:

1. controller `bindPool(pool)`;
2. VRF adapter `bindPool(pool)`;
3. pool `activate()`.

Do not reorder, repeat, or manually substitute addresses. Activation clears bootstrap authority and opens epoch 1.

## 3. Post-deploy audit and source verification

```bash
pnpm --filter @veilsave/contracts deploy:audit
pnpm --filter @veilsave/contracts verify:sepolia
```

The audit must prove:

- deployed runtime code exists and matches draft hashes;
- all bindings point to the intended pool/controller/VRF/strategy;
- bootstrap authorities are zero;
- pool is active at epoch 1;
- constants are fixed at 16 slots, seven-day epochs, 96-block winner delay, and 24-hour strategy delay;
- Safe/timelock roles are correct; and
- cUSDT configuration is six-decimal, unit-rate, and tied to the intended underlying.

Do not publish an `ACTIVE` browser manifest until source verification, evidence hashes, and live acceptance are complete.

## 4. Manifest and frontend

The frontend accepts only a schema-valid active manifest whose required contract runtime bytecode hashes match the chain. Populate:

```bash
VITE_CHAIN_ID=11155111
VITE_RPC_URL=<reviewed Sepolia RPC>
VITE_DEPLOYMENT_MANIFEST_URL=<HTTPS manifest URL>
VITE_BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
```

Never place deployment secrets in `VITE_*` variables. If manifest or code validation fails, the console must remain read-only and show a retryable validation state.

## 5. VRF funding and lifecycle

1. Fund the adapter with the reviewed native amount using `PoolVrfAdapter.fund()` or the configured deployment funding step.
2. Observe `VrfFunded`, `VrfRequestCreated`, and `VrfFulfilled` by request ID.
3. Request only after `EpochFrozen` and verify the commitment in both epoch and request records.
4. Use an explicit bounded request gas limit (`500000` was required by the validated direct-funding retry evidence) if the current wrapper/RPC estimator underestimates the wrapper path.
5. Never request a second word for the same epoch after seeing the first result.
6. If the request deadline expires without a request, call the pool abandonment path; the epoch is terminal and there is no reroll.
7. If fulfillment does not arrive before its deadline, abandon the epoch using the original request ID; ignore late fulfillment.

The callback stores the random word and timestamps only. It must not execute the FHE draw.

## 6. FHE draw recovery

1. Verify `EpochRandomnessSynchronized` and the bound request record.
2. Confirm the epoch is `DRAW_READY` and the draw deadline has not expired.
3. Call `executeEncryptedDraw(epochId)` with the unchanged frozen snapshot and stored random word.
4. If the transaction is uncertain, reconcile the canonical receipt and epoch state before retrying.
5. If it reverts, retry the same operation; do not rebuild weights, request new randomness, or call a backend oracle.
6. If the draw deadline expires, call terminal abandonment. No reroll is allowed.

Release gates are `<=17,000,000` global HCU, `<=4,000,000` sequential depth, and a reviewed Sepolia gas envelope. Current local production-shaped evidence is `14,927,246`, `3,448,096`, and `2,081,929` gas in the FHEVM mock; it is not the final live gate.

## 7. Winner proof, finality, and ACL

1. Read the encrypted winner handle from the exact epoch.
2. Request public decryption through the reviewed Zama relayer/KMS path.
3. Verify the KMS proof against the exact handle, epoch, request ID, snapshot state, and clear winner.
4. Wait until the configured 96-block ACL/finality delay.
5. Submit `finalizeWinner(epochId, clearWinner, proof)` once.
6. Confirm `WinnerFinalized` and `EpochPrizeAuthorized`.
7. Wait for ACL propagation before asking the winner to decrypt the prize.
8. Test the negative matrix: non-winner, admin, keeper, arbitrary wallet, public prize decrypt, wrong handle, wrong epoch, wrong cleartext, and replay must all fail.

If relayer/KMS is unavailable, preserve the epoch and handle, show `ACL propagation pending`, and retry the same proof path. Never make the prize publicly decryptable and never refinalize a winner to “refresh” permission.

## 8. Deposit and maturity

1. User connects to Sepolia and reserves one free slot with exactly `0.001 ETH`.
2. Public test USDT is wrapped into cUSDT; the wrap amount is public.
3. The browser encrypts the deposit and submits ERC-7984 transfer-and-call with the exact pool route.
4. Reconcile the token callback and pool `DepositProcessed` event; credit only the actual callback amount.
5. Pending weight does not enter the current epoch snapshot.
6. After the epoch closes, pending weight matures into future eligible weight.

Never infer eligibility from a UI timer alone; reread canonical epoch and encrypted-handle state.

## 9. Immediate withdrawal

1. Encrypt the requested amount in the browser.
2. Submit `requestWithdrawal` and wait for canonical receipt.
3. Finalize the public boolean proof for whether a remainder exists.
4. If no remainder exists, finalize immediate completion.
5. If a remainder exists, preserve the encrypted ticket and request-time FIFO sequence.

The user may reveal their received amount locally, but the public event must not contain it. An uncertain transaction is reconciled by request ID and wallet nonce before retry.

## 10. FIFO settlement and partial liquidity

1. Confirm all older tickets have a routing proof. An older unresolved ticket must block later service.
2. Start one aggregate principal redemption capped by the public strategy boundary.
3. Finalize the aggregate clear amount with the authenticated proof.
4. Execute the controller settlement and wait for confidential rewrap.
5. Call `serviceFifoHead()` only for the current head.
6. Finalize the completion boolean against the current ticket handle/version.
7. If complete, the ticket becomes claimed and the next request becomes head.
8. If partial, the same head remains first with its encrypted remaining claim.
9. Retry a failed settlement using its recorded retry stage; do not create a second settlement for the same intent.
10. Reconcile public balances before declaring completion.

The invariant is: earlier request order is never skipped, partial claims never create funds, and each ticket can be completed only once.

## 11. Strategy failure and loss mode

- A failed investment, redemption, or rewrap emits `SettlementFailed` and preserves retry intent.
- Anyone may call the controller retry path after the external cause is fixed.
- If withdrawable strategy assets fall below deployed principal, anyone may enter loss mode.
- Loss mode pauses investments and all new-risk pool scopes while preserving impaired exits and queued claims.
- Timelock cannot unpause while loss mode is active.
- Do not replace a strategy until investment is paused, no settlement is active, old shares/deployed principal are zero, and the replacement uses the same underlying.
- Strategy replacement is a 24-hour timelocked action and must be recorded with its proposal, execution, code hash, and asset configuration.

## 12. Pause and incident response

When an external dependency is unhealthy:

1. Record chain ID, block, contract, operation ID, request ID, settlement ID, and transaction hash.
2. Do not record confidential plaintext or proofs.
3. Pause only the affected new-risk scopes when possible.
4. Keep withdrawal and recovery paths available.
5. Reread state from canonical RPC before retrying.
6. Preserve the original handle, sequence, request, and settlement intent.
7. Escalate only after the retryable/terminal state is independently confirmed.

`RPC unavailable`, `relayer unavailable`, `VRF pending`, `ACL propagation pending`, and `strategy settlement pending` are not proof of lost funds. The UI should say who is being waited on and what retry is safe.

## 13. Release evidence checklist

- [ ] Deployment draft and Safe bootstrap batch retained privately.
- [ ] Post-deploy audit passes.
- [ ] All source verification records pass.
- [ ] Active manifest code hashes match chain.
- [ ] Final HCU/depth/gas report recorded and hashed.
- [ ] Live VRF request/fulfillment/draw evidence recorded.
- [ ] Live winner proof, finality, ACL propagation, winner decrypt, and negative checks recorded.
- [ ] Live deposit/maturity and immediate withdrawal recorded.
- [ ] Live FIFO partial settlement, retry, and claim recorded.
- [ ] TEST YIELD sponsorship and no-APY disclosure visible in the UI and README.
- [ ] No secret or plaintext confidential value appears in evidence.
