# VeilSave Design System

Confidential prize-linked savings on Ethereum Sepolia, built on Zama FHE and ERC-7984 confidential tokens. A saver deposits six-decimal cUSDT into one of exactly **16 public slots**. Principal, eligible weight, pending weight, withdrawal amount and prize amount stay **encrypted**. Yield funds **one prize per weekly epoch**. Principal stays withdrawable.

This design system exists so anyone building a VeilSave surface produces something the protocol can actually honour: asynchronous, honest about what is public, and calm while it waits.

**The one-line brand idea: _private money without private trust._** Your financial values stay yours; the draw stays inspectable. Every part of the system repeats that dyad — many sealed things in periwinkle, one proven thing in teal.

## Sources this was built from

| Source | Notes |
| --- | --- |
| `design-input/product-context.md` | Product, target user, promise, core loop, frozen behaviour, honest privacy copy |
| `design-input/architecture-context.md` | Contracts visible to the UI, public vs encrypted state, epoch and withdrawal lifecycles, security implications, timings needing explicit UI |
| `design-input/ui-structure.md` | Routes, dashboard hierarchy, required components and states, mobile rules, do-not-invent list |
| `design-input/design-brief.md` | Desired character, screens to design, content hierarchy, confidentiality and async interaction, accessibility, frozen constraints |
| `uploads/veilsave logo.jpg` → `assets/brand/veilsave-mark-exploration.jpg` | Mark exploration sheet: EPOCH / SLOTS / SHEAR candidates, and the palette anchors `#7C83FF` privacy, `#2FBFA0` verification, `#0B1020` ink |
| https://github.com/unifyWeb3/veilsave | **Empty at time of build** — the repository has no commits, so no frontend or contract source could be read. Worth re-reading once it is pushed: real component code beats any inference. |
| https://jorqeth.vercel.app/ and `/app` | Quality bar for pacing and restraint only. Nothing was copied — no palette, layout, navigation, component or copy. |

Referenced but not present in the material given to us: `docs/design/design-system-context.md`, `docs/design/screen-state-map.md`, `docs/product/product-spec.md`, `docs/spec/execution-spec.md`. If you have them, read them before extending this system.

## Index

| Path | What it is |
| --- | --- |
| `styles.css` | The single entry point — `@import`s only. Link this. |
| `tokens/colors.css` | Ink ramp, two brand accents, semantic washes, action and focus tokens |
| `tokens/typography.css` | Type scale, weights, tracking, composed `--type-*` roles, measures |
| `tokens/space.css` | Space scale, radii, rules, elevation, layout and breakpoint tokens |
| `tokens/motion.css` | Duration ladder, easing set, the six named keyframe patterns, reduced-motion collapse |
| `tokens/fonts.css` | Google Fonts import (see **Font substitution** below) |
| `tokens/base.css` | Resets, link colours, focus rings, and the `vs-*` text-role classes |
| `guidelines/*.card.html` | 20 foundation specimen cards (Colors, Type, Spacing, Motion, Brand) |
| `components/<group>/` | 33 reusable primitives — see **Components** |
| `ui_kits/console/` | The `/app` console: dashboard, deposit, withdrawal, draws, winner reveal |
| `ui_kits/site/` | The public homepage and privacy boundary |
| `assets/brand/` | Supplied mark sheet plus the three marks cropped out of it |
| `assets/icons/` | 44 Lucide outline SVGs, vendored |
| `thumbnail.html` | Project tile |
| `SKILL.md` | Agent-skill entry point |

## Components

Grouped by concern. Every component has a `.d.ts` props contract and a `.prompt.md` with usage.

