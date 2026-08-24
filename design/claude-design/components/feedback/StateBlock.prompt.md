Empty, waiting, unavailable and terminal states.

```jsx
<StateBlock kind="empty" title="No savings yet" actionLabel="Deposit cUSDT">
  Deposit to take a slot. Your amount is encrypted before it leaves your browser.
</StateBlock>
<StateBlock kind="offline" title="Sepolia RPC unavailable" safety="Your principal is unaffected." actionLabel="Retry" />
```

Every instance answers: what happened, is my money safe, what now. Kinds: empty, waiting, loading, unavailable, offline, paused, terminal, failed.