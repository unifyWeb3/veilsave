A FIFO queue row.

```jsx
<ul style={{display:"grid",gap:8}}>
  <QueueItem position={1} total={3} state="claimable" slot={4} requested="MAR 2 · 14:22" />
  <QueueItem position={2} total={3} state="queued" slot={7} requested="MAR 2 · 16:08" mine />
</ul>
```

Order is fixed at request time. Never style a queue position as an error.