Command control in five tones.

```jsx
<Button tone="primary" icon="arrow-down-to-line">Deposit</Button>
<Button tone="secondary" size="sm">Cancel</Button>
<Button tone="reveal" size="sm" icon="eye">Reveal balance</Button>
<Button tone="primary" busy>Awaiting wallet…</Button>
```

`primary` is light-on-dark and there is only one per view. `reveal` is reserved for confidential reveals. `busy` for wallet/chain waits — it disables and announces aria-busy. Sizes: sm 30, md 38, lg 46 (use lg for mobile sheet footers to clear the 44px target).