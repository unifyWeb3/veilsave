# VeilSave — Final Release Candidate Report

- Date: 2026-09-04 (UTC)
- Repository: `/home/unify/zamaS4` (branch `main`)
- Release work commit: `aaa65339dd760b1e8e39094c76fe1cb13d90d6a4` (release implementation, evidence, docs, deploy config)
- Report commit: this commit — the follow-up commit on `main` adding only this file (verify: `git log --oneline -- docs/release/VEILSAVE-FINAL-RELEASE-CANDIDATE-REPORT.md`)
- Bounty deadline: 2026-09-05 (Zama Season 4)

Status vocabulary: **PASS** · **PARTIAL** · **BLOCKED** · **N/A**

---

## 1. Executive verdict

**FINAL RELEASE CANDIDATE WITH ONE PROTOCOL-CADENCE BLOCKER.**

On 2026-09-04 the live Sepolia candidate deployment terminalized epoch 1 end-to-end with genuine evidence: freeze → VRF request → VRF fulfillment → randomness sync → isolated 16-slot FHE draw (inside all HCU/gas budgets) → KMS-authenticated zero-winner finalization with all negatives proven → prize roll-forward → epoch 2 opening. Combined with the previously proven deposit / immediate-withdrawal / TEST-YIELD / strict-FIFO evidence, 55/55 contract tests, 39/39 frontend tests, a passing production build, and a live public site, this is the strongest submission state achievable before the deadline.

The single blocker is structural, not a defect: the seven-day epoch cadence is an immutable protocol constant, so the weighted-winner epoch 2 (closes `2026-09-11T14:03:00Z`) cannot terminalize before 2026-09-05. Consequently the weighted-winner ACL/decryption gate and the create-only `ACTIVE` manifest (which correctly refuses to publish without both epochs) remain **BLOCKED**. No evidence was fabricated, no timestamp was warped, and no protocol semantic was shortened to manufacture a pass.

## 2. Current commit

| Item | Value |
| --- | --- |
| Release work commit | `aaa65339dd760b1e8e39094c76fe1cb13d90d6a4` |
| Report commit | this commit (adds only this file; see `git log` for `docs/release/`) |
| Remote | `unifyWeb3/veilsave` — pushed 2026-09-04 (`aaa6533` verified on remote `main` via `ls-remote`; this report commit pushed alongside) |
| Working tree at report time | Committed; `evidence/private/*` and `.env` remain gitignored and uncommitted by design |

## 3. Repository state

Source of truth is the working tree at `/home/unify/zamaS4` (verified `git rev-parse --show-toplevel`). Prior interrupted release work was preserved, not reset. Release delta on top of `8af071e`:

Modified: `.env.example` (`ACTIVE_MANIFEST_PATH`), `.gitignore` (`**/evidence/private/`), `README.md` (verified status), `apps/web/src/components/ConsoleApp.tsx` (writes gated on manifest-ready), `deployments/README.md` (release command), `packages/contracts/package.json` (accept/release scripts).

Added: `apps/web/src/components/ConsoleApp.test.tsx`, `apps/web/vercel.json`, `apps/web/.gitignore` (`.vercel`), `deployments/sepolia/2026-08-26T14-47-13-829Z/` (draft, audit, verification, all public evidence incl. `live-epoch-1-evidence.json`), `docs/product/VEILSAVE-ECOSYSTEM-ROADMAP.md`, `packages/contracts/scripts/acceptance/`, `packages/contracts/scripts/release/`, this report.

## 4. Contract status — PASS (with one cadence-blocked live gate)

- Local suite 2026-09-04: **PASS** — 9 suites (M0, M1–M3, M5, M6, M7, M8, M9, M10, M11), 55 passing, 0 failing.
- Live Sepolia: epoch 1 full lifecycle **PASS** (§8); epoch 2 weighted run **BLOCKED** by cadence (§17).
- No contract source was modified in this release run; deployed bytecode matches the audited draft (see §8).
- Frozen protocol semantics preserved: 16 slots, 7-day epochs, maturity-before-eligibility, snapshot-before-randomness, VRF/draw separation, encrypted weighted draw, winner ACL + 96-block delay, FIFO withdrawals, Safe/timelock governance.

## 5. Frontend status — PASS (gated, honest)

- Web suite: **PASS** — 15 files / 39 tests, including the new `ConsoleApp.test.tsx` deployment-gate test.
- `tsc --noEmit`: **PASS**. Production `vite build`: **PASS**.
- `/` = public homepage (live pool snapshot with explicit Checking/Unavailable/Awaiting states). `/app` = console; transaction sheets and recovery actions render only when `DeploymentProvider` reaches `ready` (schema-valid `ACTIVE` manifest + full runtime-bytecode match). Otherwise a retryable validation banner with a read-only shell. No fake state anywhere (§6).
- Logo rule: **N/A** — no logo PNG exists in the repository; branding uses the component-rendered `Wordmark`, never as a background.

