The confidential-value primitive — every encrypted figure in the product renders through it.

```jsx
<ConfidentialValue size="xl" state="masked" onReveal={reveal} />
<ConfidentialValue state="revealing" />
<ConfidentialValue state="revealed" value="1,284.720000" onHide={hide} />
<ConfidentialValue state="aclPending" />
<ConfidentialValue state="unavailable" onRetry={retry} />
```

States: masked · revealing · aclPending · revealed · stale · unavailable · error. Redaction is always six marks so digit count never leaks, and the value slot keeps its height across states so nothing reflows. Each instance is independent — revealing principal must never reveal a prize.