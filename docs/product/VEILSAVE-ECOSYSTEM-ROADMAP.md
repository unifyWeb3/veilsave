# VeilSave Ecosystem Roadmap

Status: **strategic documentation only**. This file preserves the strongest
ideas that were researched, considered, and deliberately deferred or rejected
for the MVP submission. Nothing in this file is approved for implementation
in the current release. Each entry explains why it must wait.

Source material: `docs/research/zama-confidential-pooltogether-research-dossier.md`
(especially §2.4 optional opportunities and §2.5 forbidden scope),
`docs/product/product-spec.md` (§non-goals), and `docs/spec/execution-spec.md`.

The direction of travel:

```text
VeilSave MVP (one 16-slot confidential cUSDT pool, TEST YIELD, manual lifecycle)
    ↓
VeilSave ecosystem
    ↓
confidential savings → automation → policy → agents → payments → reputation → auditability → observability
```

Cross-cutting rule for every item below: no backend, keeper, agent, or
relayer may ever choose winners, alter weights, decrypt balances, or
selectively progress draws. Anything that weakens that rule is rejected,
not deferred.

---

## 1. Permissionless keeper automation (lifecycle bots anyone can run)

1. **Problem.** Epoch progression today (freeze → VRF request → sync →
   draw → finalize → open-next) requires a human to submit each transaction
   before its deadline, or the epoch must be terminally abandoned.
2. **Why it fits VeilSave.** All lifecycle calls are already permissionless
   and deterministic; a keeper only pays gas and follows public state.
3. **User value.** Epochs never stall for lack of an operator; winners and
   withdrawers are not hostage to one team's availability.
4. **Technical direction.** Open-source keeper binary watching public
   `EpochStatus` + deadlines, submitting the exact same calldata any user
   could, with bond/slash or fee-rebate economics later.
5. **Relationship to confidential assets.** Keeper sees only what is already
   public (statuses, commitments, timing). No ACL, no decryption.
6. **Dependencies.** Stable live deployment; deadline/retry telemetry;
   gas-price policy for the 500k-bounded VRF request path.
7. **Risk.** A buggy keeper could spam failing transactions (gas waste) or
   create MEV-adjacent timing games around public calls. Mitigate with
   exact-state preconditions and no privileged paths.
8. **Priority.** P1 — first post-MVP automation.
9. **Why NOT now.** The submission must prove humans can execute and recover
   every step manually (acceptance evidence). Automating before the manual
   path is evidenced would hide lifecycle bugs.

## 2. Onchain policy engine (guardian rules without custody)

