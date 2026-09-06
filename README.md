# VeilSave

### Confidential prize-linked savings on Sepolia — encrypted amounts, publicly verifiable draws.

[![Live on Sepolia](https://img.shields.io/badge/live-Sepolia%20·%20veilsave.vercel.app-4DA44D)](https://veilsave.vercel.app)
[![Tests](https://img.shields.io/badge/tests-162%20passing-4DA44D)](#tests)
[![FHE](https://img.shields.io/badge/FHE-Zama%20FHEVM-7B61FF)](https://docs.zama.org)
[![Randomness](https://img.shields.io/badge/randomness-Chainlink%20VRF%20v2.5-2A5ADA)](https://docs.chain.link/vrf)

> **Release status: final candidate with one calendar blocker.** The Sepolia deployment is
> live, Safe-activated, audited, and source-verified. Deposits, immediate + FIFO withdrawals,
> sponsored TEST-YIELD harvest, and the complete epoch-1 terminal lifecycle
> (freeze → VRF → isolated FHE draw → zero-winner finalization → epoch 2 opening) all pass
> on Sepolia with genuine evidence. Epoch 2 — the first epoch with eligible weight — closes
> `2026-09-11T14:03:00Z` under the immutable seven-day rule, so the live weighted-winner
> run, winner-only prize claim, and `ACTIVE` manifest land after the bounty deadline.
> Until then the console shows genuine bytecode-verified Sepolia state **read-only**;
> transaction controls unlock automatically once the `ACTIVE` manifest publishes.

**[Open the live app ↗](https://veilsave.vercel.app/app)**  ·  **[Draw evidence ↗](#live-sepolia-evidence)**  ·  **[How the draw works ↗](#the-draw-lifecycle-step-by-step)**  ·  **[Run it locally ↗](#run-it-locally)**

---

## ▶ Demo

_Demo video walkthrough: recording in progress — this section tracks the exact script._

The 8–10 minute narrated flow, using already-confirmed Sepolia transactions for slow steps:

1. Land on the console: Epoch 2 OPEN, 2 of 16 slots occupied, 14 available.
2. State the privacy boundary: _"Your savings amount stays encrypted. Your wallet address and transactions remain public."_
3. Show the two occupied public slots — every financial value masked (`****** cUSDT`).
4. Open epoch 1: `TERMINAL · NO REROLL` — freeze transaction, 2-slot snapshot commitment.
5. Bound Chainlink request → fulfillment (152,041 callback gas, stores the word only).
6. Separate FHE draw transaction: 16-slot weighted selection inside all HCU/gas budgets.
7. Encrypted outcome handle `0x6282…` → publicly decrypts to the **zero address**: no winner, no reroll, prize rolled forward.
8. Epoch 2 evidence: both deposits now eligible, closes Sep 11 — the staged weighted-winner run.
9. Withdrawal paths: immediate confidential payment, then the FIFO queue (request-time order, partial settlement, retry, ordered claims — all proven live Aug 26).
10. End on the TEST-YIELD disclosure and the explorer-linked verification trail.

---

## Table of contents

- [The problem](#the-problem)
- [What I built](#what-i-built)
- [Architecture](#architecture)
- [The draw lifecycle, step by step](#the-draw-lifecycle-step-by-step)
- [How Zama FHE, Chainlink VRF, and ERC-7984 fit together](#how-zama-fhe-chainlink-vrf-and-erc-7984-fit-together)
- [Engineering decisions & the hard problems](#engineering-decisions--the-hard-problems)
- [What's proven live vs what's pending — the honesty table](#whats-proven-live-vs-whats-pending--the-honesty-table)
- [The app](#the-app)
- [Tech stack](#tech-stack)
- [Project layout](#project-layout)
- [Run it locally](#run-it-locally)
- [Deployments](#deployments)
- [Tests](#tests)
- [Submission status](#submission-status)

---

## The problem

Public blockchains verify everything and hide nothing: every prize-linked savings pool
either publishes balances (sacrificing privacy) or computes winners offchain (sacrificing
trust). The bounty asks for both at once — **encrypted deposits, balances, and winnings**,
**winner selection over encrypted balances**, a **publicly verifiable draw**, and
**winner-only prize decryption** — on Sepolia, with principal always withdrawable.

The hard constraints: FHE computation is metered (HCU limits cap the participant set),
encrypted division doesn't exist (so proportional selection needs exact fixed-point
construction), randomness must be publicly verifiable (not an opaque onchain PRNG), and
aggregate crossings into public yield strategies inherently leak bounds (so the privacy
promise must be precise, not absolute).

## What I built

One non-upgradeable 16-slot confidential prize-linked savings pool on Ethereum Sepolia:

1. **Save** — reserve one of 16 public slots (`0.001 ETH` refundable bond), wrap test USDT
   to cUSDT, and deposit through ERC-7984 transfer-and-call. Principal, eligible weight,
   and pending weight stay encrypted; deposits mature after one complete epoch.
2. **Draw weekly** — each seven-day epoch freezes 16 encrypted eligible-weight handles,
   requests one Chainlink VRF v2.5 word bound to the snapshot commitment, then runs an
   isolated 16-slot FHE weighted draw (multiply-high threshold + balanced prefix scan +
   first-crossing oblivious select). No backend, no plaintext oracle, no reroll.
3. **Verify publicly** — freeze tx, VRF request/fulfillment, separate draw tx, encrypted
   outcome handle, KMS-authenticated finalization after a 96-block delay, and terminal
   state are all onchain and explorer-linked. Balances stay hidden, so the public verifies
   the authenticated execution trail rather than recomputing plaintext odds.
4. **Winner-only reveal** — only the finalized winner receives prize-decryption ACL; all
   other actors (losers, admin, keeper, relayer, frontend) provably cannot decrypt.
5. **Withdraw anytime** — confidential liquidity pays immediately; any encrypted remainder
   becomes a strict request-time FIFO ticket serviced through aggregate strategy
   redemption. Prize reserve never pays principal debt and vice versa.
6. **Honest yield label** — the Sepolia strategy is a deterministic donation-based vault
   labeled `TEST YIELD` everywhere (contract metadata, manifest, UI, docs). Aave Sepolia
   USDT supply was tested and rejected with `SUPPLY_CAP_EXCEEDED`; no APY is claimed.

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
                           DeterministicTestYieldVault (TEST YIELD)
```

| Contract                      | Sepolia address                                                                                         | Responsibility                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `ConfidentialPrizePool`       | [`0x6e54…5D4d`](https://sepolia.etherscan.io/address/0x6e543f7e6f3175824a2C36E37c09829200195D4d#code)   | Slots, encrypted principal/weights, epochs, isolated FHE draw, winner proof/finalization, prize ACL, withdrawals, FIFO claims |
| `PoolVrfAdapter`              | [`0x23bD…eeEC`](https://sepolia.etherscan.io/address/0x23bD336d4E42Aa70DAea529C0EB75Ca98e3CeeEC#code)   | One VRF request per frozen epoch, request-to-snapshot binding, storage-only callback                                          |
| `SettlementController`        | [`0x8CF1…19589c`](https://sepolia.etherscan.io/address/0x8CF1984Aa1F3eE119aDCa5901DD58C28fb19589c#code) | Aggregate decrypt/unwrap, ERC-4626 deposit/redemption, confidential rewrap, retries, loss mode, drained strategy replacement  |
| `DeterministicTestYieldVault` | [`0x70d7…Da529`](https://sepolia.etherscan.io/address/0x70d70205a992aE5e02e628EEcD8AE54Ce65Da529#code)  | Replaceable ERC-4626 demo strategy; externally sponsored value labeled TEST YIELD                                             |
| `TimelockController`          | [`0x6aE4…8ff84`](https://sepolia.etherscan.io/address/0x6aE428EE7f575720A7d696e566193A7484A8ff84#code)  | 24-hour delay for strategy changes and unpause                                                                                |
| Governance Safe (2-of-3)      | [`0x429F…e9711`](https://sepolia.etherscan.io/address/0x429F46ADdDe54E4b05493C87d121efb75e3e9711#code)  | Bootstrap authority (erased after activation), pause guardian, timelock proposer                                              |
| cUSDT (ERC-7984)              | [`0x4E7B…54491`](https://sepolia.etherscan.io/address/0x4E7B06D78965594eB5EF5414c357ca21E1554491#code)  | Confidential asset (6 decimals, wrapper rate 1)                                                                               |

All five app contracts are source-verified; every runtime code hash was re-verified against
live chain state. Pool code, capacity, cadence, asset, VRF source, and fee policy
(there are no fees) are immutable. Strategy replacement requires paused investment, no
active settlement, a fully drained old strategy, the same underlying asset, and a 24-hour
timelock.

## The draw lifecycle, step by step

This is what one epoch does, and every step is an onchain artifact:

1. **Freeze** — after close, copy 16 owner/weight handles into an immutable snapshot,
   commit to it publicly, move the prize reserve into the epoch prize, and mature pending
   weight into live eligible weight. Later deposits/withdrawals cannot touch the snapshot.
2. **Request** — one Chainlink VRF v2.5 word, with the request ID bound to the epoch and
   its snapshot commitment. A second request is impossible by state machine.
3. **Fulfill** — the callback stores the word and timestamps **only**. No FHE, no pool
   call, no revert on unknown/duplicate/late words.
4. **Sync** — anyone copies the timely word into the epoch; the 24-hour draw clock starts
   at the adapter's recorded fulfillment time.
5. **Draw** — a separate transaction widens the low 64 random bits, computes
   `threshold = floor(T·R / 2⁶⁴)` with encrypted-by-public scalar math (no encrypted
   division exists), runs a balanced encrypted prefix scan, takes the first crossing, and
   selects one encrypted winner address — or encrypted zero when total weight is zero.
6. **Finalize** — after 96 blocks, anyone submits the KMS public-decryption proof;
   `FHE.checkSignatures` authenticates handle, epoch, and clear address exactly once.
   A zero address terminalizes as `NO_WINNER` and rolls the prize forward; a participant
   address grants that winner — and nobody else — prize-decryption ACL.
7. **Next epoch** — anyone opens the next seven-day epoch after terminalization.

Timeouts at every stage abandon (never reroll): no request, no timely fulfillment, or no
timely draw each terminalize the epoch once and roll the prize forward identically.

## How Zama FHE, Chainlink VRF, and ERC-7984 fit together

- **ERC-7984 cUSDT** gives confidential balances with `euint64` amounts. Deposits use
  transfer-and-call so the pool credits the _actual_ encrypted amount the token accepted —
  never the typed intention. Uninitialized handles are normalized to encrypted zero;
  arithmetic never branches or reverts on secret values.
- **Zama FHEVM** executes the weighted draw over ciphertexts; the ACL keeps principal and
  weights owner/pool-only, snapshots and intermediates pool-only, the winner handle
  publicly decryptable after the draw, routing/completion booleans publicly provable, and
  the prize winner-only. Public decryptability is permanent, so it is granted to exactly
  the allowlisted handles — never balances, weights, claims, reserves, or prizes.
- **Chainlink VRF v2.5** (direct funding, 3 confirmations, 1 word, 100k callback gas) is
  the sole entropy source: publicly verifiable, bound before use, and structurally
  incapable of selective reroll. `FHE.rand` and block variables are deliberately unused.
- **The public strategy boundary** is crossed only by KMS-authenticated aggregate amounts
  (unwrap for investment, rewrap for prize/withdrawal liquidity). Those aggregates are
  public by necessity — singleton batches can bound individual amounts, which the UI and
  docs disclose instead of hand-waving.

## Engineering decisions & the hard problems

- **16 slots is a measurement, not a guess.** The balanced 16-slot draw meters
  ~14.93M global / ~3.45M depth HCU against 20M/5M absolute limits; the 32-slot spike
  reverts at the boundary (`HCUTransactionLimitExceeded`). Capacity is a compile-time
  constant.
- **Multiply-high instead of modulo.** Encrypted `% T` doesn't exist; `floor(T·R/2⁶⁴)`
  via widened `euint128` scalar multiply + shift gives exact proportional selection with
  negligible 2⁻⁶⁴ discretization, proven against an independent oracle (vectors + property
  tests + statistical frequency).
- **Draw transaction isolation.** The draw carries no snapshot, strategy, withdrawal,
  prize, or ACL work — anything extra would risk the HCU budget and blur failure domains.
  Measured live: 2,774,598 gas inside a 3,500,000 envelope.
- **Actual-amount accounting everywhere.** Token callbacks, wrapper burns/mints, and
  strategy balance deltas are authoritative — never requested/intended amounts. Every
  retry preserves the original intent ID; nothing is ever double-credited or double-paid.
- **Fail-closed verification in the frontend.** The console's deployment gate fetches the
  signed `ACTIVE` manifest, schema-validates it, and compares every runtime bytecode hash
  plus proxy implementations and the Safe singleton against live chain before enabling a
  single transaction. Pre-release, a bytecode-verified `REHEARSAL` candidate enables
  genuine reads only — a bundled `ACTIVE` manifest or an `ACTIVE` status assignment in
  source fails CI by construction.
- **Two transcription bugs caught by the process, not by luck.** Hand-copied hashes in a
  frontend artifact were wrong twice; the schema validator rejected one, and a
  machine-to-machine artifact comparison caught the other. All security-critical values
  are now pinned by generated tests, not eyeballs.

## What's proven live vs what's pending — the honesty table

| Capability                                                           | Status                                                                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Shared 16-slot pool, slot bonds, one slot per address                | Proven live (2 occupied slots)                                                                             |
| Encrypted deposits credited to pending weight                        | Proven live (2 participants)                                                                               |
| Encrypted balances/weights, owner-only ACL                           | Proven live + negative tests                                                                               |
| Immediate confidential withdrawal                                    | Proven live                                                                                                |
| Strict request-time FIFO, partial settlement, retry, ordered claims  | Proven live (2 tickets)                                                                                    |
| Sponsored TEST-YIELD invest/harvest into encrypted prize reserve     | Proven live (labeled, no APY)                                                                              |
| Freeze → VRF → sync → isolated FHE draw → finalization → next epoch  | Proven live (epoch 1, 7/7 receipts re-verified)                                                            |
| Zero-winner rollover with full negatives                             | Proven live (`EpochNoWinner`, prize rolled forward)                                                        |
| HCU/depth/gas inside release budgets                                 | Proven live on the epoch-1 draw                                                                            |
| Source verification (5/5), Safe activation, binding/role audit       | Proven live                                                                                                |
| Read-only console with genuine Sepolia state                         | Live now at [`veilsave.vercel.app/app`](https://veilsave.vercel.app/app)                                   |
| Live **weighted (nonzero) winner** + winner-only prize decrypt/claim | **Pending epoch 2** (closes 2026-09-11, immutable cadence)                                                 |
| `ACTIVE` manifest + transaction controls                             | **Pending** the above (publishes automatically after epoch 2)                                              |
| Privacy scope                                                        | Amounts encrypted; addresses, timing, slot occupancy, aggregates, and winner identity are public by design |

## Live Sepolia evidence

Epoch 1 terminal path (all receipts re-verified: status 1, matching block + gas):

| Step                                   | Transaction                                                                                                         | Block    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| Freeze (2-slot snapshot)               | [`0x5d31db19…`](https://sepolia.etherscan.io/tx/0x5d31db199052fcd2f5740acde2aafe075d85d48e02906531420fd0dab3d8b674) | 11633722 |
| VRF request (`10159892…04164`)         | [`0x2ee81280…`](https://sepolia.etherscan.io/tx/0x2ee81280db64bf0d2c3b36e9e66af1a9264613aa4351888d8b6a61b00b47226d) | 11633725 |
| VRF fulfillment (stores word only)     | [`0xf0d55c6b…`](https://sepolia.etherscan.io/tx/0xf0d55c6ba18f9ae1cf69eacf7db4f917f2b3b69fdf13f6e9b4d0d43c1155b8f4) | 11633730 |
| Randomness sync                        | [`0x942d49f3…`](https://sepolia.etherscan.io/tx/0x942d49f3652700aa28860e6c449e6d84139b4d35213d1f93bbd3ee420fc07bcc) | 11633772 |
| Isolated 16-slot FHE draw              | [`0x7c3e4939…`](https://sepolia.etherscan.io/tx/0x7c3e4939805a1ffd41af76151751aeb9445388c6553f143b2272a03c1f3102ed) | 11633773 |
| Zero-winner finalization (`0x000…000`) | [`0xd5e9f312…`](https://sepolia.etherscan.io/tx/0xd5e9f312e246880d26a843a98561bf2c7b8e3b796d563dbb87c44d466566671d) | 11633904 |
| Epoch 2 opening                        | [`0x4ee5d485…`](https://sepolia.etherscan.io/tx/0x4ee5d48597781962f79455dfb70c547719ba7581f574105d68fe61090bd8c1a6) | 11633905 |

Epoch 1 ran the full lifecycle and its encrypted outcome publicly decrypts to the zero
address — no winner, no reroll, prize rolled forward. `0x6282…` is the ciphertext
reference of that outcome, not a winner. Full machine-readable evidence lives in
[`deployments/sepolia/2026-08-26T14-47-13-829Z/`](deployments/sepolia/2026-08-26T14-47-13-829Z/).

## The app

- **`/` landing** — live Epoch 2 snapshot (slots, terminal epoch, TEST-YIELD note).
- **`/app` console** — dashboard with current vs previous epoch cards, masked positions
  with explicit local reveal, 16-slot grid, withdrawal + settlement recovery.
- **`/app/draws/:epochId`** — public verification timeline: freeze, VRF, draw, outcome
  proof, finality — every step explorer-linked with an explicit statement of what the
  public can and cannot recompute.
- **`/app/history`** — canonical epoch/settlement/withdrawal event trail.
- **`/app/privacy` + `/privacy`** — the exact confidentiality boundary: encrypted amounts,
  public activity, aggregate-leakage disclosure, trust dependencies.

Pre-release the console is read-only: transaction sheets open only after the fetched
`ACTIVE` manifest verifies. Selecting a transaction re-checks release status on demand.

## Tech stack

- **Chain:** Ethereum Sepolia (`11155111`) · **Confidentiality:** Zama FHEVM
  (`@fhevm/solidity 0.11.1`, `@zama-fhe/relayer-sdk 0.4.1`, OpenZeppelin confidential
  contracts `0.4.0`) · **Randomness:** Chainlink VRF v2.5 · **Asset:** ERC-7984 cUSDT ·
  **Strategy:** ERC-4626 (deterministic TEST-YIELD vault) · **Governance:** Safe 2-of-3 +
  OpenZeppelin TimelockController
- **Contracts:** Solidity `0.8.27`, Hardhat `2.28.6`, Cancun target, optimizer via-IR
- **Frontend:** React 19 + TypeScript + Vite, wagmi/viem, TanStack Query, CSS Modules +
  design tokens, no component framework
- **Toolchain:** Node `22.22.3`, pnpm `11.2.2`, CI on every push to `main`

## Project layout

```text
apps/web/                    Integrated React frontend (console + landing)
packages/contracts/          Production Solidity contracts, deployment/acceptance scripts, tests
packages/shared/             Shared protocol enums and deployment-manifest types
deployments/                 Manifest schema + Sepolia deployment artifacts and live evidence
docs/                        Product, architecture, execution, design, research, release reports
spikes/                      Preserved technical validation harnesses (never imported by production)
scripts/                     Source-boundary and secret-hygiene checks
```

Production code never imports from `spikes/`; CI enforces that boundary and scans for
embedded secrets.

## Run it locally

```bash
pnpm install --frozen-lockfile
pnpm check              # format, typecheck, compile, all tests, boundary/secret checks
pnpm test:spikes         # preserved 16/32-slot, VRF, ACL, asset-yield, withdrawal harnesses
pnpm --filter @veilsave/web build
```

Browser-safe runtime values (public config only — never secrets):

```bash
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://your-reviewed-sepolia-rpc
VITE_DEPLOYMENT_MANIFEST_URL=https://your-host/veilsave-sepolia.json
VITE_BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
```

Test-token path: Sepolia ETH from any public faucet, permissionless mock-USDT `mint` at
`0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0`, wrap to cUSDT (wrap amount is public), then
deposit. Full operator procedures live in [`RUNBOOK.md`](RUNBOOK.md).

## Deployments

- **Live app:** [`veilsave.vercel.app`](https://veilsave.vercel.app) (read-only until the
  `ACTIVE` manifest publishes at `/manifest/veilsave-sepolia.json`, then transactions
  unlock with no code change).
- **Contracts:** the table in [Architecture](#architecture); draft, audit, verification,
  and live evidence under [`deployments/sepolia/2026-08-26T14-47-13-829Z/`](deployments/sepolia/2026-08-26T14-47-13-829Z/).
- **Release process:** `deploy:sepolia` → Safe bind/bind/activate → `deploy:audit` →
  `verify:sepolia` → `accept:*` live runs → `release:manifest` (create-only; refuses
  unless both epochs, ACL negatives, budgets, audit, and verification all pass).

## Tests

```text
contracts   55 passing  (slots, maturity, FIFO, settlement, VRF, draw vectors, ACL, invariants)
web         51 passing  (gating, candidate pinning, no-winner terminology, flows, a11y, recovery)
spikes      56 passing  (16/32-slot HCU, VRF lifecycle, winner ACL, asset/yield, withdrawal)
```

```bash
pnpm test:spikes
pnpm --filter @veilsave/contracts exec hardhat test
pnpm --filter @veilsave/web test
```

The 16-slot production draw meters 14,927,694 global / 3,448,128 depth HCU live on
Sepolia — inside every release budget with double-digit margin.

## Submission status

- [x] Live Sepolia deployment, Safe-activated, audited, source-verified
- [x] Live deposit / withdrawal / FIFO / TEST-YIELD evidence
- [x] Live epoch-1 terminal lifecycle with full negatives
- [x] Public site rendering genuine state (read-only, write-gated)
- [x] Privacy, yield-source, and inference-limitation disclosures
- [x] Reproducible scripts, manifest schema, runbook, release reports
- [ ] Weighted-winner epoch-2 run (closes 2026-09-11, immutable cadence)
- [ ] `ACTIVE` manifest + transaction unlock (automatic after epoch 2)
- [ ] Public GitHub visibility (owner action)
- [ ] Demo video walkthrough (recording in progress)

## Documentation

- [Product specification](docs/product/product-spec.md) · [Architecture](docs/architecture/architecture.md) · [Execution specification](docs/spec/execution-spec.md)
- [Security model](SECURITY.md) · [Privacy model](PRIVACY.md) · [Operations runbook](RUNBOOK.md)
- [Backend final release report](docs/release/VEILSAVE-BACKEND-FINAL-RELEASE-REPORT.md) · [Release candidate report](docs/release/VEILSAVE-FINAL-RELEASE-CANDIDATE-REPORT.md)

## License

No repository license has been selected yet. Do not assume redistribution rights until the project owner adds one.
