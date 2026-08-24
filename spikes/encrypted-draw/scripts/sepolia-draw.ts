import { mkdirSync, writeFileSync } from "node:fs";
import { Contract, ContractTransactionReceipt, getAddress } from "ethers";
import * as hre from "hardhat";

const SLOT_COUNT = Number(process.env.DRAW_SLOTS ?? "16");
const RANDOM_WORD = 0xdeadbeefcafebaben;
const WEIGHTS = Array.from({ length: SLOT_COUNT }, (_, index) => BigInt(index + 1));

const makeSlots = (count: number): string[] =>
  Array.from({ length: count }, (_, index) =>
    getAddress(`0x${BigInt(index + 1).toString(16).padStart(40, "0")}`),
  );

async function waitForPublicAddress(handle: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 8; ++attempt) {
    try {
      return await hre.fhevm.publicDecryptEaddress(handle);
    } catch (error) {
      lastError = error;
      console.log(`public decrypt attempt ${attempt}/8 is not ready`);
      await new Promise((resolve) => setTimeout(resolve, 15_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main(): Promise<void> {
  await hre.fhevm.initializeCLIApi();
  const [controller] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 11155111n) throw new Error(`expected Sepolia, got ${network.chainId}`);

  const slots = makeSlots(SLOT_COUNT);
  const factory = await hre.ethers.getContractFactory("EncryptedWeightedDrawSpike", controller);
  console.log(`deploying ${SLOT_COUNT}-slot spike from ${controller.address}`);
  const contract = await factory.deploy(slots);
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  const deploymentReceipt = (await contract.deploymentTransaction()?.wait()) as ContractTransactionReceipt;

  await hre.fhevm.assertCoprocessorInitialized(contract, "EncryptedWeightedDrawSpike");
  const input = hre.fhevm.createEncryptedInput(contractAddress, controller.address);
  for (const weight of WEIGHTS) input.add64(weight);
  console.log("encrypting fixed test vector");
  const encrypted = await input.encrypt();

  const loadReceipt = (await (
    await contract.loadWeights(encrypted.handles, encrypted.inputProof)
  ).wait()) as ContractTransactionReceipt;
  const freezeReceipt = (await (await contract.freezeWeights()).wait()) as ContractTransactionReceipt;
  const randomReceipt = (await (await contract.storeRandomWord(RANDOM_WORD)).wait()) as ContractTransactionReceipt;
  console.log("executing separate FHE draw transaction");
  const drawReceipt = (await (await contract.executeDraw(false)).wait()) as ContractTransactionReceipt;
  const winnerHandle = await contract.encryptedWinner();
  const winner = await waitForPublicAddress(winnerHandle);
  const hcu = hre.fhevm.computeTransactionHCU(drawReceipt);

  const evidence = {
    status: "PASS",
    network: "sepolia",
    chainId: network.chainId.toString(),
    walletAddress: controller.address,
    contractAddress,
    slotCount: SLOT_COUNT,
    slots,
    weights: WEIGHTS.map(String),
    randomWord: RANDOM_WORD.toString(),
    winner,
    deployment: { hash: deploymentReceipt.hash, blockNumber: deploymentReceipt.blockNumber },
    load: { hash: loadReceipt.hash, blockNumber: loadReceipt.blockNumber, gasUsed: loadReceipt.gasUsed.toString() },
    freeze: { hash: freezeReceipt.hash, blockNumber: freezeReceipt.blockNumber, gasUsed: freezeReceipt.gasUsed.toString() },
    random: { hash: randomReceipt.hash, blockNumber: randomReceipt.blockNumber, gasUsed: randomReceipt.gasUsed.toString() },
    draw: {
      hash: drawReceipt.hash,
      blockNumber: drawReceipt.blockNumber,
      gasUsed: drawReceipt.gasUsed.toString(),
      globalHCU: hcu.globalHCU,
      maxHCUDepth: hcu.maxHCUDepth,
    },
    timestamp: new Date().toISOString(),
  };

  mkdirSync("encrypted-draw/evidence", { recursive: true });
  writeFileSync(
    `encrypted-draw/evidence/sepolia-draw-${SLOT_COUNT}.json`,
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
