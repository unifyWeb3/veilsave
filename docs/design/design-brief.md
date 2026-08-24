# VeilSave Design Brief

Handoff: Claude Design

Status: Product behavior frozen. Design must represent this specification and must not invent functionality.

Primary references:

- `docs/product/product-spec.md`
- `docs/architecture/architecture.md`
- `docs/spec/execution-spec.md`

## 1. Product

VeilSave is a weekly confidential prize-linked savings pool on Ethereum Sepolia.

The user saves cUSDT, keeps their financial amounts encrypted, waits one full epoch for deposit eligibility, participates in a Chainlink VRF plus FHE weighted draw, and can withdraw principal at any time through an immediate or strict FIFO path. The winner address becomes public; only the winner receives prize-decryption permission. Public aggregate strategy data can still let observers infer or bound a value, which the interface must disclose honestly.

The central product line is:

> Save privately. Verify the draw. Reveal only what is yours.

The required short disclosure is:

> Your savings amount stays encrypted. Your wallet address and transactions remain public.

The MVP is one pool, one asset, 16 public slots, one seven-day epoch at a time, one winner, and one prize.

## 2. Audience

Design for a crypto-wallet user who:

- saves stable-value assets;
- understands wallet connections and transaction confirmations;
- does not want their savings amount publicly visible;
- accepts public addresses and transaction metadata;
- values transparent randomness and execution evidence;
- expects principal access without prize lock-in; and
- tolerates asynchronous cryptographic/strategy steps when their status and recovery are clear.

Do not optimize the primary flow for institutional custody, social recovery, anonymous users, fiat onboarding, or people unfamiliar with wallets. Those would require new product behavior.

## 3. Brand and Visual Direction

### Desired character

- Calm, precise, private, and trustworthy.
- Technical evidence should feel legible rather than intimidating.
- Savings is the main mental model; the prize is an earned possibility, not casino spectacle.
- The product should look production-minded while retaining enough distinction for a hackathon demo.

### Visual direction

- Dark ink/navy foundation with warm off-white surfaces in light mode or a restrained dark-first interface.
- One cool privacy accent such as muted indigo or electric periwinkle.
- One verification/success accent such as teal.
- Amber for pending/external dependency states and red only for blocked/loss/error states.
- High-contrast text; avoid low-contrast gray-on-gray fintech styling.
- Subtle line/grid motifs may suggest encrypted structure, but do not use large decorative gradients, glow orbs, shield stock art, or literal padlock wallpaper.
- Use crisp dividers, compact tables, and a real protocol timeline. Avoid a page made of floating rounded cards.

### Shape and typography

- Use modest radii, generally `6-8px`; not pill-shaped containers.
- Pills are reserved for statuses, modes, and compact tags, not normal buttons/sections.
- Do not use huge headline typography, negative letter spacing, viewport-width font scaling, or oversized marketing copy.
- Use a clear sans-serif interface typeface and tabular numerals for public times/IDs/amount placeholders.
- Monospace is appropriate for addresses, hashes, request IDs, and handles, but not for body copy.

### Iconography

- Use Lucide icons in implementation.
- Prefer familiar icons for wallet, eye/reveal, eye-off/remask, copy, external link, retry, clock, shield/privacy, alert, and check.
- Unfamiliar icon-only controls require tooltips and accessible labels.
- Do not draw custom SVG icons unless an existing Lucide symbol cannot communicate the action.

## 4. UX Principles

### Mask by default

Never show or request automatic decryption on mount. Private values render as `****** cUSDT` or `Private`, not `0`.

### Separate protocol stages

VRF requested, VRF fulfilled, FHE draw, winner proof, winner finalization, ACL propagation, prize reveal, and claim are different UI states. Do not compress them into one spinner.

### Public evidence near action

Every public draw/settlement stage should expose an explorer link, stable ID, and short explanation without forcing users into a separate technical console.

### Principal before prize

