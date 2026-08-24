Live protocol status — colour, glyph and word together.

```jsx
<StatusPill tone="verified">Authenticated</StatusPill>
<StatusPill tone="pending" pulse>Awaiting VRF</StatusPill>
<StatusPill tone="terminal">Timed out</StatusPill>
```

`pulse` means "waiting on something outside this browser". Never more than two pills in one row of the console.