import type { ReactNode, CSSProperties } from "react";

/**
 * The public/private boundary, stated plainly in two columns plus the verification limitation.
 * @startingPoint section="Confidential" subtitle="Public vs encrypted boundary statement" viewport="700x300"
 */
export interface PrivacyCalloutProps {
  title?: string;
  privateItems?: string[];
  publicItems?: string[];
  /** The verification limitation. Pass null to omit — only where it is stated nearby. */
  limitation?: string | null;
  compact?: boolean;
  style?: CSSProperties;
}
export declare function PrivacyCallout(props: PrivacyCalloutProps): JSX.Element;
