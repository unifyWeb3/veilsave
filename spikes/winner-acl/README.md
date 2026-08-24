# Winner Reveal and ACL Spike

Disposable validation harness for the transition from a publicly decryptable encrypted winner to winner-only prize access. This directory is not production contract code.

## Objective

Prove the full path:

```text
encrypted winner -> public decrypt + KMS proof -> FHE.checkSignatures
-> finalized clear winner -> FHE.allow(prize, winner) -> user decryption
```

Only the winner handle is made publicly decryptable. The encrypted prize remains private and the contract exposes ACL inspection helpers solely for the spike.

Status: **PASS WITH CONDITIONS**. All six local FHEVM tests pass. The latest Sepolia attempt was blocked by a Zama relayer/KMS connection timeout before ACL propagation and winner user-decryption latency could be measured; see `evidence/sepolia-winner-acl-blocked.json`.

## Reproduce

From `spikes/`:

```sh
./node_modules/.bin/hardhat --config winner-acl/hardhat.config.ts compile
./node_modules/.bin/hardhat --config winner-acl/hardhat.config.ts test
./node_modules/.bin/hardhat --config winner-acl/hardhat.config.ts run winner-acl/scripts/sepolia-winner-acl.ts --network sepolia --no-compile
```

Sepolia requires the same Hardhat `MNEMONIC` and optional `INFURA_API_KEY` variables documented by the encrypted-draw spike. The script writes non-secret transaction evidence under `evidence/`.

## Required Checks

- Valid KMS proof finalizes exactly once.
- Forged cleartext, another handle's proof, wrong epoch, and replay fail.
- A zero winner finalizes into a no-winner terminal state without prize access.
- The winner can user-decrypt the prize after ACL propagation.
- Admin, participant, arbitrary wallet, and keeper cannot user-decrypt it.
- The prize is never made publicly decryptable.

Expected local result: `6 passing`. A complete Sepolia run writes `evidence/sepolia-winner-acl.json`; until that file exists, live winner-decryption propagation remains a required validation condition.
