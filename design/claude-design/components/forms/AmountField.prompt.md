Six-decimal cUSDT entry for deposit and withdrawal.

```jsx
<AmountField value={amt} onChange={setAmt} max="2,400.000000" onMax={fillMax}
  helper="Encrypted in your browser before it is submitted." />
```

Rejects a 7th decimal locally with "cUSDT supports six decimal places." `max` only appears once the user has revealed their balance — never pre-reveal it to fill this field.