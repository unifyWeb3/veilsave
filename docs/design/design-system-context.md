# VeilSave Design System Context

## Design objective

VeilSave should feel like a quiet, precise savings console with an unusually strong verification layer. The product is financial infrastructure, so hierarchy, state clarity, and recovery controls take precedence over decorative storytelling.

The interface must communicate three qualities at once:

- confidential amounts without implying anonymous activity;
- transparent public protocol evidence without implying plaintext recomputation;
- patient, honest asynchronous processing without making the product feel broken.

## Visual character

- Calm, operational, and contemporary.
- High information clarity with compact spacing and deliberate whitespace.
- A neutral base with distinct semantic colors for privacy, verification, success, warning, and failure; avoid a one-hue purple/blue or dark-slate treatment.
- Borders and surface contrast should organize information without turning every section into a floating card.
- Cards are reserved for individual repeated records, modals, and framed tools; use an 8px maximum radius unless the final token system establishes a smaller value.
- Typography should be legible and measured. Compact panels use compact headings; no viewport-scaled type or negative letter spacing.

## Reference use

The Jorqeth references are interaction-quality benchmarks only. Study their confidence, responsiveness, transaction-state feedback, and polish. Do not copy their brand, palette, page composition, component geometry, navigation, or content hierarchy.

## Component behavior

- Use Lucide icons for familiar actions and status symbols.
- Use icon buttons for copy, refresh, reveal/hide, external link, close, and navigation where the symbol is familiar; provide tooltips and accessible names.
- Use text or icon-plus-text buttons for explicit commands such as Deposit, Withdraw, Claim, Retry, and Connect.
- Use segmented controls only for genuine mutually exclusive views.
- Use toggles/checkboxes only for binary preferences, never for transaction confirmation.
- Keep hashes, addresses, values, status labels, and buttons inside stable responsive constraints so async content cannot shift the layout.
- Never nest cards or stack modal dialogs.

## Confidential values

The confidential-value component is a first-class design-system primitive.

Required anatomy:

- semantic label;
- stable-width masked value;
- optional unit;
- Reveal/Hide icon control;
- freshness/ACL status;
- loading and retry affordance;
- accessible live-region announcement that does not read plaintext unexpectedly.

Rules:

- Mask by default on every session and device.
- Reveal only after an explicit user action.
- Reveal one value at a time unless the user explicitly selects a grouped reveal designed for that exact surface.
- Never place plaintext in notifications, URLs, analytics, error reports, console logs, or clipboard automatically.
- Hiding removes the rendered plaintext and clears it from application state as soon as practical.

## Status and motion

Async protocol operations use a consistent step vocabulary: Initiated, Awaiting wallet, Submitted, Confirming, External dependency pending, Fulfilled, Retry available, and Terminal.

Motion should clarify state change:

- short transitions for disclosure and step progression;
- no looping decorative animation around long-running operations;
- progress indicators must not imply deterministic completion time for VRF, FHE, KMS, ACL propagation, or strategy settlement;
- support `prefers-reduced-motion` throughout.

## Content rules

Preferred privacy copy:

- “Your savings amount is encrypted. Your wallet address and transactions remain public.”
- “Balances and odds stay hidden while the randomness and execution trail remain inspectable.”
- “Prize access is private to the finalized winner and may take time to propagate.”
- “Aggregate strategy movements are public and may reveal pool-level timing and amounts.”

Forbidden claims:

- everything is private;
- anonymous deposits;
- invisible activity;
- guaranteed yield or APY for the test strategy;
- independently reproducible weighted result from public plaintext data.

## Accessibility baseline

- WCAG 2.2 AA color contrast.
- Complete keyboard flow for wallet-independent controls, dialogs, reveal/hide, timelines, and recovery actions.
- Visible focus indicators that are not color-only.
- Semantic headings, lists, status regions, tables, and dialogs.
- Text alternatives for every status icon; color never carries meaning alone.
- Minimum 44px touch targets on mobile.
- Screen-reader announcements for transaction-step changes without exposing masked plaintext.
- No countdown or timeout may be the sole way to understand or complete a required action.

## Responsive baseline

Design mobile-first at 360px, then verify tablet and desktop widths. The dashboard must preserve position, epoch, prize, and withdrawal recovery visibility without horizontal scrolling. Dense verification data may use responsive rows, truncation plus copy, and ordered vertical timelines, but must never omit evidence.

## Design-system output expected later

The visual design milestone should deliver tokens for color, typography, spacing, radii, borders, shadows, motion, and breakpoints; component states for every primitive listed in `ui-structure.md`; and annotated desktop/mobile screens for all paths in `screen-state-map.md`. It must not alter contract behavior, maturity, FIFO order, privacy boundaries, or lifecycle states.
