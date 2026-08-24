The epoch outcome for the connected wallet.

```jsx
<ResultState variant="winner" epoch="41" address="0x8f21…04c7">
  <ConfidentialValue size="lg" state="aclPending" />
</ResultState>
<ResultState variant="nonWinner" epoch="41" />
```

Winner is quiet: one teal glyph, one halo that plays twice, no confetti. Pass the prize as a ConfidentialValue child — the amount is never revealed without an explicit action.