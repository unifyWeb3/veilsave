# Encrypted Weighted Draw Spike

Disposable validation harness for the fixed-slot FHE weighted draw described in the research dossier. This directory is not production contract code.

## Objective

Validate the exact bounded weighted-draw construction at 8 and 16 slots, compare it with an independent plaintext oracle, and measure ordinary gas plus FHE global HCU and sequential depth. The VRF callback is deliberately modeled as a lightweight `storeRandomWord` transaction; the FHE draw runs separately.

## Toolchain

- Node.js 22.22.3
- pnpm 11.2.2
- Hardhat 2.28.6
- Solidity 0.8.27
- `@fhevm/solidity` 0.11.1
- `@fhevm/hardhat-plugin` 0.4.2
- `@fhevm/mock-utils` 0.4.2
- `@zama-fhe/relayer-sdk` 0.4.1

These are the versions in the official Zama Hardhat template as checked on 2026-08-16. The relayer SDK resolves the base Sepolia URL to the working `/v2` API.

## Algorithm Under Test

1. Sum the encrypted `euint64` weights in a balanced `euint128` reduction.
2. Detect a total above `uint64.max`; sanitize the effective total and every effective weight to zero on overflow.
3. Compute `floor(T * R / 2^64)` with an encrypted `euint128` product and a 64-bit right shift.
4. Build inclusive encrypted prefixes with a balanced parallel scan.
5. Compute `threshold < prefix[i]`, then select only the first crossing.
6. Select an encrypted public slot address and make only that winner handle publicly decryptable.

Empty public slots receive an effective encrypted weight of zero. Duplicate nonzero slot addresses are rejected. A zero or overflowed total selects the zero address.

## Prerequisites

- Dependencies installed in `spikes/` with `pnpm install --frozen-lockfile`.
- For local tests, no network credentials are required.
- For Sepolia, configure Hardhat variable `MNEMONIC`; optionally configure `INFURA_API_KEY`. Never place secrets in this directory or command output.
- The first Sepolia SDK initialization downloads the current public key and 2048-capacity CRS and may take several minutes.

## Reproduce

From `spikes/`:

```sh
./node_modules/.bin/hardhat --config encrypted-draw/hardhat.config.ts compile
./node_modules/.bin/hardhat --config encrypted-draw/hardhat.config.ts test encrypted-draw/test/oracle.test.ts
./node_modules/.bin/hardhat --config encrypted-draw/hardhat.config.ts test encrypted-draw/test/EncryptedWeightedDraw.test.ts
./node_modules/.bin/hardhat --config encrypted-draw/hardhat.config.ts run encrypted-draw/scripts/sepolia-environment.ts --network sepolia --no-compile
DRAW_SLOTS=16 ./node_modules/.bin/hardhat --config encrypted-draw/hardhat.config.ts run encrypted-draw/scripts/sepolia-draw.ts --network sepolia --no-compile
```

Set `DRAW_SLOTS=8` for the second required scale run. The Sepolia script writes a non-secret JSON receipt under `evidence/`.

## Results

Status: **PASS WITH CONDITIONS**

- Plaintext oracle: 14 passing tests, including deterministic cases A-I, exhaustive reduced-width multiply-high checks, 100,000 equal-weight trials, 100,000 unequal-weight trials, and 1,000 randomized vectors.
- Mock FHE: 15 passing tests. Deterministic A-J outputs, zero totals, sparse/empty slots, overflow handling, duplicates, and oracle agreement passed.
- Sepolia 16-slot deployment: `0xa03F379049d942Db3aC7dbf27EfaB5c3A80cD30d`.
- Sepolia draw transaction: `0x372be28ae9528fbef7548edcc79ee1a58687f74564c37773b63f7eb860796b35`, block 11499257.
- Sepolia output: slot 14 (address ending `000F`), matching the plaintext oracle for weights 1 through 16 and random word `0xdeadbeefcafebabe`.

| Environment | Slots | Global HCU | Max HCU depth | Draw gas | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Hardhat mock | 8 | 7,142,718 | 2,525,096 | 1,224,559 | PASS |
| Hardhat mock | 16 | 14,927,246 | 3,448,096 | 2,211,122 | PASS |
| Sepolia | 16 | 14,927,246 | 3,448,096 | 2,833,070 | PASS |
| Hardhat mock | 32 | NOT AVAILABLE | NOT AVAILABLE | NOT AVAILABLE | FAIL: global HCU limit |

Against the observed 20,000,000 global and 5,000,000 depth limits, the 16-slot draw retains 5,072,754 global HCU (25.36%) and 1,551,904 depth HCU (31.04%). HCU accounting matched between the plugin's mock host and Sepolia; ordinary gas did not, so mock gas is not a Sepolia estimate.

## Conditions and Limits

- One full 16-slot Sepolia vector was executed; broad functional coverage comes from the deterministic and randomized local suites.
- The draw includes overflow handling, winner ACL persistence, and `makePubliclyDecryptable`, but proof verification/finalization belongs to Spike 2.
- A 32-slot single-transaction draw is structurally over the current global HCU limit and is not a credible fallback.
- The 16-slot margin must not be consumed casually by production-only logic. Epoch accounting and prize state transitions should remain outside the draw transaction where possible.
- The initial relayer request transiently returned malformed/unavailable data. A later direct `/v2/keyurl` check and the successful run show service recovery; relayer/KMS availability remains a liveness dependency.
