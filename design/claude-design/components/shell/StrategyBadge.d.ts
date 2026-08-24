import type { ReactNode, CSSProperties } from "react";

/** Strategy identity. TEST YIELD never sits beside an APY or an implied return. */
export interface StrategyBadgeProps {
  mode?: "test" | "live";
  size?: "sm" | "md";
  withHint?: boolean;
  style?: CSSProperties;
}
export declare function StrategyBadge(props: StrategyBadgeProps): JSX.Element;