The primary dashboard hierarchy is position, eligibility, next draw, withdraw. Prize messaging is secondary until the user wins.

### Honest privacy language

Use `Private amount, public activity.` near deposit and withdrawal. Never say anonymous, invisible, or fully private.

### Honest test yield

`TEST YIELD` must be visible in the pool header, strategy panel, prize-source explanation, draw page, and demo. It must not be presented as an APY.

### Recovery over dead ends

Every retryable state must show what remains safe, what is unchanged, and the next allowed action.

## 5. Information Architecture

Keep the primary navigation small:

```text
VeilSave logo/name
Pool
Draws
Privacy
Network/health
Wallet
```

Routes/screens:

1. **Pool overview/dashboard** (`/`)
2. **Draw detail/verification** (`/draws/:epochId`)
3. **History** (`/history`)
4. **Privacy and trust** (`/privacy`)
5. **Action dialogs/drawers** for connect/network, acquire cUSDT, reserve slot, deposit, withdraw, reveal, claim, and recovery

There are no pages for governance, multiple pools, strategies, referrals, NFTs, APY analytics, social features, or admin operations.

## 6. Screens

### 6.1 Pool overview / connected dashboard

This is the first screen, not a separate marketing hero.

Desktop layout:

```text
+------------------------------------------------------------------+
| Header: VeilSave | Pool | Draws | Privacy | Health | Wallet      |
+------------------------------------------------------------------+
| Pool title + TEST YIELD label + epoch countdown + primary action  |
| Short disclosure: private amount, public activity                 |
+--------------------------------------+---------------------------+
| Your private position                | Current draw status       |
| principal [masked/reveal]             | compact public stepper    |
| eligible/pending status               | view verification         |
| slot and maturity                     |                           |
| Deposit  Withdraw                     |                           |
+--------------------------------------+---------------------------+
| 16-slot public participation table                                 |
| slot | address | state | current-epoch presence (no values)       |
+------------------------------------------------------------------+
| Strategy and liquidity status | Privacy boundary summary          |
+------------------------------------------------------------------+
```

First viewport must show:

- the product/pool name;
- `TEST YIELD` or `LIVE STRATEGY YIELD` mode;
- epoch countdown/status;
- connect/reserve/deposit action appropriate to the user;
- short privacy disclosure; and
- at least the beginning of the position/draw surface.

Do not hide the actual application below a large brand statement.

Disconnected state:

- public pool status and draw timeline remain visible;
- private position area explains what connection enables;
- connect wallet is primary.

Wrong-network state:

- persistent banner and action to switch to Sepolia;
- no encryption/deposit action until corrected;
- public history can still be read through the configured Sepolia RPC.

### 6.2 Deposit flow

Use a focused modal or right-side drawer with a short stepper:

```text
1. Prepare cUSDT
2. Enter private amount
3. Encrypt locally
4. Confirm wallet
5. Verify pool credit
```

Required content:

- current cUSDT availability masked by default with an explicit Reveal action;
- amount input with no analytics/autocomplete leakage;
- maturity statement: `Deposits made now become eligible after one complete epoch.`;
- show the exact first eligible epoch. During a post-freeze/pre-next-open gap, explain that the previous maturity boundary has passed and the deposit first participates in the epoch after the next one;
- disclosure: `The amount is encrypted. Your deposit transaction and slot are public.`;
- distinct encrypting, proof-ready, wallet-confirmation, submitted, receipt, accounting-verification, success, and retry states;
- cUSDT acquisition action if unavailable.

Success should show target maturity epoch, not a plaintext balance by default.

### 6.3 Active savings position

The position component is a structured panel, not a set of nested cards.

Rows:

- Principal: `****** cUSDT` + Reveal.
- Eligible weight: `Private` + Reveal.
- Pending weight: `Private` + maturity epoch.
- Slot: public `#N` and shortened address.
- Next draw: date/time and status.
- Withdrawal: `Immediate when confidential liquidity is available; otherwise FIFO.`

