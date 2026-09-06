# VeilSave — Backend Final Release Report

- Date: 2026-09-04 (UTC)
- Repository: `/home/unify/zamaS4` (branch `main`)
- Commits covered: through `8a7737e` (verified read-only candidate path + loading transient fix)
- Bounty deadline: 2026-09-05 (Zama Season 4)
- Author role: protocol / backend / deployment / security / release audit (frontend/HCI owned separately)

Status vocabulary: **PASS** · **PARTIAL** · **BLOCKED** · **N/A**

This report was written from independently re-verified evidence. No prior report was taken on trust:
every live claim below was re-checked against Sepolia chain state and transaction receipts today
(block ~11635805), every suite was re-run, and every address/hash was compared machine-to-machine.

---

## 1. Executive verdict

**FINAL RELEASE CANDIDATE WITH TWO NON-PROTOCOL BLOCKERS.**

1. **Immutable cadence:** epoch 2 (the first epoch with eligible weight) closes
   `2026-09-11T14:03:00Z` under the constructor-enforced seven-day rule, so the live
   weighted-winner ACL/decryption/claim run and the `ACTIVE` manifest cannot complete
   before the deadline. Nothing was time-warped, fabricated, or redeployed to evade this.
2. **Repository visibility:** `github.com/unifyWeb3/veilsave` returns HTTP 404 (private).
   The bounty requires a public GitHub. Flipping visibility is an owner action and was
   deliberately not taken by this audit (no license is selected yet — see README).

Everything else is green: protocol implementation, live epoch-1 terminal lifecycle with all
seven receipts re-verified on-chain today, HCU/gas inside budgets, 55/55 contract tests,
51/51 web tests, 56/56 spike tests, typecheck, production build, source verification,
Safe activation audit, secret hygiene, and — as of this report — a production console that
loads genuine Sepolia state read-only in a real browser with transaction controls honestly
disabled (see §13).

## 2. Requirement matrix

| # | Requirement | Grade | Evidence |
| --- | --- | --- | --- |
| 1 | Web dApp | PASS | `https://veilsave.vercel.app/` + `/app` + `/app/draws/1` all HTTP 200 and rendered in headless Chromium 2026-09-04 with zero page errors |
| 2 | Public live URL | PASS | Same; alias `veilsave.vercel.app` re-pointed to deployment `veilsave-llwom0daj` and re-verified post-deploy |
| 3 | Sepolia | PASS | Live `eth_chainId` `0xaa36a7` (`11155111`); manifest chain lock; RPC `eth_chainId` re-checked today |
| 4 | Confidential deposit | PASS | `live-deposit-evidence.json` + `live-second-participant-evidence.json` (pendingEpoch 2, private reconciliation, no amounts recorded) |
| 5 | ERC-7984 / encrypted accounting | PASS | Actual-amount transfer-and-call crediting; M1–M3 suites; live deposits credited as pending weight |
| 6 | Encrypted balances | PASS | `euint64` principal/weights, owner-only ACL; negative decrypt tests (M8/M10); no plaintext in events/calldata |
| 7 | Deposit-weighted FHE winner selection | PARTIAL | Mechanism proven live (isolated 16-slot draw `0x7c3e…`, HCU in budget, frozen 2-slot snapshot); math proven by vectors/property tests; a live **non-zero-weight** outcome awaits epoch 2 (closes 2026-09-11) |
| 8 | FHE randomness | PASS | Chainlink VRF v2.5 word `88461112…58546` consumed by the FHE draw; no `FHE.rand`, no prevrandao, no offchain RNG anywhere in the path |
| 9 | No offchain RNG | PASS | Same; contracts accept only the adapter-bound VRF word; reroll impossible by state machine |
| 10 | Confidential prize distribution | PARTIAL | Encrypted reserve → per-epoch prize → winner-only claim proven locally (M8/M9); live claim awaits an epoch-2 nonzero winner |
| 11 | Winner-only decryption | PARTIAL | Zero-winner rejections proven live (participant + public prize-decrypt rejected); winner grant/decrypt awaits epoch 2 |
| 12 | EIP-712 user decryption | PARTIAL | SDK EIP-712 permit flow shipped (`createEIP712`, scoped permits); live winner decrypt awaits epoch 2 |
| 13 | Principal withdrawable at any time | PASS | Live immediate withdrawal + two-ticket strict FIFO with partial settlement/retry/ordered claims (`live-*-withdrawal-evidence.json`); no active FIFO debt on-chain today (`fifoHead 0/NONE`) |
| 14 | Draw automation / keeper / admin flow | PARTIAL | Every lifecycle step is permissionless (freeze/request/sync/draw/finalize/open/settle/service callable by any EOA; epoch 1 was driven this way) with UI retry + acceptance-script recovery; no dedicated keeper daemon (optional per spec); `scripts/recovery/` + `scripts/health/` are empty placeholders |
| 15 | Faucet / test-token access | PASS | Permissionless mock-USDT `mint` proven live (tx `0x941c…`, block 11573874) + wrap path; now documented in `RUNBOOK.md` §8 and README demo step |
| 16 | Sensible errors | PASS | Distinct states per failure class (product §8.9); subsystem-labeled manifest errors; read-only vs error vs loading states all rendered and tested |
| 17 | Public GitHub | BLOCKED | `github.com/unifyWeb3/veilsave` → HTTP 404 (private). Push access works; visibility flip is an owner action (also gated by the missing license decision) |
| 18 | README | PASS | Live URL, architecture, confidentiality, leakage, TEST-YIELD, deployment, test-token, lifecycle, withdrawal, decryption all documented; no epoch-2 winner claim |
| 19 | Deployment scripts | PASS | `deploy:sepolia`, `deploy:audit`, `verify:sepolia`, `accept:*`, `release:manifest` (create-only, refuses pre-gates) |
| 20 | Privacy leakage documentation | PASS | `PRIVACY.md` + README boundary + in-app verification-limitation copy |
| 21 | Yield-source documentation | PASS | `TEST YIELD` in contract metadata, manifest schema, UI badges, README, runbook; Aave `SUPPLY_CAP_EXCEEDED` rejection recorded; no APY claim anywhere |
| 22 | Complete deposit → draw → claim → withdraw architecture | PARTIAL | All legs proven except the live nonzero-winner **claim** leg (awaits epoch 2); local full-lifecycle suite (M9) passes |

