(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;

  /* Withdrawal: routing is unknown until the proof resolves. Immediate settlement and the
     FIFO queue are both normal outcomes, so neither is styled as a failure. */
  function WithdrawFlow({ open, onClose }) {
    const { Sheet, AmountField, Button, StatusStepper, TicketPanel, StatusPill, Icon, RecoveryBanner } = V();
    const [step, setStep] = React.useState("amount");
    const [amount, setAmount] = React.useState("");

    React.useEffect(() => { if (!open) { setStep("amount"); setAmount(""); } }, [open]);
    React.useEffect(() => {
      if (step === "routing") {
        const t = setTimeout(() => setStep(parseFloat(amount || "0") <= 500 ? "immediate" : "queued"), 2400);
        return () => clearTimeout(t);
      }
    }, [step, amount]);

    const routingSteps = [
      { label: "Encrypted in your browser", kind: "encrypting", status: "done" },
      { label: "Request submitted", kind: "submitted", status: "done", meta: "0x2be0…cc" },
      { label: "Routing proof", kind: "dependency", status: step === "routing" ? "active" : "done", detail: "The pool is checking confidential liquidity. Until this resolves, immediate settlement and the queue are both possible." },
    ];

    const footer = step === "amount"
      ? <Button tone="primary" size="lg" block icon="lock" disabled={!amount} onClick={() => setStep("routing")}>Request withdrawal</Button>
      : step === "routing"
        ? <Button tone="secondary" size="lg" block disabled>Determining routing…</Button>
        : <Button tone="primary" size="lg" block onClick={onClose}>Done</Button>;

    const title = step === "immediate" ? "Withdrawal complete" : step === "queued" ? "Withdrawal queued" : "Withdraw principal";

    return (
      <Sheet open={open} eyebrow="Withdraw" title={title} onClose={onClose} footer={footer} fullHeight>
        {step === "amount" ? <>
          <AmountField
            value={amount} onChange={setAmount} label="Amount to withdraw"
            helper="Encrypted in your browser. Try 400 for immediate settlement, 900 to see the FIFO queue."
            autoFocus
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 0 0", borderTop: "1px solid var(--border-hairline)" }}>
            <span className="vs-label">What happens next</span>
            <p style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)", margin: 0 }}>
              Immediate settlement is attempted first. If confidential liquidity is short, the unpaid encrypted remainder joins the withdrawal queue in request order — one active ticket per slot.
            </p>
          </div>
        </> : null}

        {step === "routing" ? <>
          <StatusPill tone="private" pulse>Routing unknown</StatusPill>
          <StatusStepper steps={routingSteps} />
          <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)", margin: 0 }}>
            Your principal is not at risk while this resolves. You can close this sheet and follow it from the dashboard.
          </p>
        </> : null}

        {step === "immediate" ? <>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "var(--r-sm)", background: "var(--teal-500)", color: "var(--ink-050)" }}>
              <Icon name="check" size={16} strokeWidth={2.2} />
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="vs-title-3">Settled immediately</span>
              <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>0x2be04a91ccd7</span>
            </div>
          </div>
          <StatusStepper steps={[...routingSteps, { label: "Confidential transfer to your wallet", kind: "fulfilled", status: "done", meta: "AVAILABLE NOW" }]} />
          <p style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)", margin: 0 }}>
            Confidential liquidity covered the request in full. The amount was never published.
          </p>
        </> : null}

        {step === "queued" ? <>
          <RecoveryBanner tone="info" title="This is a normal protocol state">
            A queue position is not a failure. Your principal remains yours and the ticket keeps its request-time position until it is fully settled.
          </RecoveryBanner>
          <TicketPanel
            state="settlementRequested"
            position={3} total={3} requestedAt="MAR 3 · 09:41"
            steps={[
              { label: "Queued in request order", kind: "submitted", status: "done", meta: "POSITION 3" },
              { label: "Strategy redemption", kind: "dependency", status: "active", detail: "Public redemption from the strategy, then a confidential rewrap into pool liquidity." },
              { label: "FIFO allocation", kind: "dependency", status: "future" },
              { label: "Claim", kind: "fulfilled", status: "future" },
            ]}
          />
          <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)", margin: 0 }}>
            If redemption fails, the ticket stays intact and anyone can retry the settlement call — no value is lost and your position does not move.
          </p>
        </> : null}
      </Sheet>
    );
  }

  Object.assign(window, { WithdrawFlow });
})();