## 6. Zero-mock audit — PASS

Repository-wide scan of `apps/web/src` on 2026-09-04:

| Pattern | Finding |
| --- | --- |
| mock/fake/stub/demo/simulated data in production code | None. Sole match is an HTML `placeholder="0.000000"` input attribute |
| `vi.mock` / `0x1111…` fixtures | Test files only (legitimate doubles) |
| Hardcoded production addresses | None in `src` (EIP-1967 slot constant and zero-address sentinels only) |
| `Math.random` / UUID / faker as live state | None |
| Secrets in client code or evidence | None — relayer keypair is session memory; acceptance keys live in gitignored `evidence/private/` (0600) |

## 7. Full E2E status

| Stage | Contract call | Frontend call | Status |
| --- | --- | --- | --- |
| Wallet connect / Sepolia handling | — | wagmi `WalletControl` + `readRuntimeConfig` | PASS (local + review) |
| Slot reservation | `reserveSlot` | DepositFlow | PASS (live evidence, 2 slots) |
| Confidential deposit | `onConfidentialTransferReceived` | DepositFlow (relayer encrypt + write) | PASS (live, pendingEpoch 2) |
| Maturity (pending → eligible) | `freezeEpoch` promotion | read-only weight display | PASS (live: epoch-2 precheck shows eligible > 0) |
| Epoch freeze | `freezeEpoch` | DrawLifecycle | PASS (live `0x5d31db19…`, block 11633722) |
| VRF request | `requestEpochRandomness` | DrawLifecycle | PASS (live `0x2ee81280…`, ID 101598922990784706611885201372562388386219001989045154348585444616748394704164) |
| VRF fulfillment | Chainlink callback (stores word only) | evidence read | PASS (live `0xf0d55c6b…`, block 11633730, 152,041 gas) |
| Randomness sync | `syncEpochRandomness` | DrawLifecycle | PASS (live `0x942d49f3…`) |
| Encrypted weighted draw | `executeEncryptedDraw` | DrawLifecycle | PASS (live `0x7c3e4939…`, HCU/gas in budget) |
| Winner decrypt + negatives | `finalizeWinner` (+ staticCall negatives) | DrawLifecycle | PASS zero-winner (live `0xd5e9f312…`) |
| Winner ACL / prize decrypt | `FHE.allow` + userDecrypt | winner-only reveal | PARTIAL (zero-winner rejections PASS live; winner grant path BLOCKED to epoch 2) |
| Prize claim | `claimPrize` | winner flow | BLOCKED (no nonzero winner before deadline) |
| Immediate withdrawal | request + `finalizeWithdrawalRouting` | WithdrawFlow | PASS (live evidence 2026-08-26) |
| Queued/FIFO withdrawal + settlement + retry | `serviceFifoHead`, `finalizeWithdrawalCompletion`, settlement controller | WithdrawFlow/SettlementFlow | PASS (live evidence 2026-08-26) |
| Recovery/retry paths | `sendOrResume` acceptance pattern; `retrySettlement`; abandon paths | OperationRecovery + DrawLifecycle abandon actions | PASS (live: resumable script + proven retry evidence; UI paths reviewed) |
| Next epoch | `openNextEpoch` | DrawLifecycle | PASS (live `0x4ee5d485…`, epoch 2 open) |

## 8. Live Sepolia deployment — PASS (candidate, epoch 1 terminalized)

| Component | Address |
| --- | --- |
| ConfidentialPrizePool | `0x6e543f7e6f3175824a2C36E37c09829200195D4d` |
| PoolVrfAdapter | `0x23bD336d4E42Aa70DAea529C0EB75Ca98e3CeeEC` |
| SettlementController | `0x8CF1984Aa1F3eE119aDCa5901DD58C28fb19589c` |
| DeterministicTestYieldVault | `0x70d70205a992aE5e02e628EEcD8AE54Ce65Da529` |
| TimelockController | `0x6aE428EE7f575720A7d696e566193A7484A8ff84` |
| Governance Safe (2-of-3) | `0x429F46ADdDe54E4b05493C87d121efb75e3e9711` |
| cUSDT (ERC-7984) | `0x4E7B06D78965594eB5EF5414c357ca21E1554491` |

