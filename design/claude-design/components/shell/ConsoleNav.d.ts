import type { ReactNode, CSSProperties } from "react";

export interface NavItem { id: string; label: string; icon: string; badge?: string }

/**
 * Console navigation: 232px rail on desktop, three-destination bottom bar on mobile.
 * Deposit and Withdraw are dashboard commands, never navigation.
 */
export interface ConsoleNavProps {
  items: NavItem[];
  active: string;
  onNavigate?: (id: string) => void;
  variant?: "rail" | "bottom";
  /** Secondary rail links (Privacy, docs). Rail only. */
  secondary?: NavItem[];
  /** Rail footer — wallet control and strategy identity. */
  footer?: ReactNode;
  style?: CSSProperties;
}
export declare function ConsoleNav(props: ConsoleNavProps): JSX.Element;
