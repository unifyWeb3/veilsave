# VeilSave — Voiceover Script (record verbatim, ~300 words, ~2:40 at natural pace)

> If a line won't come out of your mouth naturally, rephrase it on the recording —
> captions will follow what you actually say, not this page.

---

**[0:00]** VeilSave lets people save together without exposing their balances.

**[0:08]** This is the live app, on Sepolia, reading real chain state right now.

**[0:15]** Prize savings has always forced a trade. Public pools publish every balance,
so everyone can see exactly what you hold. Private pools hide the numbers but ask you
to trust an operator to pick the winner.

**[0:32]** VeilSave refuses that trade. One pool, sixteen public slots. Your amount and
your draw weight stay encrypted. And the winner is selected onchain, over encrypted
weights, with public randomness anyone can inspect.

**[0:52]** Here is the pool today. Epoch 2 is open. Two of sixteen slots are occupied,
fourteen are available. Both depositors are public — every amount is masked.

**[1:12]** Nothing here is decrypted by default. Values reveal only when the owner
explicitly asks, on their own device.

**[1:22]** Now the proof. Epoch 1 already completed its full lifecycle. Freeze, with a
two-slot snapshot. A Chainlink randomness request, bound to that snapshot. Fulfillment —
the callback stores the random word and does nothing else. Then a separate encrypted
draw transaction.

**[1:50]** The draw output is this handle. It publicly decrypts to the zero address.
So epoch 1 ended with no winner. No reroll — that is a terminal protocol outcome, and
the prize rolled forward to the next epoch.

**[2:08]** Every step links out to Sepolia Etherscan. You can check each transaction
yourself.

**[2:15]** One honest limitation. The console is read-only today. Transaction controls
unlock with the ACTIVE release manifest, after epoch 2 closes on September 11th. That
seven-day cadence is a protocol constant — it cannot be shortened for a demo, and we
didn't try.

**[2:34]** So: real contracts, real evidence, a real limitation. Private amounts,
public proof. That's VeilSave.

---

*Word count: ~300. Beats: product → problem → solution → live state → privacy default → epoch-1 proof → Etherscan → limitation → close.*
