/* Mock chain state for the VeilSave console kit. Amounts only ever appear here as
   already-formatted strings the user chose to reveal; nothing derives odds or APY. */
(() => {
  const VS_MOCK = {
    wallet: { state: "connected", address: "0x8f21c4b70a5519d3ff9a4004c7", network: "Sepolia" },
    slot: 7,
    epoch: {
      id: 42,
      state: "vrfRequested",
      opened: "MAR 3 · 09:00",
      freezes: "MAR 10 · 09:00",
      elapsed: 68,
      block: "5 812 004",
      request: "0x9f2c41a8b7e5d0c3",
    },
    position: {
      savings: "1,284.720000",
      eligible: "1,284.720000",
      pending: "400.000000",
      eligibleFrom: 43,
    },
    pool: {
      slots: ["mine", "filled", "filled", "empty", "filled", "filled", "empty", "filled", "filled", "empty", "filled", "filled", "empty", "empty", "filled", "filled"],
      strategy: "test",
    },
    queue: [
      { position: 1, slot: 4, state: "claimable", requested: "MAR 2 · 14:22" },
      { position: 2, slot: 7, state: "queued", requested: "MAR 2 · 16:08", mine: true },
      { position: 3, slot: 12, state: "queued", requested: "MAR 3 · 08:41" },
    ],
    prize: { epoch: 41, amount: "96.400000", winner: "0x8f21c4b70a5519d3ff9a4004c7" },
    activity: [
      { kind: "deposit", title: "Deposit confirmed", epoch: 42, time: "MAR 3 · 09:14", hash: "0x4c8b21ff90a4c7", status: "Confirmed" },
      { kind: "reveal", title: "Savings revealed", time: "MAR 3 · 09:20", local: true },
      { kind: "draw", title: "Epoch 41 draw executed", epoch: 41, time: "MAR 2 · 09:04", hash: "0x77a1cd0e4b", status: "Verified" },
      { kind: "withdrawRequest", title: "Withdrawal requested", epoch: 41, time: "MAR 2 · 16:08", hash: "0x2be04a91cc", status: "Queued" },
      { kind: "prize", title: "Epoch 41 winner finalized", epoch: 41, time: "MAR 2 · 09:36", hash: "0x9a41c70de2", status: "Public" },
    ],
    epochSteps: {
      open: [
        { label: "Open", state: "active", meta: "MAR 3 · 09:00", detail: "Deposits made now first participate in epoch 43." },
        { label: "Eligibility frozen", state: "future" },
        { label: "Randomness requested", state: "future" },
        { label: "Randomness fulfilled", state: "future" },
        { label: "Encrypted draw", state: "future" },
        { label: "Winner finalized", state: "future" },
      ],
      frozen: [
        { label: "Open", state: "done", meta: "MAR 3 · 09:00" },
        { label: "Eligibility frozen", state: "active", meta: "BLOCK 5 812 004", detail: "Frozen weights no longer change. The draw can be requested by anyone." },
        { label: "Randomness requested", state: "future" },
        { label: "Randomness fulfilled", state: "future" },
        { label: "Encrypted draw", state: "future" },
        { label: "Winner finalized", state: "future" },
      ],
      vrfRequested: [
        { label: "Open", state: "done", meta: "MAR 3 · 09:00" },
        { label: "Eligibility frozen", state: "done", meta: "BLOCK 5 812 004" },
        { label: "Randomness requested", state: "done", meta: "REQ 0x9f2c…c1" },
        { label: "Randomness fulfilled", state: "waiting", meta: "CHAINLINK VRF", detail: "Chainlink holds the request. Fulfilment usually lands within minutes." },
        { label: "Encrypted draw", state: "future" },
        { label: "Winner finalized", state: "future" },
      ],
      drawRunning: [
        { label: "Open", state: "done", meta: "MAR 3 · 09:00" },
        { label: "Eligibility frozen", state: "done", meta: "BLOCK 5 812 004" },
        { label: "Randomness requested", state: "done", meta: "REQ 0x9f2c…c1" },
        { label: "Randomness fulfilled", state: "done", meta: "WORD STORED" },
        { label: "Encrypted draw", state: "active", meta: "FHE EXECUTION", detail: "The winner is selected over encrypted weights. No balance is decrypted." },
        { label: "Winner finalized", state: "future" },
      ],
      finalized: [
        { label: "Open", state: "done", meta: "MAR 3 · 09:00" },
        { label: "Eligibility frozen", state: "done", meta: "BLOCK 5 812 004" },
        { label: "Randomness requested", state: "done", meta: "REQ 0x9f2c…c1" },
        { label: "Randomness fulfilled", state: "done", meta: "WORD STORED" },
        { label: "Encrypted draw", state: "done", meta: "TX 0x77a1…0e" },
        { label: "Winner finalized", state: "done", meta: "96-BLOCK DELAY PASSED" },
      ],
      timedOut: [
        { label: "Open", state: "done", meta: "MAR 3 · 09:00" },
        { label: "Eligibility frozen", state: "done", meta: "BLOCK 5 812 004" },
        { label: "Randomness requested", state: "done", meta: "REQ 0x9f2c…c1" },
        { label: "Randomness fulfilled", state: "terminal", meta: "TIMED OUT", detail: "The request was not fulfilled in time. This frozen epoch is terminal and cannot be rerolled." },
        { label: "Encrypted draw", state: "terminal" },
        { label: "Winner finalized", state: "terminal" },
      ],
    },
    epochLabels: {
      open: "Epoch open",
      frozen: "Eligibility frozen",
      vrfRequested: "Randomness requested",
      drawRunning: "Encrypted draw running",
      finalized: "Winner finalized",
      timedOut: "Draw timed out",
    },
  };
  window.VS_MOCK = VS_MOCK;
})();
