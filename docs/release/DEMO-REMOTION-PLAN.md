# VeilSave — Remotion Editing Plan

No Remotion project exists yet. When raw Recordly footage lands, scaffold a **standalone**
edit project that never touches the app: `demo/edit/` (own `package.json`, gitignored
`demo/raw/` inputs, committed composition code only). Do not add Remotion dependencies
to the `apps/web` workspace.

## Master spec

- Resolution **1920×1080**, 30 fps, ~165 s cap (4950 frames max)
- Screen footage: full-frame 1080p captures, no upscaling
- Voice: Recordly mic track, normalized −16 LUFS, light noise gate only
- Captions: `DEMO-CAPTIONS.md` retimed to recorded speech (SRT import)
- Music: none, or −28 dB bed under voice only in hook/close (judge must hear every word)

## Timeline (frames @30fps)

| Segment | Frames | Content |
| --- | --- | --- |
| Cold open | 0–120 | Homepage hero, pill legible; title card 24 f fade: `VEILSAVE` / `private amounts · public proof` |
| Hook→Problem | 120–1050 | Scenes 1–2; slow push-in (100→103%) on mechanism copy |
| Solution | 1050–1650 | Scene 3; underline callouts on `16 slots`, `encrypted weights`, `VRF`, `winner-only` |
| Live state | 1650–2550 | Scene 4–5; zoom to `2 / 16` stat card (hold 60 f), pan to slot grid |
| Proof | 2550–3900 | Scene 6–7; hold each: freeze (60 f), request id (60 f), outcome handle (90 f), Etherscan tab (90 f) |
| Limitation | 3900–4350 | Scene 8; banner framed full-width, no dimming (honesty must be readable) |
| Close | 4350–4950 | Scene 9; ending card: app URL, Sepolia, `Epoch 2 closes Sep 11` |

## Callouts & overlays (sparse, mono type, thin rules)

- `LIVE ON SEPOLIA` (open) · `2 / 16 · 14 AVAILABLE` · `EPOCH 1 · TERMINAL` ·
  `NO WINNER · NO REROLL` · `READ-ONLY · GATED, NOT BROKEN` (close of scene 8)
- Proof overlay: tx hash chip bottom-left during the Etherscan hold
- Ending card (3 s hold): `veilsave.vercel.app` / `Ethereum Sepolia` / `Epoch 2 closes September 11`

## Editing principles (binding)

Feel: real product + real state + real builder + clear story + proof. Motion only when
it aids comprehension: subtle zooms, clean crops, cursor-aware emphasis (small ring on
clicks that matter), short mono callouts. Never: glitch, 3D, meme transitions,
auto-zoom wandering, loud music, AI-slop gradients. Cursor stays visible in every frame
it was recorded in — no cursor removal passes.

## Retiming workflow (Phase 9)

1. Ingest `demo/raw/*` + Recordly voice track; log best takes per scene.
2. If narration deviates from `DEMO-VOICEOVER.md`, **captions follow the recording** —
   rewrite deviating cards in `DEMO-CAPTIONS.md` first, then time them.
3. Cut dead air >400 ms, keep 2 s scene handles; normalize voice before caption sync.
4. Render preview → frame-by-frame pass against Phase 10 QC (content, visual, audio,
   captions, pacing, technical) → fix → final MP4 (`demo/out/veilsave-demo-final.mp4`,
   H.264, AAC 48 kHz).
5. QC fails on: any unverified claim, any "winner" attached to epoch 1, any implied
   completed Epoch 2, any fabricated value, any skipped proof moment.

## Inputs the editor needs from the recorder

- Raw scene takes + take log (`demo/raw/`, `demo/TAKES.md` to be written at record time)
- The actual spoken lines where rephrased (caption retime source)
- Confirmation of which Etherscan tx was opened on camera
