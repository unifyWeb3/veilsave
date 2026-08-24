import { useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";

import { SEPOLIA_CHAIN_ID } from "@veilsave/shared";

import { Button, Icon, shortenMiddle } from "../design/Primitives";

export function WalletControl({ compact = false }: { compact?: boolean }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [copied, setCopied] = useState(false);

  if (!isConnected || !address) {
    const connector = connectors[0];
    return <Button size={compact ? "sm" : "md"} icon="wallet" busy={isPending} disabled={!connector} onClick={() => connector && connect({ connector })}>{isPending ? "Requesting access…" : "Connect wallet"}</Button>;
  }

  if (chainId !== SEPOLIA_CHAIN_ID) {
    return <Button tone="danger" size={compact ? "sm" : "md"} icon="triangle-alert" busy={switching} onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}>{switching ? "Switching…" : "Switch to Sepolia"}</Button>;
  }

  return (
    <div className="wallet-control">
      <button
        className="wallet-address"
        type="button"
        onClick={async () => {
          await navigator.clipboard?.writeText(address);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        }}
        aria-label="Copy wallet address"
      >
        <span className="wallet-dot" aria-hidden="true" />
        <span className="mono">{shortenMiddle(address, 6, 4)}</span>
        <span className="wallet-network">Sepolia</span>
        <Icon name={copied ? "check" : "copy"} size={13} />
      </button>
      <button className="wallet-disconnect" type="button" onClick={() => disconnect()} aria-label="Disconnect wallet" title="Disconnect wallet"><Icon name="x" size={14} /></button>
    </div>
  );
}
