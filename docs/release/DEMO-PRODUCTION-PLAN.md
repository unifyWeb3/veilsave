# VeilSave — Demo Production Plan

- Target duration: **~2:45** (hard cap 3:00)
- Source of truth: production [`veilsave.vercel.app`](https://veilsave.vercel.app) + live Sepolia state verified 2026-09-04/05
- Companion files: `DEMO-VOICEOVER.md` (exact narration), `DEMO-CAPTIONS.md` (timed captions),
  `DEMO-RECORDING-CHECKLIST.md` (how to capture), `DEMO-REMOTION-PLAN.md` (how to cut)

## Verified live state (do not contradict)

- Sepolia chain `11155111`; bytecode-verified candidate deployment
- **Epoch 2 OPEN**, closes **Sep 11, 2026** (immutable 7-day cadence)
- **2 / 16 slots occupied**, **14 available**; depositors `0x5FE7…444a`, `0x2f5b…Ce3A`
- **Epoch 1 TERMINAL — no winner, no reroll** — 2 frozen slots; outcome handle `0x6282993c29…`
  publicly decrypts to the zero address; prize rolled forward
- Console is **read-only** until the `ACTIVE` manifest publishes (transaction sheets stay shut)

## Beats (one story, not a checklist)

### 1. HOOK (0:00–0:15) — homepage
Live pill `Live on Sepolia · read-only`, headline, Epoch 2 strip (2/16, terminal epoch 1).
Promise: *save together without exposing balances.*

### 2. PROBLEM (0:15–0:35) — homepage, slow scroll
Public pools publish every balance; private pools ask you to trust an operator.
VeilSave refuses both trade-offs.

### 3. SOLUTION (0:35–0:55) — homepage mechanism section
One 16-slot pool. Amounts and draw weights encrypted. Weekly epoch, Chainlink VRF
randomness, FHE weighted draw onchain, winner-only prize reveal. Principal always
withdrawable.

### 4. LIVE PROTOCOL STATE (0:55–1:25) — `/app` dashboard
Read-only banner (framed as gating, not failure). Current Epoch card: Epoch 2 OPEN,
2/16, 14 available, closes Sep 11. Previous Epoch card: Epoch 1 TERMINAL, No Winner /
No Reroll. Slot grid: 2 occupied public owners, every amount masked.

### 5. CONFIDENTIAL PARTICIPATION (1:25–1:40) — dashboard position panel
No wallet connected: masked-by-default values, explicit-reveal copy. Point: privacy is
the default, not a setting.

### 6. EPOCH LIFECYCLE + PROOF (1:40–2:20) — `/app/draws/1`
The money sequence. Timeline: freeze (2 slots) → VRF request `10159892…04164` →
fulfillment (word stored, callback does nothing else) → isolated FHE draw →
`OUTCOME HANDLE 0x6282993c29…` → "decrypts to the zero address: no winner" →
`TERMINAL · NO REROLL`. Hover/click one Etherscan link to prove the trail leaves the app.

### 7. HONEST LIMITATION (2:20–2:35) — back on `/app`, read-only banner
Transactions unlock with the `ACTIVE` manifest after epoch 2 closes Sep 11 — the cadence
is a protocol constant, not a bug. Reads are fully live today.

### 8. CLOSE (2:35–2:45) — homepage hero
Real contracts, real evidence, real limitation. Remember: *private amounts, public proof.*

## Proof moments (hold the frame, let the judge read)

1. `Live on Sepolia · read-only` pill
2. `2 / 16` + `14 available`
3. `Epoch 1 TERMINAL` + `No Winner / No Reroll`
4. `REQ 10159892…04164` + `WORD STORED`
5. `OUTCOME HANDLE 0x6282993c29…` + zero-address note
6. One clicked Etherscan transaction
7. Read-only banner copy

## Forbidden claims

- No Epoch 2 winner, no completed Epoch 2, no prize claim, no balances, no APY,
  no "anonymous", no live transactions. The words "winner" and "Epoch 2" never share
  a completed-tense sentence.
