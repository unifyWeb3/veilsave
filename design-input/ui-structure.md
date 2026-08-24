# VeilSave UI Structure for Visual Design

## Routes

- `/`: usable pool overview with connect/open-dashboard action, current epoch, strategy label, slot occupancy, and concise privacy facts.
- `/app`: connected dashboard containing position, Deposit/Withdraw, epoch, prize, queue, and recent activity.
- `/draws`: current and historical public verification timelines.
- `/draws/:epochId`: exact evidence for one epoch.
- `/privacy`: public/private data boundary and security limitations.

Deposit and withdrawal are modal flows on desktop and full-height sheets on mobile. Prize reveal stays within the connected dashboard/winner state rather than becoming a public leaderboard page.

## Dashboard hierarchy

1. Recovery or safety banner, only when actionable.
2. Network and `TEST YIELD`/`LIVE STRATEGY YIELD` identity.
3. Confidential position with independent value reveals.
4. Deposit and Withdraw commands.
5. Current epoch timeline and next maturity.
6. Prize state for the connected wallet.
7. FIFO ticket and settlement recovery, when present.
8. Privacy-safe recent activity.

## Required components

- wallet/network control;
- strategy-mode badge;
- confidential-value row;
- amount field with six-decimal validation;
- epoch timeline and status stepper;
- verification evidence row with explorer/copy controls;
- slot occupancy indicator;
- transaction operation panel;
- FIFO ticket/claim panel;
- winner and non-winner result states;
- privacy-boundary callout;
- retry/recovery banner;
- empty, stale, unavailable, and terminal states.

## Required component states

Confidential value: Masked, Revealing, Revealed, Stale, Unavailable, Error.

Operation: Draft, Encrypting, Awaiting wallet, Submitted, Confirming, External dependency pending, Fulfilled, Retryable, Terminal.

Network/data: Disconnected, Wrong network, Loading manifest, Manifest invalid, RPC unavailable, Relayer/KMS unavailable, Fresh, Stale.

## Mobile

- Design at 360px first.
- Use bottom navigation for Pool, Dashboard, and Draws.
- Keep Deposit/Withdraw and active recovery action within reach without obscuring content.
- Turn verification grids into chronological vertical timelines.
- Never hide evidence, queue position, or retry actions behind hover.
- Keep every touch target at least 44px and every dialog keyboard/screen-reader operable.

## Do not invent

Do not add pools, assets, strategy selection, APY, fees, prize tiers, anonymity modes, auto-reveal, waitlists, operator dashboards, social content, referrals, NFTs, governance, or user-editable draw parameters.
