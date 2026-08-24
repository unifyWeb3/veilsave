import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { Contract, ContractTransactionReceipt, ZeroAddress, getAddress } from "ethers";
import * as hre from "hardhat";

import vectors from "./test-vectors.json";
import { makeDeterministicRandomWords, weightedDrawOracle } from "./oracle";

type DrawExecution = {
  contract: Contract;
  slots: string[];
  loadReceipt: ContractTransactionReceipt;
  drawReceipt: ContractTransactionReceipt;
  winner: string;
  hcu: ReturnType<typeof hre.fhevm.computeTransactionHCU>;
};

const makeSlots = (count: number): string[] =>
  Array.from({ length: count }, (_, index) =>
    getAddress(`0x${BigInt(index + 1).toString(16).padStart(40, "0")}`),
  );

async function deployDraw(slotCount: number, slots = makeSlots(slotCount)): Promise<Contract> {
  const [controller] = await hre.ethers.getSigners();
  const factory = await hre.ethers.getContractFactory("EncryptedWeightedDrawSpike", controller);
  const contract = await factory.deploy(slots);
  await contract.waitForDeployment();
  await hre.fhevm.assertCoprocessorInitialized(contract, "EncryptedWeightedDrawSpike");
  return contract;
}

async function executeDraw(
  weights: readonly bigint[],
  randomWord: bigint,
  options: { slots?: string[]; captureDebug?: boolean } = {},
): Promise<DrawExecution> {
  const [controller] = await hre.ethers.getSigners();
  const slots = options.slots ?? makeSlots(weights.length);
  const contract = await deployDraw(weights.length, slots);
  const contractAddress = await contract.getAddress();

  const input = hre.fhevm.createEncryptedInput(contractAddress, controller.address);
  for (const weight of weights) input.add64(weight);
  const encrypted = await input.encrypt();

  const loadReceipt = (await (
    await contract.loadWeights(encrypted.handles, encrypted.inputProof)
  ).wait()) as ContractTransactionReceipt;
  await (await contract.freezeWeights()).wait();
  await (await contract.storeRandomWord(randomWord)).wait();
  const drawReceipt = (await (
    await contract.executeDraw(options.captureDebug ?? true)
  ).wait()) as ContractTransactionReceipt;

  const winnerHandle = await contract.encryptedWinner();
  const winner = await hre.fhevm.publicDecryptEaddress(winnerHandle);
  const hcu = hre.fhevm.computeTransactionHCU(drawReceipt);

  return { contract, slots, loadReceipt, drawReceipt, winner, hcu };
}

async function expectDebugMatchesOracle(
  execution: DrawExecution,
  weights: readonly bigint[],
  randomWord: bigint,
): Promise<void> {
  const oracle = weightedDrawOracle(weights, execution.slots, randomWord);
  const total = await hre.fhevm.debugger.decryptEuint(
    FhevmType.euint64,
    await execution.contract.encryptedTotal(),
  );
  const threshold = await hre.fhevm.debugger.decryptEuint(
    FhevmType.euint64,
    await execution.contract.encryptedThreshold(),
  );
  const overflow = await hre.fhevm.debugger.decryptEbool(
    await execution.contract.encryptedOverflow(),
  );
  const prefixes: bigint[] = [];
  for (let index = 0; index < weights.length; ++index) {
    prefixes.push(
      await hre.fhevm.debugger.decryptEuint(
        FhevmType.euint64,
        await execution.contract.encryptedPrefix(index),
      ),
    );
  }

  expect(total).to.equal(oracle.total);
  expect(threshold).to.equal(oracle.threshold);
  expect(overflow).to.equal(oracle.overflow);
  expect(prefixes).to.deep.equal(oracle.prefixes);
  expect(execution.winner.toLowerCase()).to.equal(oracle.winnerAddress.toLowerCase());
}

function printMetric(label: string, execution: DrawExecution): void {
  console.log(
    `SPIKE_METRIC ${JSON.stringify({
      experiment: label,
      slots: execution.slots.length,
      loadGas: execution.loadReceipt.gasUsed.toString(),
      drawGas: execution.drawReceipt.gasUsed.toString(),
      globalHCU: execution.hcu.globalHCU,
      maxHCUDepth: execution.hcu.maxHCUDepth,
      transactionHash: execution.drawReceipt.hash,
      network: "hardhat-mock",
    })}`,
  );
}

describe("EncryptedWeightedDrawSpike", function () {
  this.timeout(900_000);

  for (const vector of vectors) {
    it(`matches plaintext oracle for ${vector.id}`, async function () {
      const weights = vector.weights.map(BigInt);
      const randomWord = BigInt(vector.randomWord);
      const execution = await executeDraw(weights, randomWord);
      await expectDebugMatchesOracle(execution, weights, randomWord);
    });
  }

  it("matches the oracle for randomized vector J", async function () {
    const words = makeDeterministicRandomWords(17, 0x243f6a8885a308d3n);
    const weights = words.slice(0, 16).map((word, index) => (index % 4 === 0 ? 0n : word & 0xffffn));
    const randomWord = words[16];
    const execution = await executeDraw(weights, randomWord);
    await expectDebugMatchesOracle(execution, weights, randomWord);
  });

  it("ignores a nonzero encrypted weight assigned to an empty slot", async function () {
    const slots = makeSlots(16);
    slots[7] = ZeroAddress;
    const weights = Array.from({ length: 16 }, (_, index) => (index === 7 ? 1_000_000n : 0n));
    const execution = await executeDraw(weights, 123n, { slots });
    await expectDebugMatchesOracle(execution, weights, 123n);
    expect(execution.winner).to.equal(ZeroAddress);
  });

  it("rejects duplicate nonzero public slots", async function () {
    const slots = makeSlots(8);
    slots[7] = slots[0];
    const [controller] = await hre.ethers.getSigners();
    const factory = await hre.ethers.getContractFactory("EncryptedWeightedDrawSpike", controller);
    await expect(factory.deploy(slots)).to.be.revertedWithCustomError(factory, "DuplicateSlot");
  });

  for (const slotCount of [8, 16]) {
    it(`records required ${slotCount}-slot HCU, depth, and gas`, async function () {
      const weights = Array.from({ length: slotCount }, (_, index) => BigInt(index + 1));
      const execution = await executeDraw(weights, 0xdeadbeefcafebaben, { captureDebug: false });
      const expected = weightedDrawOracle(weights, execution.slots, 0xdeadbeefcafebaben);
      expect(execution.winner.toLowerCase()).to.equal(expected.winnerAddress.toLowerCase());
      expect(execution.hcu.globalHCU).to.be.greaterThan(0);
      expect(execution.hcu.maxHCUDepth).to.be.greaterThan(0);
      printMetric(`weighted-${slotCount}`, execution);
    });
  }

  it("attempts the optional 32-slot boundary without treating it as an MVP requirement", async function () {
    const weights = Array.from({ length: 32 }, (_, index) => BigInt(index + 1));
    try {
      const execution = await executeDraw(weights, 0x0123456789abcdefn, { captureDebug: false });
      const expected = weightedDrawOracle(weights, execution.slots, 0x0123456789abcdefn);
      expect(execution.winner.toLowerCase()).to.equal(expected.winnerAddress.toLowerCase());
      printMetric("optional-weighted-32", execution);
    } catch (error) {
      console.log(
        `SPIKE_METRIC ${JSON.stringify({
          experiment: "optional-weighted-32",
          slots: 32,
          result: "FAILED_AT_BOUNDARY",
          error: error instanceof Error ? error.message : String(error),
          network: "hardhat-mock",
        })}`,
      );
    }
  });
});
