import { mkdirSync, writeFileSync } from "node:fs";
import { setDefaultResultOrder } from "node:dns";
import {
  Contract,
  ContractTransactionReceipt,
  keccak256,
  parseEther,
  toUtf8Bytes,
} from "ethers";
import * as hre from "hardhat";

setDefaultResultOrder("ipv4first");

const WRAPPER = "0x195f15F2d49d693cE265b4fB0fdDbE15b1850Cc1";
const COORDINATOR = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
const KEY_HASH = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";
const FUNDING = parseEther("0.01");
const MAX_POLLS = 36;

const parseEvent = (contract: Contract, receipt: ContractTransactionReceipt, name: string): any | null => {
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === name) return parsed.args;
    } catch {
      // Ignore logs emitted by the wrapper or RPC infrastructure.
    }
  }
  return null;
};

async function main(): Promise<void> {
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 11155111n) throw new Error(`expected Sepolia, got ${network.chainId}`);
  const [controller] = await hre.ethers.getSigners();
  const wrapperCode = await hre.ethers.provider.getCode(WRAPPER);
  const coordinatorCode = await hre.ethers.provider.getCode(COORDINATOR);
  if (wrapperCode === "0x" || coordinatorCode === "0x") {
    throw new Error("current Chainlink Sepolia code is missing at one of the documented addresses");
  }

  const factory = await hre.ethers.getContractFactory("VrfLifecycleSpike", controller);
  const contract = await factory.deploy(WRAPPER);
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  const deployment = (await contract.deploymentTransaction()?.wait()) as ContractTransactionReceipt;

  const fundingTx = await controller.sendTransaction({
    to: contractAddress,
    value: FUNDING,
    gasLimit: 500_000n,
  });
  const funding = (await fundingTx.wait()) as ContractTransactionReceipt;
  const commitment = keccak256(toUtf8Bytes(`sepolia-vrf-${Date.now()}`));
  const freeze = (await (await contract.freezeEpoch(1, commitment)).wait()) as ContractTransactionReceipt;
  // Sepolia RPC estimators returned 160,369 gas for this wrapper call, which
  // exhausted the full estimate twice. Keep a bounded explicit limit so the
  // VRF protocol path is measured instead of the estimator artifact.
  const request = (await (
    await contract.requestRandomness(1, { gasLimit: 500_000n })
  ).wait()) as ContractTransactionReceipt;
  const requestedEvent = parseEvent(contract, request, "RandomnessRequested");
  const requestId = (await contract.epoch(1)).requestId as bigint;
  const requestBlock = request.blockNumber;

  let fulfillment: any = null;
  let statusValue = Number((await contract.epoch(1)).status);
  for (let poll = 1; poll <= MAX_POLLS; ++poll) {
    const current = await contract.epoch(1);
    statusValue = Number(current.status);
    console.log(`poll ${poll}/${MAX_POLLS}: status=${statusValue} block=${await hre.ethers.provider.getBlockNumber()}`);
    if (statusValue === 3) {
      const logs = await contract.queryFilter(contract.filters.RandomnessStored(null, requestId), requestBlock);
      const log = logs.at(-1);
      if (log) {
        fulfillment = {
          hash: log.transactionHash,
          blockNumber: log.blockNumber,
          randomWord: current.randomWord.toString(),
          gasUsed: (await hre.ethers.provider.getTransactionReceipt(log.transactionHash))?.gasUsed.toString() ?? null,
        };
      }
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }

  let draw: any = null;
  let withdrawal: any = null;
  if (statusValue === 3) {
    const drawReceipt = (await (await contract.executeDraw(1)).wait()) as ContractTransactionReceipt;
    const drawEvent = parseEvent(contract, drawReceipt, "DrawExecuted");
    draw = {
      hash: drawReceipt.hash,
      blockNumber: drawReceipt.blockNumber,
      gasUsed: drawReceipt.gasUsed.toString(),
      digest: drawEvent?.drawDigest ?? null,
    };
    const withdrawReceipt = (await (await contract.withdrawNative(controller.address)).wait()) as ContractTransactionReceipt;
    withdrawal = {
      hash: withdrawReceipt.hash,
      blockNumber: withdrawReceipt.blockNumber,
      gasUsed: withdrawReceipt.gasUsed.toString(),
    };
  }

  const evidence = {
    status: fulfillment ? "PASS" : "BLOCKED",
    network: "sepolia",
    chainId: network.chainId.toString(),
    walletAddress: controller.address,
    contractAddress,
    documentedConfiguration: {
      coordinator: COORDINATOR,
      directFundingWrapper: WRAPPER,
      keyHashNotInDirectWrapperCalldata: KEY_HASH,
      callbackGasLimit: Number(await contract.CALLBACK_GAS_LIMIT()),
      requestConfirmations: Number(await contract.REQUEST_CONFIRMATIONS()),
      numWords: Number(await contract.NUM_WORDS()),
      minimumConfirmationsFromDocs: 3,
      maxGasLimitFromDocs: 2_500_000,
    },
    codePresence: { wrapper: wrapperCode !== "0x", coordinator: coordinatorCode !== "0x" },
    deployment: { hash: deployment.hash, blockNumber: deployment.blockNumber, gasUsed: deployment.gasUsed.toString() },
    funding: { hash: funding.hash, blockNumber: funding.blockNumber, gasUsed: funding.gasUsed.toString(), amountWei: FUNDING.toString() },
    freeze: { hash: freeze.hash, blockNumber: freeze.blockNumber, gasUsed: freeze.gasUsed.toString(), commitment },
    request: {
      hash: request.hash,
      blockNumber: request.blockNumber,
      gasUsed: request.gasUsed.toString(),
      requestId: requestId.toString(),
      priceWei: requestedEvent?.price?.toString() ?? null,
      epochBinding: (await contract.epochForRequest(requestId)).toString(),
    },
    fulfillment,
    draw,
    withdrawal,
    finalEpoch: await contract.epoch(1),
    timestamp: new Date().toISOString(),
  };

  mkdirSync("chainlink-vrf/evidence", { recursive: true });
  writeFileSync("chainlink-vrf/evidence/sepolia-vrf.json", `${JSON.stringify(evidence, (_, value) => typeof value === "bigint" ? value.toString() : value, 2)}\n`);
  console.log(JSON.stringify(evidence, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