1. **Problem.** Pause/guardian powers today are coarse scopes held by the
   Safe; there is no declarative policy (e.g. "never invest more than X% in
   one strategy", "halt new deposits if HCU oracle reports congestion").
2. **Why it fits VeilSave.** The architecture already separates governance
   (Safe + 24h timelock) from execution; policies are constraints on
   proposals, not new custody.
3. **User value.** Users get machine-checkable guarantees about what
   governance *cannot* do, instead of trusting 2-of-3 humans.
4. **Technical direction.** Timelock-proposal guard contracts that statically
   validate targets/calldata against an allowlisted policy registry before
   scheduling; policy changes themselves timelocked.
5. **Relationship to confidential assets.** Policies reason about public
   parameters (bps caps, delays, addresses), never plaintext amounts.
6. **Dependencies.** Live governance usage history; formal policy spec.
7. **Risk.** Over-constraining policy could brick emergency response (e.g.
   block a needed strategy replacement). Every policy needs a timelocked
   escape hatch.
8. **Priority.** P2.
9. **Why NOT now.** Policy design without production incident data is
   speculation; premature guards risk blocking the acceptance sequence
   itself.

## 3. Agent workflows (audited AI/agent operators over public state)

1. **Problem.** Operators (treasury teams, DAOs) want "run the pool for
   us" automation with natural-language oversight, not raw transactions.
2. **Why it fits VeilSave.** The runbook is already a deterministic
   procedure over public state — an ideal constrained agent environment.
3. **User value.** Delegated operations with a full public audit trail of
   everything the agent did.
4. **Technical direction.** Agent harness restricted to the documented
   runbook actions, with per-action Safe approval, spend ceilings, and every
   decision logged against public epoch/settlement state. No private-value
   telemetry to the agent (per execution-spec prohibition).
5. **Relationship to confidential assets.** Agent operates blind to amounts
   by construction; reveal actions remain manual and wallet-scoped.
6. **Dependencies.** Keeper automation (§1) as the execution layer; policy
   engine (§2) as the constraint layer.
7. **Risk.** Prompt-injection or tool-misuse causing wrong-lifecycle calls.
   Terminal "no reroll" semantics make mistakes irreversible per epoch.
8. **Priority.** P3 — research track.
9. **Why NOT now.** Agents multiply the trusted surface; the submission must
   minimize it. Also explicitly out of bounty scope.

## 4. Reliability: multi-strategy routing with confidential accounting

1. **Problem.** One deterministic TEST YIELD vault is a single point of
   failure and (by design) not real yield.
2. **Why it fits VeilSave.** `SettlementController` already abstracts
   strategy behind ERC-4626 + aggregate settlement; routing is an extension,
   not a rewrite.
3. **User value.** Diversified, real yield funding larger prizes with
   bounded exposure per strategy.
4. **Technical direction.** Allowlisted strategy set, per-strategy bps caps,
   sequential (never mixed in one FHE op) aggregate settlements, per-epoch
   strategy attribution in public evidence.
5. **Relationship to confidential assets.** Individual amounts stay
   encrypted; only aggregate per-strategy flows are public (with the known
   singleton-correlation leakage caveat).
6. **Dependencies.** Fresh per-strategy asset/solvency/redemption/yield
   validation (the Aave `SUPPLY_CAP_EXCEEDED` lesson); loss-mode drills.
7. **Risk.** Each strategy adds oracle/wrapper trust and aggregate-metadata
   leakage surface; routing logic is new attack surface on pooled funds.
8. **Priority.** P1 after a validated LIVE strategy exists.
9. **Why NOT now.** Research dossier §2.5 explicitly forbids multiple yield
   protocols in the MVP; one more strategy doubles audit scope and HCU risk.

## 5. Confidential payment rails (winner-pays-anyone, private payroll)

1. **Problem.** Winnings and withdrawals today terminate at the recipient's
   own wallet; there is no private "send my confidential balance to X".
2. **Why it fits VeilSave.** ERC-7984 confidential transfers are the native
   primitive; the pool already holds confidential balances.
3. **User value.** Winners can spend or gift prizes privately; orgs can run
   confidential payroll/vesting out of pool positions.
4. **Technical direction.** Opt-in `confidentialTransfer`-based payout
   routing with recipient-supplied handles, preserving winner-only ACL on
   the prize until transfer.
5. **Relationship to confidential assets.** Core extension of the same
   primitive; transfer graph is public, amounts stay encrypted.
6. **Dependencies.** Wallet UX for confidential address/handle exchange;
   relayer support for third-party-bound inputs.
7. **Risk.** Phishing/misdirected private transfers are irreversible and
   invisible to support; compliance surface for private payments.
8. **Priority.** P2.
9. **Why NOT now.** New fund-movement paths during a security-audited
   submission freeze are unacceptable; every route needs its own invariant
   suite.

## 6. Auditability: selective-disclosure and auditor views

1. **Problem.** Today verification is binary: fully public metadata or
   fully private amounts. Regulated users need "prove X to auditor Y
   without revealing to the world".
2. **Why it fits VeilSave.** FHE ACL (`FHE.allow`) already supports
   granting specific handles to specific addresses — the primitive exists.
3. **User value.** Tax/compliance reporting and institutional oversight
   without destroying user confidentiality.
4. **Technical direction.** Voluntary per-user auditor grants with expiry,
   auditor-view UI rendering the same masked components with an
   "auditor-granted" badge, grant-revocation flows.
5. **Relationship to confidential assets.** Extends winner-only ACL
   precedent to user-consented auditor ACL; contract changes minimal.
6. **Dependencies.** Legal definition of auditor role; key-management UX.
7. **Risk.** Coerced grants; auditor key compromise; users mistaking
   auditor-visibility for public-visibility. Grants must be explicit,
   scoped, and revocable.
8. **Priority.** P2.
9. **Why NOT now.** Any auditor concept in the MVP would confuse the
   submission's core claim ("only the winner decrypts the prize") and the
   bounty forbids implying broader disclosure.

## 7. Reputation: private standing from public behavior

1. **Problem.** Slot bonds are flat (0.001 ETH); long-horizon honest
   participation earns no standing, and griefers pay the same as stewards.
2. **Why it fits VeilSave.** Slot ownership, epoch participation, and claim
   history are already public — reputation can be computed without touching
   private amounts.
3. **User value.** Tenure-weighted bond discounts, priority re-entry, or
   keeper-reward eligibility for consistent participants.
4. **Technical direction.** Soulbound (non-transferable) participation
   receipts per epoch; scoring function over public receipts only; perks
   enforced as public-parameter discounts, never amount-dependent logic.
5. **Relationship to confidential assets.** Strictly amount-blind; must
   never let score correlate with deposits (timing-correlation guard).
6. **Dependencies.** Multiple completed live epochs of history.
7. **Risk.** Reputation becomes a de-anonymization aid (behavioral
   fingerprinting); transferable/saleable reputation recreates the problems
   of governance tokens (explicitly excluded by the bounty).
8. **Priority.** P3.
9. **Why NOT now.** No live history exists yet; any pre-launch reputation
   scheme is gameable fiction, and NFTs/governance tokens are forbidden
   MVP scope.

## 8. Observability: public operations dashboard and alerting

1. **Problem.** Operators and users must manually poll epoch state,
   deadlines, VRF fulfillment, and settlement retries.
2. **Why it fits VeilSave.** All watched quantities are public by design;
   an indexer can never leak what it cannot read.
3. **User value.** Deadline alerts, settlement-retry prompts, draw-countdown
   accuracy, and a public health page judges can inspect without a wallet.
4. **Technical direction.** Read-only indexer over pool/VRF/controller
   events → public dashboard + opt-in amount-free notifications
   (product-spec already anticipates amount-free notifications).
5. **Relationship to confidential assets.** Indexer stores handles and
   aggregates only; privacy boundary enforced by schema tests (already
   specified in execution-spec §ABI/event scanning).
6. **Dependencies.** Stable event schema; hosted manifest URL.
7. **Risk.** Stale-indexer misinformation (users acting on lagged state);
   notification-channel phishing. Mitigate with block-height freshness
   badges and canonical-state re-reads before transactions.
8. **Priority.** P1 (read-only; safe to build early post-submission).
9. **Why NOT now.** It is submission-adjacent but not submission-required,
   and every engineering hour now belongs to live acceptance gates.

## 9. Confidential finance primitives: TWAB-free time-weighting and beyond

1. **Problem.** One-epoch maturity is crude: it resists flash deposits but
   cannot express tenure-weighted odds or streaming eligibility.
2. **Why it fits VeilSave.** The eligible/pending weight pattern generalizes
   to multi-epoch ladders computed with the same FHE-clean scalar ops.
3. **User value.** Fairer odds for long-term savers; richer product
   mechanics (streaks, loyalty multipliers) without revealing balances.
4. **Technical direction.** Multi-bucket encrypted weight ladders, ladder
   advancement at epoch boundaries, HCU-budgeted prefix scans per bucket.
5. **Relationship to confidential assets.** Same encrypted-weight domain;
   each bucket adds FHE cost against the 17M/4M HCU envelope.
6. **Dependencies.** HCU headroom proof (current margins ~25%/31% would be
   consumed); PoolTogether TWAB lessons (clear TWAB is incompatible —
   research §5.4).
7. **Risk.** Blows the HCU budget (the reason capacity is fixed at 16);
   complex odds users cannot understand; maturity-gaming.
8. **Priority.** P3 — only with proven HCU headroom on live draws.
9. **Why NOT now.** Directly threatens the frozen HCU-gated architecture;
   the 16-slot/7-day constants are release gates, not tuning knobs.

## 10. Integrations and composability: pool-as-collateral, prize-splitting pacts

1. **Problem.** VeilSave positions are siloed: they cannot back other
   onchain commitments (credit, insurance, group pacts).
2. **Why it fits VeilSave.** Slots are stable, publicly owned positions
   with encrypted value — a clean collateral/attestation shape.
3. **User value.** "Borrow against my savings without revealing them";
   private prize-split agreements among friends; DAO treasury tranches.
4. **Technical direction.** View-only attestation interface (slot active,
   tenure, public-behavior proofs) + opt-in encumbered-withdrawal hooks;
   prize-split pacts as pre-registered confidential-transfer intents
   executed at claim time.
5. **Relationship to confidential assets.** Attestations must be
   amount-free or user-consented range proofs; never raw handles to third
   parties.
6. **Dependencies.** Audited core; selective-disclosure (§6); legal review
   of collateral claims over encrypted assets.
7. **Risk.** Composability bugs (reentrancy across attestation consumers);
   liquidation of confidential collateral is nearly un-designable without
   oracles that see amounts — high chance of degrading to trusted-oracle
   architecture.
8. **Priority.** P3+.
9. **Why NOT now.** Each integration is a new trust domain; the MVP's
   security case rests on having as few as possible. Cross-chain/prize
   routing is explicitly forbidden scope.

---

## Explicitly rejected (not deferred)

These were considered and must not return without a full re-architecture
review: multiple simultaneous pools/assets/strategies in the MVP, prize
tiers/runner-ups, TWAB history, liquidators/auctions, leverage, custom
cryptography or threshold KMS, a new VRF, NFTs/transferable tickets,
referrals/teams/governance tokens/DAOs/social graphs, cross-chain draws,
auto-reveal of private values, private-value telemetry, rerolls, and
calling sponsored funds "yield". See research dossier §2.5 and product-spec
non-goals.
