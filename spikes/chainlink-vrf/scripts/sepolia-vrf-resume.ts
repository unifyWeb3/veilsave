import { mkdirSync, writeFileSync } from "node:fs";
import { setDefaultResultOrder } from "node:dns";
import { Contract, ContractTransactionReceipt } from "ethers";
import * as hre from "hardhat";

setDefaultResultOrder("ipv4first");

const CONTRACT_ADDRESS = process.env.VRF_CONTRACT_ADDRESS;
const EPOCH_ID = 1n;

const receiptSummary = async (hash: string) => {
  const receipt = await hre.ethers.provider.getTransactionReceipt(hash);
  if (!receipt) throw new Error(`missing receipt ${hash}`);
  return {
    hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    status: receipt.status,
  };
};

async function main(): Promise<void> {
  if (!CONTRACT_ADDRESS) throw new Error("VRF_CONTRACT_ADDRESS is required");

  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 11155111n) throw new Error(`expected Sepolia, got ${network.chainId}`);
  const [controller] = await hre.ethers.getSigners();
  const factory = await hre.ethers.getContractFactory("VrfLifecycleSpike", controller);
  const contract = factory.attach(CONTRACT_ADDRESS) as Contract;

  if ((await contract.controller()) !== controller.address) {
    throw new Error("configured signer is not the deployed spike controller");
  }

  let epoch = await contract.epoch(EPOCH_ID);
  const requestBlock = Number(epoch.requestBlock);
  const requestId = epoch.requestId as bigint;
  if (requestBlock === 0 || requestId === 0n) throw new Error("epoch has no bound request");

  const requestedLogs = await contract.queryFilter(
    contract.filters.RandomnessRequested(EPOCH_ID, requestId),
    Math.max(0, requestBlock - 2),
  );
  const storedLogs = await contract.queryFilter(
    contract.filters.RandomnessStored(EPOCH_ID, requestId),
    requestBlock,
  );
  const requestLog = requestedLogs.at(-1);
  const storedLog = storedLogs.at(-1);
  if (!requestLog || !storedLog) throw new Error("request or fulfillment event is missing");

  let draw: Awaited<ReturnType<typeof receiptSummary>> | null = null;
  if (Number(epoch.status) === 3) {
    const receipt = (await (await contract.executeDraw(EPOCH_ID)).wait()) as ContractTransactionReceipt;
    draw = await receiptSummary(receipt.hash);
    epoch = await contract.epoch(EPOCH_ID);
  }
  if (Number(epoch.status) !== 4) throw new Error(`expected DrawExecuted status, got ${epoch.status}`);

  let withdrawal: Awaited<ReturnType<typeof receiptSummary>> | null = null;
  const remainingBalance = await hre.ethers.provider.getBalance(CONTRACT_ADDRESS);
  if (remainingBalance > 0n) {
    const receipt = (await (
      await contract.withdrawNative(controller.address, { gasLimit: 100_000n })
    ).wait()) as ContractTransactionReceipt;
    withdrawal = await receiptSummary(receipt.hash);
  }

  const requestedArgs = contract.interface.parseLog(requestLog)?.args as unknown as {
    price: bigint;
  };
  const evidence = {
    status: "PASS",
    network: "sepolia",
    chainId: network.chainId.toString(),
    walletAddress: controller.address,
    contractAddress: CONTRACT_ADDRESS,
    epochId: EPOCH_ID.toString(),
    requestId: requestId.toString(),
    stateCommitment: epoch.stateCommitment,
    randomWord: epoch.randomWord.toString(),
    request: {
      ...(await receiptSummary(requestLog.transactionHash)),
      requestPriceWei: requestedArgs.price.toString(),
      epochBinding: (await contract.epochForRequest(requestId)).toString(),
    },
    fulfillment: {
      ...(await receiptSummary(storedLog.transactionHash)),
      confirmationsObserved: storedLog.blockNumber - requestLog.blockNumber,
    },
    draw,
    withdrawal,
    finalStatus: Number(epoch.status),
    callbackPerformedFheWork: false,
    timestamp: new Date().toISOString(),
  };

  mkdirSync("chainlink-vrf/evidence", { recursive: true });
  writeFileSync("chainlink-vrf/evidence/sepolia-vrf.json", `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
