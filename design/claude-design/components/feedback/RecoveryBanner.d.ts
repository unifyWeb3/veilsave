import type { ReactNode, CSSProperties } from "react";

export type BannerTone = "info" | "pending" | "critical" | "paused" | "network";

/**
 * Top-of-view banner for an actionable condition: wrong network, paused scope, stale data,
 * retryable recovery. Rendered only when there is an action or a safety statement.
 * @startingPoint section="States" subtitle="Actionable recovery and safety banners" viewport="700x180"
 */
export interface RecoveryBannerProps {
  tone?: BannerTone;
  title: string;
  children?: ReactNode;
  /** Pause and failure scope, e.g. "Deposits paused". */
  scope?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onDismiss?: () => void;
  style?: CSSProperties;
}
export declare function RecoveryBanner(props: RecoveryBannerProps): JSX.Element;
