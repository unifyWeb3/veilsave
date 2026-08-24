# Zama Confidential PoolTogether — Research Dossier

**Research date:** 2026-08-16
**Target network:** Ethereum Sepolia (`11155111`)
**Phase:** Research and technical discovery only
**Decision status:** Conditional recommendation; architecture is not frozen
**Implementation status:** **DO NOT IMPLEMENT YET**

## Executive summary

The strongest credible direction is a bounded, epoch-based confidential prize-linked savings pool built around ERC-7984 confidential assets, Zama-style aggregate batching into a public yield strategy, a publicly verifiable randomness source, and an entirely onchain FHE weighted draw over encrypted participant weights.

The recommended draw construction is a fixed-size, initially 16-slot, weighted selection:

1. Freeze encrypted eligible-balance handles and the public slot ordering before requesting randomness.
2. Obtain one publicly verifiable Chainlink VRF v2.5 word.
3. Convert the public 64-bit word and encrypted total weight into an encrypted threshold with a widened `euint128` multiply-high construction.
4. Build encrypted cumulative weights with a balanced parallel prefix scan.
5. Compare the threshold with every prefix, derive the unique first crossing, and select an encrypted winner address with `FHE.select`.
6. Make only the encrypted winner address publicly decryptable.
7. Verify the returned KMS proof onchain with `FHE.checkSignatures`, then authorize only that winner to user-decrypt the encrypted prize amount.

This is **STRONGLY INFERRED**, not yet proven. The highest-risk unknown is whether the complete 16-slot operation—including prefix computation, comparisons, first-crossing logic, address selection, ACL work, and reveal preparation—fits the actual Sepolia HCU global and sequential-depth limits. Current documented operation costs suggest approximately 9.6 million HCU before ACL and implementation overhead for a balanced 16-slot scan, while 32 slots approach approximately 18.9 million HCU before overhead. That makes 16 a credible spike target and 32 unsafe to promise.

The strongest yield direction is a public ERC-4626 adapter over Aave V3 Sepolia USDT, entered and exited through Zama's aggregate confidential batcher pattern. Aave's current address book confirms a Sepolia USDT reserve and aToken, but it does **not** prove that the market will generate non-zero demo yield. The existing Zama Sepolia Confidential Vault is explicitly idle-only and generates no yield. A deterministic, clearly labeled sponsored test-yield fallback may be needed for demo liveness, but it must never be described as organic strategy yield.

The system can keep individual deposits, balances, prize weights, and prize credits encrypted. It cannot hide addresses, transaction timing, contract calls, gas, token relationships, slot membership, the public winner address, or public shield/unshield amounts. Aggregate amounts necessarily revealed to cross the confidential-token/public-yield boundary can also deanonymize a lone or highly correlated participant.

### Decision summary

| Decision area | Current conclusion | Status |
| --- | --- | --- |
| Confidential asset | ERC-7984 `euint64` amount model; use transfer-and-call and account for the actual transferred handle | **CONFIRMED** |
| Individual accounting | Encrypted principal, current eligible weight, next-epoch pending weight, and prize credit must be distinct | **STRONGLY INFERRED** |
| Yield boundary | Aggregate confidential deposits must be publicly decrypted before a public ERC-4626/Aave route; individual amounts remain encrypted | **CONFIRMED** |
| Sepolia yield | Aave-backed USDT adapter is plausible; non-zero test yield and wrapper compatibility are unproven | **NEEDS SPIKE** |
| Randomness | Chainlink VRF v2.5 is the clearest public-verifiability option; freeze inputs before request | **STRONGLY INFERRED** |
| Winner selection | Public VRF + encrypted multiply-high threshold + balanced encrypted prefix scan | **NEEDS SPIKE** |
| Public verification | Ethereum verifies the transaction sequence; Chainlink verifies randomness; Zama KMS signatures authenticate the revealed winner | **CONFIRMED**, with limitation |
| Independent recomputation | Observers cannot recompute the winner from hidden balances; this is authenticated execution, not a plaintext audit or custom ZK proof | **CONFIRMED** |
| Practical scale | Start at 16 active slots; do not promise 32 until measured | **NEEDS SPIKE** |
| Backend | Avoid a trusted backend; use permissionless callers/automation for liveness and an optional read-only indexer | **STRONGLY INFERRED** |

## Evidence labels

- **CONFIRMED** — directly supported by current official documentation or inspected official source.
- **STRONGLY INFERRED** — follows from confirmed primitives and source patterns, but is not an official prescribed architecture.
- **OPEN QUESTION** — current primary sources do not answer it decisively.
- **NEEDS SPIKE** — must be experimentally validated before architecture is frozen.
- **UNSAFE ASSUMPTION** — must not be relied on without evidence.

## 1. Workspace inspection

- **CONFIRMED:** The project directory contained no application or documentation files before this dossier was created.
- **CONFIRMED:** A `.git` path exists, but `git status` reports that the directory is not a Git repository.
- **CONFIRMED:** No unrelated files were modified or deleted.
- **CONFIRMED:** No frontend, production contract, scaffold, dependency tree, or speculative implementation file was created.
- **CONFIRMED:** The only project artifact created in this phase is this dossier under the required path.

## 2. Bounty requirements model

### 2.1 Mandatory requirements

1. A shared savings pool that accepts user assets.
2. User principal remains withdrawable without a prize-loss mechanic.
3. Yield is separated from principal and distributed through periodic prize draws.
4. Deposits, balances, and winnings remain encrypted.
5. Winner selection executes over encrypted balances.
6. The draw remains verifiable onchain.
7. Only winners can decrypt their prizes.
8. The demonstrated deployment targets Sepolia.

The bounty does not explicitly require PoolTogether V5 compatibility, TWAB, multiple prize tiers, cross-chain operation, a specific yield protocol, a specific confidential token, or a particular randomness provider.

### 2.2 Implied technical requirements

- An encrypted accounting model that distinguishes user principal from prize money.
- A consistent epoch/snapshot boundary so balances cannot change after randomness is requested.
- A secure randomness commitment and fulfillment lifecycle.
- A draw state machine with exactly-once finalization and claim protection.
- A confidential asset transfer mechanism and sufficient pool liquidity or an asynchronous redemption path.
- ACL rules that let the pool compute on ciphertexts, users decrypt only their own state, and only the finalized winner decrypt the prize.
- A liveness/recovery path for failed randomness, failed public decryption, failed yield settlement, and unavailable keepers.
- A bounded participant design because FHE comparisons and selects consume HCU.

### 2.3 Quality requirements

- Explicit privacy boundaries rather than a blanket claim of anonymity.
- Reproducible deployment, verified contracts, pinned versions, and published addresses.
- Unit, fuzz, invariant, integration, Sepolia, ACL, and decryption-flow tests.
- A polished UX for encryption, signing, pending operations, public draw verification, and failures.
- Permissionless progression or well-defined operational roles.
- Gas/HCU awareness, participant caps, and denial-of-service defenses.
- Documented economic, yield-source, upgrade, and admin trust.

### 2.4 Optional opportunities

- A public draw-verification timeline.
- One-epoch balance maturity to resist last-minute deposits and flash liquidity.
- A liquidity buffer with queued confidential redemptions.
- A public anti-spam slot bond.
- A privacy dashboard that explains what is encrypted and what is metadata.
- Permissionless third-party finalization and recovery rewards.

### 2.5 Forbidden or dangerous scope

- PoolTogether V5's complete tier, TWAB, liquidator, draw-auction, and cross-chain architecture.
- Unlimited participant sets or claims of unbounded FHE scalability.
- Multiple yield protocols, multiple assets, leverage, or strategy routing in the MVP.
- Custom cryptography, custom threshold KMS, a new VRF, or an unreviewed ZK winner proof.
- NFTs, transfer markets, governance tokens, referrals, teams, social graphs, or cross-chain prizes.
- A backend that can choose winners, alter weights, decrypt balances, or selectively progress draws.
- Calling sponsor funding “yield.”

### 2.6 Requirements matrix

| Requirement | Evidence | Priority | Technical implication | Verification method |
| --- | --- | ---: | --- | --- |
| Shared asset pool | Explicit bounty text | P0 | ERC-7984 receiver and pooled custody/accounting | Sepolia deposit integration test |
| Principal withdrawable at any time | Explicit bounty text | P0 | No prize lock; instant confidential buffer or permissionless queued redemption | Invariant plus withdrawal tests in every epoch state |
| Yield funds prizes | Explicit bounty text | P0 | Public yield adapter and separate prize reserve | Strategy balance/revenue reconciliation |
| Periodic draws | Explicit bounty text | P0 | Epoch state machine and public schedule | Time-transition tests |
| Deposits encrypted | Explicit bounty text | P0 | Confidential transfer amount and encrypted internal credit | Inspect calldata/events and user decrypt |
| Balances encrypted | Explicit bounty text | P0 | `euint64` principal/weight state and narrow ACL | Unauthorized decrypt negative tests |
| Winnings encrypted | Explicit bounty text | P0 | Encrypted prize reserve and credit/transfer handle | Winner and non-winner decrypt tests |
| Weighted selection over encrypted balances | Explicit bounty text | P0 | FHE cumulative weights, comparison, first crossing | Deterministic test vectors and Sepolia HCU spike |
| Publicly verifiable winner selection | Explicit bounty text | P0 | Verifiable randomness, deterministic contract code, KMS-authenticated reveal | Verify request, fulfillment, handles, proof, and finalization on explorer |
| Only winner decrypts prize | Explicit bounty text | P0 | `FHE.allow(prize, winner)` only after finalization | ACL tests for winner, losers, admin, relayer |
| Sepolia deployment | Explicit bounty text | P0 | Current Zama, token, relayer, VRF, and yield addresses | Reproducible deployment and source verification |
| Polished UX | Explicit quality language | P1 | Explicit signing/decrypt states and truthful privacy copy | Journey/edge-state usability review |
| Robust engineering | Explicit quality language | P1 | Invariants, recovery, no trusted winner backend | CI, threat-model test map, runbooks |
| Production-ready architecture | Explicit quality language | P1 | Adapter boundaries, roles, pause/recovery, upgrade policy | Architecture review after spikes |
| Multiple pools/tiers | Not stated | P3 | Large extra state and FHE cost | Deliberately excluded |

### 2.7 Evidence note

The bounty brief supplied for this research is the primary evidence for explicit requirements. No public bounty URL was provided, so none is invented here. All priority rankings and implied requirements are labeled engineering interpretation.

## 3. Current Zama technology relevant to the bounty

### 3.1 Current source snapshot and versions

The following versions were verified from official manifests or source checkouts, not memory:

| Component | Verified current evidence | Relevance |
| --- | --- | --- |
| Solidity FHE library | `@fhevm/solidity ^0.11.1` in the official Hardhat template and `0.11.1` in current `protocol-apps` | Contract types, operations, ACL, config |
| Hardhat plugin | `@fhevm/hardhat-plugin ^0.4.2` | Local/remote FHE tests and tasks |
| Mock utilities | `@fhevm/mock-utils ^0.4.2` | Fast local test mode |
| Low-level relayer SDK used by template | `@zama-fhe/relayer-sdk ^0.4.1` | Existing template integration |
| High-level SDK | `@zama-fhe/sdk 3.4.0` | Preferred current application SDK |
| React SDK | `@zama-fhe/react-sdk 3.4.0` | React hooks and wagmi integration |
| SDK FHE dependency | `@fhevm/sdk 0.13.2` | Underlying WASM/encryption runtime |
| Confidential contracts | `@openzeppelin/confidential-contracts ^0.4.0` in current batcher/wrapper packages | ERC-7984 and confidential finance primitives |
| Solidity/EVM | Solidity `0.8.27`, Cancun in the official Hardhat template | Build target |
| Node | Template `>=20`; current high-level SDK monorepo `>=22` | Tooling compatibility |

Inspected official source snapshots:

- `zama-ai/protocol-apps` commit `aa77db0` dated 2026-08-07.
- `zama-ai/sdk` commit `03b1d7e` dated 2026-07-30, package version `3.4.0`.
- `zama-ai/fhevm-hardhat-template` commit `ec84e1a` dated 2026-05-04.
- A local `fhevm-solidity` checkout was older (2025) and was not used to override current documentation or current manifests.

### 3.2 FHEVM model

**CONFIRMED:** FHEVM exposes encrypted Solidity types as ciphertext handles. Supported types relevant here include `ebool`, `euint8`, `euint16`, `euint32`, `euint64`, `euint128`, `euint160`, `euint256`, and `eaddress` as an alias for `euint160`.

**CONFIRMED:** ERC-7984 amounts and balances use `euint64`. Six decimals allow approximately 18.4 trillion whole-token units before the `uint64` ceiling, adequate for an MVP but still requiring overflow-safe accounting.

**CONFIRMED:** Encrypted arithmetic is unchecked and wraps on overflow. Contracts must detect overflow with encrypted comparisons and choose a safe result with `FHE.select`; reverting based on a secret comparison would leak information.

**CONFIRMED:** Required operations exist: encrypted add/subtract/multiply, comparisons, boolean operators, casts, scalar shifts, scalar division/remainder, `FHE.min/max`, and `FHE.select`. Encrypted division or remainder by an encrypted right-hand operand is not supported.

### 3.3 Encrypted inputs

**CONFIRMED:** A client encrypts values for a particular contract and sender, submits `externalEuintX` handles and a proof, and the contract validates/converts them with `FHE.fromExternal`.

Important constraints:

- The encrypted input must target the correct contract and signer context.
- Multiple values can be packed into one proof.
- Proof validation does not replace application-level request IDs, epoch binding, nonce/idempotency, or double-claim protection.
- Deposit flows should prefer an ERC-7984 transfer callback because it passes the actual encrypted amount accepted by the token implementation.

### 3.4 ACL and permissions

**CONFIRMED:** The ACL is not optional. A ciphertext is unusable across transactions unless the right contract/address has access.

| API | Meaning | Pool usage |
| --- | --- | --- |
| `FHE.allowThis(x)` | Persistent permission for the current contract | Every stored principal, weight, reserve, snapshot, and prize handle reused later |
| `FHE.allow(x, address)` | Persistent permission for a user/contract | User decrypts own balance; winner decrypts prize |
| `FHE.allowTransient(x, address)` | Permission only for the current transaction | Passing an encrypted amount into an ERC-7984 transfer or another contract |
| `FHE.makePubliclyDecryptable(x)` | Global, permanent public decryptability | Only the final encrypted winner address, and necessary aggregate settlement handles |
| `FHE.checkSignatures(...)` | Validates KMS-authenticated cleartexts and handle order | Winner reveal and aggregate unwrap finalization |

**CONFIRMED:** Public decryptability is permanent. Never mark user balances, weights, or prize amounts publicly decryptable.

**CONFIRMED:** Zama's reorg guidance says ACL events reach the Gateway before finality. For critically valuable secrets, it recommends a two-step grant with more than 95 blocks between the commitment and the final ACL authorization. Applying that full delay to a small Sepolia demo prize may be excessive UX, but the risk must be documented and a value-at-risk threshold chosen.

### 3.5 User-specific and public decryption