When revealed:

- show a local-only indicator;
- provide Remask;
- mark Stale after relevant transactions;
- do not persist across account/network change.

### 6.4 Draw detail / verification

This is the core differentiation surface.

Header:

- Epoch ID and outcome.
- Open/close/terminal times.
- Slot count `16 fixed slots` and frozen participant count.
- `View on explorer` actions.

Main content is a vertical timeline on mobile and two-column evidence timeline/detail panel on desktop:

1. Epoch frozen.
2. VRF requested.
3. VRF fulfilled.
4. Random word synchronized.
5. FHE draw executed.
6. Encrypted winner handle ready.
7. 96-block finality/ACL delay.
8. KMS proof submitted.
9. Winner finalized or no-winner/abandoned outcome.
10. Prize ACL state.

For every step show:

- status icon;
- timestamp/block;
- transaction/request ID shortened with copy;
- explorer link;
- one-sentence meaning;
- retry/progress action only when permissionless and safe.

When VRF is fulfilled, show that the fixed 24-hour draw-execution window has started. Synchronizing the word later must not visually reset or extend that deadline.

Prominently display:

> Balances and odds remain hidden. The public can verify the randomness and authenticated execution trail, but cannot independently recompute the weighted result from plaintext balances.

Do not display hidden weights as blank bars, estimated odds, rankings, or visual proportions.

### 6.5 Winner experience

For the winning address:

- Use a restrained success state, not gambling-style confetti by default.
- Headline: `You won Epoch N`.
- Prize remains `****** cUSDT`.
- Show evidence link and status:
  - Winner finalized.
  - Waiting for prize permission.
  - Permission available.
  - Decrypting locally.
  - Prize revealed.
  - Claim submitted/received/retryable.
- Primary action changes from `Wait for permission` (disabled/status) to `Reveal prize` to `Claim confidentially`.
- Allow claim without reveal.
- Explain: `Your prize amount is not published onchain.`
- Show lost-wallet warning in prize help, not as an alarming modal after winning.

For non-winners:

- `No prize this epoch`.
- `Your principal remains yours and your eligible savings continue into the next epoch unless withdrawn.`
- Show final winner address and verification link.
- Do not show a zero prize field or trigger decryption.

### 6.6 Withdraw flow

Use a focused modal/drawer with these stages:

```text
Enter private amount
-> encrypt and confirm
-> immediate transfer attempted
-> routing proof pending
-> immediate complete OR queued
```

Before confirmation:

- state that the actual route is confidentially determined;
- explain that public observers see the request and later queue/settlement status, not the amount;
- explain that withdrawal reduces future eligibility but not an already frozen snapshot.

Immediate state:

- `Withdrawal completed from confidential pool liquidity.`
- User may reveal their wallet cUSDT separately.

Queued state:

- public ticket ID;
- FIFO position based on public order, never amount;
- current head/non-head state;
- settlement stage;
- `Your amount remains encrypted.`;
- progress/retry action if safe and permissionless.

Partial head settlement:

- show `Partially paid; remains first in queue` without revealing amount;
- owner can explicitly reveal the remaining claim locally.

### 6.7 History

One compact filterable table/list for:

- epochs;
- draw outcomes;
- public verification status;
- strategy settlements and mode;
- connected user's public deposit/withdraw/prize action references.

Do not build charts implying private TVL, private balance distribution, APY, or odds.

### 6.8 Privacy and trust screen

Use a clear privacy boundary table:

| Private | Public |
| --- | --- |
| Principal amount | Wallet address |
| Eligible/pending weight | Slot membership/order |
| Prize amount | Winner address |
| Queued claim amount | Request/queue timing |
| Draw intermediates | VRF and draw transactions |
| Internal reserves | Aggregate strategy settlement |

Include sections for:

