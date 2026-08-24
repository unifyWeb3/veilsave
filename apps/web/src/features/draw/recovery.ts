export const DRAW_RECOVERY_ACTIONS = [
  "freeze",
  "request-vrf",
  "sync-vrf",
  "execute-draw",
  "finalize-winner",
  "abandon-unrequested",
  "abandon-unfulfilled",
  "abandon-unexecuted",
  "claim-prize",
  "open-next",
] as const;

export type DrawRecoveryAction = (typeof DRAW_RECOVERY_ACTIONS)[number];

const actionPattern = DRAW_RECOVERY_ACTIONS.join("|");
const PUBLIC_ID_PATTERN = new RegExp(`^([1-9][0-9]*):(${actionPattern})$`);

export interface DrawRecoveryReference {
  epochId: bigint;
  action: DrawRecoveryAction;
}

export function parseDrawRecoveryPublicId(
  publicId: string | undefined,
): DrawRecoveryReference | null {
  if (!publicId) return null;
  const match = PUBLIC_ID_PATTERN.exec(publicId);
  if (!match?.[1] || !match[2]) return null;
  return {
    epochId: BigInt(match[1]),
    action: match[2] as DrawRecoveryAction,
  };
}
