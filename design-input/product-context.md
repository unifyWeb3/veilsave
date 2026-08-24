# VeilSave Product Context

## Product

VeilSave is a Sepolia MVP for confidential prize-linked savings. A wallet holder deposits six-decimal cUSDT into one of exactly 16 public slots. Their principal, eligible weight, pending weight, withdrawal amount, and prize amount remain encrypted. Yield funds one prize per weekly epoch. Principal remains withdrawable.

The release defaults to a deterministic, donation-funded strategy labeled `TEST YIELD`. It must never display an APY or imply organic strategy return. `LIVE STRATEGY YIELD` is permitted only after a replacement adapter is deployed and validated through the frozen governance process.

## Target user

A crypto-native saver who wants stable-value principal access and prize exposure without publishing financial amounts. They accept that wallet addresses, transaction timing, slot occupancy, winner identity, and aggregate strategy movements remain public. They value an inspectable draw lifecycle and can use a browser wallet on Sepolia.

## Promise

- Save capital while financial amounts remain encrypted.
- Become eligible for a periodic, principal-weighted prize draw.
- Inspect the VRF request, fulfillment, separate FHE draw, and winner proof trail.
- Keep the prize private to the winner unless that winner reveals it locally.
- Withdraw principal immediately when confidential liquidity exists or through a retryable FIFO claim otherwise.

## Core loop

Connect wallet → prepare cUSDT → reserve/use a slot → encrypt and deposit → wait for next-epoch maturity → observe freeze → observe VRF → observe separate FHE draw → observe public winner finalization → winner waits for ACL and reveals prize locally → claim prize or withdraw principal → continue into next epoch.

## Frozen behavior

- Exactly 16 public slots; no unbounded participant list.
- One weekly epoch and one winner; no prize tiers.
- A deposit made during `OPEN E` first participates in `E+1`.
- A deposit made after `E` freezes but before the next open transition first participates in `E+2`.
- Frozen weights never change after the VRF request.
- A timed-out draw is terminal and cannot be rerolled.
- Immediate withdrawal is attempted first; encrypted unpaid remainder joins strict request-time FIFO.
- One active FIFO ticket per slot.
- The final winner address is public; the prize amount remains private.

## Honest privacy copy

Use: “Your savings amount is encrypted. Your wallet address and transactions remain public.”

Use: “Balances and odds stay hidden. Anyone can inspect the randomness and authenticated execution trail, but cannot recompute the weighted result from plaintext balances.”

Never claim anonymity, hidden addresses, invisible deposit timing, private aggregate strategy movements, or that everything is private.

## Non-goals

No multiple pools/assets, referrals, social layer, leaderboard, NFTs, governance UX, variable capacity, prize tiers, APY estimator, custom randomness, trusted winner service, or automatic decryption.

## Source documents

- `docs/product/product-spec.md`
- `docs/architecture/architecture.md`
- `docs/spec/execution-spec.md`
- `docs/design/design-brief.md`
