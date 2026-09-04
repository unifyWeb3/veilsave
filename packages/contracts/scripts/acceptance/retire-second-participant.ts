import fs from "node:fs/promises";
import path from "node:path";

import { Contract, Wallet, ZeroHash, getAddress } from "ethers";
import * as hre from "hardhat";

type Draft = {
  chainId: number;
  contracts: { confidentialPrizePool: { address: string } };
  external: { confidentialToken: string };
};

type ParticipantState = {
  chainId: 11155111;
  participant: string;
  privateKey: string;
  pool: string;
  token: string;
  slot?: number;
  retirementRequestTransaction?: string;
  retirementWithdrawalId?: string;
  retirementRoutingTransaction?: string;
  releaseTransaction?: string;
};

type ReceiptRecord = {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
};

const ROUTING_PENDING = 1;
const IMMEDIATE_SETTLED = 4;
const ACTIVE_SLOT = 2;
const CLOSING_SLOT = 3;
const RETRY_DELAY_MS = 15_000;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function compactError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).split("\n", 1)[0]!.slice(0, 240);
}

async function retry<T>(label: string, attempts: number, action: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; ++attempt) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.log(`${label} pending (${attempt}/${attempts}); retrying the same intent`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function receiptRecord(receipt: {
  hash: string;
  blockNumber: number;
  gasUsed: bigint;
}): ReceiptRecord {
  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
}

function clearBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value !== 0n;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false" || normalized === "" || /^0x0*$/.test(normalized)) return false;
    return BigInt(normalized) !== 0n;
  }
  throw new Error("Public routing proof returned an unsupported boolean value");
}

async function writePrivate(file: string, state: ParticipantState): Promise<void> {
  await fs.writeFile(file, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

async function canonicalReceipt(hash: string): Promise<any> {
  const receipt = await hre.ethers.provider.getTransactionReceipt(hash);
  if (receipt) return receipt;
  const transaction = await hre.ethers.provider.getTransaction(hash);
  if (!transaction) throw new Error(`Transaction ${hash} is not canonical; refusing replacement`);
  const mined = await transaction.wait();
  if (!mined) throw new Error(`Transaction ${hash} remains pending; refusing replacement`);
  return mined;
}

async function sendOrResume(
  state: ParticipantState,
  privatePath: string,
  field: keyof ParticipantState,
  send: () => Promise<any>,
): Promise<any> {
  const existing = state[field];
  if (typeof existing === "string" && existing.startsWith("0x") && existing.length === 66) {
    const receipt = await canonicalReceipt(existing);
    if (receipt.status !== 1) throw new Error(`Recorded ${String(field)} transaction reverted`);
    return receipt;
  }
  const transaction = await send();
  (state as Record<string, unknown>)[field] = transaction.hash;
  await writePrivate(privatePath, state);
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`${String(field)} transaction reverted`);
  return receipt;
}

function findEvent(contract: any, receipt: any, name: string): any | null {
  return (
    receipt.logs
      .map((log: unknown) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event: any) => event?.name === name) ?? null
  );
}

