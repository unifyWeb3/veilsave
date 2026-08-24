(() => {
  const V = () => window.VeilSaveDesignSystem_484fa6;

  /* The winner journey — the product's strongest sequence:
     verified winner → authorized (ACL) → ready → revealed → claimed.
     Nothing decrypts without an explicit action, and the celebration stays quiet. */
  function PrizePanel({ scenario = "default", reveals }) {
    const { ResultState, ConfidentialValue, StatusStepper, Button, StateBlock, Icon } = V();
    const prize = window.VS_MOCK.prize;
    const winner = scenario === "winner" || scenario === "default";
    const [stage, setStage] = React.useState(scenario === "winner" ? "proof" : "ready");

    React.useEffect(() => {
      if (stage === "proof") { const t = setTimeout(() => setStage("acl"), 1800); return () => clearTimeout(t); }
      if (stage === "acl") { const t = setTimeout(() => setStage("ready"), 2400); return () => clearTimeout(t); }
      if (stage === "revealing") { const t = setTimeout(() => setStage("revealed"), 1400); return () => clearTimeout(t); }
    }, [stage]);

    if (!winner) {
      return (
        <Section label="Prize" title={`Epoch ${prize.epoch} result`} gap={16}>
          <ResultState variant="nonWinner" epoch={prize.epoch} />
        </Section>
      );
    }
    if (scenario === "noDraw") {
      return (
        <Section label="Prize" title="No active draw" gap={16}>
          <StateBlock kind="waiting" title="Waiting for the next epoch" meta="OPENS MAR 10 · 09:00" compact>
            Eligibility freezes weekly. Nothing is required from you until then.
          </StateBlock>
        </Section>
      );
    }

    const valueState = stage === "proof" ? "unavailable" : stage === "acl" ? "aclPending"
      : stage === "ready" ? "masked" : stage === "revealing" ? "revealing" : "revealed";

    const steps = [
      { label: "Winner finalized", kind: "fulfilled", status: "done", meta: "PUBLIC ADDRESS" },
      { label: "KMS proof authenticated", kind: "dependency", status: stage === "proof" ? "active" : "done", meta: stage === "proof" ? undefined : "VERIFIED", detail: "The public-decryption proof binds epoch, request, handle and winner address." },
      { label: "96-block finality delay", kind: "dependency", status: stage === "proof" ? "future" : "done", meta: stage === "proof" ? undefined : "PASSED" },
      { label: "Private access confirmed", kind: "dependency", status: stage === "proof" ? "future" : stage === "acl" ? "active" : "done", detail: "Access-control propagation lets your wallet — and only your wallet — decrypt the prize.", meta: stage === "proof" || stage === "acl" ? undefined : "GRANTED" },
    ];

    return (
      <Section label="Prize" title={`Epoch ${prize.epoch} result`} gap={16}>
        <ResultState variant="winner" epoch={prize.epoch} address="0x8f21c4…04c7">
          <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 4 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
              <ConfidentialValue
                label="Your prize"
                size="lg"
                state={valueState}
                value={prize.amount}
                hideActions
                note={stage === "proof" ? "Verifying the winner proof" : undefined}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {stage === "ready" ? <Button tone="reveal" size="md" icon="key-round" onClick={() => setStage("revealing")}>Reveal prize</Button> : null}
                {stage === "revealed" ? <>
                  <Button tone="primary" size="md" icon="arrow-down-to-line" onClick={() => setStage("claimed")}>Claim prize</Button>
                  <Button tone="ghost" size="md" icon="eye-off" onClick={() => setStage("ready")}>Hide</Button>
                </> : null}
                {stage === "claimed" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 7, font: "var(--type-body-sm)", color: "var(--text-verified)" }}><Icon name="circle-check" size={14} /> Claimed to your wallet</span> : null}
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--border-verified)", paddingTop: 16 }}>
              <StatusStepper steps={steps} />
            </div>
            <span style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
              The winner address is public. The prize amount is decrypted locally, in this session only — it is never written to a log, a URL, or a notification.
            </span>
          </div>
        </ResultState>
      </Section>
    );
  }

  Object.assign(window, { PrizePanel });
})();
