The one overlay: dialog on desktop, bottom sheet on mobile.

```jsx
<Sheet open={open} eyebrow="Deposit" title="Save cUSDT" onClose={close}
  footer={<Button tone="primary" size="lg" block>Encrypt and deposit</Button>}>
  <AmountField … />
</Sheet>
```

Escape closes; the scrim blurs but never covers the value being acted on. Use `fullHeight` for multi-step flows on mobile.