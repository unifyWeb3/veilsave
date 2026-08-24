One operation's async progress, with the wait explained.

```jsx
<StatusStepper steps={[
  { label: "Encrypted locally", kind: "encrypting", status: "done" },
  { label: "Approved in wallet", kind: "wallet", status: "done", meta: "0x4c…9a" },
  { label: "Confirming on Sepolia", kind: "confirming", status: "active", detail: "2 of 3 confirmations." },
  { label: "Token callback accounting", kind: "dependency", status: "future" },
]} />
```

Kinds map to the real waits: encrypting, wallet, submitted, confirming, dependency (VRF/KMS/ACL/strategy), fulfilled, retryable, terminal. Put the recovery control on the active step via `action`.