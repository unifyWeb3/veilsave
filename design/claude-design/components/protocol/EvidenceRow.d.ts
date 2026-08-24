import type { ReactNode, CSSProperties } from "react";

/** One piece of public evidence: label, machine value, copy and explorer access. */
export interface EvidenceRowProps {
  label: string;
  value?: string;
  /** hash/address/handle render in mono and truncate in the middle; plain renders as prose. */
  kind?: "hash" | "address" | "handle" | "plain";
  href?: string;
  /** Marks the row as authenticated by the proof this block reports. */
  verified?: boolean;
  note?: string;
  truncate?: boolean;
  onCopy?: (value?: string) => void;
  style?: CSSProperties;
}
export declare function EvidenceRow(props: EvidenceRowProps): JSX.Element;