- amount confidentiality, not anonymity;
- aggregate leakage;
- the difference between decryption authority and side-information inference, including known-reserve and `TEST YIELD` cases;
- winner identity;
- public wrap/unwrapper boundary;
- standard token/wrapper ciphertext handles as public, correlatable metadata even though they are not plaintext amounts;
- browser compromise/XSS/extensions;
- lost-wallet/no-admin-recovery policy;
- Chainlink/FHEVM/KMS/strategy/admin trust;
- test-yield definition.

This is essential product content, not legal fine print.

### 6.9 Error and recovery surfaces

Use a persistent operation panel/toast center for long-running actions. Each item includes:

- operation name;
- stable public ID/tx hash;
- last successful stage;
- what remains safe/unchanged;
- current dependency/error;
- retry/resume action;
- explorer link.

Avoid generic `Something went wrong` toasts when a defined recovery state exists.

## 7. Components

### Global

- App header/network/wallet control.
- Protocol health indicator.
- Strategy mode label: `TEST YIELD` or `LIVE STRATEGY YIELD`.
- Pause/loss banner.
- Explorer link and copy-address/hash controls.
- Operation/recovery center.

### Confidential values

- `ConfidentialValue`: masked/reveal/remask/stale/error.
- `RevealPermitDialog`: scope, chain, contract, expiry, signing reason.
- `PrivateStateLabel`: distinguishes private, unavailable, and zero.

### Pool

- Position panel.
- Eligibility/maturity row.
- Epoch countdown/status.
- Slot capacity meter (`occupied of 16`) without value ranking.
- Public slot table.
- Deposit and withdraw action controls.

### Draw

- Draw timeline/stepper.
- Evidence detail row.
- Snapshot commitment display.
- VRF request/word display.
- Encrypted winner handle display.
- Finality-block progress.
- Verification-limitation notice.
- Winner outcome panel.

### Withdrawal/settlement

- Withdrawal flow stepper.
- FIFO ticket/position row.
- Settlement stage indicator.
- Partial-head state.
- Permissionless progress/retry control.
- Aggregate-leakage notice.

### Privacy/help

- Privacy boundary table.
- Trust stack explanation.
- Contextual tooltips/popovers.
- Wallet-loss warning.

Do not overcomponentize every text block into a card. Use sections, rows, tables, dividers, and one level of containment.

## 8. Interaction Flows

### First visit

```text
Load public pool state
-> show chain/strategy/epoch/slots
-> connect wallet
-> network check
-> SDK readiness check
-> cUSDT/slot check
-> offer next valid action
```

### First deposit

```text
Acquire/wrap cUSDT if needed
-> reserve slot/bond
-> privacy disclosure
-> enter amount
-> encrypt locally
-> wallet confirmation
-> canonical receipt
-> pool accounting reread
-> pending maturity success
```

### Private reveal

```text
masked value
-> click Reveal
-> explain scoped permit
-> wallet signature
-> decrypting
-> locally revealed
-> stale/remask/account-change clear
```

### Draw progression

```text
close reached
-> permissionless freeze
-> request VRF
-> fulfillment polling
-> synchronize
-> execute FHE draw
-> wait 96 blocks
-> retrieve/submit proof
-> final winner
```

Each permissionless action must say `Anyone can progress this step. The outcome is already bound.`

### Winner

```text
public winner finalized
-> ACL propagating
-> explicit reveal permit
-> prize decrypted locally
-> confidential claim
-> claim state reread
```

### Withdrawal

```text
enter/encrypt amount
-> tx and immediate transfer attempt
-> routing boolean proof
-> immediate terminal
   OR FIFO queued
-> aggregate strategy redemption
-> confidential liquidity returned
-> FIFO head service
-> completion boolean proof
-> terminal
```

## 9. Confidential-Value Handling

### Default presentation

- Amount: `****** cUSDT`.
- Weight/odds: `Private`.
- Uninitialized/unavailable: `Unavailable`, never `0`.
- Loading: preserve the masked field width; do not replace it with a resizing skeleton.