**`components/core/`** — `Icon`, `Button`, `IconButton`, `Badge`, `StatusPill`, `Card`, `Tooltip`, `ProgressTrack`, `Tabs`, `SectionHead`
**`components/forms/`** — `AmountField`, `TextField`, `Select`
**`components/confidential/`** — `ConfidentialValue`, `FinancialMetric`, `PrivacyCallout`
**`components/protocol/`** — `EpochTimeline` (+ `EpochNodeLegend`, `VS_NODE`), `StatusStepper`, `SlotGrid`, `EvidenceRow`, `ProofBlock`, `QueueItem`, `TicketPanel`, `ResultState`, `ActivityItem`
**`components/feedback/`** — `RecoveryBanner`, `StateBlock`, `Toast`
**`components/shell/`** — `Wordmark`, `ConsoleNav`, `WalletControl`, `StrategyBadge`, `Sheet` (+ `useIsNarrow`)

The inventory comes from `ui-structure.md`'s required-component list crossed with the brief's component list. **Intentional additions** (not named in the source, added because the screens could not be built without them): `Icon` (wrapper for the Lucide set), `SectionHead` (so sections can be ruled instead of carded), `Wordmark` (no logo file was supplied), `QueueItem` (the row `TicketPanel` composes), `ProgressTrack` (the spinner replacement), `useIsNarrow` (the responsive switch the kits share).

Deliberately **not** built, because the product does not have them: pools/asset selection, APY or estimator, prize tiers, leaderboard, referrals, NFTs, governance, operator dashboard, auto-reveal, anonymity mode, avatars, toast queues for values.

## Content fundamentals

**Voice: a competent operator, not a marketer.** Short declaratives. No exclamation marks, no hype, no "seamless", no "revolutionary". The product is a savings console handling other people's money on a testnet, and the copy sounds like it.

- **Second person for the user, third person for the protocol.** "Your savings amount is encrypted." "The controller is redeeming from the strategy." Never "we" for protocol actions — there is no operator to be.
- **Sentence case everywhere.** Uppercase is reserved for eyebrow labels, micro metadata and machine values (`EPOCH 42`, `BLOCK 5 812 004`, `TEST YIELD`) — set with `0.09em` tracking. Buttons and titles are sentence case.
- **Name the wait, then the reason.** "Awaiting randomness" + "Chainlink holds the request. Fulfilment usually lands within minutes." Never a bare spinner, never "Loading…".
- **Say what is safe.** Any error, pause or queue state that could read as loss carries a safety line: "Your principal is unaffected." "No value is lost and your position does not move."
- **A queue is not a failure.** Withdrawal queue copy is neutral-to-positive: "Your withdrawal is queued in request order."
- **Never overclaim privacy.** Use the approved sentences verbatim: _"Your savings amount is encrypted. Your wallet address and transactions remain public."_ and _"Balances and odds stay hidden. Anyone can inspect the randomness and authenticated execution trail, but cannot recompute the weighted result from plaintext balances."_ Never "anonymous", "untraceable", "fully private", "invisible".
- **Never imply return.** `TEST YIELD` appears wherever prize funding is implied, and never near a number that looks like a rate. No APY, no projection, no "earn up to".
- **FHE vocabulary is progressive.** Ordinary flows say "encrypted", "reveal", "private access". Words like ACL, KMS, ciphertext handle and rewrap appear only in evidence surfaces, tooltips and expanded technical detail — never in a primary button.
- **No emoji, anywhere.** Not in UI, not in copy, not as status. Status is glyph + colour + word.
- **Numbers are exact.** Six decimals for cUSDT (`1,284.720000`), thin-space grouping for block numbers, `of 16` for slots, epoch as `E42` in dense metadata and "Epoch 42" in prose.

Micro-copy that carries the system: `Reveal` · `Hide` · `Preparing secure reveal…` · `Private access is being confirmed` · `Private value unavailable` · `Visible in this session only` · `Encrypted in your browser before it is submitted` · `Eligible from epoch 43` · `Local only` · `Terminal — no reroll`.

## Visual foundations

