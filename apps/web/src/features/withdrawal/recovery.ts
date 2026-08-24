import { WithdrawalStatus } from "../../protocol/types";

export type CanonicalWithdrawalStage = "immediate" | "queued" | "completion-proof" | "complete";

export function parseWithdrawalPublicId(publicId: string | undefined): bigint | null {
  if (!publicId) return null;
  const match = /^(\d+)(?::(?:routing|service|completion))?$/.exec(publicId);
  if (!match?.[1]) return null;
  return BigInt(match[1]);
}

export function canonicalWithdrawalStage(
  status: WithdrawalStatus,
): CanonicalWithdrawalStage | null {
  if (status === WithdrawalStatus.ImmediateSettled) return "immediate";
  if (status === WithdrawalStatus.Claimed) return "complete";
  if (status === WithdrawalStatus.Queued) return "queued";
  if (status === WithdrawalStatus.PayoutStatusPending) return "completion-proof";
  return null;
}
