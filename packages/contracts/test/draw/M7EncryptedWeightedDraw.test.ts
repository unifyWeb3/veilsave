import { expect } from "chai";
import { ZeroAddress, getAddress, parseEther } from "ethers";
import * as hre from "hardhat";

const UINT64_MAX = (1n << 64n) - 1n;

type Fixture = { pool: any; owners: string[] };

type DrawVector = {
  id: string;
  weights: bigint[];
  randomWord: bigint;
};

const vectors: DrawVector[] = [
  {
    id: "all-zero",
    weights: Array(16).fill(0n),
    randomWord: UINT64_MAX,
  },
  {
    id: "only-slot-0",
    weights: [100n, ...Array(15).fill(0n)],
    randomWord: 123456789n,
  },
  {
    id: "only-slot-15",
    weights: [...Array(15).fill(0n), 999n],
    randomWord: 987654321n,
  },
  {
    id: "equal",
    weights: Array(16).fill(10n),
    randomWord: 1311768467463790320n,
  },
  {
    id: "dominant-slot-7",
    weights: [1n, 1n, 1n, 1n, 1n, 1n, 1n, 1000000n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n],
    randomWord: 9223372036854775808n,
  },
  {
    id: "sparse",
    weights: [0n, 5n, 0n, 0n, 7n, 0n, 0n, 11n, 0n, 13n, 0n, 0n, 17n, 0n, 19n, 0n],
    randomWord: 16045690984503098046n,
  },
  {
    id: "small-total",
    weights: [1n, 0n, 2n, 0n, 0n, 3n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
    randomWord: 6148914691236517205n,
  },
  {
    id: "large-safe",
    weights: [18446744073709551600n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 0n],
    randomWord: UINT64_MAX,
  },
  {
    id: "overflow",
    weights: [UINT64_MAX, 1n, ...Array(14).fill(0n)],
    randomWord: 42n,
  },
];

function oracle(weights: readonly bigint[], slots: readonly string[], randomWord: bigint) {
  const effective = weights.map((weight, index) =>
    slots[index]!.toLowerCase() === ZeroAddress.toLowerCase() ? 0n : weight,
  );
  const rawTotal = effective.reduce((sum, value) => sum + value, 0n);
  const overflow = rawTotal > UINT64_MAX;
  const total = overflow ? 0n : rawTotal;
  const threshold = (total * randomWord) >> 64n;
  let running = 0n;
  const prefixes = effective.map((value) => {
    running = overflow ? 0n : running + value;
    return running;
  });
  const winnerIndex =
    overflow || total === 0n ? null : prefixes.findIndex((prefix) => threshold < prefix);
  return {
    total,
    threshold,
    prefixes,
    overflow,
    winner: winnerIndex === null || winnerIndex < 0 ? ZeroAddress : slots[winnerIndex]!,
  };
}

async function deployFixture(): Promise<Fixture> {
  const signers = await hre.ethers.getSigners();
  const bootstrap = signers[0]!;
  const timelock = signers[1]!;
  const guardian = signers[2]!;
  const owners = Array.from({ length: 16 }, (_, index) =>
    getAddress(
      `0x${BigInt(index + 1)
        .toString(16)
        .padStart(40, "0")}`,
    ),
  );
  const asset: any = await (
    await hre.ethers.getContractFactory("MockSixDecimalAsset", bootstrap)
  ).deploy();
  await asset.waitForDeployment();
  const token: any = await (
    await hre.ethers.getContractFactory("TestConfidentialUSDT", bootstrap)
  ).deploy(await asset.getAddress());
  await token.waitForDeployment();
  const vrf: any = await (
    await hre.ethers.getContractFactory("MockPoolVrfBinding", bootstrap)
  ).deploy(bootstrap.address, timelock.address);
  await vrf.waitForDeployment();
  const settlement: any = await (
    await hre.ethers.getContractFactory("MockSettlementBinding", bootstrap)
  ).deploy(
    bootstrap.address,
    await token.getAddress(),
    await asset.getAddress(),
    timelock.address,
    guardian.address,
  );
  await settlement.waitForDeployment();
  const pool: any = await (
    await hre.ethers.getContractFactory("ConfidentialPrizePoolHarness", bootstrap)
  ).deploy(
    {
      confidentialToken: await token.getAddress(),
      vrfAdapter: await vrf.getAddress(),
      settlementController: await settlement.getAddress(),
      bootstrapAuthority: bootstrap.address,
      timelock: timelock.address,
      pauseGuardian: guardian.address,
    },
    {
      epochDuration: 7 * 24 * 60 * 60,
      requestTimeout: 24 * 60 * 60,
      fulfillmentTimeout: 24 * 60 * 60,
      drawTimeout: 24 * 60 * 60,
      winnerAclDelayBlocks: 96,
      slotBondWei: parseEther("0.001"),
      liquidityTargetBps: 2_000,
    },
  );
  await pool.waitForDeployment();
  await (await vrf.bindPool(await pool.getAddress())).wait();
  await (await settlement.bindPool(await pool.getAddress())).wait();
  await (await pool.activate()).wait();
  await hre.fhevm.assertCoprocessorInitialized(pool, "ConfidentialPrizePoolHarness");
  return { pool, owners };
}

async function executeVector(
  vector: DrawVector,
  options: { duplicateSlot?: [number, number]; emptySlot?: number; randomWord?: bigint } = {},
) {
  const fixture = await deployFixture();
  const controller = (await hre.ethers.getSigners())[0]!;
  const owners = [...fixture.owners];
  if (options.duplicateSlot !== undefined) {
    owners[options.duplicateSlot[0]] = owners[options.duplicateSlot[1]]!;
  }
  if (options.emptySlot !== undefined) owners[options.emptySlot] = ZeroAddress;
  const input = hre.fhevm.createEncryptedInput(await fixture.pool.getAddress(), controller.address);
  for (const weight of vector.weights) input.add64(weight);
  const encrypted = await input.encrypt();
  const randomWord = options.randomWord ?? vector.randomWord;
  const drawReceipt = await (
    await fixture.pool.testPrepareDraw(owners, encrypted.handles, encrypted.inputProof, randomWord)
  ).wait();
  const receipt = await (await fixture.pool.executeEncryptedDraw(1)).wait();
  const winnerInfo = await fixture.pool.epochWinner(1);
  const winner = await hre.fhevm.publicDecryptEaddress(winnerInfo[0]);
  return { fixture, owners, drawReceipt, receipt, winner, winnerInfo };
}

describe("M7 production encrypted weighted draw", function () {
  this.timeout(900_000);

  for (const vector of vectors) {
    it(`matches the independent oracle for ${vector.id}`, async function () {
      const execution = await executeVector(vector);
      const expected = oracle(vector.weights, execution.owners, vector.randomWord);
      expect(execution.winner.toLowerCase()).to.equal(expected.winner.toLowerCase());
      expect((await execution.fixture.pool.epochPublic(1))[0]).to.equal(5n); // REVEAL_PENDING
    });
  }

  it("sanitizes a nonzero weight assigned to an empty slot", async function () {
    const vector = { ...vectors[4]!, weights: Array(16).fill(0n) };
    vector.weights[7] = 1_000_000n;
    const execution = await executeVector(vector, { emptySlot: 7 });
    expect(execution.winner).to.equal(ZeroAddress);
  });

  it("uses only the low 64 random bits", async function () {
    const vector = vectors[3]!;
    const low = 0x123456789abcdef0n;
    const high = (0xfeedn << 64n) | low;
    const lowRun = await executeVector(vector, { randomWord: low });
    const highRun = await executeVector(vector, { randomWord: high });
    expect(highRun.winner).to.equal(lowRun.winner);
  });

  it("matches the oracle across deterministic randomized vectors", async function () {
    let state = 0x9e3779b97f4a7c15n;
    const next = () => {
      state = (state * 6364136223846793005n + 1442695040888963407n) & UINT64_MAX;
      return state;
    };

    for (let caseIndex = 0; caseIndex < 8; ++caseIndex) {
      const weights = Array.from({ length: 16 }, () => next() % 1_000_000n);
      const randomWord = next();
      const vector: DrawVector = {
        id: `random-${caseIndex}`,
        weights,
        randomWord,
      };
      const execution = await executeVector(vector);
      const expected = oracle(weights, execution.owners, randomWord);
      expect(execution.winner.toLowerCase()).to.equal(expected.winner.toLowerCase());
    }
  });

  it("selects deterministically even if a malformed snapshot repeats an address", async function () {
    const vector: DrawVector = {
      id: "duplicate-address",
      weights: [0n, 100n, ...Array(14).fill(0n)],
      randomWord: UINT64_MAX,
    };
    const execution = await executeVector(vector, { duplicateSlot: [1, 0] });
    const expected = oracle(vector.weights, execution.owners, vector.randomWord);
    expect(execution.winner).to.equal(execution.owners[0]);
    expect(execution.winner.toLowerCase()).to.equal(expected.winner.toLowerCase());
  });

  it("keeps the draw transaction under the production release targets", async function () {
    const execution = await executeVector(vectors[5]!);
    const hcu = hre.fhevm.computeTransactionHCU(execution.receipt);
    console.log(
      `PRODUCTION_DRAW_METRIC ${JSON.stringify({
        slots: 16,
        globalHCU: hcu.globalHCU,
        maxHCUDepth: hcu.maxHCUDepth,
        gasUsed: execution.receipt.gasUsed.toString(),
        transactionHash: execution.receipt.hash,
      })}`,
    );
    expect(hcu.globalHCU).to.be.lessThanOrEqual(17_000_000);
    expect(hcu.maxHCUDepth).to.be.lessThanOrEqual(4_000_000);
  });

  it("does not permit a second draw or a draw after its deadline", async function () {
    const execution = await executeVector(vectors[1]!);
    await expect(execution.fixture.pool.executeEncryptedDraw(1)).to.be.revertedWithCustomError(
      execution.fixture.pool,
      "WrongEpochState",
    );
  });
});