**CONFIRMED:** Current high-level application APIs are:

- `sdk.decryption.decryptValues` and React `useDecryptValues` for authorized user decryption.
- `sdk.decryption.decryptPublicValues` and React `useDecryptPublicValues` for public handles.

User decryption uses EIP-712 permits scoped to the signer, chain, and contract list. The current SDK limits a permit to up to ten contracts and defaults permit and transport-key TTLs to 30 days.

Public decryption is asynchronous:

1. The contract marks a handle publicly decryptable.
2. Any client asks the SDK/relayer for the cleartext and KMS proof.
3. Any caller submits cleartext and proof to the contract.
4. The contract calls `FHE.checkSignatures` and finalizes exactly once.

**CONFIRMED:** Handle order and ABI cleartext order must match exactly. Finalization functions need replay/idempotency guards even though the proof is authentic.

### 3.6 Relayer, KMS, and wallet trust

**CONFIRMED:** Sepolia's Zama relayer is open and requires no API key. Encryption and decryption still depend on relayer/KMS availability.

**CONFIRMED:** The SDK security model says the KMS re-encrypts ciphertexts to user transport keys without learning plaintext under the scheme's assumptions. The coprocessor is trusted to execute encrypted operations correctly as part of protocol consensus.

**CONFIRMED:** The browser transport private key is stored in plaintext in IndexedDB by default. Same-origin JavaScript, XSS, hostile extensions, or device compromise can steal it. Production UX therefore needs a strict CSP, dependency hygiene, short sensible permit TTLs, and explicit “Reveal” actions.

### 3.7 HCU and gas

FHEVM meters homomorphic work separately from ordinary EVM gas.

**CONFIRMED:** Current documentation publishes a global HCU limit of 20,000,000 and sequential-depth limit of 5,000,000 per transaction for the current devnet. **NEEDS SPIKE:** confirm that Sepolia enforces the same limits and costs.

Relevant documented costs:

| Operation | HCU |
| --- | ---: |
| `euint64` non-scalar add | 162,000 |
| `euint64` non-scalar less-than | 146,000 |
| `euint64` select | 55,000 |
| `ebool` non-scalar and | 25,000 |
| `ebool` not | 2 |
| `eaddress` select | 83,000 |
| `euint128` scalar multiply | 696,000 |
| `euint128` scalar shift | 37,000 |
| cast/trivial encrypt | 32 |

Ordinary gas is still paid for storage, calls, ACL writes, events, and verification. HCU—not calldata gas—is expected to be the draw's binding limit.

### 3.8 Random encrypted values

**CONFIRMED:** Current Zama documentation exposes `FHE.randEbool()` and `FHE.randEuintX()` and describes them as encrypted, onchain CSPRNG outputs. Bounded random upper bounds in current docs must be powers of two and the PRNG state can only advance in a transaction, not `eth_call`.

**OPEN QUESTION:** The collected official material does not explain the entropy beacon, operator trust, bias-resistance proof, or how an independent observer audits a particular random output. An older checked-out repository contained stale warnings about a plaintext mock PRNG, while current official docs claim cryptographic security. Current docs take precedence for API capability, but the trust/public-verifiability gap remains.

**Conclusion:** do not use `FHE.randEuint64()` as the sole bounty randomness source until its production entropy and audit semantics are proven. It remains a valuable alternative or private salt.

### 3.9 Tooling recommendation

- **Hardhat:** currently the most directly evidenced end-to-end template, remote Sepolia test workflow, plugin, tasks, and TypeScript integration.
- **Foundry:** officially supported through `forge-fhevm`, which deploys real FHEVM host contracts with mock signing keys and supports public/user decryption proof helpers.
- **Recommended later:** choose one primary deployment framework, but run property/invariant tests in Foundry if the team is comfortable with it. Avoid maintaining two full deployment systems.

### Section sources

