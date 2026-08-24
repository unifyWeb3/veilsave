Console navigation.

```jsx
<ConsoleNav variant="rail" active="dashboard" onNavigate={go}
  items={[{id:"pool",label:"Pool",icon:"grid-2x2"},{id:"dashboard",label:"Dashboard",icon:"vault"},{id:"draws",label:"Draws",icon:"dices"}]}
  secondary={[{id:"privacy",label:"Privacy",icon:"lock"}]}
  footer={<WalletControl state="connected" address="0x8f21…04c7" />} />
<ConsoleNav variant="bottom" … />
```

Only the frozen routes appear here: Pool, Dashboard, Draws, plus Privacy as a secondary link. Deposit and Withdraw are commands on the dashboard.