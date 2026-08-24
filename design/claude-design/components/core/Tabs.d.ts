import type { ReactNode, CSSProperties } from "react";

export interface TabItem { id: string; label: string; count?: number }

/** Underlined tab set for sibling views (current draw vs history, summary vs evidence). */
export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange?: (id: string) => void;
  style?: CSSProperties;
}
export declare function Tabs(props: TabsProps): JSX.Element;