Chain state verified 2026-09-04: `active=true`, `currentEpochId=2`, `lastTerminalEpochId=1`, epoch 1 `TERMINAL`, no active settlement, no pending VRF request. The September 2 gate was missed only because the previous run ended 2026-08-27 while epoch 1 was still OPEN (close `2026-09-02T15:15:00Z`); the deployment itself stayed healthy and freezable. The 7-day cadence is protocol (`epochDuration = 7 days` constant, constructor-enforced), not deployment configuration — a short-cadence redeploy would be a different protocol and is correctly refused by the release gates.

## 9. Live evidence matrix

| Gate | Status | Evidence |
| --- | --- | --- |
| Live deployment + Safe activation + audit | PASS | `deployment-draft.json`, `safe-bootstrap-proposal.json`, `post-deploy-audit.json` |
| Source verification (5 contracts) | PASS | `source-verification.json` (Etherscan URLs) |
| Encrypted deposit (2 participants) | PASS | `live-deposit-evidence.json`, `live-second-participant-evidence.json` |
| Immediate withdrawal | PASS | `live-immediate-withdrawal-evidence.json` |
| TEST-YIELD invest/harvest | PASS | `live-test-yield-evidence.json` |
| Strict FIFO + partial settlement + retry + ordered claims | PASS | `live-fifo-withdrawal-evidence.json` |
| Epoch freeze (2-slot verified snapshot) | PASS | `live-epoch-1-evidence.json` |
| VRF request + fulfillment + callback isolation | PASS | same (request `0x2ee81280…`, fulfillment block 11633730) |
| Randomness sync | PASS | same (`0x942d49f3…`) |
| Encrypted draw in budget | PASS | same (`0x7c3e4939…`) |
| Winner finalization + negatives | PASS | same (`0xd5e9f312…`, zero address) |
| Zero-winner prize ACL (rejections) | PASS | same |
| Winner-only prize decryption + claim | BLOCKED | requires epoch-2 nonzero winner (closes 2026-09-11) |
| Epoch 2 weighted draw | BLOCKED | staged `PARTICIPANT_WINNER`, `WAIT_EPOCH_CLOSE`, closes 2026-09-11 |
| `ACTIVE` manifest + HCU/gas/ACL reports | BLOCKED | `release:manifest` correctly refuses (needs both epochs) |
| Privacy boundary in evidence | PASS | no amounts/proofs/handles/keys recorded in any public artifact |

## 10. HCU/gas evidence — PASS (live, in budget)

Live epoch-1 Sepolia draw: global HCU `14,927,694` (target ≤ 17,000,000), sequential-depth HCU `3,448,128` (target ≤ 4,000,000), draw gas `2,774,598` (target ≤ 3,500,000), VRF callback gas `152,041` (≤ 250,000 envelope), sync gas `98,433`, finalize gas `618,033`, freeze gas `1,160,862`, VRF request gas `272,604` at quote `257,243,035,623,948` wei. Local production-shaped numbers (14,927,246 / 3,448,096) agree with live to <0.001%.

## 11. Winner ACL/decryption evidence — PARTIAL

Zero-winner path (live): KMS public decrypt of the winner handle → `0x000…000` (1 attempt, 5,820 ms, proof `0x29ee1797…c18f`); early-finalization, wrong-clear, wrong-epoch, and replay negatives all rejected on-chain; participant and public prize decryption rejected; prize rolled to reserve; no prize amount recorded. Weighted-winner grant/decrypt/claim: **BLOCKED** to epoch 2 (§17).

## 12. Withdrawal/FIFO evidence — PASS

Proven live 2026-08-26 (`live-fifo-withdrawal-evidence.json`): request-time FIFO ordering across two participants, partial settlement with wrong-proof rejection and resumable completion, ordered claims, double-claim rejection, private reconciliation, both slots preserved for epoch 2. Immediate-withdrawal path proven separately. No evidence regression from epoch-1 finalization (no active settlement, no pending withdrawals on-chain).

## 13. Security findings — PASS (no new issues)

- Static scan: no `tx.origin`, `delegatecall`, `selfdestruct`, or unguarded value calls in production contracts.
- Access control reviewed: Safe-only bind/activate (erased after activation), pool-only VRF/settlement entry points, timelock-only strategy replacement (requires paused investment, no active settlement, drained old strategy, same underlying), guardian pause vs timelock unpause, loss-mode gating.
- FHE lifecycle reviewed: no reroll (state-machine enforced), snapshot-bound VRF, callback stores randomness only, draw-once, 96-block ACL delay with signature-bound finalization, winner-only prize ACL, FIFO-head enforcement on service/complete.
- M10 security/invariant suite passes within the 55/55 run. No changes were required; no scope-expanding rewrites were made.

