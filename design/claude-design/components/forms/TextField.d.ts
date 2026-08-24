import type { ReactNode, CSSProperties } from "react";

/** Text entry for public values only — addresses, epoch ids, hashes. Never amounts. */
export interface TextFieldProps {
  value: string;
  onChange?: (next: string) => void;
  label?: string;
  placeholder?: string;
  mono?: boolean;
  icon?: string;
  error?: string;
  helper?: string;
  disabled?: boolean;
  id?: string;
  style?: CSSProperties;
}
export declare function TextField(props: TextFieldProps): JSX.Element;
