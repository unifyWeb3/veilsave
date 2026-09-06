# VeilSave — Recording Checklist (Recordly: screen + real voice)

## One-time browser setup

- [ ] Desktop Chrome/Edge, **one window**, new clean profile (no extensions overlays).
- [ ] Window **1920×1080**, browser zoom **100%**, OS text scaling 100%.
- [ ] Cursor: default arrow, **always visible** — never enable cursor hiding.
- [ ] **No wallet connected.** Reads need no wallet; this also guarantees no address or
      signing popup can leak into frame, and no transaction can be submitted by accident.
- [ ] Close everything except **two tabs**: `https://veilsave.vercel.app/` and
      `https://veilsave.vercel.app/app`. Mute/silence notifications (Do Not Disturb on).
- [ ] Quiet room; do a 5-second mic test in Recordly and play it back before scene 1.

## Pre-roll verification (do not record yet)

- [ ] Load `/app`, wait for `Candidate verified · read-only` (up to ~30 s on slow RPC).
- [ ] Confirm: Epoch 2 OPEN, `2 / 16`, `14 available`, closes Sep 11.
- [ ] Open `/app/draws/1`, confirm: TERMINAL, 2 frozen slots, `REQ 10159892…04164`,
      `OUTCOME HANDLE 0x6282993c29…`, `No winner · terminal`.
- [ ] If either page shows an error banner instead, **stop**: retry once, then report it
      as a demo-blocking bug. Do not record around it.

## Scene map (matches `DEMO-PRODUCTION-PLAN.md`)

| Scene | Start | End | Page |
| --- | --- | --- | --- |
| 1 Hook | homepage loaded, pill visible | after headline read | `/` |
| 2 Problem | scroll to mechanism section | end of second beat | `/` |
| 3 Solution | mechanism bullets in frame | before navigation | `/` |
| 4 Live state | `/app` settled read-only | after slot grid pan | `/app` |
| 5 Participation | position panel masked values | before leaving dashboard | `/app` |
| 6 Proof | `/app/draws/1` settled | after outcome handle beat | `/app/draws/1` |
| 7 Etherscan | click ONE tx link (draw `0x7c3e…`), hold 3 s | back to draw page | explorer → back |
| 8 Limitation | `/app` read-only banner in frame | after Sep-11 line | `/app` |
| 9 Close | `/` hero in frame | final line + 2 s hold | `/` |

## During each scene

- Move the cursor **before** you start speaking about an element, then hold it still.
- Wait for live data before narrating it (never narrate a skeleton/loading state).
- Pause 2 s between scenes (clean cut points; dead air is trimmed in edit).
- **Never click**: Deposit, Withdraw, Reserve, any draw-progression button, or wallet
  connect. Hover at most. A misclick that opens a sheet = stop, close it on camera is
  fine once, otherwise retake the scene.
- If RPC stalls (spinners >45 s): pause recording, wait off-camera, resume with a
  2 s silent lead-in. Do not narrate loading screens.

## Retakes

- Retake by **scene**, not from the top. Clap once (audio spike) at each retake start
  so the spike is visible in the waveform.
- Keep every take; name files `veilsave-demo-sceneNN-takeMM.{mp4}`.

## After recording

- Place raw files in `demo/raw/` (create it; gitignored — never commit raw footage).
- Report: scenes covered, best takes, any line you rephrased, any UI surprise.
