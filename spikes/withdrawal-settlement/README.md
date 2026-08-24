# Withdrawal / Asynchronous Settlement Spike

Disposable validation harness for the statement “withdraw at any time.” It is not production pool code.

Status: **PASS WITH CONDITIONS**. All seven local FHEVM tests pass. The strategy is deterministic and local; live Aave liquidity is not claimed.

## Validated model

- A withdrawal request can be submitted against encrypted principal in every normal state.
- Confidential principal liquidity pays immediately when available.
- Any unpaid amount becomes an encrypted, irrevocable queued claim while principal and draw weight are reduced once.
- Multiple encrypted claims contribute to one encrypted aggregate settlement amount.
- A publicly decrypted capped aggregate exits a public ERC-4626 strategy, is rewrapped into ERC-7984 custody, and becomes confidential claim liquidity.
- Partial settlements leave unpaid claims intact.
- A reverted strategy withdrawal leaves the same proof, settlement handle, and user claims retryable.
- Prize reserve and principal liquidity are separate encrypted values; prize funds never satisfy principal requests.
- A second claim may execute as encrypted zero but cannot transfer value twice.
- Pausing new deposits does not disable existing exits.

## Reproduce

From `spikes/`:

```sh
./node_modules/.bin/hardhat --config withdrawal-settlement/hardhat.config.ts compile
./node_modules/.bin/hardhat --config withdrawal-settlement/hardhat.config.ts test
```

Prerequisites are the pinned dependencies in `spikes/pnpm-lock.yaml`; no network credentials are required. Expected result: `7 passing`.

## Intentional limitations

- The partial-settlement claim policy is first-come against settled liquidity. A final architecture should choose and test a deterministic FIFO or pro-rata allocation policy.
- The mock ERC-4626 strategy has deterministic liquidity and a controllable failure switch. It validates accounting and retry behavior, not live Aave liquidity.
- Aggregate public settlement reveals the settled cap/amount and therefore does not provide anonymity at the public strategy boundary.