## 3. Contract status — PASS

- Full suite re-run 2026-09-04: **55 passing, 0 failing** (`M0/M1-M3/M5/M6/M7/M8/M9/M10/M11`).
- No contract source changed in this audit. Deployed bytecode matches the audited draft:
  all five runtime code hashes re-verified against live Sepolia today (machine-to-machine).
- Frozen semantics intact: 16 slots, 7-day cadence, maturity-before-eligibility,
  snapshot-before-randomness, VRF/draw separation, 96-block ACL delay, strict FIFO,
  Safe/timelock governance, no fees, no proxies, no `tx.origin`/`delegatecall`/`selfdestruct`.

## 4. Live Sepolia evidence — PASS (re-verified today, block ~11635805)

Chain reads today: `active=true`, `currentEpochId=2`, `lastTerminalEpochId=1`,
epoch 1 `TERMINAL` (status 6), epoch 2 `OPEN` (status 1, closes `2026-09-11T14:03:00Z`),
epoch durations exactly 604800 s, FIFO head empty, no active settlement.

All seven epoch-1 receipts re-fetched and matched (status 1, block, gas):

| Step | Transaction | Block | Gas |
| --- | --- | --- | --- |
| Freeze (2-slot snapshot, commitment `0x00e8bb…5e4d3c`) | `0x5d31db19…` | 11633722 | 1,160,862 |
| VRF request (ID `10159892…04164`) | `0x2ee81280…` | 11633725 | 272,604 |
| VRF fulfillment (callback, stores word only) | `0xf0d55c6b…` | 11633730 | 152,041 |
| Randomness sync | `0x942d49f3…` | 11633772 | 98,433 |
| Isolated 16-slot FHE draw | `0x7c3e4939…` | 11633773 | 2,774,598 |
| Zero-winner finalization (`0x000…000`) | `0xd5e9f312…` | 11633904 | 618,033 |
| Epoch 2 opening | `0x4ee5d485…` | 11633905 | 54,812 |

