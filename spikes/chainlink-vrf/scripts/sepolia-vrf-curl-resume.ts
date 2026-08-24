import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { HDNodeWallet, Interface, Wallet, getAddress, id } from "ethers";
import { vars } from "hardhat/config";

const RPC_URL = process.env.CURL_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const CONTRACT_ADDRESS = process.env.VRF_CONTRACT_ADDRESS;
const EPOCH_ID = 1n;

const abi = new Interface([
  "function controller() view returns (address)",
  "function epoch(uint64) view returns (bytes32 stateCommitment,uint256 requestId,uint256 randomWord,uint64 requestBlock,uint64 timeoutBlock,uint8 status)",
  "function epochForRequest(uint256) view returns (uint64)",
  "function executeDraw(uint64) returns (bytes32)",
  "function withdrawNative(address payable)",
  "event RandomnessRequested(uint64 indexed epochId,uint256 indexed requestId,uint256 price)",
  "event RandomnessStored(uint64 indexed epochId,uint256 indexed requestId,uint256 randomWord)",
  "event DrawExecuted(uint64 indexed epochId,uint256 indexed requestId,bytes32 drawDigest)",
]);

let nextRpcId = 1;

const rpc = <T>(method: string, params: unknown[]): T => {
  const payload = JSON.stringify({ jsonrpc: "2.0", method, params, id: nextRpcId++ });
  const output = execFileSync(
    "curl",
    [
      "--max-time",
      "30",
      "-sS",
      RPC_URL,
      "-H",
      "content-type: application/json",
      "--data",
      payload,
    ],
    { encoding: "utf8" },
  );
  const response = JSON.parse(output) as { result?: T; error?: { code: number; message: string } };
  if (response.error) throw new Error(`${method}: ${response.error.code} ${response.error.message}`);
  if (response.result === undefined) throw new Error(`${method}: missing result`);
  return response.result;
};

const quantity = (value: bigint | number): string => `0x${BigInt(value).toString(16)}`;

const call = (functionName: string, args: readonly unknown[]) => {
  if (!CONTRACT_ADDRESS) throw new Error("VRF_CONTRACT_ADDRESS is required");
  const data = abi.encodeFunctionData(functionName, args);
  const result = rpc<string>("eth_call", [{ to: CONTRACT_ADDRESS, data }, "latest"]);
  return abi.decodeFunctionResult(functionName, result);
};

type Receipt = {
  transactionHash: string;
  blockNumber: string;
  gasUsed: string;
  status: string;
};

const waitForReceipt = async (hash: string): Promise<Receipt> => {
  for (let attempt = 1; attempt <= 45; ++attempt) {
    const receipt = rpc<Receipt | null>("eth_getTransactionReceipt", [hash]);
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 4_000));
  }
  throw new Error(`timed out waiting for ${hash}`);
};

const receiptSummary = (receipt: Receipt) => ({
  hash: receipt.transactionHash,
  blockNumber: Number(BigInt(receipt.blockNumber)),
  gasUsed: BigInt(receipt.gasUsed).toString(),
  status: Number(BigInt(receipt.status)),
});

const send = async (
  wallet: HDNodeWallet,
  data: string,
  gasLimit: bigint,
): Promise<ReturnType<typeof receiptSummary>> => {
  if (!CONTRACT_ADDRESS) throw new Error("VRF_CONTRACT_ADDRESS is required");
  const nonce = Number(BigInt(rpc<string>("eth_getTransactionCount", [wallet.address, "pending"])));
  const gasPrice = BigInt(rpc<string>("eth_gasPrice", [])) * 2n;
  const raw = await wallet.signTransaction({
    chainId: 11155111,
    data,
    gasLimit,
    gasPrice,
    nonce,
    to: CONTRACT_ADDRESS,
    type: 0,
    value: 0n,
  });
  const hash = rpc<string>("eth_sendRawTransaction", [raw]);
  const receipt = await waitForReceipt(hash);
  if (Number(BigInt(receipt.status)) !== 1) throw new Error(`transaction reverted: ${hash}`);
  return receiptSummary(receipt);
};

