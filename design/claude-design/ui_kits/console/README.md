# UI kit — VeilSave console (`/app`)

The connected product experience. Open `index.html`; it loads `styles.css` and `_ds_bundle.js`, then mounts the screens.

| File | What it is |
| --- | --- |
| `index.html` | Router, public pool view, and the **Prototype state** switcher (bottom centre) |
| `ConsoleShell.jsx` | 232px rail above 900px, bottom navigation below; sticky top bar with network + strategy identity |
| `Overview.jsx` | Dashboard: position block, commands, epoch, prize, ticket, pool, activity. `useReveals` gives every value its own independent reveal state |
| `PrizePanel.jsx` | Winner journey: proof → ACL → ready → revealed → claimed |
| `DepositFlow.jsx` | Deposit sheet: readiness → encryption → wallet → confirming → ERC-7984 callback |
| `WithdrawFlow.jsx` | Withdraw sheet: amount → routing proof → immediate settlement **or** FIFO queue (enter ≤500 for immediate, >500 for queued) |
| `DrawsVerify.jsx` | `/draws` list and `/draws/:epochId` evidence detail (epoch 39 is the timed-out terminal case) |
| `mock.jsx` | All fake chain state, including the six epoch-lifecycle step sets |

## Things to try

- Reveal **Your savings**, then **Eligible weight** — each is independent; one reveal never unlocks another.
- Switch **Prototype state** to *Winner reveal sequence* to watch proof → private access → reveal.
- Withdraw `900` to land in the FIFO queue; withdraw `400` to settle immediately.
- Open **Draws → History → E39** for the terminal, no-reroll case.
- Narrow the window under 900px: rail becomes bottom navigation, the epoch timeline turns vertical, commands go full width.

The state switcher is kit scaffolding, not product UI. Everything else is intended as production behaviour.