### Reveal behavior

- Explicit button only.
- Explain signature purpose before wallet prompt.
- Scope permit to required chain/contracts only.
- Plaintext appears in the user's active client only.
- Provide visible `Revealed locally` and `Remask` controls.
- Mark stale after dependent transaction; do not silently show an old value as current.
- Clear on account/network switch.

### Privacy-safe UI details

- Never place amounts in page title, URL, query string, notification, clipboard automatically, analytics, console, error report, or DOM metadata.
- Avoid rendering private plaintext in offscreen accessible duplicates.
- Screen-reader labels must not expose masked plaintext through hidden elements.
- Browser autofill should be disabled for private amount inputs where appropriate.

## 10. Async States

### Standard visual vocabulary

| State | Visual treatment | Copy style | Action |
| --- | --- | --- | --- |
| Not started | Neutral outline/icon | What the step will do | Start if valid |
| Local processing | Indigo spinner/progress | `Encrypting on this device` | Cancel only if safe |
| Wallet action | Wallet icon/amber | `Confirm in wallet` | Reopen/retry |
| Onchain pending | Clock/amber | Tx submitted, awaiting canonical receipt | Explorer link |
| External dependency | Linked-node/amber | VRF/KMS/strategy is pending | Poll/retry safely |
| Ready to progress | Indigo emphasis | Outcome/input already bound | Permissionless action |
| Success | Teal check | Exact completed stage | Next action |
| Retryable failure | Amber/red outline | What stayed safe and why retry is safe | Retry/resume |
| Terminal no-award | Neutral terminal | Prize rolled forward; no reroll | Next epoch |
| Loss/blocked risk | Red banner | Strategy impairment; exits remain available | Withdraw/recovery |

Do not use a single generic spinner for all pending operations.

### Latency handling

- Avoid exact ETA promises for relayer/KMS/strategy.
- Show elapsed time, deadline if protocol-defined, and last checked block.
- For 96-block finality, show blocks remaining and explain why.
- For winner proof after handle creation, no expiry countdown exists; keep retry available indefinitely.
- Persist public operation IDs across reload, not private data.

## 11. Draw Verification

The verification surface must show:

- epoch ID;
- frozen status/time/transaction;
- fixed slot capacity and frozen participant count;
- snapshot commitment;
- VRF request ID/transaction;
- fulfillment transaction/time;
- public random word/reference;
- separate FHE draw transaction;
- measured HCU/gas badge/link for deployed version;
- encrypted winner handle;
- 96-block grant delay;
- winner proof/finalization transaction;
- final winner or no-winner/abandoned outcome; and
- prize ACL state without amount.

Use a `What this proves` / `What stays hidden` two-column explanation:

**What this proves**

- Inputs were frozen before randomness.
- The used word came from the bound Chainlink request.
- The fixed contract executed the FHE draw transaction.
- The final address is the KMS-authenticated plaintext of the encrypted winner handle.
- The epoch finalized once.

**What stays hidden**

- Individual balances and weights.
- Encrypted total, threshold, and prefixes.
- Prize amount.
- Independent plaintext recomputation of the weighted result.

Add a nearby qualification: the prize is never publicly decrypted, but observable aggregate strategy flows or a known reserve history may let observers infer or bound it. Do not present ACL confidentiality as guaranteed resistance to all side information.

Do not draw faux odds bars or imply public verification of hidden plaintext values.

## 12. Winner UX

### Winner detection

- Compare connected address to public finalized winner.
- Do not infer winner from frontend/private calculations.
- Account changes recalculate public winner relationship and clear revealed prize.

### ACL states

1. `Winner not finalized`.
2. `Winner handle ready; waiting for 96-block safety delay` while proof finalization is not yet allowed.
3. `Prize permission submitted`.
4. `Prize permission propagating`.
5. `Prize reveal available`.
6. `Decryption unavailable - retry`.
7. `Prize revealed locally`.

