(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;

  /* Deposit: readiness → local encryption → wallet → chain → ERC-7984 callback accounting.
     The user's balance is only offered as a Max once they have revealed it themselves. */
  function DepositFlow({ open, onClose }) {
    const { Sheet, AmountField, Button, StatusStepper, ConfidentialValue, StatusPill, Icon, Badge } = V();
    const [step, setStep] = React.useState("amount");
    const [amount, setAmount] = React.useState("");
    const [balance, setBalance] = React.useState("masked");

    React.useEffect(() => { if (!open) { setStep("amount"); setAmount(""); setBalance("masked"); } }, [open]);
    React.useEffect(() => {
      if (step === "submitting") { const t = setTimeout(() => setStep("confirming"), 2000); return () => clearTimeout(t); }
      if (step === "confirming") { const t = setTimeout(() => setStep("confirmed"), 2400); return () => clearTimeout(t); }
    }, [step]);
    React.useEffect(() => {
      if (balance === "revealing") { const t = setTimeout(() => setBalance("revealed"), 1200); return () => clearTimeout(t); }
    }, [balance]);

    const steps = [
      { label: "Encrypted in your browser", kind: "encrypting", status: "done", meta: "FHE INPUT PROOF" },
      { label: "Approve in your wallet", kind: "wallet", status: step === "submitting" ? "active" : "done", detail: "Confirm the confidential transfer. Nothing is submitted until you approve." },
      { label: "Confirming on Sepolia", kind: "confirming", status: step === "submitting" ? "future" : step === "confirming" ? "active" : "done", meta: step === "amount" ? undefined : "0x4c8b…c7", detail: "2 of 3 confirmations." },
      { label: "Token callback accounting", kind: "dependency", status: step === "confirmed" ? "done" : "future", detail: "The ERC-7984 callback credits your slot. Your balance updates when it lands." },
    ];

    const footer = step === "amount"
      ? <Button tone="primary" size="lg" block icon="lock" disabled={!amount} onClick={() => setStep("submitting")}>Encrypt and deposit</Button>
      : step === "confirmed"
        ? <Button tone="primary" size="lg" block onClick={onClose}>Done</Button>
        : <Button tone="secondary" size="lg" block disabled>Waiting on the chain…</Button>;

    return (
      <Sheet open={open} eyebrow="Deposit" title={step === "confirmed" ? "Deposit confirmed" : "Save cUSDT"} onClose={onClose} footer={footer} fullHeight>
        {step === "amount" ? <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: "var(--r-md)", background: "var(--surface-inset)", border: "1px solid var(--border-hairline)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="wallet" size={14} style={{ color: "var(--text-muted)" }} />
              <span style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)" }}>cUSDT in your wallet</span>
            </div>
            <ConfidentialValue
              size="row" state={balance} value="2,400.000000" unit=""
              onReveal={() => setBalance("revealing")} onHide={() => setBalance("masked")}
            />
          </div>
          <AmountField
            value={amount} onChange={setAmount}
            max={balance === "revealed" ? "2,400.000000" : undefined}
            onMax={() => setAmount("2400.000000")}
            helper="Encrypted in your browser before it is submitted."
            autoFocus
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 0 0", borderTop: "1px solid var(--border-hairline)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span className="vs-label">Slot</span>
              <Badge icon="grid-2x2">Slot 07 · yours</Badge>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span className="vs-label">First eligible</span>
              <span style={{ font: "var(--type-body-sm)", color: "var(--text-primary)" }}>Epoch 43</span>
            </div>
            <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)", margin: 0 }}>
              A deposit made while epoch 42 is open first participates in epoch 43. Principal stays withdrawable throughout.
            </p>
          </div>
        </> : null}

        {step === "submitting" || step === "confirming" ? <>
          <StatusPill tone="private" pulse>Deposit in progress</StatusPill>
          <StatusStepper steps={steps} />
          <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)", margin: 0 }}>
            You can close this sheet. The operation continues and appears in your activity when it lands.
          </p>
        </> : null}

        {step === "confirmed" ? <>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: "var(--r-sm)", background: "var(--teal-500)", color: "var(--ink-050)" }}>
              <Icon name="check" size={16} strokeWidth={2.2} />
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="vs-title-3">Credited to slot 07</span>
              <span className="vs-mono-sm" style={{ color: "var(--text-faint)" }}>0x4c8b21ff90a4c7</span>
            </div>
          </div>
          <StatusStepper steps={steps} />
          <p style={{ font: "var(--type-body-sm)", color: "var(--text-secondary)", margin: 0 }}>
            Your pending weight becomes eligible in epoch 43. The amount stayed encrypted the whole way — this confirmation does not contain it.
          </p>
        </> : null}
      </Sheet>
    );
  }

  Object.assign(window, { DepositFlow });
})();
