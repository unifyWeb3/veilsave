import type { ReactNode, CSSProperties } from "react";

export type WalletState = "disconnected" | "connecting" | "connected" | "wrongNetwork";

/** Wallet and network control. A wrong chain blocks writes and says so in place. */
export interface WalletControlProps {
  state?: WalletState;
  address?: string;
  network?: string;
  compact?: boolean;
  onConnect?: () => void;
  onSwitch?: () => void;
  onDisconnect?: () => void;
  style?: CSSProperties;
}
export declare function WalletControl(props: WalletControlProps): JSX.Element;
