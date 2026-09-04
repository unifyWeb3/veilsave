# Deployment Manifests

`manifest.schema.json` is the versioned public manifest contract. A deployment file is created only after contracts exist on Sepolia and every address, runtime code hash, role, configuration value, and evidence hash has been verified.

Do not publish a manifest containing placeholder or zero addresses. Deployment-specific Zama, Chainlink, token, strategy, Safe, and timelock values must be revalidated immediately before use.

## Sepolia Runbook

1. Populate the deployment-only values from `.env.example` and load them into the shell. Never expose `DEPLOYER_PRIVATE_KEY` through a `VITE_*` variable.
2. Set `SOURCE_COMMIT` to the reviewed source revision and `SAFE_ADDRESS` to the deployed 2-of-3 Safe that will be bootstrap authority, pause guardian, timelock proposer, and canceller.
3. Revalidate every external address against current official sources. The deployment script checks runtime code for callable contracts, validates Zama's EIP-712 verifier domains against the pinned SDK, proves the Safe is 2-of-3, and checks the cUSDT underlying, six-decimal/unit-rate boundary, Zama executor/input-verifier binding, positive gas-price-aware VRF quote, and deployer balance.
4. Run `pnpm --filter @veilsave/contracts deploy:sepolia`.
5. Review `deployment-draft.json` and execute `safe-bootstrap-batch.json` from the configured Safe in its exact bind-controller, bind-VRF, activate-pool order.
6. Set `DEPLOYMENT_DRAFT_PATH` to the generated draft and run `pnpm --filter @veilsave/contracts deploy:audit`.
7. Run `pnpm --filter @veilsave/contracts verify:sepolia` with `ETHERSCAN_API_KEY` configured.
8. Complete the live deposit/draw/ACL/FIFO acceptance run.
9. Load the reviewed Sepolia RPC environment and run `pnpm --filter @veilsave/contracts release:manifest`. The command revalidates current Sepolia runtime code, upgradeable dependency implementations, and the 2-of-3 Safe/singleton, then refuses to write unless both epoch evidence files, the ACL/decryption negatives, the HCU/depth/gas budgets, earlier live acceptance evidence, source verification, and the post-deploy audit all pass.

The deployer cannot bind or activate application contracts. Those one-time capabilities belong to the Safe from construction and are erased by activation. The OpenZeppelin timelock is deployed with a 24-hour delay, Safe proposer/canceller roles, an open executor role, and no deployer admin role.

## Generated Files

- `deployment-draft.json`: addresses, constructor arguments, deployment transactions/blocks, runtime hashes/sizes, toolchain configuration, and external inputs.
- `safe-bootstrap-batch.json`: raw Safe transaction-builder calldata for the one-time bootstrap sequence.
- `post-deploy-audit.json`: code, binding, constant, role, and authority-erasure checks.
- `source-verification.json`: Etherscan verification results.

These intermediate files are not the public deployment manifest. `manifest.schema.json` additionally requires final HCU/gas evidence and a successful live winner ACL/decryption record.

The release command writes `live-hcu-report.json`, `live-gas-report.json`, `live-acl-validation-report.json`, and `manifest.json` with create-only semantics. It never edits `deployment-draft.json`, never emits a placeholder manifest, and refuses to overwrite an existing release artifact. Set `ACTIVE_MANIFEST_PATH` only when the reviewed hosting path should differ from the deployment directory default.