- [Supported encrypted types](https://docs.zama.org/protocol/solidity-guides/smart-contract/types.md)
- [Encrypted operations](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md)
- [Encrypted inputs](https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs.md)
- [ACL](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl.md)
- [Reorg handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md)
- [Public decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [HCU](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md)
- [Random encrypted values](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/random.md)
- [Hardhat](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat.md)
- [Foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry.md)
- [SDK configuration](https://docs.zama.org/protocol/sdk/guides/configuration.md)
- [SDK security model](https://docs.zama.org/protocol/sdk/concepts/security-model.md)
- [Official Hardhat template manifest](https://github.com/zama-ai/fhevm-hardhat-template/blob/main/package.json)
- [Current SDK manifest](https://github.com/zama-ai/sdk/blob/main/packages/sdk/package.json)

## 4. Official repository and source-pattern investigation

| Repository / file | Demonstrated pattern | Reuse | Do not copy blindly |
| --- | --- | --- | --- |
| [`zama-ai/protocol-apps/.../BatcherConfidentialUpgradeable.sol`](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-batcher/contracts/BatcherConfidentialUpgradeable.sol) | Encrypted aggregate deposits; transfer-and-call; permissionless dispatch/callback/claim; public aggregate unwrap; KMS proof; cancel/quit recovery | State machine, actual-amount accounting, permissionless liveness, aggregate privacy boundary | Its route is generic and participant privacy degrades with small batches; do not assume it is a prize pool |
| [`.../ConfidentialWrapper.sol`](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-wrapper/contracts/ConfidentialWrapper.sol) | Production wrapper policy, pause/blocklist/observer hooks, asynchronous unwrap | Wrapper behavior and risk controls | Observers can decrypt broad data; do not configure one casually |
| [`.../ERC7984Upgradeable.sol`](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-wrapper/contracts/token/ERC7984Upgradeable.sol) | Encrypted balances, operators, safe transfer, actual transferred amount, receiver callback/refund | Transfer semantics and ACL discipline | Transfer-and-call refund is best-effort if a malicious receiver spends during the callback |
| [`.../ERC7984ERC20WrapperUpgradeable.sol`](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-wrapper/contracts/extensions/ERC7984ERC20WrapperUpgradeable.sol) | Public wrap, confidential transfer, public-decryption unwrap, six-decimal cap | Asset boundary | Fee-on-transfer, deflationary, rebasing tokens are unsupported |
| [`zama-ai/sdk/packages/sdk`](https://github.com/zama-ai/sdk/tree/main/packages/sdk) | Current high-level encryption/decryption, permits, token wrappers, errors | Preferred frontend/service API | Do not mix old `fhevmjs` tutorial APIs with SDK 3.4.0 |
| [`VaultPositionCard.tsx`](https://github.com/zama-ai/sdk/blob/main/examples/react-wagmi/src/components/VaultPositionCard.tsx) | Explicit permit, user-controlled reveal, masked state, error states | Confidential balance UX | Do not auto-decrypt on component mount |
| [`fhevm-hardhat-template/FHECounter.sol`](https://github.com/zama-ai/fhevm-hardhat-template/blob/main/contracts/FHECounter.sol) | `FHE.fromExternal`, encrypted state update, `allowThis`, user allowance | Minimal contract pattern | Example omits production overflow and authorization concerns |
| [OpenZeppelin Confidential Contracts v0.4.0](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts/tree/v0.4.0) | ERC-7984 and confidential finance primitives | Interfaces/utilities | Pin the compatible version; current Zama wrappers include upgradeable forks and policy additions |

Key source conclusions:

- **CONFIRMED:** ERC-7984 `_update` uses encrypted safe-decrease/increase and returns either the requested amount or encrypted zero. The receiving application must update its ledger from the actual returned/callback amount, not the user's requested plaintext intention.
- **CONFIRMED:** A sender with an uninitialized balance can revert even when an encrypted request would otherwise clamp to zero.
- **CONFIRMED:** A batch callback can be permissionless and idempotent when the proof and state are validated.
- **CONFIRMED:** Claiming on behalf of another user is safe when output is hardcoded to that user's address.
- **CONFIRMED:** Wrapper registration is a Protocol DAO action. An application-owned wrapper may function technically, but it must not be represented as registry-verified until governance registers it.

## 5. PoolTogether model and what confidentiality changes

### 5.1 PoolTogether V5 model

Inspected source confirms:

- `PrizeVault` is ERC-4626 compatible and deposits assets into an underlying yield vault.
- User share balances are stored through a TWAB Controller.
- Yield above depositor debt and a yield buffer is liquidated into the prize token and contributed to `PrizePool`.
- A draw manager supplies a winning random number after a draw closes.
- `PrizePool.isWinner` derives a user-specific pseudo-random value from the draw, vault, user, tier, prize index, and winning random number, then compares clear TWAB odds.
- Claims are checked and marked exactly once onchain.
- Withdrawals attempt to return principal, but underlying vault loss can make withdrawals proportional/lossy.

### 5.2 Reusable directly

- ERC-4626 as the public yield-adapter boundary.
- Explicit principal/debt versus available-yield accounting.
- A reserve/yield buffer.
- Draw epochs, close times, immutable draw inputs, and claim records.
- Permissionless progression and explicit shutdown/recovery behavior.

### 5.3 Reusable conceptually

- Balance-weighted odds.
- A maturity period to reward sustained savings rather than instant liquidity.
- Separating prize liquidity from principal liquidity.
- Keeping the yield strategy replaceable behind an adapter.

### 5.4 Incompatible or unnecessary for the bounty

- Clear TWAB history exposes balances and is expensive to reproduce under FHE.
- PoolTogether's per-user clear `isWinner` computation is not encrypted weighted selection.
- Tiered prizes, canary tiers, prize indices, liquidators, auctions, and cross-chain draw delivery are unnecessary.
- Copying the complete V5 architecture would enlarge scope and obscure the bounty's FHE primitive.

### Section sources

- [PoolTogether V5 PrizeVault](https://github.com/GenerationSoftware/pt-v5-vault/blob/main/src/PrizeVault.sol)
- [PoolTogether V5 PrizePool](https://github.com/GenerationSoftware/pt-v5-prize-pool/blob/main/src/PrizePool.sol)
- [PoolTogether TWAB ERC-20](https://github.com/GenerationSoftware/pt-v5-vault/blob/main/src/TwabERC20.sol)
- [PoolTogether Chainlink VRF adapter](https://github.com/GenerationSoftware/pt-v5-chainlink-vrf-v2-direct/blob/main/src/ChainlinkVRFV2Direct.sol)

## 6. Confidential asset, accounting, yield, withdrawal, and prize model

### 6.1 Values that must not be conflated

| Value | Suggested representation | Meaning | Who may decrypt / observe |
| --- | --- | --- | --- |
| User wallet token balance | ERC-7984 `confidentialBalanceOf(user)` | cUSDT outside the pool | User; token contract |
| Pool's actual cUSDT balance | ERC-7984 token balance of pool | Liquid confidential assets physically held | Pool/token; should not be public |
| User principal | Pool `euint64 principal[user]` | Amount the pool owes as principal | User and pool |
| Current eligible weight | Pool `euint64 eligible[user]` | Amount eligible for the next frozen draw | User and pool |
| Pending weight | Pool `euint64 pending[user]` | New deposit waiting one full epoch | User and pool |
| Draw snapshot | Epoch array of `euint64` handles | Immutable weights after close | Pool computation only |
| Public batch aggregate | `uint64/uint256` after KMS proof | Amount crossing into/out of public strategy | Everyone; never an individual amount by design |
| Public strategy assets | ERC-4626/Aave position | Aggregate assets deployed to yield | Everyone |
| Encrypted prize reserve | Pool `euint64` | Confidential cUSDT available for prizes | Pool only until a prize is granted |
| Winner's prize | `euint64` credit/transfer handle | Winnings for one draw | Winner and necessary contracts only |

### 6.2 Asset model candidates

| Model | Feasibility | Privacy | Yield credibility | Main issue |
| --- | --- | --- | --- | --- |
| Existing official `cUSDTMock` plus sponsored test vault | Highest | Strong inside confidential layer | Low-to-medium | Existing underlying is not Aave's USDT; sponsor funding is not organic yield |
| App wrapper over Aave Sepolia USDT plus Aave ERC-4626 adapter | Medium | Strong individual privacy; aggregate strategy flows public | Highest conceptual credibility | Unregistered app wrapper, adapter risk, uncertain non-zero test yield |
| Accept a Zama Confidential Vault `cShare` | Medium | Reuses strongest official finance pattern | Mainnet credible | Official Sepolia vault is idle-only; principal denomination/harvest is awkward |
| Native confidential savings token | Medium-low | Flexible | Requires custom backing/yield design | Reinvents wrapper and custody policy unnecessarily |

### 6.3 Recommended conceptual asset direction

**STRONGLY INFERRED:** Target an application-owned ERC-7984 wrapper over Aave's official Sepolia test USDT, plus a small public ERC-4626 adapter that holds Aave aUSDT and issues non-rebasing public shares. Use Zama's deposit/redeem batcher lifecycle to move encrypted aggregates across the public strategy boundary.

Why:

- Aave's current official address book confirms Sepolia USDT underlying `0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0`, aUSDT `0xAF0F6e8b0Dc5c913bbF4d14c22B4E78Dd14310B6`, and Pool `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951` at address-book release `v4.65.5` dated 2026-08-08.
- Wrapping the rebasing aUSDT directly is unsafe under Zama's wrapper rules. A non-rebasing ERC-4626 adapter share avoids that wrapper incompatibility.
- Batch aggregates—not individual deposits—are revealed to use a public strategy.

**NEEDS SPIKE:** wrapper deployment/ownership, ERC-165 compatibility, batcher route, Aave supply/withdraw, adapter share math, available liquidity, and actual Sepolia interest.

**Fallback:** use official `cUSDTMock` and a deterministic prefunded test ERC-4626 adapter, visibly labeled “sponsored test yield.” Keep the same yield-adapter interface so it cannot be mistaken for the production strategy.

### 6.4 Deposit

1. User shields public USDT into cUSDT. The shield amount is public.
2. Prefer holding cUSDT before entering the pool to weaken timing correlation.
3. User calls `confidentialTransferAndCall(pool, encryptedAmount, proof, data)`.
4. Pool's receiver validates the token caller and credits the actual callback amount.
5. Principal and pending-next-epoch weight increase homomorphically; both handles receive `allowThis` and user allowance.
6. Periodically, an encrypted aggregate is publicly decrypted with KMS proof, unwrapped, and deposited into the public strategy.

**Privacy:** individual transferred amount stays encrypted; sender, pool, token, time, and transaction type are public. The later batch aggregate is public.

### 6.5 Eligibility accounting

To prevent deposit-just-before-draw and flash-liquidity capture:

- New deposits enter `pendingWeight`, not the current draw.
- At draw close, snapshot `eligibleWeight` handles for the ending epoch.
- After the snapshot, mature pending weight into the next epoch's eligible weight.
- A withdrawal reduces eligible weight first, then pending weight, ensuring total weight never exceeds principal.

This requires encrypted `min`, subtract, and select operations on withdrawal and must be included in gas/HCU tests. It is materially stronger than a close-time balance snapshot alone.

### 6.6 Yield

- Public strategy assets and share price are public.
- Individual liabilities remain encrypted, but aggregate batch liabilities may be revealed for strategy settlement and solvency.
- Realized strategy yield is returned through a public aggregate redemption and rewrapped into confidential tokens.
- The resulting confidential amount is added to an encrypted prize reserve.
- A prize can be computed as a scalar fraction of that encrypted reserve, for example `reserve / publicDivisor`; the exact amount stays encrypted because the carried reserve is unknown.

**Privacy caveat:** if the reserve is known to start at zero and all additions are public, a prize formula may be inferable. Seed and maintain the reserve through confidential transfers/carryover, and do not publicly reveal its balance. This improves practical confidentiality but cannot defeat all side information.

### 6.7 Withdrawal

“Withdraw at any time” should mean a user can permissionlessly initiate withdrawal in every normal epoch state; it should not promise synchronous public-underlying settlement despite asynchronous FHE unwraps.

- A user submits an encrypted amount, or withdraws all using the stored principal handle.
- The contract uses safe encrypted decrease semantics and transfers at most actual principal.
- If the pool's confidential liquidity buffer can pay, cUSDT returns immediately.
- Otherwise, the request enters a permissionless redeem batch, which aggregates encrypted requests, exits the public strategy, rewraps, and lets each user claim cUSDT.
- Principal is reduced only by the actual confidential amount transferred/claimed.

The MVP should expose “instant when buffer available; otherwise queued” honestly.

### 6.8 Prize

- Prize funds never come from principal accounting.
- Compute the prize amount as an encrypted value from the encrypted reserve.
- After the winner address is publicly revealed and proof-verified, add the encrypted prize to `winnings[winner]` or confidentially transfer cUSDT to the winner.
- Grant persistent user decryption only to the finalized winner.
- Deduct the reserve and set a draw-finalized/claimed flag exactly once.

### 6.9 Token movement invariants

1. Internal principal increases only by actual cUSDT received.
2. Internal principal decreases only by actual cUSDT returned or an irrevocably claimable redemption credit.
3. Prize reserve never includes principal.
4. Draw weight never exceeds live principal.
5. Strategy loss reduces the reported safety margin and can pause deposits; it must not be hidden.
6. A failed callback, unwrap, route, or claim has a quit/retry/cancel path.

### Section sources

- [Zama confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)
- [Zama Sepolia addresses](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md)
- [Confidential Vault architecture](https://docs.zama.org/protocol/confidential-vault/concepts/architecture.md)
- [Confidential Vault deposit](https://docs.zama.org/protocol/confidential-vault/guides/deposit.md)
- [Confidential Vault withdrawal](https://docs.zama.org/protocol/confidential-vault/guides/withdraw.md)
- [Confidential Vault addresses](https://docs.zama.org/protocol/confidential-vault/reference/addresses.md)
- [Aave address book, Sepolia](https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3Sepolia.sol)
- [ERC-4626](https://eips.ethereum.org/EIPS/eip-4626)

## 7. Winner selection over encrypted balances

This is the project's highest-risk technical area.

### 7.1 Required invariant

Given a public, immutable slot order and encrypted non-negative weights `w[0..N-1]`, the contract must select exactly one slot with probability proportional to its weight when total weight is non-zero, without revealing any individual weight.

### 7.2 Recommended bounded construction

**STRONGLY INFERRED / NEEDS SPIKE:**

1. Cap active slots at `N = 16`.
2. Before requesting randomness, store the public participant address for every slot and copy the current eligible encrypted handles into epoch snapshot storage. Copying handles is ordinary storage work; the underlying ciphertext remains immutable.
3. Request one Chainlink VRF word bound to that epoch/request ID.
4. On fulfillment, store the word only. Do not run the large FHE draw inside the VRF callback.
5. Map the low 64 bits `R` and encrypted total `T` to an encrypted threshold:

   ```text
   wideT     = cast_euint128(T)
   product   = wideT * uint64(R)       // encrypted × public scalar; fits < 2^128
   threshold = cast_euint64(product >> 64)
   ```

   This computes `floor(T * R / 2^64)` in `[0, T-1]` for `T > 0` without division by an encrypted value.

6. Compute inclusive encrypted prefixes with a balanced scan.
7. In parallel, compute `cross[i] = threshold < prefix[i]`.
8. Derive the unique first crossing:

   ```text
   match[0] = cross[0]
   match[i] = cross[i] AND NOT(cross[i-1])
   ```

9. Fold over public slot addresses with encrypted `FHE.select` to produce one `eaddress winner`.
10. If all weights are zero, every comparison is false and the encrypted winner remains the zero address; reveal zero and roll the prize forward.
11. Mark only the encrypted winner address publicly decryptable.
12. Any client publicly decrypts it and submits the clear address and proof.
13. Verify with `FHE.checkSignatures`, finalize once, then grant the winner access to the encrypted prize.

### 7.3 Why multiply-high rather than encrypted modulo

- `R % T` is unavailable because encrypted remainder requires a plaintext divisor.
- A bounded Zama random call requires a public power-of-two upper bound, not encrypted `T`.
- Multiply-high is fixed-cost, has no secret-dependent loop, and is standard range reduction.
- For contiguous ranges of winning thresholds, discretization error is on the order of one or two points in `2^64`; this is negligible for the MVP but must be quantified with exhaustive small-domain tests and statistical large-domain tests.

### 7.4 HCU estimate

Using a work-efficient balanced prefix scan with approximately `2N - 2` encrypted additions:

| Work for `N=16` | Approximate HCU |
| --- | ---: |
| 30 `euint64` additions | 4,860,000 |
| 16 `euint64` comparisons | 2,336,000 |
| 15 boolean first-crossing `and`s | 375,000 |
| 16 `eaddress` selects | 1,328,000 |
| `euint128` scalar multiply + shift + casts | ~733,000 |
| **Subtotal before ACL/overhead** | **~9,632,000** |

For `N=32`, the analogous subtotal is approximately 18.9 million HCU before ACL, initialization, or other operations. That is too close to a documented 20 million global ceiling.

Sequential depth for a balanced 16-slot scan is plausibly below 5 million HCU, while a naive 32-slot cumulative scan/select chain is not. Actual compiler scheduling, dependency accounting, ACL charges, and Sepolia policy must be measured.

### 7.5 Candidate comparison

| Candidate | Supported? | Complexity / scale | Privacy | Verifiability | Conclusion |
| --- | --- | --- | --- | --- | --- |
| Naive sequential cumulative scan | Yes in primitives | `O(N)` work and depth; brittle near depth limit | Strong values | Authenticated FHE execution | Only baseline spike, not preferred |
| Balanced parallel prefix + oblivious select | Yes in primitives | `O(N)` work, `O(log N)` prefix depth; selects still linear | Strong values | Best current fit | Recommended spike |
| Encrypted binary search over storage | Not directly | Secret index cannot branch into public storage; oblivious traversal returns to `O(N)` | Strong | Same | No advantage for small N |
| Merkle-assisted encrypted weights | Partly | Merkle proof authenticates committed leaves but does not prove plaintext weights or remove oblivious selection | Depends | Adds commitment, not FHE correctness proof | Unnecessary for MVP |
| Offchain winner calculation | Easy | Scales, but whoever decrypts/receives weights becomes trusted | Weak | Needs custom proof/MPC | Does not satisfy strongest reading |
| Custom ZK proof of weighted draw | Theoretically | Major circuit, ciphertext/commitment binding, prover infrastructure | Potentially strong | Strong independent proof | Dangerous scope |
| `FHE.randEuint64` + encrypted draw | Primitive exists | Simple and private | Strong | Entropy/public audit unresolved | Alternative only after spike |

### 7.6 Snapshot and race handling

Chainlink guidance requires all outcome-affecting user inputs to be frozen before the randomness request. Therefore:

- Draw slots, ordering, and encrypted weights are frozen first.
- The VRF request is second.
- Deposits after close affect the next epoch.
- Withdrawals remain allowed because the frozen draw stores prior ciphertext handles; live principal can change without mutating the snapshot.
- Slot reuse is prohibited until any epoch referencing that slot is terminal.

At 16 slots, an explicit per-epoch handle snapshot is preferable to complex encrypted checkpoints.

### 7.7 What is public, encrypted, and known

| Item | Public? | Encrypted? | Known by |
| --- | --- | --- | --- |
| Epoch ID, times, slot ordering | Yes | No | Everyone |
| Participant addresses | Yes | No | Everyone |
| Individual eligible weights | No | Yes | User can know own; pool computes |
| Total weight | No by default | Yes | Pool computes |
| VRF request, proof/output | Yes | No | Everyone |
| Threshold | No | Yes | Pool computes |
| Prefixes/comparison bits | No | Yes | Pool computes |
| Final winner address before reveal | No | Yes | No plaintext observer |
| Final winner address after reveal | Yes | Was encrypted | Everyone, KMS-authenticated |
| Prize amount | No | Yes | Winner after ACL grant |

### 7.8 Failure modes

- HCU global/depth revert.
- Incorrect prefix implementation or off-by-one threshold.
- Overflow if `euint64 * R` is not widened first.
- Incorrect handle ordering in public-decryption proof.
- Randomness requested before snapshot freeze.
- Duplicate slot, slot reuse, or participant index drift.
- Zero-total epoch not handled.
- Draw finalized twice or prize credited twice.
- ACL accidentally granted to admin, relayer, or all users.
- Reorg between winner finalization and high-value ACL grant.

### Section sources

- [Zama encrypted types](https://docs.zama.org/protocol/solidity-guides/smart-contract/types.md)
- [Zama operations](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md)
- [Zama HCU](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md)
- [Zama public decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Chainlink VRF security](https://docs.chain.link/vrf/v2-5/security)

## 8. Randomness research

### 8.1 Evaluation

| Approach | Unpredictability / bias resistance | Onchain verification | Complexity / liveness | Fit |
| --- | --- | --- | --- | --- |
| Chainlink VRF v2.5 on Sepolia | Strong cryptographic randomness; validator can only attempt costly request-block rewrite, not predict output | Coordinator verifies VRF proof and fulfillment is onchain | Async, funded subscription/direct request, callback and oracle availability | **Recommended** |
| Zama `FHE.randEuint64()` | Current docs claim encrypted CSPRNG and unpredictability | FHE operation is onchain, but independent entropy/proof semantics are undocumented in collected sources | Simple and private | **NEEDS SPIKE** before sole use |
| `block.prevrandao` / blockhash | Validator/proposer can bias or selectively withhold within economic constraints | Native/public | Simple but timing-sensitive | Unsuitable alone for meaningful prizes |
| Single-party commit/reveal | Committer can withhold last reveal | Public commitments/reveals | Requires deposits, deadlines, fallback | Reject |
| Multi-party commit/reveal | Better if at least one honest revealer | Public | Last-revealer, Sybil, incentive, and liveness complexity | Possible, poor MVP fit |
| Beacon-root extraction | Public consensus data, but safe delayed constructions require care | Native after EIP-4788 | Considerable protocol reasoning and delay | Unnecessary unless VRF unavailable |

### 8.2 Recommended VRF lifecycle

1. Close epoch and freeze slot order and encrypted weights.
2. Store an epoch commitment/request state.
3. Request one VRF v2.5 word with a value-at-risk-appropriate confirmation count.
4. Bind the returned `requestId` to that epoch; never infer association from callback order.
5. In `fulfillRandomWords`, validate the request, store the word, and return without large FHE work.
6. Let any caller execute the weighted FHE draw in a separate transaction.
7. Never permit an operator to re-request until it sees a favorable result.
8. If VRF never arrives, a fixed public timeout may abandon the draw and roll the prize forward, permanently preventing that epoch from later awarding. This policy must be automatic and non-selective.

**CONFIRMED:** Chainlink warns that fulfillments can arrive out of order, request/fulfillment association must use `requestId`, users must not supply outcome-affecting inputs after request, fulfill callbacks should not revert, and re-request/cancellation can enable selective randomness.

**NEEDS SPIKE:** current Sepolia coordinator, key hash, payment method, callback limit, funding workflow, confirmation count, and interaction with FHEVM transaction scheduling. Read these from the current supported-networks page immediately before deployment; do not pin an address from memory.

### 8.3 Randomness attack considerations

- A draw requester must not control whether a valid fulfilled word is used.
- Anyone should be able to progress a fulfilled draw.
- The callback should store only data, minimizing callback-gas failure.
- Deposits cannot affect the frozen epoch after request.
- A late fulfillment after an already-finalized timeout must be rejected by terminal epoch state.
- Reorg risk must be priced into the confirmation count and prize value.
- `prevrandao` may be retained only as a domain separator or non-security-critical salt, never as the sole entropy source.

### Section sources

- [Chainlink VRF v2.5 supported networks](https://docs.chain.link/vrf/v2-5/supported-networks)
- [Chainlink VRF security considerations](https://docs.chain.link/vrf/v2-5/security)
- [Zama encrypted randomness](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/random.md)
- [EIP-4399: `PREVRANDAO`](https://eips.ethereum.org/EIPS/eip-4399)
- [EIP-4788: Beacon block root in the EVM](https://eips.ethereum.org/EIPS/eip-4788)

## 9. Public verifiability model

### 9.1 What “verifiable onchain” can honestly mean

Recommended definition:

```text
public frozen epoch and slot ordering
              +
public VRF request, verified fulfillment, and random word
              +
deterministic FHE contract code and onchain operation transaction
              +
encrypted winner handle made publicly decryptable
              +
KMS cleartext/signature proof checked by FHE.checkSignatures
              +
exactly-once prize credit state transition
```

Observers can verify:

- the participant slot ordering and epoch were fixed before randomness;
- a specific VRF request produced the used word;
- the deployed bytecode implements the stated encrypted computation;
- no privileged backend supplied weights or a winner;
- the revealed address is the KMS-authenticated plaintext of the encrypted winner handle;
- the draw finalized once and credited a confidential prize once.

Observers cannot verify by plaintext recomputation:

- each hidden weight;
- the encrypted cumulative totals;
- the encrypted threshold;
- that the winner is mathematically correct independently of the FHEVM/coprocessor execution trust;
- the prize amount.

Therefore the guarantee is **authenticated execution under Ethereum, Chainlink VRF, FHEVM, ACL, and Zama KMS trust**, not an independently reproducible plaintext calculation and not a custom zero-knowledge proof of the weighted computation.

### 9.2 Model comparison

| Model | What is revealed | What observers verify | Trust / loophole | Assessment |
| --- | --- | --- | --- | --- |
| A. All selection in FHE, public winner | Winner | Contract execution and KMS reveal | Randomness may be opaque if FHE RNG only | Good if entropy clarified |
| B. FHE result plus custom proof | Winner and proof | Independent computation statement | Requires new proof system and ciphertext commitments | Out of scope |
| C. Public VRF + encrypted weights/computation + public winner | Random word and winner | Strong randomness chain plus KMS-authenticated result | Cannot recompute from hidden weights | **Recommended** |
| D. Offchain decrypt/select plus attestation | Winner, perhaps attestation | Trusted service behavior | Service sees weights and may choose winner | Reject |

### 9.3 Public audit UX

A strong submission should expose, for each draw:

- epoch ID and freeze transaction;
- participant count and slot commitment/order;
- VRF request and fulfillment transaction;
- draw-computation transaction;
- encrypted winner handle;
- public-decryption proof/finalization transaction;
- prize-credit transaction status, while keeping amount masked;
- exact statement: “Verified execution; balances remain hidden, so the public cannot recompute the weighted result.”

### Section sources

- [Zama public decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Zama ACL](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl.md)
- [Chainlink VRF security considerations](https://docs.chain.link/vrf/v2-5/security)

## 10. Access-control and decryption model

### 10.1 Recommended permission matrix

| Ciphertext | Contract access | User access | Public access |
| --- | --- | --- | --- |
| Principal | Pool via `allowThis` | Balance owner | Never |
| Eligible/pending weight | Pool | Owner if UX needs it | Never |
| Epoch snapshot | Pool | Optional owner; not necessary | Never |
| Encrypted total/prefix/threshold | Pool for transaction/state as needed | None | Never |
| Encrypted winner address | Pool | None before reveal | Public only when terminal result is ready |
| Prize reserve | Pool | None | Never |
| Winner prize credit | Pool/token | Finalized winner | Never |
| Aggregate batch unwrap amount | Batcher/wrapper | None | Publicly decryptable by necessity |

No ordinary admin, keeper, frontend, indexer, or relayer should receive user-decryption rights.

### 10.2 Winner grant lifecycle

1. FHE draw produces `encryptedWinner` and `encryptedPrize`.
2. Only `encryptedWinner` is made publicly decryptable.
3. A permissionless finalizer submits the clear winner and proof.
4. Contract checks proof, epoch state, non-zero/eligible slot, and exactly-once flag.
5. Contract calls `FHE.allow(encryptedPrize, winner)` and persists contract access.
6. Winner explicitly signs an SDK permit scoped to the pool contract and decrypts.

**NEEDS SPIKE:** whether ACL propagation delay affects immediate winner decryption and how the SDK surfaces a not-yet-propagated grant.

### 10.3 Wallet change and recovery

- ACL permission is address-specific; a new wallet cannot automatically decrypt the old wallet's position.
- A user must use the old wallet to confidentially transfer assets or invoke an explicit encrypted-position migration.
- Social recovery/account abstraction is outside MVP scope.
- Never add an admin “recover any user balance” decryption backdoor.
- Document wallet-loss risk before deposit.

### 10.4 After withdrawal or prize expiry

- Old ciphertext handles and historical permissions can remain; users may still decrypt historical values.
- Do not assume an ACL grant can erase knowledge already obtained.
- Prize expiry should not be part of MVP. If added later, expiry can move spendability back to the reserve, but it cannot guarantee that the former winner forgets or can no longer decrypt the historical prize ciphertext.
- Prefer non-expiring claimability or an explicit long claim window with rollover rules.

### 10.5 Confidential value versus confidential metadata

Encrypted values do not hide:

- which address received ACL rights;
- which address is the winner after reveal;
- which contracts a user's permit covers;
- transaction graphs and timing;
- the fact that an address requested decryption;
- public batch membership and public aggregate settlement.

This product provides amount confidentiality, not address anonymity or full transaction-graph privacy.

### Section sources

- [Zama ACL](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl.md)
- [Zama public decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Zama SDK permit model](https://docs.zama.org/protocol/sdk/concepts/permit-model.md)
- [Zama SDK security model](https://docs.zama.org/protocol/sdk/concepts/security-model.md)
- [Zama reorg handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md)

## 11. Privacy and information-leakage threat model

### 11.1 Adversary

Assume an adversary observes all transactions, calldata, logs, public storage, RPC traces, gas, timing, token transfers, participant addresses, repeated participation, draw events, public-decryption requests, public strategy positions, and frontend network traffic. The adversary may also participate, create many wallets, correlate offchain behavior, and know some users' deposits from external information.

### 11.2 Leakage classification

| Observation / inference | Classification | Reason | Mitigation |
| --- | --- | --- | --- |
| Sender, pool, token, call type | Unavoidable | Ethereum transaction metadata | State clearly; avoid anonymity claims |
| Shield/unshield amount | Unavoidable at wrapper boundary | Public ERC-20 transfer | Encourage pre-shielding and delayed entry |
| Confidential transfer amount | Preventable and protected | ERC-7984 amount ciphertext | Use transfer-and-call; never mirror in clear event |
| Participant address and slot | Unavoidable in proposed design | Public address storage/calls | Use neutral slot order; no public balance rank |
| Deposit/withdraw timing | Unavoidable | Transaction timestamp | Batch, delay, and avoid instant shield→deposit UX default |
| Public aggregate batch amount | Necessary but risky | Public strategy needs plaintext | Minimum batch size/age; warn lone users; optional threshold before dispatch |
| Lone participant's amount from aggregate | Critical | Aggregate equals individual | Do not dispatch privacy-sensitive singleton batches; allow quit |
| Difference attack across small batches | Critical/preventable | Known participants/amounts isolate unknown | Larger batch, randomized/delayed dispatch windows, min anonymity set |
| Winner identity | Required reveal | Bounty verifiability | Reveal only winner address, never weights/prize amount |
| Prize amount inferred from known-zero reserve | Preventable | Public yield plus deterministic payout | Confidential seed/carry reserve; avoid known-zero first draw |
| Gas depending on weight | Preventable | Secret-dependent branching/path | Fixed 16-slot oblivious computation |
| Revert revealing secret comparison | Critical/preventable | Plain branch on encrypted condition | Use encrypted select and generic outcomes |
| Repeated user balance reveals | User-controlled leakage | User displays plaintext locally | Explicit reveal, auto-remask, no analytics capture |
| Decryption request timing | Acceptable but visible | Wallet/relayer traffic | Explain; avoid automatic background decrypt |
| Browser transport-key theft | Critical | XSS/extensions can access IndexedDB | CSP, audits, minimal dependencies, TTL, clear/revoke UX |
| Public Aave position and strategy flows | Acceptable aggregate leakage | Public yield layer | Do not claim pool-level TVL secrecy |

### 11.3 Privacy requirements for implementation

- No clear amount in application events, custom errors, analytics, logs, or URLs.
- All draw operations run a constant public shape for 16 slots, including empty slots represented by encrypted zero.
- Do not sort participants by balance.
- Never publish decrypted total weight merely to simplify drawing.
- Exclude observers from wrappers unless there is a documented compliance requirement.
- Redact encrypted proofs/handles only when needed for UI ergonomics; handles are not plaintext secrets but can aid correlation.
- Use a privacy notice that distinguishes amount confidentiality, aggregate leakage, and metadata visibility.

### Section sources

- [Zama SDK security model](https://docs.zama.org/protocol/sdk/concepts/security-model.md)
- [Confidential Vault confidentiality](https://docs.zama.org/protocol/confidential-vault/concepts/confidentiality.md)
- [Confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)

## 12. Security threat model

### 12.1 Smart-contract risks

| Risk | Severity | Control / validation |
| --- | --- | --- |
| Ledger credits requested rather than actual transferred amount | Critical | Credit callback/return handle only; invariant against token balance |
| Encrypted overflow/underflow wraps | Critical | `FHESafeMath`, comparisons, selects, supply/aggregate caps |
| Reentrancy through token callback, wrapper, strategy, or claim | High | Checks-effects-interactions, transient reentrancy guard, narrow callbacks |
| Transfer-and-call malicious receiver refund failure | High | Pool is receiver, not arbitrary callback target; never spend received tokens before returning success |
| Double draw/finalization/claim | Critical | Terminal state, request binding, per-epoch flags, claim record |
| Unauthorized admin progression or winner override | Critical | Permissionless deterministic progression; no winner setter |
| Strategy/accounting insolvency | Critical | Separate principal/reserve, public aggregate reconciliation, loss pause, buffer |
| Incorrect slot reuse or duplicate participant | High | Address→slot map, epoch references, terminal-state reuse only |
| Unsafe upgrade | High | Prefer immutable MVP core or timelocked multisig UUPS with storage-layout tests |
| Pause traps funds | High | Pause joins/new dispatch only; keep quit/claim/recovery open |

### 12.2 FHE-specific risks

| Risk | Severity | Control / validation |
| --- | --- | --- |
| Missing `allowThis` bricks future computation | Critical | Permission assertions in every state mutation test |
| Over-broad `allow` or observer | Critical | Permission matrix and negative decrypt tests |
| Accidentally public balance/prize | Critical | Static review for every `makePubliclyDecryptable` call |
| Handle/cleartext order mismatch | High | Typed finalizer helper and multi-handle test vectors |
| Public-decryption replay | High | Bind epoch, handle, request, state, and `finalized` flag |
| ACL propagation/reorg leak | High at value | Two-step delay above value threshold; confirmation policy |
| HCU limit denial of service | Critical | 16-slot benchmark, measured margin, no unbounded loops |
| Stale ciphertext snapshot | High | Snapshot before request; immutable epoch storage |
| Async relayer/KMS outage | Medium/high liveness | Permissionless retry; quit paths; status UI; no permanent deadline too short |
| Comparing/revealing secret validity | Medium | Encrypted success flags and generic public state |

### 12.3 Economic risks

| Risk | Effect | Mitigation |
| --- | --- | --- |
| Whale domination | One user captures most probability | This is mathematically proportional, not a bug; optional public max-per-slot would reveal/cap behavior and is not recommended initially |
| Sybil wallets | Slot exhaustion, not extra aggregate odds | Public refundable anti-spam bond, one active slot/address, queue/waitlist |
| Last-minute deposits | Yield-free prize capture | One full epoch maturity |
| Withdraw-after-snapshot | User retains earned epoch weight | Accept if funds were present for full epoch; snapshot rule must be public |
| Flash liquidity | Temporary weight | Maturity makes same-transaction/epoch funds ineligible |
| Zero deposit slot squatting | Consumes bounded capacity | Require bond and encrypted positive-amount success; remove inactive slots safely |
| Yield strategy loss | Principal loss/insolvency | Conservative adapter, loss monitoring, deposit pause, honest loss policy |
| Yield near zero | Empty prizes/demo failure | Carry reserve; test sponsor separately labeled; no fake APY |
| Prize reserve drain | Later draw fails | Encrypted reserve safe-decrease and rollover |

### 12.4 Operational risks

- VRF subscription unfunded or direct request underfunded.
- VRF callback gas too low or callback reverts.
- No one calls draw, public decryption, settlement, claim, or recovery.
- Zama relayer/KMS unavailable.
- Public strategy pauses, lacks liquidity, or reverts.
- Indexer misses an event and frontend shows stale state.
- Frontend targets wrong chain/address or stale SDK ABI.
- Admin key compromise changes adapter, pause, or upgrade policy.

Mitigation: permissionless progression, funded monitoring thresholds, static deployment manifest, explorer links, retry-safe state transitions, optional keeper as convenience only, multisig roles, and written recovery runbooks.

### Section sources

- [Zama ACL](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl.md)
- [Zama reorg handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md)
- [Zama SDK security model](https://docs.zama.org/protocol/sdk/concepts/security-model.md)
- [Chainlink VRF security considerations](https://docs.chain.link/vrf/v2-5/security)
- [Confidential wrapper guide](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)

## 13. Participant and scalability analysis

### 13.1 Recommended MVP scale

**Recommendation:** 16 active participant slots per pool, one winner per epoch, one pool, and one asset.

Why:

- A 16-slot balanced scan has a plausible HCU margin based on published costs.
- It is large enough for a compelling live demo and privacy batching.
- It supports explicit snapshots and simple public slot inspection.
- It makes fixed-shape UX and tests realistic.
- It avoids pretending FHE currently supports arbitrary-scale weighted lotteries in one transaction.

### 13.2 Limits and complexity

| Item | 16 slots | 32 slots |
| --- | ---: | ---: |
| Balanced-prefix additions | ~30 | ~62 |
| Weight comparisons | 16 | 32 |
| Address selects | 16 | 32 |
| Estimated subtotal HCU | ~9.6M | ~18.9M |
| Risk | Plausible, unproven | Near global ceiling before overhead |

The system should still use an explicit constant and reject/queue new participants once full. A UI waitlist is acceptable; an onchain unbounded list is not.

### 13.3 Epoch behavior

- Deposits: accepted anytime but enter next-epoch weight.
- Draw snapshot: atomic fixed-size handle copy before VRF request.
- Withdrawals: allowed anytime; live principal changes independently of frozen snapshot.
- Joining/leaving: slot remains assigned while balance/pending/snapshot references exist.
- Prize: one encrypted amount and one public winner address per epoch.
- Batching: required for public yield deposits/redemptions, not for the 16-slot draw transaction.

### 13.4 If 16-slot draw fails

Fallback order:

1. Optimize prefix implementation and eliminate unnecessary persisted intermediate handles.
2. Reduce to eight slots while preserving the exact mechanism.
3. Split prefix construction and selection across transactions using immutable epoch intermediate state, carefully measuring state/ACL overhead.
4. Only then consider a different winner proof architecture.

Do not silently switch to offchain decryption or a trusted winner service.

### Section sources

- [Zama HCU documentation](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md)
- [Zama encrypted operations](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md)

## 14. System responsibilities

| Component | Why it exists | Data it sees | Trust / failure | Can MVP avoid it? |
| --- | --- | --- | --- | --- |
| Frontend | Encrypt inputs, explain state, invoke transactions/decryption | User-entered plaintext before encryption; locally revealed values | XSS or analytics can leak; app outage does not stop contracts | No |
| Wallet | Signs transactions and EIP-712 permits | Account, transaction intent, permit scope | Compromise loses account/privacy | No |
| Prize pool contract | Principal/weight/reserve accounting and draw state machine | Ciphertext handles; public slots/randomness/winner | Core correctness and ACL trust | No |
| ERC-7984 wrapper/token | Confidential custody and transfers | Encrypted balances/amounts; public wrap/unwrap | Wrapper policy, pause, upgrade, observers | No |
| Deposit/redeem batcher | Crosses confidential/public yield boundary in aggregates | Encrypted individual positions; public aggregate on dispatch | Small-batch privacy; route/callback liveness | Strongly recommended for real yield |
| FHEVM/coprocessor | Executes homomorphic operations | Ciphertexts, operation graph | Must execute correctly and stay available | No |
| Zama relayer/KMS | Encryption/decryption coordination and signed reveal | Ciphertexts, permits, transport keys; no plaintext under stated re-encryption model | Outage blocks reads/public finalization | No |
| Randomness provider | Supplies unpredictable public draw word | Public request/output | Funding/availability and request security | No; provider can vary |
| Public yield adapter | Generates yield and exposes standard accounting | Public aggregate assets/shares | Strategy and liquidity risk | No if organic yield required |
| Keeper/automation | Convenience progression | Public state only | Failure delays but must not control outcomes | Yes; anyone can call |
| Indexer | Fast historical UI and notifications | Public events/state only | Stale/missed data affects display only | Yes; direct RPC fallback |
| Backend proxy | Mainnet API-key protection or optional relayer proxy | Relayer traffic, metadata | Adds availability/privacy surface | Avoid on open Sepolia relayer |

### Recommended responsibility boundary

- Keep winner selection, finalization, accounting, and authorization onchain.
- Keep private plaintext in the browser only when the user explicitly enters or reveals it.
- Use no backend database as a source of truth.
- Make automation permissionless and stateless.
- Treat an indexer as cache, not authority.
- Do not let the yield adapter or wrapper admin choose draw inputs or winners.

### Section sources

- [Zama SDK security model](https://docs.zama.org/protocol/sdk/concepts/security-model.md)
- [Zama confidential batcher source](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-batcher/contracts/BatcherConfidentialUpgradeable.sol)
- [Zama Confidential Vault architecture](https://docs.zama.org/protocol/confidential-vault/concepts/architecture.md)
- [Chainlink VRF security considerations](https://docs.chain.link/vrf/v2-5/security)

## 15. Frontend and UX research

### 15.1 Primary journey

1. **Connect wallet:** verify Sepolia, supported wallet signing, SDK initialization, and correct deployment addresses.
2. **Enter pool:** explain the 16-slot cap, next-epoch maturity, public participant address, and privacy limits.
3. **Deposit:** encrypt amount locally, show wallet/proof progress, submit confidential transfer, then optionally reveal the new private position.
4. **Wait/earn:** show principal masked by default, eligibility epoch, public strategy health, and draw countdown.
5. **Draw occurs:** show frozen snapshot, VRF request/fulfillment, FHE computation, and reveal stages separately.
6. **Winner notification:** public winner address is shown; prize amount remains masked.
7. **Winner decrypts prize:** explicit permit/signature followed by decryption; no automatic prompt.
8. **Withdraw principal:** choose instant confidential liquidity or queued redemption status; never imply the user forfeits prize eligibility already earned for a frozen epoch.

### 15.2 Essential UI states

| Area | States that must be represented |
| --- | --- |
| SDK | loading WASM, single-thread fallback, ready, relayer unavailable, unsupported browser |
| Wallet | disconnected, wrong network, signature rejected, account changed, contract permit absent/expired |
| Deposit | editing, encrypting, proof generation, wallet confirmation, submitted, confirmed, callback accepted, encrypted zero/failed credit |
| Balance | masked, requesting permit, decrypting, revealed, stale after transaction, remasked, decryption failed |
| Eligibility | pending next epoch, eligible current epoch, frozen snapshot, withdrawn after snapshot |
| Yield | batching, public settlement pending, invested, strategy impaired, yield unavailable, sponsor-only demo source |
| Draw | open, closing, snapshot frozen, randomness requested, randomness fulfilled, computing FHE, reveal available, finalized, no funded entries, failed/timed out |
| Winner | not winner, public winner, prize private, permission propagating, decrypted, claimed/transferred |
| Withdrawal | instant available, queued, batch dispatched, public decryption pending, strategy withdrawal pending, claimable, complete, recoverable/canceled |

### 15.3 UX traps

- Wallet prompts caused by auto-mounted decrypt hooks.
- Calling a confirmed transaction a successful deposit before checking the actual encrypted credit.
- Treating “encrypted” as “anonymous.”
- Hiding the public nature of shielding, winner identity, and batch aggregates.
- Showing “0” when a ciphertext is merely unavailable/uninitialized.
- Combining VRF fulfillment, FHE draw, and public reveal into one fake loading state.
- Quoting an exact withdrawal settlement time when relayer/strategy calls are asynchronous.
- Showing an APY on Sepolia as economically meaningful.
- Losing the user's place when account/network changes during a multi-step operation.

### 15.4 Recommended communication patterns

- Mask by default; explicit “Reveal” button.
- Explain why a signature is needed and which contracts the permit covers.
- Use a persistent transaction/draw stepper with explorer links.
- Label public, encrypted, and locally decrypted values consistently.
- Show “private amount, public activity” near every deposit/withdraw action.
- Offer retry for offchain decryption without resubmitting onchain state changes.
- Distinguish “request accepted,” “funds claimable,” and “funds received.”

### Section sources

- [Zama SDK React example](https://github.com/zama-ai/sdk/tree/main/examples/react-wagmi)
- [Vault position explicit reveal example](https://github.com/zama-ai/sdk/blob/main/examples/react-wagmi/src/components/VaultPositionCard.tsx)
- [SDK security model](https://docs.zama.org/protocol/sdk/concepts/security-model.md)
- [Confidential Vault deposit guide](https://docs.zama.org/protocol/confidential-vault/guides/deposit.md)
- [Confidential Vault withdrawal guide](https://docs.zama.org/protocol/confidential-vault/guides/withdraw.md)

## 16. Production-quality interpretation

### 16.1 Required for a production-quality demo

#### Smart contracts

- Small, explicit contracts and state machines with one responsibility each.
- Immutable or tightly controlled configuration for asset, randomness provider, strategy, epoch duration, and slot cap.
- Safe encrypted math and accounting from actual transferred values.
- Permissionless progress/retry/claim/quit and terminal state guards.
- Pause that never blocks exits or recovery.
- Verified source and a versioned deployment manifest.

#### Security and tests

- Unit tests for every state transition and negative ACL case.
- Fuzz tests for deposit/withdraw/prize accounting.
- Invariants for solvency, no principal-to-prize leakage, weight≤principal, single winner, and no double claim.
- Exhaustive small-domain weighted-selection tests and statistical distribution tests.
- HCU/depth measurements in local FHE mode and Sepolia.
- Reentrancy, malformed proof, stale request, reorg policy, timeout, and dependency outage tests.
- External review before public value is encouraged.

#### Frontend

- SDK 3.4.0-current APIs, explicit reveal, no old tutorial calls.
- Transaction and decryption error recovery.
- Privacy boundary and strategy risk disclosure.
- Accessible masked values, keyboard/focus behavior, and mobile wallet testing.

#### Deployment and reproducibility

- Pinned lockfile and compiler/EVM settings.
- Environment template with no secrets.
- Deterministic or documented deployment order.
- Address/ABI manifest with chain ID and source commit.
- Contract verification and one-command read-only health check.
- Sepolia runbook for funding VRF and test assets.

#### Observability and failure recovery

- Events for public state transitions, never plaintext private amounts.
- Alerts for unfunded VRF, stuck batches/draws, strategy loss, and KMS/relayer failure.
- Permissionless scripts or UI buttons to progress each recoverable state.
- Public status page or in-app protocol-health card.

### 16.2 Nice to have

- Independent read-only indexer.
- Keeper reward from a small public operations budget.
- Timelocked multisig upgrade/admin.
- Formal specification of the weighted algorithm.
- Mainnet-fork tests for the future strategy, where feasible.
- Privacy-focused telemetry with no amounts/handles.

### 16.3 Real production concerns outside MVP

- Independent audits and formal verification.
- Governance/DAO registration of a wrapper.
- Mainnet relayer API-key proxy and service SLOs.
- Multiple KMS/coprocessor failure scenarios and protocol governance risk.
- Insurance, strategy diversification, regulatory analysis, sanctions/blocklist handling.
- Large-scale participant sharding and cross-pool liquidity.
- Account recovery and institutional custody.

### Section sources

- [Official FHEVM Hardhat template](https://github.com/zama-ai/fhevm-hardhat-template)
- [Current Zama SDK manifest](https://github.com/zama-ai/sdk/blob/main/packages/sdk/package.json)
- [Zama SDK security model](https://docs.zama.org/protocol/sdk/concepts/security-model.md)
- [Zama reorg handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md)

## 17. Competitive and reference analysis

### 17.1 Reference baselines

| Reference | Baseline expectation | Pattern worth taking | Mistake to avoid |
| --- | --- | --- | --- |
| PoolTogether V5 | Deposits, yield strategy, periodic draws, no-loss spirit, verifiable claims | Principal/yield separation, epochs, buffers, explicit failure modes | Importing the entire tier/TWAB/liquidation system |
| Zama Confidential Vault | Individual encrypted positions crossing to public ERC-4626 through aggregate batches | Batch lifecycle, permissionless settlement, quit/claim, public aggregate proof | Claiming aggregate privacy with singleton/correlated batches |
| Zama ERC-7984 wrapper | Standard confidential asset UX | Transfer-and-call, actual amount, async unwrap | Wrapping rebasing/fee tokens or broad observers |
| Chainlink VRF | Publicly verifiable randomness lifecycle | Request binding, confirmations, minimal callback | Re-requesting, accepting inputs after request, reverting callback |
| Aave V3 Sepolia | Real lending adapter target | Official USDT market and public strategy interface | Assuming non-zero test yield or wrapping rebasing aUSDT directly |

No official primary-source reference application inspected here implements this exact combination of encrypted weighted prize selection, public VRF, confidential prize ACL, and a public yield adapter. That is the core opportunity and the core risk.

### 17.2 Common mistakes likely to weaken submissions

- Encrypt deposits but select winners from public ticket counts.
- Use public randomness but decrypt every balance to select offchain.
- Call a KMS-authenticated reveal independently recomputable “proof” without qualification.
- Use `prevrandao` as the sole prize randomness.
- Announce a public fixed prize that makes “confidential winnings” trivially inferable.
- Ignore transfer clamping/actual amount and create ledger insolvency.
- Promise unlimited participants despite HCU limits.
- Build beautiful masked cards while leaking amounts in events or analytics.
- Use the idle Sepolia Confidential Vault and claim it generates yield.

### Section sources

- [PoolTogether V5 PrizeVault](https://github.com/GenerationSoftware/pt-v5-vault/blob/main/src/PrizeVault.sol)
- [PoolTogether V5 PrizePool](https://github.com/GenerationSoftware/pt-v5-prize-pool/blob/main/src/PrizePool.sol)
- [Zama Confidential Vault architecture](https://docs.zama.org/protocol/confidential-vault/concepts/architecture.md)
- [Zama confidential wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)
- [Chainlink VRF security considerations](https://docs.chain.link/vrf/v2-5/security)
- [Aave V3 Sepolia address book](https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3Sepolia.sol)

## 18. Product opportunity analysis

Scores are 1–10 per criterion. Weighted total is out of 100.

| Product interpretation | Alignment 25 | Feasibility 20 | Novelty 15 | Demo 15 | Production 10 | UX 10 | Scope 5 | Weighted total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **A. Private Weekly Savings Pool** — one stablecoin pool, 16 slots, one mature balance-weighted winner, full verification timeline | 9 | 8 | 8 | 9 | 8 | 9 | 8 | **85.0** |
| **B. Confidential Micro-Savings Circle** — small deposits, gentle cadence, safety-first messaging, same weighted draw | 9 | 8 | 7 | 8 | 8 | 9 | 9 | **82.5** |
| **C. Verifiable Private Draw Lab** — product centers on auditable VRF→FHE→KMS proof progression | 9 | 7 | 9 | 10 | 7 | 8 | 7 | **83.5** |
| **D. Multi-Strategy Private Prize Marketplace** — several assets/yield providers/pools | 9 | 4 | 9 | 9 | 6 | 8 | 3 | **73.0** |
| **E. Private Savings Clubs** — invite-based groups and social goals with encrypted balances | 8 | 6 | 9 | 9 | 6 | 9 | 5 | **76.5** |

### Findings

- **Strongest candidate:** A, Private Weekly Savings Pool.
- **Safest candidate:** B, because its restrained single-pool framing fits the same technical core and avoids extra protocol surface.
- **Most innovative candidate:** C, because it turns the exact cryptographic trust chain into the memorable product experience.
- **Most technically risky candidate:** D.
- **Best overall recommendation:** Build A's product with C's verification experience. Do not add clubs or multiple strategies until the core draw is proven.

This is a product-direction recommendation, not a frozen feature specification.

### Source basis

The opportunity scores synthesize the explicit bounty requirements (Section 2), measured Zama constraints (Sections 3 and 7), the inspected [PoolTogether PrizeVault](https://github.com/GenerationSoftware/pt-v5-vault/blob/main/src/PrizeVault.sol), and Zama's [Confidential Vault architecture](https://docs.zama.org/protocol/confidential-vault/concepts/architecture.md). They are judgments, not external judging criteria.

## 19. Differentiation analysis

### 19.1 Real differentiators

1. **A truthful public verification timeline:** show VRF, FHE computation, encrypted handle, KMS proof, and finalization without pretending balances are publicly recomputable.
2. **One-full-epoch balance maturity:** materially improves savings behavior and eliminates flash/last-minute weight capture.
3. **Confidential prize reserve and winner-only reveal:** the winner is public for verification, but the prize amount remains encrypted.
4. **Permissionless recovery:** any user can progress or recover draws and yield batches; no trusted winner backend.
5. **Privacy nutrition label:** clearly state amount privacy, aggregate leakage, metadata, shield/unshield visibility, and browser-key risks.
6. **Measured capacity:** publish actual HCU/depth benchmarks and enforce the evidenced slot cap.
7. **No-loss honesty:** disclose strategy loss and asynchronous liquidity instead of marketing an absolute guarantee.

### 19.2 Cosmetic differentiators

- Draw animations, confetti, gradients, glass cards, sound, mascots, themes, NFT badges.
- These may improve polish but do not compensate for an unproven draw or misleading privacy.

### 19.3 Dangerous differentiators

- Multiple prize tiers or multiple winners before single-winner correctness.
- Social graphs, teams, referrals, transferable tickets, or NFT positions.
- Cross-chain deposits/prizes.
- A custom VRF, MPC, or ZK proof system.
- Strategy routing, leverage, or yield optimization.
- Hidden admin rescue/decryption powers marketed as convenience.

### 19.4 Recommended differentiation budget

Pursue only:

1. Verification timeline.
2. One-epoch maturity and anti-timing economics.
3. Privacy/recovery UX with measured technical limits.

### Source basis

These differentiators follow from the gaps between PoolTogether's public [PrizePool](https://github.com/GenerationSoftware/pt-v5-prize-pool/blob/main/src/PrizePool.sol), Zama's [public-decryption model](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md), the [SDK security model](https://docs.zama.org/protocol/sdk/concepts/security-model.md), and the lack of an inspected official example combining them. They are product recommendations, not documented protocol features.

## 20. Technical spike plan

Architecture must remain conditional until the following spikes are complete. Ratings use 1 (low) to 5 (high). The spikes should be disposable validation code, not the production contracts or frontend.

| Rank | Risk | Impact | Uncertainty | Difficulty | Failure consequence | Spike | Success criteria | Failure fallback |
| ---: | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| **1** | The complete encrypted weighted draw exceeds Sepolia HCU or sequential-depth limits, or the proposed arithmetic is wrong | 5 | 5 | 5 | 5 | Implement only a minimal fixed-slot draw harness for 8 and 16 slots: widened multiply-high threshold, balanced prefix scan, first crossing, encrypted address select, zero-total case, public winner reveal | Exhaustive small-domain vectors match a plaintext oracle; statistical large-domain tests show no material bias; exactly one nonzero winner is selected; 16 slots complete on current Sepolia with measured global/depth HCU and operational margin | First optimize the scan; then use 8 slots. If neither works, investigate predesigned multi-transaction intermediates. Do **not** fall back to trusted offchain selection |
| **2** | The cUSDT-to-public-yield round trip is incompatible, insolvent, too slow, or produces no actual Sepolia yield | 5 | 5 | 4 | 5 | Build an isolated asset-route harness using current ERC-7984 transfer semantics, aggregate public decryption, unwrap/wrap, a non-rebasing ERC-4626 adapter, and Aave V3 Sepolia USDT | Actual encrypted amount received is conserved; a batch can enter and exit; principal reconciliation has no rounding deficit; a nonzero strategy return can be observed or deterministically evidenced from the real strategy; all deployed addresses are current | Try another credible live Sepolia ERC-4626 route. A sponsored-yield adapter may demonstrate accounting/UX only and must be labeled non-organic; it is not evidence that the bounty's yield requirement is solved |
| **3** | ACL or decryption semantics do not support winner-only prize reveal safely | 5 | 4 | 4 | 5 | Minimal harness from encrypted winner handle through public decryption proof, `FHE.checkSignatures`, finalization, and `FHE.allow(prize, winner)` | Correct proof finalizes once; winner user-decrypts prize; loser, admin, relayer, and arbitrary account cannot; stale/reordered handles and replayed proofs fail; confirmed-state policy survives a controlled reorg test | Keep the winner public but deliver the prize as an encrypted ERC-7984 transfer whose receiver access is established by token semantics; if loser exclusion still cannot be proved, stop the architecture |
| **4** | Current Chainlink VRF v2.5 configuration or callback behavior conflicts with the FHE draw lifecycle | 5 | 3 | 3 | 4 | Resolve current Sepolia coordinator/key hash/payment/funding data, deploy a request harness, bind request IDs, store callback output only, and exercise timeout/late fulfillment | Request and fulfillment work with current configuration; callback never performs heavy FHE work; out-of-order and duplicate callbacks are rejected; fulfilled randomness cannot be selectively discarded | Evaluate a rigorously specified alternative provider. Do not use `prevrandao` alone and do not use operator-controlled rerolls |
| **5** | Asynchronous strategy liquidity prevents credible “withdraw at any time” behavior or breaks encrypted conservation | 5 | 4 | 4 | 5 | Model and test encrypted withdrawal requests, aggregate settlement, strategy exit, re-shielding, and confidential claims under partial liquidity and failures | A user can request withdrawal in every epoch state; frozen draw weight remains well-defined; principal is deducted/escrowed exactly once; settlement is permissionless and retry-safe; solvency invariants hold through partial fills | Increase the confidential liquidity buffer and reduce invested fraction; if necessary make all exits queued with an explicit service objective. Never block exits merely because a draw is active |
| **6** | Aggregate public settlement leaks individual deposits/withdrawals in realistic 16-user usage | 4 | 4 | 2 | 3 | Run an event/timing correlation exercise for singleton, two-user, repeated-size, and delayed batches | The privacy label accurately describes leakage; production configuration has a minimum batch rule plus bounded timeout; the UI warns when a singleton/low-anonymity batch is dispatched | Accept and disclose aggregate leakage for the demo, or keep more assets in confidential custody. Do not claim amount anonymity across shielding/unshielding boundaries |
| **7** | Current SDK 3.4.0 wallet/permit/decryption flow is too brittle for a polished browser journey | 4 | 3 | 3 | 3 | Minimal browser harness for network configuration, encrypted input, ERC-7984 transfer, scoped permit, own-balance reveal, public result reveal, and error recovery | Works in two supported wallets; no automatic reveal occurs; account/network changes invalidate stale permits safely; errors are actionable; no private values enter logs or analytics | Use the lower-level relayer SDK only for a narrowly documented missing capability; do not mix obsolete tutorial APIs |

### 20.1 Go/no-go gates

The project may move to product definition after Spike 1 proves at least an 8-slot draw and Spike 3 proves the decryption/ACL chain. It may move to final architecture only after Spikes 1–5 pass with the exact intended Sepolia dependencies.

The following outcomes are hard stops rather than minor implementation issues:

- Neither 8 nor 16 fixed slots can complete the draw within current Sepolia limits.
- A non-winner or privileged operator can decrypt the prize.
- The only workable winner path requires plaintext balances offchain.
- No credible Sepolia yield route can conserve principal through entry and exit.
- Randomness can be rerolled or ignored after its output is knowable.

### Section sources

- [Zama HCU documentation](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md)
- [Zama encrypted operations](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md)
- [Zama ACL](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl.md)
- [Zama public decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Chainlink VRF security considerations](https://docs.chain.link/vrf/v2-5/security)
- [Zama Confidential Vault architecture](https://docs.zama.org/protocol/confidential-vault/concepts/architecture.md)

## 21. Ruthless MVP boundary

### 21.1 MUST HAVE

- One Sepolia pool and one six-decimal stablecoin-like confidential asset.
- A measured fixed cap of **8 or 16 active slots**, selected only after the draw spike; 16 is the target, not a promise.
- ERC-7984 confidential transfer-and-call deposit accounting from the actual transferred amount.
- Separate encrypted principal, pending next-epoch weight, mature eligible weight, and prize credit.
- One-full-epoch maturity and an immutable per-draw encrypted weight snapshot.
- One periodic winner, weighted by encrypted mature balances, selected entirely through FHE contract operations.
- Current Chainlink VRF v2.5 integration, frozen inputs before request, and no rerolls.
- Public winner reveal with onchain KMS-signature verification and exactly-once finalization.
- Winner-only decryption of an encrypted prize amount; negative ACL tests for everyone else.
- A real yield source or an explicitly unresolved blocker. A funded mock can support testing but cannot silently substitute for generated yield in the final claim.
- Principal withdrawal requests accepted in every draw state, with confidential accounting and a permissionless asynchronous settlement path if assets are invested.
- Zero-total, no-randomness, late-randomness, failed-draw, strategy-failure, and decryption-retry behavior.
- Public verification timeline, privacy nutrition label, strategy-risk disclosure, and explorer links.
- Unit, fuzz, invariant, selection-distribution, ACL-negative, local-FHE, and Sepolia integration tests.
- Pinned versions, verified source, deployment/address manifest, role disclosure, and recovery runbook.

### 21.2 SHOULD HAVE

- Confidential liquidity buffer so small withdrawals can settle sooner, provided its behavior does not create hidden insolvency.
- Minimum aggregate batch size plus maximum wait time, with a low-anonymity warning.
- Permissionless keeper calls and an optional small public progress incentive.
- Read-only draw/indexing service with direct-RPC fallback.
- Multisig plus timelock for mutable production-like roles; immutable configuration is preferable where practical.
- Published HCU/depth measurements and a machine-readable draw audit record.
- Mobile wallet and accessibility testing.

### 21.3 COULD HAVE

- A second demo cadence or read-only historical analytics.
- Notification opt-in that reveals no private amount.
- A formally written selection specification and property-based reference model.
- A small public operations-reserve dashboard.
- A clearly isolated sponsored-yield simulator for deterministic demos when the real Sepolia market is idle, shown side-by-side with—not substituted for—the real adapter status.

### 21.4 DO NOT BUILD

- Multiple assets, pools, yield strategies, prize tiers, or multiple winners.
- PoolTogether V5 TWAB, tiered prize pool, liquidation, draw auction, or cross-chain system.
- Unbounded participant arrays, encrypted binary-search theater, or claims of arbitrary scalability.
- A custom VRF, KMS, MPC network, or ZK proof system.
- A backend that chooses winners, decrypts balances, approves outcomes, or is required for withdrawals.
- Transferable tickets, NFTs, governance token, DAO, referrals, teams, clubs, chat, or social graph.
- Leverage, strategy optimization, automatic routing, insurance, bridge support, or mainnet deployment.
- Hidden admin observers or “recovery” roles with blanket ciphertext access.
- Prize animations or cosmetic work before all P0 state transitions and recovery paths work.

### Source basis

The MVP boundary is derived from the bounty brief plus the current [HCU limits](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md), [ERC-7984 wrapper constraints](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md), [VRF security guidance](https://docs.chain.link/vrf/v2-5/security), and [Confidential Vault batch lifecycle](https://docs.zama.org/protocol/confidential-vault/concepts/architecture.md).

## 22. Functional user and protocol flows

These are functional contracts between actors and system states, not a UI design or final contract API.

### 22.1 Deposit flow

| Field | Flow |
| --- | --- |
| Actor | User, wallet/browser SDK, ERC-7984 token, pool |
| Action | User enters an amount locally, encrypts it for the token/receiver context, and calls confidential transfer-and-call. The token invokes the pool callback with the **actual** encrypted amount transferred |
| Contract interaction | ERC-7984 operator/transfer proof validation → token transfer → receiver callback → encrypted principal and pending-next-epoch weight increase → persistent ACL restored for pool and depositor as required |
| Encrypted data | Requested amount, actual transferred amount, principal, pending weight, token balances |
| Publicly visible | User and contract addresses, transaction/timing/gas, slot membership or join event, epoch target, token relationship; no plaintext pool-deposit amount in calldata/events |
| Expected result | Principal is immediately withdrawable by request; weight matures only at the next full epoch boundary; UI may reveal the user's updated position only on explicit permit/decrypt |
| Failure states | Bad proof/context, expired operator approval, wrong network, token pause/blocklist, slot cap, callback failure/refund, transaction replacement/reorg, SDK/relayer error. UI rereads onchain state before retrying |

### 22.2 Withdraw flow

| Field | Flow |
| --- | --- |
| Actor | User, pool, withdrawal batcher, public strategy adapter, ERC-7984 wrapper/token |
| Action | User encrypts a requested amount. The pool computes the allowed amount against live encrypted principal without a secret-dependent revert, removes or escrows it once, and creates an encrypted withdrawal claim. The request is allowed during every draw state |
| Contract interaction | Encrypted request validation → safe encrypted debit of principal/pending eligibility → enqueue claim → aggregate public-decryption settlement → adapter withdrawal → re-shield into ERC-7984 → confidential claim transfer |
| Encrypted data | Requested/allowed amount, remaining principal, pending weight reduction, individual queue claim, final confidential transfer |
| Publicly visible | Request address/time/gas, batch membership and public aggregate at strategy boundary, strategy withdrawal and wrapper shield amount, claim address/time; individual value may be inferred from singleton/correlated batches |
| Expected result | User can initiate exit at any time; a liquid confidential buffer may settle part sooner, otherwise the amount becomes claimable after permissionless batch settlement. A snapshot already frozen for a completed savings epoch remains unchanged |
| Failure states | Amount above principal, strategy illiquidity/loss/pause, batch not full, public decryption outage, wrapper failure, partial return, claim transfer failure. State must permit retry/partial settlement/quit without double debit |

### 22.3 Draw flow

| Field | Flow |
| --- | --- |
| Actor | Any caller/automation, pool, VRF coordinator, FHEVM, Zama public-decryption service |
| Action | After epoch close, any caller freezes the public slot order and encrypted weight handles. The pool requests VRF. Fulfillment stores the word. Any caller then executes the fixed-shape FHE selection and later submits the public-decryption result/proof |
| Contract interaction | `Open → Frozen → RandomnessRequested → RandomReady → DrawComputed → RevealReady → Finalized` with immutable epoch/request bindings and exactly-once guards |
| Encrypted data | Weights, total, threshold, prefixes, crossings, winner handle, prize amount |
| Publicly visible | Epoch times/order, freeze/request/fulfillment transactions, VRF word, draw transaction, encrypted handles, revealed winner address, KMS proof verification/finalization status |
| Expected result | One public winner for nonzero total, or the zero-address/no-winner terminal outcome for zero total; prize reserve is credited exactly once and next epoch can open |
| Failure states | Freeze races, bad request binding, missing VRF, callback failure, HCU/depth revert, bad reveal proof, reorg, zero total. None permits an operator reroll |

### 22.4 Winner flow

| Field | Flow |
| --- | --- |
| Actor | Finalized winner, all observers, pool |
| Action | The winner address becomes public after proof-checked finalization. The pool grants only that address persistent access to the encrypted prize credit. The winner can inspect the public verification chain before revealing or claiming |
| Contract interaction | Verify clear winner against encrypted winner handle → terminalize draw → add encrypted prize credit/allowance → optional confidential claim transfer |
| Encrypted data | Prize amount and prize/token credit remain encrypted |
| Publicly visible | Winner identity, draw finalization, later claim transaction and recipient relationship; not the amount |
| Expected result | Winner can decrypt and claim; non-winners can verify the authenticated execution timeline but cannot decrypt the prize |
| Failure states | Winner wallet lost, address sanctioned/blocklisted by token policy, ACL grant failure, wrapper pause, user delays indefinitely. Prize-expiry policy must never let an admin decrypt it |

### 22.5 Prize decryption flow

| Field | Flow |
| --- | --- |
| Actor | Winner's browser/wallet, SDK/relayer/KMS, pool |
| Action | Winner explicitly selects Reveal, signs a narrowly scoped permit for the pool/handle, and asks the SDK to user-decrypt. Plaintext is returned to the user's client, not written onchain |
| Contract interaction | Usually no state-changing transaction for reveal; read ciphertext handle and validate permit/ACL through the current SDK flow. Claim remains a separate confidential onchain action |
| Encrypted data | Prize handle in state and transport-key re-encryption response |
| Publicly visible | Existing winner ACL relationship and offchain request metadata; no plaintext amount unless the user or compromised client publishes it |
| Expected result | Only the winner sees the prize amount locally; masked state remains default after reload until another explicit reveal |
| Failure states | Stale permit, wrong chain/contract, KMS/relayer outage, account switch, browser-key loss, XSS, user rejection. Retry offchain; never recompute the draw or resubmit prize state |

### 22.6 Failed transaction flow

| Field | Flow |
| --- | --- |
| Actor | User/caller, wallet, frontend, affected contract |
| Action | UI preserves the intended action locally, waits for a terminal receipt, decodes the public error where safe, and rereads contract state before offering retry |
| Contract interaction | No assumed state change after revert; for replacement/reorg, reconcile nonce and canonical receipt; retry uses request IDs/idempotency guards where applicable |
| Encrypted data | Original plaintext remains only in the user's client; a fresh proof may be required because context/nonce changed |
| Publicly visible | Reverted or replaced transaction, sender, gas, called function selector; revert design must not expose secret comparisons |
| Expected result | User learns whether nothing happened, the action already succeeded, or a fresh encryption/signature is needed |
| Failure states | Blind duplicate deposit/request, stale ciphertext proof, misleading “success” after wallet submission, leaked plaintext logs. These are frontend test cases, not generic toasts |

### 22.7 Failed draw flow

| Field | Flow |
| --- | --- |
| Actor | Any caller, pool, monitoring/automation |
| Action | If FHE execution reverts, the epoch remains bound to the same snapshot and VRF word. Anyone may retry the same predesigned path. After an objective timeout, a one-way abandonment can roll the prize forward and permanently reject late finalization |
| Contract interaction | `RandomReady` is unchanged by a revert; optional predesigned multi-step computation records immutable intermediates; `Abandoned` is terminal and disallows award/re-request |
| Encrypted data | Snapshot and any valid persisted intermediates remain encrypted |
| Publicly visible | Failed transaction/gas, retries, timeout, terminal abandonment and rollover |
| Expected result | No alternative random word, no partial/double winner, and no trapped principal |
| Failure states | Deterministic HCU failure, malformed operation graph, state corruption in a multi-step design, selective operator delay. Repeated failure triggers the slot-cap/design fallback before production |

### 22.8 Randomness failure flow

| Field | Flow |
| --- | --- |
| Actor | VRF coordinator, any caller, pool |
| Action | Request remains pending until fulfillment or a fixed timeout. The system never re-requests for the same award. On timeout, anyone terminally abandons that epoch and rolls its prize forward; a late callback is recorded/rejected without reopening it |
| Contract interaction | `RandomnessRequested → RandomReady` on the bound callback, or `RandomnessRequested → Abandoned` after deadline |
| Encrypted data | Frozen weights remain encrypted and are not reused with alternate entropy |
| Publicly visible | Request ID, funding, elapsed time, callback or timeout transaction |
| Expected result | Availability failure causes delay/rollover, never an operator-selected reroll |
| Failure states | Underfunding, wrong coordinator/key hash, callback gas error, coordinator outage, reorg, late delivery. Monitoring warns before requests when funding is low |

### 22.9 Decryption failure flow

| Field | Flow |
| --- | --- |
| Actor | Public-decryption submitter or winner, SDK/relayer/KMS, pool |
| Action | For public winner reveal, anyone retries retrieval/submission against the same immutable handle. For winner prize reveal, only the winner retries offchain with a fresh scoped permit |
| Contract interaction | Public proof submission is replay-protected and order-bound; failed proof leaves `RevealReady` unchanged. User reveal does not mutate draw state |
| Encrypted data | Winner/prize handles never change merely because a service request failed |
| Publicly visible | Public proof-submission failures and final success; private user-decrypt transport timing may be observable to service operators |
| Expected result | Service outage delays visibility but cannot change winner or amount |
| Failure states | Bad signature/proof, reordered handles, stale permit, reorg, relayer/KMS outage. Objective public-reveal timeout may roll over only if specified before randomness; finalized winner prizes do not expire merely because user decryption is unavailable |

### Section sources

- [Zama encrypted-input guide](https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs.md)
- [Zama SDK permit model](https://docs.zama.org/protocol/sdk/concepts/permit-model.md)
- [Zama public decryption](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md)
- [Zama Confidential Vault deposit guide](https://docs.zama.org/protocol/confidential-vault/guides/deposit.md)
- [Zama Confidential Vault withdrawal guide](https://docs.zama.org/protocol/confidential-vault/guides/withdraw.md)
- [Chainlink VRF security considerations](https://docs.chain.link/vrf/v2-5/security)

## 23. Architectural options — investigation, not final architecture

All options retain the same conditional draw core: fixed slots, encrypted weights, public VRF, FHE selection, public winner, and winner-only encrypted prize. They differ at the confidential/public yield boundary.

### 23.1 Option A — modular confidential pool plus aggregate strategy batcher

```text
User wallet + Zama SDK
          |
          | confidential ERC-7984 transfer / reveal permit
          v
  +--------------------+       public VRF       +------------------+
  | Confidential Pool  |<---------------------->| Chainlink VRF     |
  | principal/weights  |                        +------------------+
  | draw/prize ACL     |
  +---------+----------+
            | encrypted deposit / withdrawal batches
            v
  +--------------------+   public aggregate   +-------------------+
  | Zama-style Batcher |<-------------------->| ERC-20/4626       |
  | retry/quit/claim   |                      | Aave USDT adapter |
  +---------+----------+                      +---------+---------+
            | confidential wrap/claim                   |
            v                                           v
       ERC-7984 cUSDT                              Aave V3 Sepolia

FHEVM executes encrypted accounting/draw; Zama KMS authenticates reveals.
```

| Dimension | Assessment |
| --- | --- |
| Responsibilities | Pool owns encrypted liabilities and draw; batcher owns async boundary/recovery; adapter owns only public strategy interactions; wrapper owns confidential token transfers |
| Trust assumptions | Ethereum + deployed code, Zama FHEVM/KMS/relayer, Chainlink VRF, wrapper governance/policy, Aave and adapter, any explicit admin/timelock |
| Privacy | Individual pool values encrypted; public aggregate entry/exit, addresses, timing, slot membership, and winner leak. Batching can reduce but not eliminate correlation |
| Complexity | Highest component count, but each state machine has a narrow responsibility and matches inspected Zama patterns |
| Scalability | Draw fixed at measured 8/16 slots; yield settlement can batch across those users |
| Gas/HCU | Highest transaction count; draw HCU unchanged; public strategy gas amortized by batching |
| Implementation risk | Medium-high overall; risk is explicit and separable. Strongest recovery/testing story |
| Deployment | ERC-7984 asset/wrapper, pool, batcher, ERC-4626 adapter, VRF consumer/config, roles/monitoring |
| Pros | Best separation of concerns; conceptually reuses official batcher; replaceable strategy; permissionless recovery; clearest production narrative |
| Cons | More async UX and contracts; aggregate leakage; difficult accounting across failures; depends on real Sepolia yield |

**Assessment:** strongest production-oriented option if Spikes 1–5 pass.

### 23.2 Option B — integrated epoch pool and net-settlement controller

```text
User + SDK --> ERC-7984 cUSDT --> +--------------------------------+
                                  | Integrated Confidential Pool   |
Chainlink VRF -------------------> | ledger + epochs + draw +       |
Zama FHEVM/KMS <-----------------> | aggregate route + withdrawal  |
                                  +---------------+----------------+
                                                  |
                                        public net amount per epoch
                                                  v
                                      ERC-4626 Aave USDT adapter
```

| Dimension | Assessment |
| --- | --- |
| Responsibilities | One main contract controls encrypted accounting, draw, aggregate dispatch, public strategy position, redemptions, and claims |
| Trust assumptions | Same external systems as Option A; fewer deployed admin surfaces but a much larger core contract |
| Privacy | Similar aggregate leakage; fixed epoch netting may make correlations easier because dispatch times are predictable |
| Complexity | Fewer contracts and approvals, but one coupled state machine with more cross-feature invariants |
| Scalability | Fixed draw slots; one net strategy action per epoch is efficient for 8/16 users |
| Gas/HCU | Fewer cross-contract calls; same core FHE cost; failed settlement can block unrelated transitions if separation is poor |
| Implementation risk | High concentration risk. Easier demo deployment, harder review, upgrade, and recovery |
| Deployment | cUSDT/wrapper, integrated pool/controller, adapter, VRF configuration |
| Pros | Small deployment graph; fewer callback interfaces; easier end-to-end demo narration |
| Cons | Accounting/draw/yield failures become entangled; larger audit surface; strategy replacement and partial failure are dangerous |

**Assessment:** viable for a deliberately small proof-of-concept, but weaker than Option A for “production-ready architecture.” It should not be selected merely to reduce file count.

### 23.3 Option C — confidential wrapper around a non-rebasing yield-share token

```text
Public USDT --> ERC-4626 Aave adapter --> public fixed-supply shares
                                                |
                                                | shield/wrap
                                                v
User + SDK ------------------------------> confidential cShares
                                                |
                                                v
                                      Confidential Prize Pool
                                      weights in encrypted shares
                                                |
                           aggregate excess-share redeem / prize funding
                                                v
                                      public adapter + re-shield
```

| Dimension | Assessment |
| --- | --- |
| Responsibilities | Adapter produces a non-rebasing ERC-20 share; its shares are wrapped confidentially; pool accounts in encrypted shares and periodically realizes exchange-rate gain |
| Trust assumptions | Same FHE/VRF/strategy trusts plus correctness of share-price accounting and wrapper compatibility |
| Privacy | Pool transfer amount is confidential, but each user's public USDT-to-share deposit and share shielding amount are visible and easily correlated unless another batching layer is added |
| Complexity | Fewer pool-to-strategy deposit batches, but principal denomination, yield extraction, rounding, and loss semantics become harder |
| Scalability | Fixed draw slots; share-price operations are public, draw still bounded |
| Gas/HCU | Potentially fewer strategy entry calls; no reduction in draw HCU; public shield/unshield remains |
| Implementation risk | Highest economic/accounting risk and weakest deposit privacy. ERC-7984 wrapper compatibility requires non-rebasing, non-fee, supported-decimal shares |
| Deployment | ERC-4626 Aave adapter/share, its ERC-7984 wrapper, confidential pool, prize realization route, VRF configuration |
| Pros | Yield accrues naturally in a public exchange rate; strategy position token is conceptually modular |
| Cons | Public precursor reveals user amounts; “principal” becomes ambiguous between assets and shares; extracting only yield without undercollateralizing encrypted liabilities is subtle |

**Assessment:** technically plausible but not preferred. It is useful as a fallback research direction only if aggregate cUSDT routing fails and an accounting spike proves asset-denominated principal precisely.

### 23.4 Conditional recommendation

Choose **Option A** only after the fixed-slot draw, ACL chain, VRF, and real-yield round trip pass. Keep the adapter interface narrow enough that an Aave-specific failure does not require changing confidential accounting or draw logic.

If 16 slots fail but 8 passes, use Option A with eight slots and present the measured limitation honestly. If the aggregate strategy path fails while Option C proves precise asset-denominated solvency and acceptable privacy, reconsider Option C. Option B is a schedule fallback, not the quality target.

No option is frozen during this research phase.

### Section sources

- [Zama BatcherConfidentialUpgradeable source](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-batcher/contracts/BatcherConfidentialUpgradeable.sol)
- [Zama ERC-7984 wrapper documentation](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md)
- [Zama Confidential Vault architecture](https://docs.zama.org/protocol/confidential-vault/concepts/architecture.md)
- [ERC-4626 Tokenized Vault Standard](https://eips.ethereum.org/EIPS/eip-4626)
- [Aave V3 Sepolia address book](https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3Sepolia.sol)

## 24. Final executive recommendation

### Recommended Product Direction

Build a **Private Weekly Savings Pool** with the draw-verification experience of a “Verifiable Private Draw Lab”: one confidential stablecoin pool, one measured 8-or-16-user active set, one balance-weighted winner per epoch, full principal exit requests at all times, and a public timeline that explains exactly which parts are public, encrypted, authenticated, and locally revealed.

### Recommended Technical Direction

Conditionally pursue Option A: ERC-7984 confidential deposits and claims; distinct encrypted principal/pending/eligible/prize ledgers; one-full-epoch maturity; Zama-style aggregate conversion into a non-rebasing public ERC-4626/Aave adapter; Chainlink VRF v2.5; fixed-shape FHE weighted selection; public decryption of only the winner address; and winner-only access to the encrypted prize.

Use `@fhevm/solidity 0.11.1`, the current Hardhat plugin/template workflow, and Zama SDK/React SDK 3.4.0-era APIs as the researched baseline. Re-check manifests and network addresses immediately before implementation because the deadline is still weeks away and these packages are evolving.

### Biggest Unknown

Whether the full fixed-slot draw—including real ACL and reveal preparation—can execute within current Sepolia global and sequential HCU limits. Arithmetic primitives exist; end-to-end feasibility is not yet established.

### Highest-Priority Spike

Implement the disposable 8/16-slot draw harness first. Verify exact weighted outputs against a plaintext oracle, measure HCU/depth on Sepolia, test zero-total and overflow boundaries, and complete the public-winner proof chain. This result determines participant cap and whether the core bounty interpretation is viable.

### Scope

Keep out multiple assets/strategies/pools, PoolTogether V5 protocol machinery, multiple prizes, unbounded participants, custom cryptography, transferable tickets, governance/social layers, cross-chain support, and a trusted backend. Keep sponsored test yield isolated and honestly labeled.

### Differentiation

The 1–3 differentiators worth funding are:

1. A truthful public VRF → frozen encrypted weights → FHE computation → KMS-authenticated reveal timeline.
2. One-full-epoch maturity with principal exits never blocked by draw state.
3. A privacy/recovery UX that states aggregate and metadata leakage and exposes permissionless recovery.

### Main Risks

1. Draw global/depth HCU failure.
2. Incorrect weighted-selection arithmetic, overflow, or off-by-one behavior.
3. ACL misconfiguration exposing prize/balance ciphertexts.
4. Real Sepolia yield absence or Aave/wrapper incompatibility.
5. Asynchronous withdrawal liquidity and insolvency/accounting errors.
6. VRF funding, callback, reorg, or selective-timeout mistakes.
7. KMS/relayer/public-decryption outage or proof-order errors.
8. Singleton batch and transaction-metadata deanonymization.
9. Admin/wrapper/adapter upgrade or blocklist trust.
10. SDK/API drift before deployment and stale tutorial usage.

### Confidence

**MEDIUM.** Current official primitives support each individual operation, current source demonstrates confidential token/batcher/ACL patterns, and public VRF is a credible entropy source. Confidence is not high because no inspected primary-source application combines these pieces into an encrypted weighted draw, the estimated 16-slot HCU margin is unmeasured, and the real Sepolia yield/withdrawal route is unresolved.

### Implementation decision

**DO NOT IMPLEMENT YET.** Complete at least Spikes 1–5 before freezing architecture; run Spike 1 first.

### Source basis

This recommendation synthesizes the sources cataloged below. The baseline versions come from the official [Hardhat template manifest](https://github.com/zama-ai/fhevm-hardhat-template/blob/main/package.json) and [SDK manifest](https://github.com/zama-ai/sdk/blob/main/packages/sdk/package.json); the conditional wording is driven by the [HCU documentation](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md), inspected [batcher source](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-batcher/contracts/BatcherConfidentialUpgradeable.sol), and current [Aave Sepolia address book](https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3Sepolia.sol).

## 25. Final research self-review

| Review question | Result | Evidence in this dossier |
| --- | --- | --- |
| Every explicit bounty requirement captured? | **YES** | Sections 2.1 and 2.6 separate mandatory text from interpretation |
| Current Zama stack and versions verified? | **YES, as of 2026-08-16** | Sections 3 and 4 cite manifests, current commits, APIs, ACL, tooling, SDK, and limits |
| Encrypted weighted winner selection deeply investigated? | **YES, conditionally feasible** | Section 7 gives exact arithmetic, scan, HCU estimate, alternatives, and failure modes |
| Credible randomness model identified? | **YES, configuration still needs spike** | Section 8 recommends bound Chainlink VRF v2.5 and rejects insecure rerolls/block randomness |
| “Publicly verifiable” defined precisely? | **YES** | Section 9 states what observers can and cannot independently verify |
| Metadata leakage analyzed? | **YES** | Sections 10–11 cover ACL and value-versus-metadata confidentiality |
| Security and operational failures mapped? | **YES** | Sections 12 and 22 cover contract, FHE, economic, keeper, VRF, strategy, and decryption failures |
| Participant limits and epoch behavior identified? | **YES, cap unproven** | Sections 7.4 and 13 recommend measured 8/16 slots and reject 32 without evidence |
| Product opportunity and memorability analyzed? | **YES** | Sections 17–19 score five directions and prioritize three real differentiators |
| Realistic MVP boundary defined? | **YES** | Section 21 contains MUST/SHOULD/COULD/DO NOT BUILD |
| Highest-risk assumptions converted into spikes? | **YES** | Section 20 ranks seven spikes with measurable success and fallback criteria |
| Another engineer can verify claims? | **YES, subject to mutable network state** | The `Sources` section catalogs primary sources, commits/versions, paths, and supported claims |

Remaining uncertainty is intentionally visible rather than converted into a false architecture decision.

# Sources

Source dates below are either the inspected repository commit date or the research access date. Live documentation and network configuration can change; the implementation phase must re-check them immediately before deployment. A source supports only the claim described in its row, not every conclusion in this dossier.

## Zama

| Title | URL | What it supports | Date/version |
| --- | --- | --- | --- |
| FHEVM Solidity: Supported encrypted types | [docs.zama.org/protocol/solidity-guides/smart-contract/types](https://docs.zama.org/protocol/solidity-guides/smart-contract/types.md) | `euint*`, `ebool`, `eaddress`, handle model, supported widths | Current docs, accessed 2026-08-16 |
| FHEVM Solidity: Encrypted operations | [docs.zama.org/protocol/solidity-guides/smart-contract/operations](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations.md) | Arithmetic, comparisons, casts, `FHE.select`, encrypted operation constraints | Current docs, accessed 2026-08-16 |
| FHEVM Solidity: Encrypted inputs | [docs.zama.org/protocol/solidity-guides/smart-contract/inputs](https://docs.zama.org/protocol/solidity-guides/smart-contract/inputs.md) | `externalEuintX`, input proofs, `FHE.fromExternal`, sender/contract binding | Current docs, accessed 2026-08-16 |
| FHEVM Solidity: ACL | [docs.zama.org/protocol/solidity-guides/smart-contract/acl](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl.md) | `allow`, `allowThis`, user/public permissions and ciphertext access | Current docs, accessed 2026-08-16 |
| FHEVM Solidity: Reorg handling | [docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling](https://docs.zama.org/protocol/solidity-guides/smart-contract/acl/reorgs_handling.md) | ACL/reorg operational considerations | Current docs, accessed 2026-08-16 |
| FHEVM Solidity: Public decryption/oracle | [docs.zama.org/protocol/solidity-guides/smart-contract/oracle](https://docs.zama.org/protocol/solidity-guides/smart-contract/oracle.md) | Public reveal flow, clear values, signatures, `FHE.checkSignatures` | Current docs, accessed 2026-08-16 |
| FHEVM Solidity: HCU | [docs.zama.org/protocol/solidity-guides/development-guide/hcu](https://docs.zama.org/protocol/solidity-guides/development-guide/hcu.md) | Homomorphic computation unit costs, global/depth budgeting | Current docs, accessed 2026-08-16 |
| FHEVM Solidity: Random encrypted values | [docs.zama.org/protocol/solidity-guides/smart-contract/operations/random](https://docs.zama.org/protocol/solidity-guides/smart-contract/operations/random.md) | `FHE.randEuint*` capability and bounds/ACL considerations | Current docs, accessed 2026-08-16 |
| FHEVM Solidity: Hardhat development guide | [docs.zama.org/protocol/solidity-guides/development-guide/hardhat](https://docs.zama.org/protocol/solidity-guides/development-guide/hardhat.md) | Current Hardhat workflow and plugin expectations | Current docs, accessed 2026-08-16 |
| FHEVM Solidity: Foundry development guide | [docs.zama.org/protocol/solidity-guides/development-guide/foundry](https://docs.zama.org/protocol/solidity-guides/development-guide/foundry.md) | Foundry compatibility and workflow constraints | Current docs, accessed 2026-08-16 |
| Zama SDK configuration | [docs.zama.org/protocol/sdk/guides/configuration](https://docs.zama.org/protocol/sdk/guides/configuration.md) | SDK network/provider configuration and current integration model | Current docs, accessed 2026-08-16 |
| Zama SDK security model | [docs.zama.org/protocol/sdk/concepts/security-model](https://docs.zama.org/protocol/sdk/concepts/security-model.md) | Browser/relayer/KMS trust, user decryption and key handling | Current docs, accessed 2026-08-16 |
| Zama SDK permit model | [docs.zama.org/protocol/sdk/concepts/permit-model](https://docs.zama.org/protocol/sdk/concepts/permit-model.md) | Scoped decryption permits and authorization boundaries | Current docs, accessed 2026-08-16 |
| FHEVM Hardhat template manifest | [github.com/zama-ai/fhevm-hardhat-template/package.json](https://github.com/zama-ai/fhevm-hardhat-template/blob/main/package.json) | Verified package versions, Solidity/EVM and Node baseline | Commit `ec84e1a`, 2026-05-04 |
| FHEVM Hardhat template `FHECounter.sol` | [github.com/zama-ai/fhevm-hardhat-template/contracts/FHECounter.sol](https://github.com/zama-ai/fhevm-hardhat-template/blob/main/contracts/FHECounter.sol) | Minimal `fromExternal`, encrypted state, `allowThis`, test pattern | Commit `ec84e1a`, 2026-05-04 |
| Zama SDK package manifest | [github.com/zama-ai/sdk/packages/sdk/package.json](https://github.com/zama-ai/sdk/blob/main/packages/sdk/package.json) | High-level SDK version and dependency baseline | Commit `03b1d7e`, 2026-07-30; SDK `3.4.0` |
| Zama SDK React/wagmi example | [github.com/zama-ai/sdk/examples/react-wagmi](https://github.com/zama-ai/sdk/tree/main/examples/react-wagmi) | Current wallet, React, permit and explicit reveal integration patterns | Commit `03b1d7e`, 2026-07-30 |
| `VaultPositionCard.tsx` | [github.com/zama-ai/sdk/examples/react-wagmi/src/components/VaultPositionCard.tsx](https://github.com/zama-ai/sdk/blob/main/examples/react-wagmi/src/components/VaultPositionCard.tsx) | Masked values, explicit reveal, transaction/decryption error UX | Commit `03b1d7e`, 2026-07-30 |
| Protocol Apps: `BatcherConfidentialUpgradeable.sol` | [github.com/zama-ai/protocol-apps/.../BatcherConfidentialUpgradeable.sol](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-batcher/contracts/BatcherConfidentialUpgradeable.sol) | Aggregate encrypted deposits, public settlement, permissionless dispatch/claim/quit | Commit `aa77db0`, 2026-08-07 |
| Protocol Apps: confidential batcher directory | [github.com/zama-ai/protocol-apps/confidential-batcher](https://github.com/zama-ai/protocol-apps/tree/main/contracts/confidential-batcher) | Related interfaces, tests, scripts and state-machine patterns | Commit `aa77db0`, 2026-08-07 |
| Protocol Apps: `ConfidentialWrapper.sol` | [github.com/zama-ai/protocol-apps/.../ConfidentialWrapper.sol](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-wrapper/contracts/ConfidentialWrapper.sol) | Wrapper policy, observers, pause/blocklist/upgrade and asynchronous unwrap behavior | Commit `aa77db0`, 2026-08-07 |
| Protocol Apps: `ERC7984Upgradeable.sol` | [github.com/zama-ai/protocol-apps/.../ERC7984Upgradeable.sol](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-wrapper/contracts/token/ERC7984Upgradeable.sol) | Confidential token balance/transfer/operator/receiver semantics and actual amount handling | Commit `aa77db0`, 2026-08-07 |
| Protocol Apps: `ERC7984ERC20WrapperUpgradeable.sol` | [github.com/zama-ai/protocol-apps/.../ERC7984ERC20WrapperUpgradeable.sol](https://github.com/zama-ai/protocol-apps/blob/main/contracts/confidential-wrapper/contracts/extensions/ERC7984ERC20WrapperUpgradeable.sol) | Public wrap, confidential transfer, public-decryption unwrap and supported asset limitations | Commit `aa77db0`, 2026-08-07 |
| Protocol Apps: confidential wrapper guide | [docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper](https://docs.zama.org/protocol/protocol-apps/confidential-tokens/confidential-wrapper.md) | ERC-7984 wrapper behavior, callback/refund and policy caveats | Current docs, accessed 2026-08-16 |
| Zama Sepolia protocol-app addresses | [docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia](https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia.md) | Current cUSDTMock/cUSDCMock/wrapper registry addresses and testnet labels | Current docs, accessed 2026-08-16 |
| Confidential Vault architecture | [docs.zama.org/protocol/confidential-vault/concepts/architecture](https://docs.zama.org/protocol/confidential-vault/concepts/architecture.md) | Confidential-to-public aggregate boundary and batch lifecycle | Current docs, accessed 2026-08-16 |
| Confidential Vault confidentiality | [docs.zama.org/protocol/confidential-vault/concepts/confidentiality](https://docs.zama.org/protocol/confidential-vault/concepts/confidentiality.md) | What aggregate batching hides and what it reveals | Current docs, accessed 2026-08-16 |
| Confidential Vault deposit guide | [docs.zama.org/protocol/confidential-vault/guides/deposit](https://docs.zama.org/protocol/confidential-vault/guides/deposit.md) | Deposit/dispatch/claim lifecycle and user expectations | Current docs, accessed 2026-08-16 |
| Confidential Vault withdrawal guide | [docs.zama.org/protocol/confidential-vault/guides/withdraw](https://docs.zama.org/protocol/confidential-vault/guides/withdraw.md) | Async withdrawal, batching, quit/recovery behavior | Current docs, accessed 2026-08-16 |
| Confidential Vault testnet addresses | [docs.zama.org/protocol/confidential-vault/reference/addresses](https://docs.zama.org/protocol/confidential-vault/reference/addresses.md) | Sepolia vault deployments and current testnet status | Current docs, accessed 2026-08-16 |

## PoolTogether

| Title | URL | What it supports | Date/version |
| --- | --- | --- | --- |
| PoolTogether V5 `PrizeVault.sol` | [github.com/GenerationSoftware/pt-v5-vault/src/PrizeVault.sol](https://github.com/GenerationSoftware/pt-v5-vault/blob/main/src/PrizeVault.sol) | Principal-preserving vault boundary, yield buffer and strategy accounting concepts | Inspected checkout commit `b8226ab`, 2025-07-30 |
| PoolTogether V5 `PrizePool.sol` | [github.com/GenerationSoftware/pt-v5-prize-pool/src/PrizePool.sol](https://github.com/GenerationSoftware/pt-v5-prize-pool/blob/main/src/PrizePool.sol) | Draw lifecycle, prizes, claims, accounting and state-transition concepts | Inspected checkout commit `fedd70f`, 2025-02-19 |
| PoolTogether V5 `TwabERC20.sol` | [github.com/GenerationSoftware/pt-v5-vault/src/TwabERC20.sol](https://github.com/GenerationSoftware/pt-v5-vault/blob/main/src/TwabERC20.sol) | Time-weighted balance concept; not imported directly because balances must remain encrypted | Inspected checkout commit `b8226ab`, 2025-07-30 |
| PoolTogether V5 Chainlink VRF adapter | [github.com/GenerationSoftware/pt-v5-chainlink-vrf-v2-direct/src/ChainlinkVRFV2Direct.sol](https://github.com/GenerationSoftware/pt-v5-chainlink-vrf-v2-direct/blob/main/src/ChainlinkVRFV2Direct.sol) | Request/fulfillment adapter boundary and outcome-binding pattern | Inspected checkout commit `dc020dca`, 2024-02-15 |
| PoolTogether V5 RNG contracts | [github.com/GenerationSoftware/pt-v5-rng-contracts](https://github.com/GenerationSoftware/pt-v5-rng-contracts) | RNG interface/consumer separation and operational patterns | Inspected checkout commit `9625fae`, 2024-02-15 |
| PoolTogether V5 winners package | [github.com/GenerationSoftware/pt-v5-winners](https://github.com/GenerationSoftware/pt-v5-winners) | Winner calculation/claiming reference context; not a confidential winner implementation | Inspected checkout commit `6a16853`, 2026-06-25 |

## Ethereum

| Title | URL | What it supports | Date/version |
| --- | --- | --- | --- |
| ERC-4626: Tokenized Vault Standard | [eips.ethereum.org/EIPS/eip-4626](https://eips.ethereum.org/EIPS/eip-4626) | Public adapter interface, assets/shares, preview/deposit/withdraw semantics | Final EIP, accessed 2026-08-16 |
| EIP-4399: `PREVRANDAO` | [eips.ethereum.org/EIPS/eip-4399](https://eips.ethereum.org/EIPS/eip-4399) | Native beacon randomness exposure and its protocol context | Final EIP, accessed 2026-08-16 |
| EIP-4788: Beacon Block Root in the EVM | [eips.ethereum.org/EIPS/eip-4788](https://eips.ethereum.org/EIPS/eip-4788) | Beacon-root availability and timing considerations | Final EIP, accessed 2026-08-16 |

## OpenZeppelin

| Title | URL | What it supports | Date/version |
| --- | --- | --- | --- |
| OpenZeppelin Confidential Contracts | [github.com/OpenZeppelin/openzeppelin-confidential-contracts/tree/v0.4.0](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts/tree/v0.4.0) | ERC-7984 interfaces and confidential finance primitives used by current Zama applications | `v0.4.0`, inspected/current dependency baseline |

## Other technical references

| Title | URL | What it supports | Date/version |
| --- | --- | --- | --- |
| Chainlink VRF v2.5 supported networks | [docs.chain.link/vrf/v2-5/supported-networks](https://docs.chain.link/vrf/v2-5/supported-networks) | Current network/coordinator/key-hash/payment lookup requirement; addresses must be refreshed before deployment | Current docs, accessed 2026-08-16 |
| Chainlink VRF v2.5 security considerations | [docs.chain.link/vrf/v2-5/security](https://docs.chain.link/vrf/v2-5/security) | Freeze-before-request, request ID binding, confirmation/reorg, callback and reroll guidance | Current docs, accessed 2026-08-16 |
| Aave V3 Sepolia address book | [github.com/bgd-labs/aave-address-book/src/AaveV3Sepolia.sol](https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3Sepolia.sol) | Sepolia Pool, USDT underlying, aUSDT, decimals and related market addresses | `v4.65.5`, commit `70e2f30`, 2026-08-08 |
| Aave V3 developer Pool reference | [aave.com/docs/developers/smart-contracts/pool](https://aave.com/docs/developers/smart-contracts/pool) | Public supply/withdraw interaction model for a strategy adapter | Current docs, accessed 2026-08-16 |

## Source-use notes

- Official source code was preferred over tutorial prose when the two could differ.
- The checked-out `fhevm-solidity` repository was older than the current official manifests and was used only for historical/contextual inspection, not for current version claims.
- Aave address-book presence proves address/configuration existence, not liquidity, solvency, nonzero APY, or successful integration.
- The Zama Sepolia Confidential Vault source/docs support its aggregate mechanics and its idle-only status; they do not prove a yield-generating strategy for this bounty.
- Chainlink documentation supports the randomness lifecycle and security requirements, but the exact Sepolia coordinator configuration remains a deployment-time lookup.
- Product scores, threat analysis, HCU subtotal, and architecture recommendations are this dossier's labeled engineering inferences built from the cited primitives; they are not claims that Zama or PoolTogether prescribe this design.
