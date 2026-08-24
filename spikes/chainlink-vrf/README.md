# Chainlink VRF v2.5 Lifecycle Spike

Disposable validation harness for the randomness boundary. It deliberately stores the VRF word in the callback and executes a separate `executeDraw` transaction; it is not production pool code.

## Current Sepolia configuration

Verified from the current official [supported-networks table](https://docs.chain.link/vrf/v2-5/supported-networks), accessed 2026-08-16:

- Chain ID: `11155111`
- Subscription coordinator: `0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B`
- Direct-funding wrapper: `0x195f15F2d49d693cE265b4fB0fdDbE15b1850Cc1`
- 500-gwei key hash: `0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae`
- Minimum confirmations: `3`
- Maximum callback gas: `2,500,000`
- Maximum random values: `500` for subscription, `10` for direct wrapper

The direct-funding route does not put the key hash in consumer calldata; the wrapper owns the coordinator configuration. The spike uses the official Chainlink `contracts-v1.3.0` wrapper-consumer surface, vendored only in the `contracts/vendor` directory because installing the monolithic package pulled unrelated cross-chain git dependencies.

Status: **PASS**. Sepolia request `0x89d3c0801b3b675dc9c511255154571298a6c07e1b2d716b48a668836ba72aad` fulfilled in `0x5d96742b427d09fa34cb11293e8c16e9beaf4e2b085bc92a5554338e508139da` after five blocks. The separate draw executed in `0x62bc09d539eac6400369ec3bc61631cbfafe7a52823bbae9cfa45e6ad20d7188`.

## Reproduce

From `spikes/`:

```sh
./node_modules/.bin/hardhat --config chainlink-vrf/hardhat.config.ts compile
./node_modules/.bin/hardhat --config chainlink-vrf/hardhat.config.ts test
./node_modules/.bin/hardhat --config chainlink-vrf/hardhat.config.ts run chainlink-vrf/scripts/sepolia-vrf.ts --network sepolia --no-compile
```

Sepolia requires the existing Hardhat `MNEMONIC` configuration and approximately `0.01` Sepolia ETH for one direct-funded request. Set `SEPOLIA_RPC_URL` to override the default public endpoint without changing source. The script records a non-secret receipt under `evidence/`, waits up to six minutes for fulfillment, and withdraws unused native balance after a successful draw. The request uses an explicit `500,000` gas limit because two Sepolia attempts exhausted the same RPC-estimated `160,369` gas limit. Corrected failure evidence is retained in `evidence/sepolia-vrf-request-oog-failures.json`.

## Security cases covered

- State commitment is frozen before request.
- Request IDs bind fulfillments to epochs, including reverse-order fulfillments.
- Duplicate requests are rejected.
- The callback only stores the word and is safe for duplicate/unknown/late callbacks.
- No callback path runs FHE work.
- Expiry is terminal and does not expose a reroll function.
- Draw execution is separate from fulfillment.

Primary implementation references:

- [Direct funding guide](https://docs.chain.link/vrf/v2-5/direct-funding/get-a-random-number)
- [VRF security considerations](https://docs.chain.link/vrf/v2-5/security)
- [Chainlink contracts v1.3.0 wrapper consumer](https://github.com/smartcontractkit/chainlink/blob/contracts-v1.3.0/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol)
