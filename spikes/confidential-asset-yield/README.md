# Confidential Asset / Yield Boundary Spike

Disposable validation harness for the ERC-7984 asset boundary and public yield adapter. It is not production pool code.

Status: **PASS WITH CONDITIONS**. The seven local tests pass. The Sepolia Aave read probe passes, but the live supply attempt is blocked by Aave error `51` (`SUPPLY_CAP_EXCEEDED`), so no organic Aave yield is claimed.

## What it validates

- Official `@openzeppelin/confidential-contracts@0.4.0` ERC-7984 wrapper behavior.
- `confidentialTransferAndCall` callback receives the actual encrypted amount returned by the token, including a zero result when a user over-requests.
- Callback rejection causes the wrapper to attempt a refund and does not credit the pool ledger.
- The pool stores encrypted principal and encrypted aggregate handles with narrow ACLs.
- A public aggregate unwrap can be KMS-verified and deposited into an ERC-4626 strategy.
- A deterministic sponsored transfer can simulate strategy yield; it is explicitly not organic yield evidence.
- A non-rebasing ERC-4626 adapter over an Aave-style aToken balance preserves share denomination while interest accrues.

## Reproduce

From `spikes/`:

```sh
./node_modules/.bin/hardhat --config confidential-asset-yield/hardhat.config.ts compile
./node_modules/.bin/hardhat --config confidential-asset-yield/hardhat.config.ts test
./node_modules/.bin/hardhat --config confidential-asset-yield/hardhat.config.ts run confidential-asset-yield/scripts/sepolia-aave-probe.ts --network sepolia --no-compile
./node_modules/.bin/hardhat --config confidential-asset-yield/hardhat.config.ts run confidential-asset-yield/scripts/sepolia-aave-roundtrip.ts --network sepolia --no-compile
```

Prerequisites are the pinned dependencies in `spikes/pnpm-lock.yaml`. Local tests require no network credentials. Sepolia scripts require the existing Hardhat `MNEMONIC` and optional `INFURA_API_KEY` or `SEPOLIA_RPC_URL` configuration; they must not be written to source or logs.

Expected local result: `7 passing`. Live evidence is written under `evidence/`; `sepolia-aave-roundtrip.json` is expected to remain `BLOCKED` while the current USDT reserve supply cap is exceeded.

The round-trip script requests only `10` faucet USDT when needed, deposits `5` USDT through the disposable adapter, redeems all shares, and records the residual. It must not be interpreted as proof of sustained non-zero yield.

The optional `SEPOLIA_RPC_URL` environment variable overrides the default public Sepolia endpoint for future deployment/read probes. No Sepolia deployment is claimed by this local spike.

## Current live asset facts

The current Aave Sepolia address-book source (fetched 2026-08-16) identifies:

- Pool: `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`
- USDT underlying: `0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0`
- USDT aToken: `0xAF0F6e8b0Dc5c913bbF4d14c22B4E78Dd14310B6`
- USDT decimals: `6`

Address existence does not prove faucet balance, market liquidity, adapter compatibility, or non-zero interest. Those remain a live-network probe.

The Aave faucet interface was inspected in the official [`aave/aave-v3-periphery`](https://github.com/aave/aave-v3-periphery/blob/master/contracts/mocks/testnet-helpers/IFaucet.sol) checkout at commit `8bb2493678bbb31532249f1e488fffe5f53a2d1a`; the read probe verifies its deployed permission and mintability state before any test-token request.

## Important source pattern

The official OpenZeppelin wrapper credits confidential balances inside `_update`, invokes `onConfidentialTransferReceived` with the returned `transferred` handle, and tries to refund when the receiver returns encrypted false. The receiver must therefore account from the callback handle, never from a plaintext user request.
