import { expect } from "chai";
import { ZeroAddress, getAddress } from "ethers";

import vectors from "./test-vectors.json";
import {
  UINT64_MAX,
  makeDeterministicRandomWords,
  weightedDrawOracle,
} from "./oracle";

const makeSlots = (count: number): string[] =>
  Array.from({ length: count }, (_, index) =>
    getAddress(`0x${BigInt(index + 1).toString(16).padStart(40, "0")}`),
  );

const thresholdAtWidth = (total: bigint, randomWord: bigint, bits: bigint): bigint =>
  (total * randomWord) >> bits;

const selectIndexFast = (weights: readonly bigint[], randomWord: bigint): number => {
  const total = weights.reduce((sum, weight) => sum + weight, 0n);
  if (total === 0n) return -1;
  const threshold = (total * randomWord) >> 64n;
  let prefix = 0n;
  for (let index = 0; index < weights.length; ++index) {
    prefix += weights[index];
    if (threshold < prefix) return index;
  }
  throw new Error("fast oracle failed to find first crossing");
};

describe("plaintext weighted draw oracle", function () {
  this.timeout(900_000);
  const slots = makeSlots(16);

  for (const vector of vectors) {
    it(`validates deterministic vector ${vector.id}`, function () {
      const weights = vector.weights.map(BigInt);
      const randomWord = BigInt(vector.randomWord);
      const result = weightedDrawOracle(weights, slots, randomWord);

      expect(result.threshold).to.equal((result.total * randomWord) >> 64n);
      expect(result.prefixes.at(-1)).to.equal(result.total);

      if (result.total === 0n) {
        expect(result.winnerIndex).to.equal(null);
        expect(result.winnerAddress).to.equal(ZeroAddress);
      } else {
        expect(result.winnerIndex).not.to.equal(null);
        const winnerIndex = result.winnerIndex as number;
        expect(result.threshold).to.be.lessThan(result.prefixes[winnerIndex]);
        if (winnerIndex > 0) {
          expect(result.threshold).to.be.greaterThanOrEqual(result.prefixes[winnerIndex - 1]);
        }
        expect(result.effectiveWeights[winnerIndex]).to.be.greaterThan(0n);
      }
    });
  }

  it("forces an empty public slot to zero weight", function () {
    const emptySlots = [...slots];
    emptySlots[4] = ZeroAddress;
    const result = weightedDrawOracle(
      [0n, 0n, 0n, 0n, UINT64_MAX, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
      emptySlots,
      UINT64_MAX,
    );

    expect(result.effectiveWeights[4]).to.equal(0n);
    expect(result.total).to.equal(0n);
    expect(result.winnerAddress).to.equal(ZeroAddress);
  });

  it("exhaustively checks multiply-high range reduction at reduced widths", function () {
    for (const bits of [8n, 12n, 16n]) {
      const domain = 1n << bits;
      for (let total = 1n; total <= 31n; ++total) {
        const counts = Array.from({ length: Number(total) }, () => 0);
        for (let randomWord = 0n; randomWord < domain; ++randomWord) {
          const threshold = thresholdAtWidth(total, randomWord, bits);
          if (threshold >= total) throw new Error(`threshold escaped range for ${bits}-bit domain`);
          counts[Number(threshold)] += 1;
        }

        const minimum = Math.min(...counts);
        const maximum = Math.max(...counts);
        expect(maximum - minimum).to.be.at.most(1);
      }
    }
  });

  it("selects equal weights approximately uniformly over 100,000 deterministic words", function () {
    const words = makeDeterministicRandomWords(100_000);
    const weights = Array.from({ length: 16 }, () => 1n);
    const counts = Array.from({ length: 16 }, () => 0);

    for (const word of words) {
      const winner = selectIndexFast(weights, word);
      if (winner < 0) throw new Error("positive equal-weight total produced no winner");
      counts[winner] += 1;
    }

    console.log(`ORACLE_DISTRIBUTION equal=${JSON.stringify(counts)}`);
    for (const count of counts) {
      const observed = count / words.length;
      expect(Math.abs(observed - 1 / 16)).to.be.lessThan(0.006);
    }
  });

  it("tracks unequal weight proportions over 100,000 deterministic words", function () {
    const words = makeDeterministicRandomWords(100_000, 0xd1b54a32d192ed03n);
    const weights = Array.from({ length: 16 }, (_, index) => BigInt(index + 1));
    const counts = Array.from({ length: 16 }, () => 0);
    const total = Number(weights.reduce((sum, weight) => sum + weight, 0n));

    for (const word of words) {
      const winner = selectIndexFast(weights, word);
      if (winner < 0) throw new Error("positive unequal-weight total produced no winner");
      counts[winner] += 1;
    }

    console.log(`ORACLE_DISTRIBUTION weighted=${JSON.stringify(counts)}`);
    counts.forEach((count, index) => {
      const expected = Number(weights[index]) / total;
      const observed = count / words.length;
      expect(Math.abs(observed - expected)).to.be.lessThan(0.006);
    });
  });

  it("validates 1,000 randomized vectors and first-crossing invariants", function () {
    const words = makeDeterministicRandomWords(17_000, 0x94d049bb133111ebn);

    for (let trial = 0; trial < 1_000; ++trial) {
      const weights = words
        .slice(trial * 16, trial * 16 + 16)
        .map((word, index) => (index % 5 === 0 ? 0n : word & 0xffffn));
      const randomWord = words[16_000 + trial];
      const result = weightedDrawOracle(weights, slots, randomWord);

      if (result.total !== weights.reduce((sum, weight) => sum + weight, 0n)) {
        throw new Error(`randomized trial ${trial} total mismatch`);
      }
      if (result.prefixes.at(-1) !== result.total) {
        throw new Error(`randomized trial ${trial} final prefix mismatch`);
      }
      if (result.winnerIndex === null) throw new Error(`randomized trial ${trial} produced no winner`);

      const winnerIndex = result.winnerIndex as number;
      if (weights[winnerIndex] === 0n) throw new Error(`randomized trial ${trial} selected zero weight`);
      if (result.threshold >= result.prefixes[winnerIndex]) {
        throw new Error(`randomized trial ${trial} did not cross winner prefix`);
      }
      if (winnerIndex > 0) {
        if (result.threshold < result.prefixes[winnerIndex - 1]) {
          throw new Error(`randomized trial ${trial} did not select first crossing`);
        }
      }
    }
  });
});
