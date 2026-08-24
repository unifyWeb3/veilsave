The public epoch lifecycle in protocol order.

```jsx
<EpochTimeline steps={[
  { label: "Open", state: "done", meta: "MAR 3 · 09:00" },
  { label: "Eligibility frozen", state: "done", meta: "BLOCK 5 812 004" },
  { label: "Randomness requested", state: "waiting", meta: "REQ 0x9f…c1", detail: "Chainlink VRF has the request. Fulfilment usually lands within minutes." },
  { label: "Encrypted draw", state: "future" },
  { label: "Winner finalized", state: "future" },
]} />
```

Only the active, waiting and failed nodes carry prose — that is what keeps the timeline calm. Switch to `orientation="vertical"` below 768px. A VRF timeout is `terminal`, not `failed`: there is no reroll.