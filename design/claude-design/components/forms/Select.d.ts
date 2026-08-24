import type { ReactNode, CSSProperties } from "react";

export interface SelectOption { value: string; label: string }

/** Dropdown for public filters (epoch range, evidence view). Never for protocol parameters. */
export interface SelectProps {
  value: string;
  onChange?: (next: string) => void;
  options: SelectOption[];
  label?: string;
  disabled?: boolean;
  id?: string;
  style?: CSSProperties;
}
export declare function Select(props: SelectProps): JSX.Element;
