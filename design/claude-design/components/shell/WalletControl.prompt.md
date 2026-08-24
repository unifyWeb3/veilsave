Wallet and network state.

```jsx
<WalletControl state="disconnected" onConnect={connect} />
<WalletControl state="wrongNetwork" network="Sepolia" onSwitch={switchChain} />
<WalletControl state="connected" address="0x8f21c4…04c7" network="Sepolia" />
```

Network identity is always visible. Wrong chain is surfaced before the user commits to an action, not at signature time.