Do not describe finalization receipt alone as successful decryption.

### Prize claim

- Allow claim without reveal.
- Public UI shows claim transaction/status, not amount.
- On partial/failed confidential token transfer, show durable credit and retry.
- No expiry timer or admin recovery action.

## 13. Withdrawal UX

### Pre-request copy

> VeilSave first uses confidential pool liquidity. Any unpaid private remainder joins a public-order FIFO queue and is settled through aggregate strategy redemption.

> Your amount remains encrypted. The request, queue order, and aggregate settlement are public.

### Route result

Do not predict whether the withdrawal will be immediate from a public liquidity number, because confidential liquidity is encrypted. Show `Determining route privately` until the authenticated boolean is finalized.

### FIFO display

- Ticket ID.
- `Position N by request time` or `First in queue`.
- Status and created time.
- If an older request still awaits its routing proof, explain that request-time fairness temporarily blocks later service and that anyone may progress the older proof.
- Settlement association and stage.
- Owner-only reveal of remaining claim.
- Partial-head label.
- Permissionless progress/retry button where valid.

Do not show other users' amounts or a total private queue amount. Public aggregate settlement amount may appear in settlement details with the aggregate leakage warning.

### Strategy failure

State explicitly:

- `Your principal claim remains recorded.`
- `The strategy did not return assets in this attempt.`
- `Retry uses the same settlement; it does not debit your principal again.`

### Loss mode

Use a prominent non-dismissable banner:

> Strategy impairment detected. New deposits, investment, and future epoch openings are paused. Any already-open epoch can still reach a terminal state. Existing withdrawals and claims remain available, but settlement may be delayed.

Do not say principal is guaranteed or already lost unless the public accounting proves a finalized loss policy outside this MVP.

## 14. Error States

Provide designed states and exact recovery actions for:

| Error | Required explanation/action |
| --- | --- |
| Wrong network | Switch to Ethereum Sepolia; stale permits/proofs will be cleared |
| Wallet rejected | No new transaction was sent; retry without losing typed amount in the current flow |
| SDK/WASM loading | Explain local encryption preparation; wait/retry/support fallback |
| Encryption/proof failure | Check account/network/service and generate a new proof |
| Transaction reverted | Reread canonical pool state before retry; show public error if safe |
| Transaction replaced/reorged | Reconcile replacement/canonical receipt; do not duplicate |
| RPC unavailable/stale | Switch/fail over and show last known block as stale |
| Relayer/KMS unavailable | Onchain state is unchanged; retry encryption/decryption/proof retrieval later |
| VRF underfunded/pending | Show request/funding state and permissionless funding/progress path |
| VRF timeout | Epoch abandoned, prize rolled, no reroll; proceed to next epoch |
| FHE draw reverted | Same snapshot and word remain; retry before fixed deadline |
| Winner proof invalid | Verify bound handle/epoch and retrieve a fresh proof; no draw rerun |
| ACL propagation pending | Winner is fixed; retry prize decryption without refinalizing |
| Strategy unavailable | Claims remain recorded; retry same settlement |
| Strategy loss mode | New risk paused; exits/recovery remain available |
| Withdrawal queued | Normal state, not an error; show order and progress |
| Claim transfer failed | Unpaid encrypted remainder remains; retry payout/completion flow |
| Pool full | All 16 public slots occupied; wait for release |
| Lost wallet | No admin can reauthorize/decrypt; original key is required |

Error copy must not include private amounts or dump raw proof/SDK error objects.

## 15. Responsive Behavior

### Desktop

- Max content width around `1200-1280px`.
- Two-column position/draw summary.
- Full 16-slot table with shortened addresses.
- Draw evidence timeline plus detail panel.
- Action dialogs may be `440-520px` wide.

### Tablet

- Collapse summary to one column before content becomes cramped.
- Slot table may keep slot/address/status columns and move metadata into row expansion.
- Draw detail becomes full-width below the timeline.

