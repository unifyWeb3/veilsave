import type { ReactNode, CSSProperties } from "react";

/** Icon-only control. `label` is required — it is the accessible name and the tooltip. */
export interface IconButtonProps {
  name: string;
  label: string;
  size?: "sm" | "md" | "lg";
  tone?: "ghost" | "outline" | "private";
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