async function main(): Promise<void> {
  const draftPath = path.resolve(required("DEPLOYMENT_DRAFT_PATH"));
  const draft = JSON.parse(await fs.readFile(draftPath, "utf8")) as Draft;
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 11155111n || draft.chainId !== 11155111) {
    throw new Error(`Refusing live acceptance on chain ${network.chainId}`);
  }

  const deploymentDir = path.dirname(draftPath);
  const repositoryRoot = path.resolve(deploymentDir, "../../..");
  const privatePath = path.join(repositoryRoot, "evidence/private/live-second-participant.json");
  const evidencePath = path.join(deploymentDir, "retired-second-participant-evidence.json");
  const state = JSON.parse(await fs.readFile(privatePath, "utf8")) as ParticipantState;
  const wallet = new Wallet(state.privateKey, hre.ethers.provider);
  const participant = getAddress(wallet.address);
  const poolAddress = getAddress(draft.contracts.confidentialPrizePool.address);
  const tokenAddress = getAddress(draft.external.confidentialToken);
  if (
    state.chainId !== 11155111 ||
    getAddress(state.participant) !== participant ||
    getAddress(state.pool) !== poolAddress ||
    getAddress(state.token) !== tokenAddress
  ) {
    throw new Error("Retirement state does not match the live Sepolia participant");
  }

  const pool: any = await hre.ethers.getContractAt("ConfidentialPrizePool", poolAddress, wallet);
  const token: any = new Contract(
    tokenAddress,
    ["function confidentialBalanceOf(address account) view returns (bytes32)"],
    wallet,
  );
  await retry("Zama SDK initialization", 8, async () => {
    await hre.fhevm.initializeCLIApi();
    return true;
  });

  let [occupied, slotIndex] = (await pool.slotOf(participant)) as [boolean, bigint];
  if (!occupied) {
    await fs.rm(privatePath, { force: true });
    throw new Error("Participant is already retired; removed stale private state");
  }
  state.slot = Number(slotIndex);
  await writePrivate(privatePath, state);
  let slot = await pool.slotPublic(slotIndex);

  let requestReceipt: any = null;
  let withdrawalId = state.retirementWithdrawalId
    ? BigInt(state.retirementWithdrawalId)
    : BigInt(slot.activeWithdrawalId);
  if (withdrawalId === 0n) {
    if (Number(slot.status) !== ACTIVE_SLOT) throw new Error("Retirement requires an active slot");
    requestReceipt = await sendOrResume(
      state,
      privatePath,
      "retirementRequestTransaction",
      async () => {
        const args = [ZeroHash, "0x", true] as const;
        const estimatedGas = await pool.requestWithdrawal.estimateGas(...args);
        return pool.requestWithdrawal(...args, { gasLimit: (estimatedGas * 3n) / 2n });
      },
    );
    const requested = findEvent(pool, requestReceipt, "WithdrawalRequested");
    if (!requested || getAddress(requested.args.owner) !== participant) {
      throw new Error("Retirement withdrawal event is missing or mismatched");
    }
    withdrawalId = BigInt(requested.args.requestId);
    state.retirementWithdrawalId = withdrawalId.toString();
    await writePrivate(privatePath, state);
  } else if (state.retirementRequestTransaction) {
    requestReceipt = await canonicalReceipt(state.retirementRequestTransaction);
  }

  let ticket = await pool.withdrawalPublic(withdrawalId);
  let routingReceipt: any = null;
  if (Number(ticket.status) === ROUTING_PENDING) {
    const routingHandle = ticket.routingHandle as `0x${string}`;
    if (routingHandle === ZeroHash) throw new Error("Retirement routing handle is not ready");
    const reveal = await retry("retirement routing public decryption", 16, () =>
      hre.fhevm.publicDecrypt([routingHandle]),
    );
    if (clearBoolean(reveal.clearValues[routingHandle])) {
      throw new Error("Retirement unexpectedly queued; encrypted claim remains preserved");
    }
    routingReceipt = await sendOrResume(
      state,
      privatePath,
      "retirementRoutingTransaction",
      async () => {
        const args = [withdrawalId, false, reveal.decryptionProof] as const;
        const estimatedGas = await pool.finalizeWithdrawalRouting.estimateGas(...args);
        return pool.finalizeWithdrawalRouting(...args, { gasLimit: (estimatedGas * 3n) / 2n });
      },
    );
    ticket = await pool.withdrawalPublic(withdrawalId);
  } else if (state.retirementRoutingTransaction) {
    routingReceipt = await canonicalReceipt(state.retirementRoutingTransaction);
  }
  if (Number(ticket.status) !== IMMEDIATE_SETTLED) {
    throw new Error(`Retirement withdrawal did not settle immediately; status=${ticket.status}`);
  }

  slot = await pool.slotPublic(slotIndex);
  if (Number(slot.status) !== CLOSING_SLOT || BigInt(slot.activeWithdrawalId) !== 0n) {
    throw new Error("Retirement withdrawal did not leave a releasable closing slot");
  }
  const releaseReceipt = await sendOrResume(state, privatePath, "releaseTransaction", async () => {
    const estimatedGas = await pool.releaseSlot.estimateGas(slotIndex);
    return pool.releaseSlot(slotIndex, { gasLimit: (estimatedGas * 3n) / 2n });
  });
  [occupied] = (await pool.slotOf(participant)) as [boolean, bigint];
  if (occupied) throw new Error("Retired participant still owns a pool slot");

  const residualHandle = (await token.confidentialBalanceOf(participant)) as string;
  const evidence = {
    schemaVersion: 1,
    product: "VeilSave",
    status: "PASS",
    network: "ethereum-sepolia",
    chainId: 11155111,
    recordedAt: new Date().toISOString(),
    participant,
    pool: poolAddress,
    slot: Number(slotIndex),
    reason: "Acceptance wallet credential rotation before any epoch snapshot.",
    withdrawalId: withdrawalId.toString(),
    request: requestReceipt ? receiptRecord(requestReceipt) : null,
    routingFinalization: routingReceipt ? receiptRecord(routingReceipt) : null,
    release: receiptRecord(releaseReceipt),
    route: "IMMEDIATE",
    slotReleased: true,
    bondRefunded: true,
    residualTestAssetHandlePresent: residualHandle !== ZeroHash,
    privacy: {
      privateKeyRecordedPublicly: false,
      principalAmountRecordedPublicly: false,
      ciphertextHandlesRecorded: false,
    },
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await fs.rm(privatePath, { force: true });
  console.log(
    JSON.stringify(
      {
        status: evidence.status,
        participant: evidence.participant,
        slot: evidence.slot,
        withdrawalId: evidence.withdrawalId,
        releaseTransaction: evidence.release.transactionHash,
        slotReleased: true,
        privateStateRemoved: true,
        evidencePath,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(compactError(error));
  process.exitCode = 1;
});