async function main(): Promise<void> {
  if (!CONTRACT_ADDRESS) throw new Error("VRF_CONTRACT_ADDRESS is required");

  const chainId = BigInt(rpc<string>("eth_chainId", []));
  if (chainId !== 11155111n) throw new Error(`expected Sepolia, got ${chainId}`);
  const code = rpc<string>("eth_getCode", [CONTRACT_ADDRESS, "latest"]);
  if (code === "0x") throw new Error("resume target has no code");

  const mnemonic = vars.get("MNEMONIC", "");
  if (!mnemonic) throw new Error("Hardhat MNEMONIC is required");
  const wallet = Wallet.fromPhrase(mnemonic);
  const controller = getAddress(call("controller", [])[0] as string);
  if (controller !== wallet.address) throw new Error("configured signer is not the spike controller");

  let epoch = call("epoch", [EPOCH_ID]);
  const requestId = epoch[1] as bigint;
  const requestBlock = Number(epoch[3] as bigint);
  if (requestId === 0n || requestBlock === 0) throw new Error("epoch has no bound request");

  const logs = rpc<Array<{
    topics: string[];
    data: string;
    blockNumber: string;
    transactionHash: string;
  }>>("eth_getLogs", [{
    address: CONTRACT_ADDRESS,
    fromBlock: quantity(Math.max(0, requestBlock - 2)),
    toBlock: "latest",
  }]);
  const requestedTopic = id("RandomnessRequested(uint64,uint256,uint256)");
  const storedTopic = id("RandomnessStored(uint64,uint256,uint256)");
  const requestLog = logs.find((log) => log.topics[0] === requestedTopic);
  const storedLog = logs.find((log) => log.topics[0] === storedTopic);
  if (!requestLog || !storedLog) throw new Error("request or fulfillment log is missing");

  let draw: ReturnType<typeof receiptSummary> | null = null;
  if (Number(epoch[5]) === 3) {
    draw = await send(wallet, abi.encodeFunctionData("executeDraw", [EPOCH_ID]), 150_000n);
    epoch = call("epoch", [EPOCH_ID]);
  }
  if (Number(epoch[5]) !== 4) throw new Error(`expected DrawExecuted status, got ${epoch[5]}`);

  let withdrawal: ReturnType<typeof receiptSummary> | null = null;
  const remainingBalance = BigInt(rpc<string>("eth_getBalance", [CONTRACT_ADDRESS, "latest"]));
  if (remainingBalance > 0n) {
    withdrawal = await send(
      wallet,
      abi.encodeFunctionData("withdrawNative", [wallet.address]),
      100_000n,
    );
  }

  const requestReceipt = rpc<Receipt>("eth_getTransactionReceipt", [requestLog.transactionHash]);
  const fulfillmentReceipt = rpc<Receipt>("eth_getTransactionReceipt", [storedLog.transactionHash]);
  const requested = abi.decodeEventLog("RandomnessRequested", requestLog.data, requestLog.topics);
  const evidence = {
    status: "PASS",
    network: "sepolia",
    chainId: chainId.toString(),
    rpcProviderClass: "public JSON-RPC via curl transport fallback",
    walletAddress: wallet.address,
    contractAddress: CONTRACT_ADDRESS,
    epochId: EPOCH_ID.toString(),
    requestId: requestId.toString(),
    stateCommitment: epoch[0],
    randomWord: (epoch[2] as bigint).toString(),
    request: {
      ...receiptSummary(requestReceipt),
      requestPriceWei: (requested.price as bigint).toString(),
      epochBinding: (call("epochForRequest", [requestId])[0] as bigint).toString(),
    },
    fulfillment: {
      ...receiptSummary(fulfillmentReceipt),
      confirmationsObserved:
        Number(BigInt(fulfillmentReceipt.blockNumber)) - Number(BigInt(requestReceipt.blockNumber)),
    },
    draw,
    withdrawal,
    finalStatus: Number(epoch[5]),
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
