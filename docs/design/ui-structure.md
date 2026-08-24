# VeilSave UI Structure

Status: structural handoff for implementation and visual design. Product behavior remains governed by the product, architecture, execution, and design specifications.

## Product shell

VeilSave is a focused savings console, not a generalized DeFi dashboard. The first usable surface shows the active pool, its `TEST YIELD` or `LIVE STRATEGY YIELD` label, the current epoch, wallet/network state, and a clear route into the savings dashboard.

Primary navigation:

- **Pool**: public pool overview and wallet entry.
- **Dashboard**: the connected user's confidential position and primary actions.
- **Draws**: current draw lifecycle plus historical verification evidence.
- **Privacy**: precise disclosure of encrypted values and public metadata.

The desktop shell uses a restrained top navigation and a compact account/network area. Mobile uses a stable bottom navigation for Pool, Dashboard, and Draws, with Privacy and account controls in a menu.

## Screen hierarchy

### Pool overview

Purpose: establish the product and let a user connect without presenting an oversized marketing page.

Required content, in order:

1. VeilSave identity and literal offer: confidential prize-linked savings.
2. Active network and strategy mode.
3. Current epoch timing, public slot occupancy, and next draw state.
4. Connect or open-dashboard action.
5. Three concise facts: private amounts, verifiable draw trail, withdrawable principal.
6. Public activity preview and privacy-boundary link.

### Dashboard overview

Purpose: answer four questions immediately: Is my principal safe? When am I eligible? What is the draw doing? Can I withdraw?

Required hierarchy:

1. Global warning or recovery banner when an operation needs attention.
2. Strategy-mode label and network status.
3. Confidential position: principal, eligible weight, pending weight, and maturity epoch.
4. Primary actions: Deposit and Withdraw.
5. Current epoch timeline.
6. Prize status for the connected wallet.
7. Queued withdrawal status, when present.
8. Recent wallet and protocol activity.

Confidential values are masked independently. Revealing principal must not automatically reveal weight, pending weight, prize, or withdrawal claim values.

### Deposit flow

Use a modal on desktop and a full-height sheet on mobile.

Steps:

1. Asset readiness: cUSDT balance state, preparation route, and slot availability.
2. Amount entry using six-decimal cUSDT.
3. Review: encrypted amount, visible transaction metadata, slot bond if reservation is required, and exact maturity epoch.
4. Local encryption and wallet signature.
5. Token transfer/callback confirmation.
6. Success with pending-eligibility explanation.

The flow must preserve a recoverable operation record through wallet rejection, encryption failure, RPC failure, and transaction replacement.

### Withdraw flow

Use a modal on desktop and a full-height sheet on mobile.

Steps:

1. Optional explicit reveal of principal.
2. Amount entry and encrypted request preparation.
3. Review of immediate-liquidity versus possible FIFO routing. Never promise an immediate result before the encrypted routing proof is complete.
4. Local encryption, wallet signature, and request transaction.
5. Branch to immediate settlement or queued ticket.
6. For queued tickets, show FIFO request ID, settlement state, claim availability, and retry actions.

### Draw detail and verification

Purpose: make the public evidence trail understandable without claiming plaintext recomputation.

Required evidence sequence:

1. Epoch opened and eligibility window.
2. Epoch frozen with fixed slot count and snapshot commitment.
3. VRF request ID and request transaction.
4. VRF fulfillment transaction and stored random-word reference.
5. Separate FHE draw transaction.
6. Encrypted winner handle reference.
7. Winner public-decryption proof/finalization transaction after the 96-block delay.
8. Final public winner address or zero-winner terminal result.

Required explanation: balances and odds remain hidden. Anyone can inspect the authenticated randomness and execution trail, but cannot independently recompute the weighted result from plaintext balances.

### Prize state

The prize surface appears within Dashboard and has a focused winner detail state; it is not a separate public prize leaderboard.

States:

- no completed result;
- non-winner, principal unchanged;
- winner proof pending;
- winner finality delay;
- winner finalized, ACL propagation pending;
- private prize available to reveal;
- locally decrypted prize;
- claim submitted;
- claimed;
- reveal or claim retry required.

The prize handle and amount never appear in public event history or logs.

### Privacy explanation

Present a compact public/private comparison, aggregate-settlement leakage, winner identity disclosure, transaction-correlation limits, and browser/wallet security boundary. Never say that everything, addresses, or transaction timing are private.

## Reusable structural components

- App shell, network guard, wallet control, and strategy-mode badge.
- Confidential value with Masked, Revealing, Revealed, Stale, Unavailable, and Error states.
- Operation stepper with Initiated, Pending, Fulfilled, Retryable, and Terminal states.
- Epoch timeline and verification evidence row.
- Explorer link, address display, transaction display, and copy control.
- Deposit and withdrawal amount fields.
- Slot occupancy indicator showing public existence only.
- FIFO ticket status and permissionless recovery action.
- Privacy boundary callout.
- Empty, unavailable, stale-data, RPC-down, relayer-down, and wrong-network states.

## Data boundaries

Private by default:

- principal;
- eligible weight;
- pending weight;
- prize amount;
- withdrawal amount and unpaid claim;
- confidential pool reserves and draw intermediates.

Public:

- wallet and contract addresses;
- transaction existence and timing;
- occupied slot existence and slot number;
- epoch timing and state;
- VRF request and fulfillment evidence;
- FHE draw and winner-finalization transactions;
- final winner address;
- aggregate strategy settlement amount and timing;
- public strategy state and mode.

## Responsive constraints

- Support 360px through wide desktop without hiding required recovery actions.
- Keep primary actions within thumb reach on mobile.
- Convert side-by-side evidence layouts into ordered vertical timelines; never reorder protocol chronology.
- Use stable dimensions for value rows, status icons, steppers, and action controls so decryption or long hashes do not shift layout.
- Truncate addresses and hashes visually while preserving copy access and accessible full labels.
- Never place a modal inside another modal or a card inside another card.

## Scope guard

Do not add social feeds, leaderboards, referrals, NFTs, governance voting, multiple pools, multiple assets, prize tiers, APY projections, anonymity claims, automatic value reveal, or operator-only progression controls.
