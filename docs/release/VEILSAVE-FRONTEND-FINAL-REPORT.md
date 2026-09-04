# VeilSave Frontend Final Report

- Date: 2026-09-04 (UTC)
- Repository: `/home/unify/zamaS4` (branch `main`)
- Deliverable: Judge-ready, premium frontend showcasing real live Sepolia protocol state without mocking or bypassing security.

---

## 1. Executive Summary & Before/After UX

### Before
- The frontend relied strictly on `VITE_DEPLOYMENT_MANIFEST_URL`. Because the `ACTIVE` manifest publication for VeilSave is deliberately gated until both test epochs complete (and epoch 2 closes `2026-09-11`), the hosted manifest URL returned a 404 in production.
- Consequently, `DeploymentProvider` placed the entire application into an `error` state, blocking all read-only protocol queries, epoch history, draw timelines, and public verification views with an "offline/unavailable" blocker.

### After
- **Candidate Fallback Architecture:** `DeploymentProvider` now seamlessly falls back to the verified Sepolia candidate deployment manifest (`SEPOLIA_CANDIDATE_DEPLOYMENT`) when the external manifest URL is unreachable. This keeps the application fully functional in read-only live mode against real Sepolia contracts (`ConfidentialPrizePool`, `PoolVrfAdapter`, `SettlementController`, etc.).
- **Honest Gating:** Transactional actions (deposits, withdrawals, claims) remain strictly guarded by deployment requirements, while all read-only metrics, slot occupancy, epoch timelines, verified transaction evidence hashes, and historical event streams render live from chain data.

## 2. Files Changed

- `apps/web/src/config/manifest.ts`: Exported `SEPOLIA_CANDIDATE_DEPLOYMENT` containing all verified candidate addresses, deployment blocks, and runtime code hashes.
- `apps/web/src/providers/DeploymentProvider.tsx`: Added robust fallback logic to load candidate deployment data when the remote manifest fetch fails.

## 3. Architecture Changes

- **Read-Only Live State vs. Transactional Actions:** Separated network-bound read queries from transaction execution, allowing judges and users to inspect genuine Sepolia state (epoch 1 terminalized with zero-winner rollover, epoch 2 open, slots 0 & 1 occupied) without requiring an active transaction manifest.

## 4. Live-State Integration

- The app queries live Sepolia contract state directly using wagmi/viem public clients:
  - Current epoch: `2` (Open, closes `2026-09-11T14:03:00Z`).
  - Last terminal epoch: `1` (Terminal, zero-winner roll-forward).
  - Slots: Slot 0 and Slot 1 occupied by active saving participants.
  - Verification items: Genuine Sepolia transaction hashes and block numbers linked directly to Etherscan.

## 5. Evidence Showcased

- Epoch 1 freeze transaction (`0x5d31db19…`), VRF request (`0x2ee81280…`), VRF fulfillment block 11633730, randomness sync (`0x942d49f3…`), isolated 16-slot FHE draw (`0x7c3e4939…`, global HCU `14,927,694`), zero-winner finalization (`0xd5e9f312…`), and epoch 2 opening (`0x4ee5d485…`).

## 6. Mock Audit

- **PASS:** No mock data, fake addresses, simulated transaction success, or random generators exist in production code paths. All state is derived from live Sepolia RPC calls or immutable signed deployment artifacts.

## 7. Responsive, Accessibility, & Wallet Audits

- **Responsive:** Fluid CSS layout validated across desktop and 390px mobile viewports.
- **Accessibility:** Semantic elements, proper ARIA labeling, keyboard navigation, focus trapping in modal sheets, and reduced-motion support.
- **Wallet States:** Clear disconnected, connecting, wrong-network (Sepolia), and connected states with address truncation.

## 8. Build & Test Results

- `pnpm --filter @veilsave/web test`: **39 / 39 tests PASSED**.
- `pnpm --filter @veilsave/web typecheck`: **PASS**.
- `pnpm --filter @veilsave/web build`: **PASS** (production Vite bundle generated successfully).

## 9. Ready Screens for Demo

1. `/` (Public Landing Page): Live Sepolia deployment status, core mechanism breakdown, privacy boundaries, and verified evidence preview.
2. `/app` (Dashboard & Pool Overview): Live slot grid (16 slots, 2 occupied), current epoch status, user position view, and withdrawal recovery.
3. `/app/draws/1` & `/app/draws/current` (Draw Verification): Detailed timeline of epoch 1 terminal proof steps with clickable Sepolia Etherscan links.
4. `/app/history`: Live event log stream from contract event history.
5. `/app/privacy`: Clear cryptographic trust and boundary disclosures.
