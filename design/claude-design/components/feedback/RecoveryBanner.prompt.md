Actionable conditions at the top of a view.

```jsx
<RecoveryBanner tone="network" title="Wrong network" actionLabel="Switch to Sepolia" onAction={switchChain}>
  Writes are blocked until your wallet is on Sepolia. Reads continue.
</RecoveryBanner>
<RecoveryBanner tone="paused" title="Deposits paused" scope="Deposits" secondaryLabel="View withdrawal">
  Withdrawals and claims are unaffected.
</RecoveryBanner>
```

One banner at a time, highest severity wins. Always name the scope of a pause and the exit that still works.