Epoch 1 was an honest zero-winner rollover: both deposits were made during epoch 1
(`pendingEpoch 2`), so eligible weight at the freeze was zero and the no-award path
terminalized with full negatives (early/wrong-clear/wrong-epoch/replay + participant and
public prize-decrypt rejection). Both deposits are now eligible in epoch 2.

## 5. Epoch-2 blocker — immutable, correctly refused

`epochDuration = 7 days` is a `public constant` (`ConfidentialPrizePool.sol:35`) enforced by
the constructor (`configuration.epochDuration != epochDuration → revert`, line 308) and
re-confirmed on-chain (both epochs span exactly 604800 s). It cannot be shortened without
deploying a different protocol. No time warp, no fabricated evidence, no semantic-shortening
redeploy was performed. `release:manifest` (create-only) correctly refuses to publish until
both epochs terminalize. The limitation is explicit in README, the runbook, and §12 below.

## 6. Security — PASS (two genuine issues found and fixed, §13)

- Static scan: no `tx.origin`, `delegatecall`, `selfdestruct`, unguarded value calls.
- ACL surface re-audited: `allowThis` on all stored ciphertexts; `allowTransient` only for
  token transfers; `makePubliclyDecryptable` only on the winner handle, routing/completion
  booleans, and settlement aggregates (all allowlisted); `FHE.allow(prize, winner)` only in
  `finalizeWinner` after the 96-block delay.
- This audit added: (a) a CI boundary guard forbidding bundled `ACTIVE` manifests and
  `DeploymentStatus.Active` assignment in frontend source (test fixtures excluded);
  (b) provider gate regression tests (4 paths incl. fail-closed); (c) candidate artifact
  pinning tests (addresses + runtime code hashes, machine-generated from audit artifacts).
- Invariant/security suites (M10) pass within the 55/55 run. No new contract risk introduced
  (no contract changed).

## 7. HCU / gas — PASS (inside all budgets)

Live epoch-1 draw: global HCU `14,927,694` (≤ 17,000,000), depth `3,448,128` (≤ 4,000,000),
draw gas `2,774,598` (≤ 3,500,000), VRF callback gas `152,041` (≤ 250,000 envelope).
Local production-shaped numbers agree to <0.001%. 32-slot remains rejected at the boundary
(preserved spike metric `HCUTransactionLimitExceeded`).

## 8. Deployment — PASS (candidate; ACTIVE correctly pending)

| Component | Sepolia address | Code hash re-verified live today |
| --- | --- | --- |
| ConfidentialPrizePool | `0x6e543f7e6f3175824a2C36E37c09829200195D4d` | yes |
| PoolVrfAdapter | `0x23bD336d4E42Aa70DAea529C0EB75Ca98e3CeeEC` | yes |
| SettlementController | `0x8CF1984Aa1F3eE119aDCa5901DD58C28fb19589c` | yes |
| DeterministicTestYieldVault | `0x70d70205a992aE5e02e628EEcD8AE54Ce65Da529` | yes |
| TimelockController | `0x6aE428EE7f575720A7d696e566193A7484A8ff84` | yes |
| Governance Safe (2-of-3) | `0x429F46ADdDe54E4b05493C87d121efb75e3e9711` | yes |
| cUSDT (ERC-7984) | `0x4E7B06D78965594eB5EF5414c357ca21E1554491` | yes (proxy + impl) |

Zama proxy implementations (ACL/executor/KMS/input verifiers), VRF coordinator/wrapper,
underlying token, and Safe singleton also re-verified (EIP-1967 slots + code hashes).
Etherscan source verification records stand (5/5). Safe bind/bind/activate completed with
authority erasure (post-deploy audit PASS, bindings locked).

## 9. Manifest gating — PASS (three-state model, §13)

`loading | ready | read-only | error`. Reads unlock on `ready` **or** `read-only`;
transactions unlock on `ready` only (a fetched, schema-valid ACTIVE manifest whose runtime
bytecode matches live chain). A fetched manifest that fails bytecode verification fails
closed to `error` (never degrades to the candidate). Zama confidential-client init stays
`ready`-gated; public reads never require Zama. ConsoleApp sheets and operation recovery
render only when `ready`.

## 10. Secret hygiene — PASS

