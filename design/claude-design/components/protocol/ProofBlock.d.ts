import type { ReactNode, CSSProperties } from "react";

/**
 * A framed group of evidence with a verification verdict — the audit-trail unit.
 * @startingPoint section="Verification" subtitle="Verdict first, evidence on expand" viewport="700x300"
 */
export interface ProofBlockProps {
  title: string;
  verdict?: "verified" | "pending" | "failed" | "none";
  verdictLabel?: string;
  summary?: string;
  /** EvidenceRow children. */
  children?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  footnote?: string;
  style?: CSSProperties;
}
export declare function ProofBlock(props: ProofBlockProps): JSX.Element;