**Palette.** Surfaces are deep navy drifting toward dark teal as they rise: page `#04080D` → deep `#061019` → brand `#0B1020` (the supplied ink, used as the hero and footer band) → base `#08111A` → raised `#0C1622` → elevated `#111C29` → inset `#16222F`. Two brand accents and two held-back semantics sit on top. Periwinkle `#7C83FF` means *encrypted / private / the masked many* — masked values, reveal actions, your own slot, active protocol steps. Teal `#2FBFA0` means *verified / settled / the singular proven thing* — authenticated proof, completed steps, claimable funds, the drawn slot, the winner. Amber `#DFA43A` only ever means *waiting on the protocol* (VRF, KMS, ACL, settlement, stale data, `TEST YIELD`). Red `#E4575E` only ever means *failed or blocked*. The accents are semantic-only, never decorative: a typical screen is ~90% ink, and status tints a surface at exactly 9–10% wash + 38% border, never more.

**Type.** Instrument Sans carries everything a person wrote or reads as language, plus every financial value. IBM Plex Mono carries everything a machine produced or measures — addresses, hashes, ciphertext handles, block numbers, epoch ids — **and every structural label**, which is the decision that keeps the interface from reading as a generic uppercase-sans dashboard. Four scales that never overlap in size: display (46→80 hero, 36→56 section, at `-0.032em`), title (22/18/16), numeric (44→60 down to 16, always tabular), mono (13/11). Body is 15/1.62 on a 62ch measure; marketing prose steps up to a 17→19 lead. **Masked values are six marks, always**, in periwinkle over a hairline "seal" rule — the digit count is private too, and the layout never reflows on reveal. That remains the single most important typographic decision in the system.

**The field.** One ambient environment, used at the top of the console and behind three homepage bands: a **64px hairline lattice** — the same geometry the 16-slot grid uses, so the background is a measuring grid rather than decoration — masked from the top, never above 7% opacity behind copy, plus three low radial washes (privacy top-left, verification bottom-right, brand navy pulling up through the page). `.vs-field` applies it; `.vs-field-flat` is the console's quieter variant. Inside panels the same lattice runs at 36px, masked to the top-left corner. This is the *only* background art in the system: no photography, no illustration, no noise, no glass panes, no blobs, no fake depth.

**Layout and rhythm.** Ruled sections, not stacked cards. On the homepage, rhythm comes from **alternating full-bleed bands** (page → deep → page → brand+field → page → deep) with one field section per screenful — never from a wall of floating cards. In the console, `SectionHead` + a hairline separates content, and `Frame` supplies the panel-with-lattice treatment for diagrams. 236px console rail above 900px, bottom navigation below; 1220px content max; 40px desktop gutters, 20px mobile; 44px minimum touch targets.

**Elevation.** Four steps, and depth is structural before it is atmospheric. Inset (`--surface-inset`, darker not lifted) for fields and wells. Panel (`--shadow-panel`: a 1px contact shadow plus a low 28px wash) for records and tools. Overlay (`--shadow-overlay`) for dialogs and sheets. Glow (`--glow-private` / `--glow-verified`) **only** where the protocol changed state — the drawn slot, a claimable prize. Three panel weights of one treatment: `.vs-panel-quiet` (grouping), `.vs-panel` (default), `.vs-panel-lifted` (anchors a view). Panels never nest and never float free of a hairline.

**Corners and borders.** 2 / 4 / 6 / 8px, and nothing rounder than 8px. Pills are for status only. Borders are hairline by default (`rgba(156,172,192,0.12)`); a status border is that status's colour at 38%.

**Motion.** Seven durations (90 / 140 / 220 / 380 / 640 / 900 / 1400ms) and five curves, including `--ease-mechanical` for protocol progress and `--ease-settle` — one soft overshoot, used only on reveal. Eight named patterns: **ENCRYPT** (a value collapsing into confidentiality), **DECRYPT** (blur-up on owner reveal), **SCAN** (a travelling band — VeilSave has no rotating spinners), **TICK** (protocol advancing one notch), **ATTEST** (a step being sealed, left to right), **SETTLE** (a queue item moving forward and coming to rest), **BREATHE** ("waiting on something outside this browser"), **HALO** (one state change worth noticing, played a fixed number of times and never looped). The homepage adds a single scroll pattern — 12px rise, one direction — and the hero pool field runs the real epoch lifecycle on a 2.6s cadence. Reduced motion collapses every duration to 1ms at the token layer and holds the hero on its finalized state.