Tracked files contain no private keys, mnemonics, RPC URLs, or API keys (only `.env.example`
with empty secret slots; all secret-bearing files — `.env`, `.env.deployment-public`,
`evidence/private/*` (0600), `.env.local`, `.vercel/` — are gitignored and uncommitted).
Public evidence files carry only tx hashes, addresses, code hashes, and timing. Vercel
production variables are the four public `VITE_*` values only. No secret value is printed
in this report or any log retained in the repo.

## 11. Tests — PASS

| Suite | Result |
| --- | --- |
| Contracts (Hardhat, FHE mock) | 55 passing, 0 failing |
| Web (vitest) | 51 passing (17 files), incl. 5 provider-gate + 7 candidate-pinning tests |
| Preserved spikes | 56 passing (29+6+7+7+7), 0 failing |
| Typecheck (`pnpm run typecheck`) | PASS (contracts + web) |
| Production build | PASS (`vite build`, chunk-size advisory only) |
| Format + source-boundary/secret checks | PASS |
| Live browser verification (headless Chromium) | `/`, `/app`, `/app/draws/1` render genuine state, 0 page errors |

## 12. Known cadence limitation + submission-safe claims

- Claim: shared 16-slot pool, encrypted deposits/balances, VRF randomness, isolated FHE
  draw, zero-winner terminal lifecycle, immediate + FIFO withdrawals, TEST-YIELD harvest,
  Safe governance, verified source — all live-evidenced. Do NOT claim: a live weighted
  (nonzero) winner, live winner-only prize decryption/claim, or an `ACTIVE` manifest.
- Epoch 2 closes `2026-09-11T14:03:00Z`; the `accept:epoch` → `release:manifest` → publish →
  redeploy path is staged and needs no code change.
- Remaining blockers: (1) epoch-2 weighted run (calendar); (2) `ACTIVE` manifest + derived
  HCU/gas/ACL reports (depend on 1); (3) public GitHub visibility (owner action);
  (4) full console transactions (depend on 2).

## 13. Production Console Failure — Root Cause and Resolution

### Symptom (2026-09-04)

`https://veilsave.vercel.app/app` showed `Deployment validation stopped / Failed to fetch`
with `Public pool state is unavailable / Protocol client is unavailable`. No live state
rendered despite a healthy Sepolia deployment.

### First failing boundary

The manifest fetch. Forensics on the production bundle showed it had baked
`VITE_DEPLOYMENT_MANIFEST_URL=https://example.invalid/veilsave-sepolia.json` — a
non-routable placeholder. `fetch()` to it rejects with TypeError `Failed to fetch`, the
provider entered `error`, and every manifest-gated read (`useProtocolSnapshot`,
`useEpochSnapshot`, `useEpochEvidence`, `usePublicHistory`) stayed disabled, producing the
derived `Protocol/Epoch-evidence client is unavailable` messages. The RPC was innocent:
`VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com` returns the correct chain ID
with `access-control-allow-origin: *` (browser-safe).

Root cause (two layers):

1. **Vercel had zero custom environment variables** (`vercel env ls` → empty). The CLI
   deploy uploaded the gitignored local `apps/web/.env.local` (which contained the
   `example.invalid` placeholder), and the build baked it. There was no `.vercelignore`
   to stop the leak.
2. **Even a correct URL 404s**: no `ACTIVE` manifest exists (correctly — release gates
   refuse before epoch 2), and the console had no legitimate pre-`ACTIVE` read path, so
   any manifest outage meant a fully offline console.

A concurrent uncommitted frontend change attempted a fallback but was unsafe (it reported
`ready` from a bundled `ACTIVE`-labeled constant with zeroed evidence hashes, short-
circuiting even bytecode verification, and broke `tsc`). It was reverted; its report-only
commit `2aef1ee` touches no code.

### Fix (no validation weakened, no mocks, no fabrication)

- **Verified read-only candidate** (`apps/web/src/config/candidate.ts`, status
  `REHEARSAL`, never `ACTIVE`): audited Sepolia addresses + runtime code hashes.
  All 52 values verified machine-to-machine against `deployment-draft.json` /
  `post-deploy-audit.json`; all 10 code hashes plus proxy implementations re-verified
  against live chain today. Reads enable only after `validateCandidateReadModel` +
  live `verifyManifestCode` pass in the browser; any mismatch fails closed to `error`.
