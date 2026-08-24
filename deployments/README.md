# Deployment Manifests

`manifest.schema.json` is the versioned public manifest contract. A deployment file is created only after contracts exist on Sepolia and every address, runtime code hash, role, configuration value, and evidence hash has been verified.

Do not publish a manifest containing placeholder or zero addresses. Deployment-specific Zama, Chainlink, token, strategy, Safe, and timelock values must be revalidated immediately before use.

## Sepolia Runbook

1. Populate the deployment-only values from `.env.example` and load them into the shell. Never expose `DEPLOYER_PRIVATE_KEY` through a `VITE_*` variable.
2. Set `SOURCE_COMMIT` to the reviewed source revision and `SAFE_ADDRESS` to the deployed 2-of-3 Safe that will be bootstrap authority, pause guardian, timelock proposer, and canceller.
3. Revalidate every external address against current official sources and onchain code. The deployment script also checks the cUSDT underlying, six-decimal/unit-rate boundary, Zama executor/input-verifier binding, VRF wrapper interface, and deployer balance.
4. Run `pnpm --filter @veilsave/contracts deploy:sepolia`.
5. Review `deployment-draft.json` and execute `safe-bootstrap-batch.json` from the configured Safe in its exact bind-controller, bind-VRF, activate-pool order.
6. Set `DEPLOYMENT_DRAFT_PATH` to the generated draft and run `pnpm --filter @veilsave/contracts deploy:audit`.
7. Run `pnpm --filter @veilsave/contracts verify:sepolia` with `ETHERSCAN_API_KEY` configured.
8. Complete the live deposit/draw/ACL/FIFO acceptance run and hash the resulting evidence before producing the schema-valid public manifest.

The deployer cannot bind or activate application contracts. Those one-time capabilities belong to the Safe from construction and are erased by activation. The OpenZeppelin timelock is deployed with a 24-hour delay, Safe proposer/canceller roles, an open executor role, and no deployer admin role.

## Generated Files

- `deployment-draft.json`: addresses, constructor arguments, deployment transactions/blocks, runtime hashes/sizes, toolchain configuration, and external inputs.
- `safe-bootstrap-batch.json`: raw Safe transaction-builder calldata for the one-time bootstrap sequence.
- `post-deploy-audit.json`: code, binding, constant, role, and authority-erasure checks.
- `source-verification.json`: Etherscan verification results.

These intermediate files are not the public deployment manifest. `manifest.schema.json` additionally requires final HCU/gas evidence and a successful live winner ACL/decryption record.