### Mobile

- Header becomes compact with wallet/network/health controls still reachable.
- Timeline is vertical.
- Tables become semantic stacked rows or horizontally scroll with a clear affordance; do not squeeze addresses/status into overlap.
- Deposit/withdraw use full-height bottom sheets or full-screen dialogs.
- Primary actions remain reachable without obscuring status content.
- Do not place fixed bottom actions over wallet/browser controls without safe-area padding.
- Test long localized status text, long ENS-less addresses, `****** cUSDT`, and large public IDs.

### Stable dimensions

- Icon buttons: minimum 44x44px touch target on mobile.
- Status icons/nodes keep fixed width so labels align.
- Private amount field reserves width across masked/loading/revealed states.
- Buttons do not jump width when changing from idle to spinner; reserve icon/text space.
- Avoid viewport-font scaling and layout that depends on exact hash length.

## 16. Accessibility

- Meet WCAG 2.2 AA contrast and interaction requirements.
- Full keyboard navigation and visible focus.
- Correct dialog focus trap, return focus, Escape behavior, and destructive/cancel semantics.
- Use semantic headings, lists, tables, buttons, progress/status regions, and form labels.
- Async protocol status updates use polite live regions; errors use assertive announcements only when blocking.
- Masked values announce `Private value hidden`, not six asterisks individually.
- Reveal buttons state which value will be decrypted.
- Do not rely on color alone for success/pending/error/terminal.
- Copyable hashes include an accessible full value while visual text is shortened; avoid exposing private plaintext in hidden labels.
- Draw/slot tables have captions and meaningful headers.
- Support browser zoom to 200% without lost content/actions.
- Respect `prefers-reduced-motion`; no mandatory confetti, flashing, or auto-scrolling timeline.
- Time/countdown values include absolute date/time and timezone in accessible text.
- External links identify that they open an explorer/new tab.

## 17. Design Constraints

The design must preserve:

- fixed 16 public slots;
- one seven-day sequential epoch;
- one-full-epoch deposit maturity;
- one winner and one prize;
- separate freeze, VRF, FHE draw, proof, ACL, reveal, and claim states;
- public winner, private prize;
- immediate-or-strict-FIFO withdrawal;
- one active withdrawal ticket per slot;
- aggregate public strategy settlements;
- default `TEST YIELD` mode;
- public metadata/privacy limitations;
- no automatic decryption;
- no trusted backend/admin winner actions; and
- permissionless recovery actions.

Visual polish must not imply unsupported functionality or make async stages appear synchronous.

## 18. Do-Not-Invent Rules

Claude Design must not add or imply:

- more than 16 participants;
- a waitlist with new onchain mechanics (a simple informational full state is allowed);
- multiple pools, assets, strategies, winners, or prize tiers;
- public/estimated odds, balance ranks, or leaderboard;
- APY, projected returns, dollar value, or organic-yield claims for `TEST YIELD`;
- deposit locks, withdrawal penalties, prize forfeiture, or principal spent on prizes;
- pro-rata withdrawals, claim auctions, priority fees, or user-selected queue order;
- prize expiry or admin recovery;
- identity anonymity, hidden addresses, or hidden transaction history;
- custom zero-knowledge proof claims or independently recomputable hidden balances;
- social features, referrals, teams, clubs, chat, NFTs, badges with product rights, governance, DAO, or token;
- cross-chain, mainnet, multiple wallets per position, account abstraction, or social recovery;
- auto-reveal, background decryption, or notification amounts;
- a backend operator who advances/approves outcomes as an authority;
- admin panels for changing capacity, randomness, fees, winner, cadence, or prize; or
- decorative casino mechanics that displace the verification/recovery experience.

If a screen needs behavior not defined in the product specification, flag it as a design question. Do not resolve it by inventing a feature.

**Design handoff status: READY. Product functionality is frozen; production UI implementation has not started.**
