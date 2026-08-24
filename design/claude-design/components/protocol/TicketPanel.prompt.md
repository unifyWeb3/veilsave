The FIFO withdrawal ticket.

```jsx
<TicketPanel state="claimable" position={1} total={3} requestedAt="MAR 2 · 14:22" onClaim={claim} />
<TicketPanel state="retryable" onRetry={retry} />
```

States: queued, settlementRequested, ready, partial, claimable, claimed, retryable. Partial settlement keeps the encrypted remainder in its original position — say so, do not imply loss.