**States.** Hover lightens by a 6–8% neutral wash (primary buttons go to pure white); press is a 0.5px settle, never a scale bounce; focus is a 2px periwinkle outline at 2px offset, always visible; disabled is a 6% wash with faint ink and no border. Transparency and blur appear in exactly three places: the sticky headers (82–84% surface + blur), the dialog scrim (74% + 3px blur), and the SCAN band.

**The hero is a diagram, not a backdrop.** `ui_kits/site/PoolField.jsx` is the reference for how VeilSave communicates itself: 16 real slots above a labelled ENCRYPTED / PUBLIC boundary, the evidence trail printing below it, and the epoch axis underneath — cycling through the true lifecycle. A first-time visitor sees the product working before reading a word about FHE. Any future hero visual must earn its space the same way: if it does not carry product state, it does not belong.

## Iconography

**Lucide outline is the icon system** (specified by the design brief). 44 glyphs are vendored into `assets/icons/` from `lucide-icons/lucide` (ISC) and inlined into `components/core/Icon.jsx` as path data, so the set works offline and inherits `currentColor`. Use `<Icon name="shield-check" />`; names match the file names.

- 24×24 grid, **1.5px stroke** at 14–20px, 1.8–2 below 13px. Never filled variants, never mixed weights.
- Privacy glyphs (`lock`, `lock-open`, `eye`, `eye-off`, `key-round`) render periwinkle; verification glyphs (`check`, `circle-check`, `badge-check`, `shield-check`, `file-check`) render teal; everything else inherits ink.
- Every status glyph is redundant with a word — colour is never the only cue (WCAG 2.2 AA, non-colour status cues).
- Unfamiliar controls get an accessible `Tooltip`; icon-only controls always carry a `label`.
- **No emoji and no unicode symbols as icons.** No hand-drawn SVG: if a glyph is missing, add the real Lucide file.
- The brand's own geometric figures — the 16-tick epoch dial and the 4×4 slot board — are **product components** (`SlotGrid`, and the epoch glyph in `Wordmark`), not icons.

## Brand assets and the logo gap

`assets/brand/veilsave-mark-exploration.jpg` is the supplied sheet; `mark-epoch.png`, `mark-slots.png` and `mark-shear.png` are cropped from it. **No vector logo was supplied and none was invented.** Wherever a mark would go, `Wordmark` sets the name in type (`veil` at 500 in muted ink, `Save` at 600 in primary). Send the chosen mark as SVG and it can replace the glyph in one component.

## Font substitution — needs your input

No font binaries came with the material. `tokens/fonts.css` loads **Instrument Sans** + **IBM Plex Mono** from Google Fonts as the closest match to the precise low-contrast grotesque and technical mono the brand sheet implies. If VeilSave has licensed faces, send them and this becomes local `@font-face` rules with no other change.

## Accessibility notes

WCAG 2.2 AA contrast on every text token except `--text-faint`, which is documented as decorative/large-only. Visible 2px focus on all interactive elements. Dialogs are `role="dialog" aria-modal` with Escape close. Steppers and timelines are ordered lists. Masked values expose their state in text, and full hashes are available to screen readers behind the truncated display. Status is never colour-only. No hover-only information or recovery control. 44px minimum targets, reduced-motion support at the token layer.

## Known gaps

- **Light theme.** Not built — the supplied brand ink is a dark surface and one theme was done properly instead of two at half quality.
- **Empty upstream repo.** Real contract call names, event shapes and error strings could not be read; the kits use plausible placeholders in `mock.jsx`.
- **`Toast` has no host.** The component exists; a positioned toast region/queue is left for engineering.
- **Charts.** None. The product has nothing worth charting, and the brief warns against meaningless ones.
