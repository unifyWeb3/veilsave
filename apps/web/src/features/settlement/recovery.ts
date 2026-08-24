export function parseSettlementPublicId(publicId: string | undefined): bigint | null {
  if (!publicId) return null;
  const match = /^([1-9][0-9]*)(?::(?:aggregate|execute|retry))?$/.exec(publicId);
  if (!match?.[1]) return null;
  return BigInt(match[1]);
}