- **Three-state provider**: `ready` (fetched ACTIVE + verified bytecode → reads +
  writes) / `read-only` (candidate verified → reads only) / `error` / `loading`
  (including a hold-while-verifying state so no terminal error flashes mid-check).
  A fetched manifest that fails bytecode verification fails closed — never falls back.
- **Improved errors**: network-level manifest failures name the subsystem and URL
  instead of bare `Failed to fetch`.
- **Deployment configuration**: set the four public Vercel production variables
  (`VITE_CHAIN_ID=11155111`, `VITE_RPC_URL=publicnode`, `VITE_DEPLOYMENT_MANIFEST_URL=
  https://veilsave.vercel.app/manifest/veilsave-sepolia.json`, explorer URL); added
  `apps/web/.vercelignore` (excludes `.env.local` from CLI uploads); corrected the
  `.env.local` placeholder; pinned `installCommand: pnpm install --frozen-lockfile`
  (a plain CLI deploy fails on `npm install` because of `workspace:*`).
- Deployed via local `vercel build --prod` (bundle forensics: correct URLs, zero
  `example.invalid` refs) + `vercel deploy --prebuilt --prod` → alias
  `https://veilsave.vercel.app` (deployment `veilsave-llwom0daj`).

### Files changed

`apps/web/src/config/candidate.ts` (+tests), `providers/DeploymentProvider.tsx` (+tests),
`config/manifest.ts` (error labels, signature widening), read-gate openings in
`useProtocolSnapshot`/`useEpochEvidence`/`usePublicHistory`, honest `read-only` display in
`ConsoleApp`/`LandingPage`/`ProtocolHealth`, `lib/zama.ts` (type widening only; init stays
`ready`-gated), `scripts/check-source-boundaries.mjs` (CI guards), `apps/web/.vercelignore`,
`apps/web/vercel.json` (install command), `RUNBOOK.md` §8 + README (test-token + read-only
accuracy).

### Verification performed

Headless Chromium against **production** 2026-09-04: `/` (live Epoch 2, 2/16 slots,
terminal epoch 1, `verified candidate read`), `/app` (LOADING → READ-ONLY, Epoch 2 OPEN,
slots `0x5FE7…444a` + `0x2f5b…Ce3A`, deposit/withdraw sheets correctly non-functional),
`/app/draws/1` (Epoch 1 TERMINAL · NO REROLL, request `10159892…04164`, winner handle
`0x6282993c29…36a70700`, 2 frozen slots). Zero page errors on all three routes.
Regression: 51/51 web, 55/55 contracts, 56/56 spikes, typecheck, build, boundaries.

### Remaining from this incident

- Dead-button polish: Deposit/Withdraw buttons render in read-only but open nothing
  (gate holds — safe). Suggested HCI follow-up: disabled state with explanatory tooltip.
- First-load verification latency (~10–60 s on public RPC for ~25 code/storage reads;
  cached 5 min per load). Acceptable; documented here.
- Post-epoch-2: publish the ACTIVE manifest file, redeploy (no code change), console
  lights up transactions automatically.

## 14. Note on the frontend final report (`2aef1ee`)

That report's §8 claims (`typecheck: PASS`, `build: PASS` for the fallback change) do not
match the measured state at audit time (2 type errors; the fallback was never in the
deployed bundle). Its §17 claim that "transactional actions remain strictly guarded" did
not hold for the described implementation (fallback resolved to `ready`, which unlocks
writes, before bytecode verification completed). The safe subset of its goal — genuine
read-only live state — is implemented by §13 instead, with writes provably gated
(`writesEnabled === ready` only; covered by regression tests). No visual-system files were
redesigned by this audit; display edits are limited to status/banner copy.

---

*End of backend final release report.*

## 15. Addendum 2026-09-05: decoupled initialization + verified production behavior

- **Init no longer touches the future ACTIVE manifest.** `DeploymentProvider` mounts
  straight into candidate verification; the ACTIVE fetch runs only inside
  `ensureTransactionReady()`, called from explicit transaction intent (Deposit/Withdraw
  sheets, draw-lifecycle and settlement submit handlers, all of which fail with an
  honest message when promotion is refused). Request interception in headless Chromium
  confirms **zero `/manifest/` requests** during read-only init/idle and **zero failed
  requests / page errors**.
