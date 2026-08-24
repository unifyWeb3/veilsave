# VeilSave Visual Design Brief

## Assignment

Design the production VeilSave web experience using the frozen behavior in the supplied context files. Produce a coherent responsive system and annotated screens; do not redefine the product or contract flows.

Read first:

1. `design-input/product-context.md`
2. `design-input/architecture-context.md`
3. `design-input/ui-structure.md`
4. `docs/design/design-system-context.md`
5. `docs/design/screen-state-map.md`

Use `docs/design/design-brief.md` as the complete authoritative handoff when more detail is required.

## Desired character

A quiet, trustworthy savings console with a high-quality public verification surface. It should feel operational and mature, not like a token marketing site or a generic dark DeFi dashboard. Use a neutral foundation with clearly separated semantic colors; avoid a dominant purple/blue, slate, beige, or orange/brown palette.

Cards are for repeated records, dialogs, and framed tools, never for every page section and never nested. Keep radii at 8px or less. Use stable layouts for masked/revealed values, hashes, statuses, and buttons. Use Lucide icons for familiar controls and accessible tooltips for unfamiliar icons.

The Jorqeth URLs are quality and interaction references only. Do not copy their brand, layout, palette, navigation, or component designs.

## Screens to design

- Pool overview in disconnected and connected states.
- Dashboard with masked position, pending/eligible maturity, current draw, and Deposit/Withdraw.
- Deposit flow from cUSDT readiness through callback confirmation.
- Withdrawal flow with unknown routing, immediate completion, FIFO queue, partial settlement, claimable, and claimed states.
- Current draw and epoch-detail verification timeline.
- Winner proof/finality/ACL/reveal/claim states plus non-winner result.
- Privacy explanation.
- Wrong network, RPC down, relayer/KMS down, strategy unavailable, paused scope, stale data, and retry states.

Provide desktop and 360px mobile designs for the core dashboard, both financial flows, draw verification, and winner/withdrawal recovery.

## Content hierarchy

On the dashboard, principal safety and eligibility come before prize excitement. The user must always be able to see their current protocol state, the next safe action, and whether that action is a write, a local reveal, or a permissionless recovery call.

The draw surface must show public evidence in protocol order and include this limitation in plain language:

> Balances and odds remain hidden. The public can verify the randomness and authenticated execution trail, but cannot independently recompute the weighted result from plaintext balances.

## Confidentiality interaction

- Mask every financial value by default.
- Require explicit per-value reveal.
- Design loading, ACL pending, stale, unavailable, failure, retry, Hide, and session-clear behavior.
- Never imply that revealing one value reveals all values.
- Do not surface plaintext in toast notifications, page titles, URLs, activity lists, or public verification.

## Async interaction

Design distinct, calm states for local encryption, wallet approval, chain confirmation, token callback, VRF request/fulfillment, separate FHE draw, KMS proof, 96-block finality delay, ACL propagation, strategy redemption, rewrap, FIFO allocation, and confidential claim. Avoid indefinite spinners without explanation or recovery.

## Accessibility and responsive requirements

- WCAG 2.2 AA contrast and non-color status cues.
- Visible keyboard focus and correct semantic dialog/stepper/timeline behavior.
- Reduced-motion support.
- 44px minimum mobile targets.
- No hover-only information or recovery control.
- Long addresses/hashes truncate visually with copy access and accessible full labels.
- Text and controls must not overlap at any supported viewport.

## Frozen constraints

Exactly 16 slots, one weekly prize, strict FIFO queue, `TEST YIELD` default, public winner address, private prize, no reroll, no automatic decryption, and no trusted winner operator. Visual design may clarify these rules but may not change them.