## 14. UX/accessibility findings — PASS (unchanged product, one gating fix)

Prior audits (desktop + 390px mobile, reduced motion, 44px targets, focus trapping, loading/error/empty/pending states) remain valid; the only UI change is the manifest-ready write gate plus its test. The console degrades to an explicit validation banner + read-only shell without an `ACTIVE` manifest — the correct safe failure mode, verified by test and live on the production URL.

## 15. Production URL — PARTIAL (site live, manifest pending)

- `https://veilsave.vercel.app` (alias) — **live**, serves homepage + `/app` SPA rewrites, COOP/COEP headers for FHE wasm.
- Deployment URL `https://veilsave-fabxlkq85-oxunify.vercel.app` verified alongside.
- `https://veilsave.vercel.app/` and `/app` return the app shell (HTTP 200); `/manifest/veilsave-sepolia.json` honestly 404s until `release:manifest` can publish, so the console shows the validation-stopped state rather than any fake readiness.
- Post-`ACTIVE`-manifest step: copy `manifest.json` to `apps/web/public/manifest/veilsave-sepolia.json` and redeploy (no code change needed).

## 16. GitHub URL

- Remote: `unifyWeb3/veilsave` (`gh` authenticated; SSH push verified). Push status: **pushed 2026-09-04** — release work `aaa6533` confirmed on remote `main` via `ls-remote`; report commit pushed in the same session.
- Commits: release work `aaa65339dd760b1e8e39094c76fe1cb13d90d6a4`; this report in the follow-up commit. No secrets committed (`.env`, `evidence/private/`, `.vercel` excluded; public evidence only).

## 17. Exact remaining blockers

1. **Epoch-2 weighted draw + winner ACL/decryption/claim** — BLOCKED by the immutable 7-day cadence (epoch 2 closes `2026-09-11T14:03:00Z`; acceptance staged, `WAIT_EPOCH_CLOSE`). No safe acceleration exists: the duration is a contract constant enforced at construction and re-checked by every release gate.
2. **`ACTIVE` manifest + derived HCU/gas/ACL reports** — BLOCKED on (1) by the create-only `release:manifest` preconditions (`lastTerminalEpochId ≥ 2`, `currentEpochId ≥ 3`, both epoch evidence files PASS).
3. **Full console transaction binding on the public site** — BLOCKED on (2) by design (manifest-ready gate).
4. **Single manual actions for the owner**: none required before submission; after epoch 2, run `accept:epoch` (resumes automatically), then `release:manifest`, publish manifest, redeploy site, push.

## 18. Submission checklist

- [x] Contracts compile; 55/55 tests pass; security review recorded
- [x] Frontend 39/39 tests, typecheck, production build pass; zero-mock audit clean
- [x] Live deployment Safe-activated, audited, source-verified
- [x] Live deposit / withdrawal / TEST-YIELD / FIFO evidence PASS
- [x] Live epoch-1 terminal evidence PASS (freeze/VRF/draw/finalize/negatives/privacy)
- [x] Live HCU/gas within release budgets
- [x] Public site live with honest gated console
- [x] Roadmap kept as strategy-only documentation
- [ ] Weighted-winner + `ACTIVE` manifest (protocol-cadence BLOCKED — documented, staged)
- [ ] Push release commits to `unifyWeb3/veilsave` (see §16)
- [ ] Attach this report + evidence hashes to the bounty submission

## 19. What is genuinely complete

Everything except the cadence-blocked items: protocol implementation, deployment, activation, audit, verification, all pre-draw acceptance, the complete terminal-epoch path with VRF/FHE/ACL evidence on live Sepolia, budgets, test/build quality, public site, and release hygiene.

## 20. What is impossible to prove before the deadline

A live nonzero-winner draw with winner-only prize decryption and claim, and therefore the `ACTIVE` manifest and bound console — impossible solely because epoch 2 (the first epoch with eligible weight) closes 2026-09-11 under the frozen protocol rule. Any attempt to prove it sooner would require time-warping, evidence fabrication, or weakening protocol semantics, all of which were refused.

## 21. Recommended final submission state

Submit this release candidate as-is: link the repository at `REPORT_COMMIT`, the production URL `https://veilsave.vercel.app`, the Etherscan-verified candidate addresses (§8), and `live-epoch-1-evidence.json` as the terminal-lifecycle proof. State the epoch-2 staging (`PARTICIPANT_WINNER`, closes 2026-09-11) and the exact post-deadline path (§17.4) so reviewers can reproduce the remaining gates without trusting any claim.
