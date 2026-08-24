import { ZeroAddress } from "ethers";

export const UINT64_MODULUS = 1n << 64n;
export const UINT64_MAX = UINT64_MODULUS - 1n;

export type OracleResult = {
  effectiveWeights: bigint[];
  total: bigint;
  threshold: bigint;
  prefixes: bigint[];
  winnerIndex: number | null;
  winnerAddress: string;
  overflow: boolean;
};

export function weightedDrawOracle(weights: readonly bigint[], slots: readonly string[], randomWord: bigint): OracleResult {
  if (weights.length !== slots.length) throw new Error("weights and slots length mismatch");
  if (randomWord < 0n || randomWord > UINT64_MAX) throw new Error("random word outside uint64");

  const effectiveWeights = weights.map((weight, index) => {
    if (weight < 0n || weight > UINT64_MAX) throw new Error(`weight ${index} outside uint64`);
    return slots[index].toLowerCase() === ZeroAddress.toLowerCase() ? 0n : weight;
  });

  const rawTotal = effectiveWeights.reduce((sum, weight) => sum + weight, 0n);
  const overflow = rawTotal > UINT64_MAX;
  const total = overflow ? 0n : rawTotal;
  const threshold = total === 0n ? 0n : (total * randomWord) >> 64n;

  let running = 0n;
  const prefixes = effectiveWeights.map((weight) => {
    running = overflow ? 0n : running + weight;
    return running;
  });

  let winnerIndex: number | null = null;
  if (!overflow && total > 0n) {
    winnerIndex = prefixes.findIndex((prefix) => threshold < prefix);
    if (winnerIndex < 0) throw new Error("oracle failed to find first crossing");
  }

  return {
    effectiveWeights,
    total,
    threshold,
    prefixes,
    winnerIndex,
    winnerAddress: winnerIndex === null ? ZeroAddress : slots[winnerIndex],
    overflow,
  };
}

export function makeDeterministicRandomWords(count: number, seed = 0x9e3779b97f4a7c15n): bigint[] {
  let state = seed & UINT64_MAX;
  const words: bigint[] = [];
  for (let i = 0; i < count; ++i) {
    state ^= state >> 12n;
    state ^= (state << 25n) & UINT64_MAX;
    state ^= state >> 27n;
    state &= UINT64_MAX;
    words.push((state * 0x2545f4914f6cdd1dn) & UINT64_MAX);
  }
  return words;
}
