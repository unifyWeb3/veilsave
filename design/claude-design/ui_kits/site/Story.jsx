(() => {
const V = () => window.VeilSaveDesignSystem_484fa6;

/* ── 1 · The tension ──────────────────────────────────────────────────────────────
   The product's core idea as an interaction: reveal a private value on the left and
   watch the public column stay exactly the same. The boundary is a real line on the
   page, and crossing it is something the visitor does, not something they read. */
function Tension({ narrow }) {
  const { ConfidentialValue, EvidenceRow, Icon, Button } = V();
  const [state, setState] = React.useState("masked");
  React.useEffect(() => {
    if (state === "revealing") { const t = setTimeout(() => setState("revealed"), 1200); return () => clearTimeout(t); }
  }, [state]);
  const revealed = state === "revealed";

  return (
    <Band id="tension" tone="deep" pad="lg">
      <BandHead
        narrow={narrow}
        label="The boundary"
        title="Your numbers stay yours. The draw stays checkable."
        aside="Confidential finance usually asks you to trust an operator. VeilSave splits the problem instead: values are encrypted, execution is public. VSReveal the balance below — nothing on the public side moves."
      />
      <VSReveal>
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0,1fr) 1px minmax(0,1fr)", gap: narrow ? 0 : 40 }}>
          <div className="vs-panel" style={{ padding: narrow ? 20 : 28, background: "linear-gradient(180deg, rgba(124,131,255,0.07), transparent 58%), var(--surface-raised)", borderColor: "var(--border-private)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "var(--type-label)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-private)" }}>
                  <Icon name="lock" size={13} strokeWidth={1.9} /> Encrypted
                </span>
                <span className="vs-micro">only you can decrypt</span>
              </div>
              <ConfidentialValue
                size="xl" state={state} value="1,284.720000"
                onReveal={() => setState("revealing")} onHide={() => setState("masked")}
              />
              <ul style={{ display: "flex", flexDirection: "column", gap: 9, borderTop: "1px solid var(--border-hairline)", paddingTop: 18 }}>
                {["Savings amount", "Eligible and pending weight", "Withdrawal amount", "Prize amount"].map((t) => (
                  <li key={t} style={{ display: "flex", alignItems: "center", gap: 10, font: "var(--type-body-sm)", color: "var(--text-secondary)" }}>
                    <span aria-hidden="true" style={{ display: "inline-flex", gap: 2 }}>
                      {"•••".split("").map((d, i) => <span key={i} style={{ color: "var(--periwinkle-500)", fontSize: 9 }}>{d}</span>)}
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {!narrow ? (
            <div aria-hidden="true" style={{ position: "relative", background: "linear-gradient(180deg, transparent, var(--border-subtle) 18%, var(--border-subtle) 82%, transparent)" }}>
              <span style={{
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                width: 30, height: 30, borderRadius: "var(--r-pill)", display: "grid", placeItems: "center",
                background: "var(--surface-deep)", border: "1px solid var(--border-subtle)", color: "var(--text-faint)",
              }}>
                <Icon name="scan-line" size={13} />
              </span>
            </div>
          ) : null}

          <div className="vs-panel" style={{ padding: narrow ? 20 : 28, marginTop: narrow ? 16 : 0, background: "linear-gradient(180deg, rgba(47,191,160,0.07), transparent 58%), var(--surface-raised)", borderColor: "var(--border-verified)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, font: "var(--type-label)", letterSpacing: "var(--tr-label)", textTransform: "uppercase", color: "var(--text-verified)" }}>
                  <Icon name="eye" size={13} strokeWidth={1.9} /> Public
                </span>
                <span className="vs-micro">anyone can check</span>
              </div>
              <div>
                <EvidenceRow label="VRF request" value="0x9f2c41a8b7e5d0c3" verified />
                <EvidenceRow label="Draw tx" value="0x77a1cd0e4b8830fa19" verified href="#" />
                <EvidenceRow label="Winner proof" value="0xd41c90aa7b6e5528" verified />
                <EvidenceRow label="Winner address" value="0x8f21c4b70a5519d3ff9a4004c7" kind="address" verified href="#" />
              </div>
              <p style={{
                display: "flex", gap: 9, alignItems: "flex-start", margin: 0, font: "var(--type-body-sm)",
                color: revealed ? "var(--text-verified)" : "var(--text-muted)",
                transition: "color var(--dur-base) var(--ease-standard)",
              }}>
                <Icon name={revealed ? "check" : "circle-dot"} size={13} style={{ marginTop: 3, flex: "none" }} />
                {revealed
                  ? "You just decrypted a balance locally. This column did not change — and it never contained your amount."
                  : "Slot occupancy, epoch timing, randomness and the winner address live here. Amounts never do."}
              </p>
            </div>
          </div>
        </div>
      </VSReveal>
    </Band>
  );
}

/* ── 2 · How it works — a stepped rail, not four paragraphs ──────────────────── */
const STEPS = [
  { n: "01", t: "Save privately", d: "Your amount is encrypted in your browser, then deposited into one of sixteen public slots. The pool accounts in ciphertext and never learns the number." },
  { n: "02", t: "Earn eligibility", d: "A deposit made while an epoch is open first participates in the next one. Weights freeze before the draw and cannot change afterwards." },
  { n: "03", t: "Verify the draw", d: "Chainlink randomness is requested publicly, then a separate transaction selects the winner over encrypted weights." },
  { n: "04", t: "VSReveal only yours", d: "The winner address becomes public. The prize amount is decrypted locally, by the winner, in one explicit gesture — or not at all." },
];

function StepFigure({ i }) {
  const { Icon } = V();
  const box = { height: 62, display: "flex", alignItems: "center", gap: 8 };
  if (i === 0) return (
    <div style={box}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 8px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-private)", background: "var(--wash-private)", color: "var(--periwinkle-400)", font: "var(--type-mono-sm)" }}>••••••</span>
      <Icon name="arrow-right" size={13} style={{ color: "var(--text-faint)" }} />
      <span style={{ display: "grid", gridTemplateColumns: "repeat(4, 9px)", gap: 3 }}>
        {Array.from({ length: 16 }, (_, k) => <span key={k} style={{ width: 9, height: 9, borderRadius: 1, border: `1px solid ${k === 5 ? "var(--slot-mine)" : "var(--slot-empty)"}`, background: k === 5 ? "var(--wash-private)" : "transparent" }} />)}
      </span>
    </div>
  );
  if (i === 1) return (
    <div style={{ ...box, flexDirection: "column", alignItems: "stretch", justifyContent: "center", gap: 7 }}>
      {[["E42 pending", "var(--amber-500)", "38%"], ["E43 eligible", "var(--periwinkle-500)", "100%"]].map(([l, c, w]) => (
        <span key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="vs-mono-sm" style={{ color: "var(--text-faint)", width: 74 }}>{l}</span>
          <span style={{ flex: 1, height: 3, background: "var(--slot-empty)", borderRadius: 2, overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: w, background: c, borderRadius: 2 }} />
          </span>
        </span>
      ))}
    </div>
  );
  if (i === 2) return (
    <div style={{ ...box, flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 6 }}>
      {["VRF REQUEST", "DRAW TX", "WINNER PROOF"].map((l) => (
        <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Icon name="check" size={11} strokeWidth={2.2} style={{ color: "var(--teal-400)" }} />
          <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>{l}</span>
        </span>
      ))}
    </div>
  );
  return (
    <div style={{ ...box, gap: 10 }}>
      <span style={{ color: "var(--periwinkle-400)", font: "var(--type-num-4)", letterSpacing: "0.14em" }}>••••••</span>
      <Icon name="key-round" size={13} style={{ color: "var(--text-faint)" }} />
      <span className="vs-num-4" style={{ color: "var(--teal-300)" }}>96.40</span>
    </div>
  );
}

function HowItWorks({ narrow }) {
  return (
    <Band id="how" tone="page" pad="lg">
      <BandHead
        narrow={narrow}
        label="How it works"
        title="Four steps. No ceremony."
        aside="The protocol is asynchronous, so the interface always says what is waiting on you and what is waiting on the chain."
      />
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(4, 1fr)", gap: narrow ? 0 : 1, background: narrow ? "transparent" : "var(--border-hairline)" }}>
        {STEPS.map((s, i) => (
          <VSReveal key={s.n} delay={i * 70}>
            <div style={{
              display: "flex", flexDirection: "column", gap: 16, height: "100%",
              padding: narrow ? "22px 0" : "0 clamp(18px, 2vw, 26px)",
              background: "var(--surface-page)",
              borderTop: narrow ? "1px solid var(--border-hairline)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="vs-mono-sm" style={{ color: "var(--periwinkle-400)" }}>{s.n}</span>
                <span aria-hidden="true" style={{ flex: 1, height: 1, background: "var(--border-hairline)" }} />
              </div>
              <StepFigure i={i} />
              <h3 className="vs-title-2" style={{ margin: 0 }}>{s.t}</h3>
              <p className="vs-body-sm" style={{ margin: 0 }}>{s.d}</p>
            </div>
          </VSReveal>
        ))}
      </div>
      <VSReveal>
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(4, 1fr)", gap: 24, marginTop: narrow ? 32 : 56, paddingTop: 28, borderTop: "1px solid var(--border-hairline)" }}>
          {[["16", "public slots, fixed"], ["1", "prize per weekly epoch"], ["0", "prize tiers or rerolls"], ["FIFO", "withdrawal settlement"]].map(([v, l]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="vs-num-2">{v}</span>
              <span className="vs-micro">{l}</span>
            </div>
          ))}
        </div>
      </VSReveal>
    </Band>
  );
}

/* ── 3 · The draw ─────────────────────────────────────────────────────────────── */
function DrawStory({ narrow }) {
  const { EpochTimeline, ProofBlock, EvidenceRow, Button, SlotGrid } = V();
  return (
    <Band id="draw" tone="brand" field pad="lg">
      <BandHead
        narrow={narrow}
        label="The draw, in public"
        title="Verifiable randomness. Invisible balances."
        aside="Each epoch leaves an evidence trail in protocol order. Savers read the verdict; anyone who wants the machine values can expand them."
      />
      <VSReveal>
        <div className="vs-panel-quiet" style={{ padding: narrow ? "20px" : "28px 32px", marginBottom: 24 }}>
          <EpochTimeline orientation={narrow ? "vertical" : "horizontal"} steps={[
            { label: "Open", state: "done", meta: "WEEKLY" },
            { label: "Eligibility frozen", state: "done", meta: "SNAPSHOT" },
            { label: "Randomness requested", state: "done", meta: "CHAINLINK VRF" },
            { label: "Randomness fulfilled", state: "done", meta: "WORD STORED" },
            { label: "Encrypted draw", state: "active", meta: "FHE EXECUTION", detail: "The winner is selected over encrypted weights. No balance is decrypted to do it." },
            { label: "Winner finalized", state: "future", meta: "96-BLOCK DELAY" },
          ]} />
        </div>
      </VSReveal>
      <VSReveal delay={80}>
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0,1.35fr) minmax(0,1fr)", gap: narrow ? 24 : 40, alignItems: "start" }}>
          <ProofBlock title="Epoch 41 · winner proof" verdict="verified" summary="Authenticated public decryption of the winner address only."
            footnote="Balances and odds stay hidden. Anyone can inspect the randomness and authenticated execution trail, but cannot recompute the weighted result from plaintext balances.">
            <EvidenceRow label="VRF request id" value="0x9f2c41a8b7e5d0c3" verified />
            <EvidenceRow label="Draw tx" value="0x77a1cd0e4b8830fa19" href="#" verified />
            <EvidenceRow label="Winner handle" value="0x7ab34e91c05f" kind="handle" verified note="Ciphertext reference — not an amount." />
            <EvidenceRow label="Winner address" value="0x8f21c4b70a5519d3ff9a4004c7" kind="address" href="#" verified />
          </ProofBlock>
          <div className="vs-panel" style={{ padding: narrow ? 20 : 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="vs-label">Slots at freeze · E41</span>
              <SlotGrid size="lg" legend slots={["filled","filled","filled","empty","filled","filled","empty","filled","filled","empty","drawn","filled","empty","empty","filled","filled"]} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--border-hairline)", paddingTop: 18 }}>
              <h3 className="vs-title-3" style={{ margin: 0 }}>What we cannot prove</h3>
              <p className="vs-body-sm" style={{ margin: 0 }}>
                Odds are a function of encrypted weights, so no observer can recompute them — and neither can we. Verification covers the randomness and the authenticated execution trail, not the plaintext arithmetic.
              </p>
              <Button tone="secondary" size="sm" iconAfter="arrow-right">Browse every draw</Button>
            </div>
          </div>
        </div>
      </VSReveal>
    </Band>
  );
}

/* ── 4 · Privacy boundary ─────────────────────────────────────────────────────── */
function PrivacyStory({ narrow }) {
  const { PrivacyCallout, StateBlock } = V();
  return (
    <Band id="privacy" tone="page" pad="lg">
      <BandHead
        narrow={narrow}
        label="Privacy boundary"
        title="Encrypted where it matters. Public where it counts."
        aside="We would rather state the limits than imply more. VeilSave does not offer anonymity, and no operator can decrypt on your behalf."
      />
      <VSReveal><PrivacyCallout /></VSReveal>
      <VSReveal delay={70}>
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(3, 1fr)", gap: 16, marginTop: 20 }}>
          <StateBlock compact kind="paused" title="Reveals are session-only">Decrypted values live in the tab you revealed them in. Nothing is written to storage, logs, URLs or notifications.</StateBlock>
          <StateBlock compact kind="terminal" title="No trusted operator">There is no backend that can decrypt for you and no automatic reveal. The winner decrypts locally or not at all.</StateBlock>
          <StateBlock compact kind="waiting" title="Asynchronous by design">Access-control propagation and proof authentication take real time. The console explains each wait instead of spinning.</StateBlock>
        </div>
      </VSReveal>
    </Band>
  );
}

/* ── 5 · FAQ ──────────────────────────────────────────────────────────────────── */
const FAQS = [
  ["Is my balance really hidden?", "Your savings amount, eligible weight, withdrawal amount and prize amount are encrypted. Your wallet address, your transaction timing, slot occupancy and the winner address are public. VeilSave does not offer anonymity, and we will not claim it."],
  ["Can anyone prove the draw was fair?", "Anyone can verify the freeze timing, the request-id binding, the Chainlink fulfilment, the separate encrypted draw, the authenticated decryption proof and the final winner. Because weights stay encrypted, nobody — including us — can recompute the weighted result from plaintext balances. That limit is part of the design, and we state it on every draw."],
  ["Where does the prize come from?", "In this release, from donations into a deterministic vault labelled TEST YIELD. There is no organic strategy return, no APY and no projection. A live strategy adapter can only replace it through the frozen governance process."],
  ["How fast can I withdraw?", "Immediate settlement is attempted first. If confidential liquidity is short, the encrypted remainder joins a strict request-time queue with one active ticket per slot. Partial funding advances earlier claims and leaves your remainder in place."],
  ["What if the draw fails?", "A randomness timeout is terminal for that frozen epoch — no reroll, no substitute winner. A failed encrypted draw can be retried with the same frozen inputs and the same stored random word."],
  ["Who can decrypt my prize?", "Only the winning wallet, after access-control propagation, in its own browser. There is no trusted operator and no automatic decryption."],
];

function Faq({ narrow }) {
  const { Icon } = V();
  const [open, setOpen] = React.useState(0);
  return (
    <Band id="faq" tone="deep" pad="lg">
      <BandHead narrow={narrow} label="Questions" title="Answered honestly." />
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "minmax(0, 760px)", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {FAQS.map(([q, a], i) => {
            const on = open === i;
            return (
              <div key={q} style={{ borderTop: "1px solid var(--border-hairline)" }}>
                <button type="button" onClick={() => setOpen(on ? -1 : i)} aria-expanded={on}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, width: "100%", minHeight: 58, padding: "18px 0", background: "none", border: 0, cursor: "pointer", textAlign: "left", color: "var(--text-primary)" }}>
                  <span className="vs-title-3" style={{ fontWeight: on ? 600 : 500 }}>{q}</span>
                  <Icon name={on ? "minus" : "plus"} size={15} style={{ color: on ? "var(--text-private)" : "var(--text-muted)", flex: "none" }} />
                </button>
                {on ? <p className="vs-body" style={{ margin: 0, paddingBottom: 24, maxWidth: "66ch", color: "var(--text-secondary)", animation: "vs-settle var(--dur-base) var(--ease-entrance)" }}>{a}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    </Band>
  );
}

Object.assign(window, { Tension, HowItWorks, DrawStory, PrivacyStory, Faq });
})();