- **Faster settle:** `verifyManifestCode` now batches independent code/storage reads
  (`Promise.all` per group, same checks in the same order). Measured `/app` settle:
  ~21 s → **~9 s**. No check weakened (bytecode, proxy implementations, chain,
  addresses, Safe/singleton all still verified; mismatch still fails closed).
- **Write gating verified live:** clicking Deposit in read-only opens no dialog, no
  sheet, no signing flow (DOM-verified: 0 dialogs, 0 sheets). Sheets, recovery resume,
  draw progression, and settlement submits all sit behind promotion-or-deny.
- **Production re-verified** (`veilsave-lgpxgydmt`, alias `veilsave.vercel.app`): `/`
  (Epoch 2, 2/16, terminal epoch 1), `/app` (10/10 content checks incl. both genuine
  depositor addresses, 14 available, tx-disabled messaging), `/app/draws/1` (TERMINAL ·
  NO REROLL, request `10159892…04164`, 2 frozen slots).
- **Coordination note:** frontend commit `87531d3` (dashboard overhaul: hero epoch
  cards, slot grid, read-only banner) was reviewed — no gating, verification, or
  status semantic weakened; all displayed values match live chain state. Two display
  strings there are hardcoded-but-true for terminal epoch 1 ("2 frozen slots",
  "epoch 1 evidence" label); making them fully data-driven is a safe follow-up, not
  a blocker (epoch-1 values are immutable on-chain).
- Regression: web 51/51 (17 files), typecheck, production build, format, and
  source-boundary/secret checks green at push time.

## 16. Addendum 2026-09-05: epoch-1 "winner handle" terminology ruling

**Unambiguous truth.** `0x6282993c2944b115876fa748e21731244c3eb0fa1cff0000000000aa36a70700`
is the FHE ciphertext handle of epoch 1's encrypted draw-output value: it is the
`eaddress` stored by `executeEncryptedDraw` (emitted in `EncryptedDrawExecuted`) and
returned today by `epochWinner(1).encryptedWinner`. Its KMS-authenticated public
decryption is the zero address (proof `0x29ee179798dc92b80eb5b626ea1058de13d2d6041ab253cb90a2364b9d63c18f`,
1 attempt). The zero path therefore emitted `EpochNoWinner` (not `WinnerFinalized`),
terminalized with outcome `NO_ELIGIBLE_WEIGHT`, rolled the prize to the reserve, and set
`finalizedWinner = 0x000…000`. **There is no winner.** "Winner handle" in earlier
reports and UI copy always meant "handle of the encrypted winner-output value", never
"address of a winner" — the phrasing was ambiguous and is now corrected.

**UI corrections (display-only, no protocol change).** In a terminal zero-winner epoch
the console now renders: step meta `OUTCOME HANDLE`, `Outcome handle` with note
"Draw-output reference — decrypts to the zero address: no winner", `Outcome proof and
finality` linking the `EpochNoWinner` transaction, `Outcome: No winner · terminal`, and
a `No winner` pill instead of `Winner finalized`. The zero address is never rendered as
a winner (history, landing, draw views). Covered by a terminal zero-winner Timeline
regression test using the genuine epoch-1 values.

**Demo narration (verbatim-safe).** "Epoch 1 ran the full lifecycle — freeze, VRF,
encrypted draw — and the encrypted draw output publicly decrypts to the zero address,
so the epoch terminalized with no winner, no reroll, and the prize rolled forward.
`0x6282…` is the ciphertext reference of that outcome, not a winner."

Production verification 2026-09-05 (deployment `veilsave-k3wq3xi5n`): `/app/draws/1`
renders `OUTCOME HANDLE 0x6282993c29…` with "decrypts to the zero address: no winner",
`Outcome proof and finality` linked to the `EpochNoWinner` transaction, and
`No winner · terminal`; `/app` dashboard shows Epoch 2 OPEN 2/16 + Epoch 1 TERMINAL
No Winner / No Reroll; `/app/history` shows Epoch 2 Winner Pending. The zero address
appears nowhere as a winner on any route. The generic privacy-boundary line "Winner
address after finalization" remains as documented protocol disclosure (a winner address
is public when one exists), not as an epoch-1 claim.
