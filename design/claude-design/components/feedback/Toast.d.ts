import type { ReactNode, CSSProperties } from "react";

/** Transient confirmation. Protocol facts only — never a plaintext amount or revealed value. */
export interface ToastProps {
  tone?: "neutral" | "private" | "verified" | "pending" | "critical";
  title: string;
  children?: ReactNode;
  hash?: string;
  onDismiss?: () => void;
  style?: CSSProperties;
}
export declare function Toast(props: ToastProps): JSX.Element;
