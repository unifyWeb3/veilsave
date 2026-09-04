import { randomInt } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { FhevmType } from "@fhevm/hardhat-plugin";
import { Contract, ZeroHash, getAddress } from "ethers";
import * as hre from "hardhat";

type Draft = {
  chainId: number;
  contracts: { confidentialPrizePool: { address: string } };
  external: { confidentialToken: string };
};

type PrivateWithdrawalState = {
  chainId: 11155111;
  pool: string;
  token: string;
  participant: string;
  slot: number;
  amount: string;
  principalBefore: string;
  tokenBalanceBefore: string;
  stage: "PREPARED" | "SUBMITTED" | "ROUTED";
  withdrawalId?: string;
  requestTransaction?: string;
  routingTransaction?: string;
};

type ReceiptRecord = {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
};

const ROUTING_PENDING = 1;
const IMMEDIATE_SETTLED = 4;
const RETRY_DELAY_MS = 15_000;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function compactError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).split("\n", 1)[0]!.slice(0, 240);
}

async function retry<T>(
  label: string,
  attempts: number,
  action: () => Promise<T>,
): Promise<{ value: T; attempts: number; transientErrors: string[] }> {
  const transientErrors: string[] = [];
  for (let attempt = 1; attempt <= attempts; ++attempt) {
    try {
      return { value: await action(), attempts: attempt, transientErrors };
    } catch (error) {
      transientErrors.push(compactError(error));
      if (attempt < attempts) {
        console.log(`${label} pending (${attempt}/${attempts}); retrying the same intent`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${transientErrors.at(-1)}`);
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

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writePrivate(file: string, state: PrivateWithdrawalState): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await fs.writeFile(file, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function validatePrivateState(
  state: PrivateWithdrawalState,
  pool: string,
  token: string,
  participant: string,
  slot: number,
): void {
  if (
    state.chainId !== 11155111 ||
    getAddress(state.pool) !== pool ||
    getAddress(state.token) !== token ||
    getAddress(state.participant) !== participant ||
    state.slot !== slot ||
    BigInt(state.amount) <= 0n
  ) {
    throw new Error("Private withdrawal state does not match the live Sepolia position");
  }
}

function eventFromReceipt(pool: any, receipt: any, name: string): any | null {
  return (
    receipt.logs
      .map((log: unknown) => {
        try {
          return pool.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event: any) => event?.name === name) ?? null
  );
}

async function canonicalReceipt(hash: string): Promise<any> {
  const receipt = await hre.ethers.provider.getTransactionReceipt(hash);
  if (receipt) return receipt;
  const transaction = await hre.ethers.provider.getTransaction(hash);
  if (!transaction)
    throw new Error(`Transaction ${hash} is not yet canonical; refusing replacement`);
  const mined = await transaction.wait();
  if (!mined) throw new Error(`Transaction ${hash} remains pending; refusing replacement`);
  return mined;
}

async function main(): Promise<void> {
  const draftPath = path.resolve(required("DEPLOYMENT_DRAFT_PATH"));
  const draft = JSON.parse(await fs.readFile(draftPath, "utf8")) as Draft;
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 11155111n || draft.chainId !== 11155111) {
    throw new Error(`Refusing live acceptance on chain ${network.chainId}`);
  }

  const [signer] = await hre.ethers.getSigners();
  if (!signer) throw new Error("No Sepolia acceptance signer is configured");

  const participant = getAddress(signer.address);
  const poolAddress = getAddress(draft.contracts.confidentialPrizePool.address);
  const tokenAddress = getAddress(draft.external.confidentialToken);
  const deploymentDir = path.dirname(draftPath);
  const repositoryRoot = path.resolve(deploymentDir, "../../..");
  const privatePath = path.join(repositoryRoot, "evidence/private/live-withdrawal-state.json");
  const evidencePath = path.join(deploymentDir, "live-immediate-withdrawal-evidence.json");
  const pool: any = await hre.ethers.getContractAt("ConfidentialPrizePool", poolAddress, signer);
  const token: any = new Contract(
    tokenAddress,
    ["function confidentialBalanceOf(address account) view returns (bytes32)"],
    signer,
  );

  const [occupied, slotIndexValue] = (await pool.slotOf(participant)) as [boolean, bigint];
  if (!occupied) throw new Error("The acceptance signer has no live pool slot");
  const slot = Number(slotIndexValue);
  const slotBefore = await pool.slotPublic(slot);
  if (Number(slotBefore.status) !== 2)
    throw new Error("Immediate withdrawal requires an active slot");

  const initialization = await retry("Zama SDK initialization", 8, async () => {
    await hre.fhevm.initializeCLIApi();
    return true;
  });

  let state = await readJson<PrivateWithdrawalState>(privatePath);
  if (state) validatePrivateState(state, poolAddress, tokenAddress, participant, slot);

  const activeWithdrawalId = BigInt(slotBefore.activeWithdrawalId);
  if (!state && activeWithdrawalId !== 0n) {
    throw new Error(
      `Slot already has withdrawal ${activeWithdrawalId}; refusing to create or assume an unrecorded intent`,
    );
  }

  if (!state) {
    const principalHandle = (await pool.principalHandle(participant)) as string;
    const tokenHandle = (await token.confidentialBalanceOf(participant)) as string;
    if (principalHandle === ZeroHash) throw new Error("The active slot has no principal handle");

    const principalBefore = await retry("principal owner decryption", 12, () =>
      hre.fhevm.userDecryptEuint(FhevmType.euint64, principalHandle, poolAddress, signer),
    );
    const tokenBalanceBefore =
      tokenHandle === ZeroHash
        ? { value: 0n, attempts: 0, transientErrors: [] }
        : await retry("cUSDT owner decryption", 12, () =>
            hre.fhevm.userDecryptEuint(FhevmType.euint64, tokenHandle, tokenAddress, signer),
          );

    const preserve = 750_000n;
    if (principalBefore.value <= preserve + 100_000n) {
      throw new Error(
        "Principal is too small for a non-destructive immediate-withdrawal acceptance run",
      );
    }
    const maximum = Number(
      principalBefore.value - preserve > 250_000n ? 250_000n : principalBefore.value - preserve,
    );
    const minimum = Math.min(100_000, maximum - 1);
    const amount = BigInt(randomInt(minimum, maximum));

    state = {
      chainId: 11155111,
      pool: poolAddress,
      token: tokenAddress,
      participant,
      slot,
      amount: amount.toString(),
      principalBefore: principalBefore.value.toString(),
      tokenBalanceBefore: tokenBalanceBefore.value.toString(),
      stage: "PREPARED",
    };
    await writePrivate(privatePath, state);
  }

  let requestReceipt: any;
  let withdrawalId = state.withdrawalId ? BigInt(state.withdrawalId) : 0n;
  if (state.requestTransaction) {
    requestReceipt = await canonicalReceipt(state.requestTransaction);
    if (requestReceipt.status !== 1) throw new Error("Recorded withdrawal request reverted");
    const event = eventFromReceipt(pool, requestReceipt, "WithdrawalRequested");
    if (!event) throw new Error("Recorded withdrawal receipt has no WithdrawalRequested event");
    withdrawalId = BigInt(event.args.requestId);
  } else {
    const currentSlot = await pool.slotPublic(slot);
    if (BigInt(currentSlot.activeWithdrawalId) !== 0n) {
      throw new Error("An unrecorded active withdrawal appeared; refusing duplicate submission");
    }

    const encrypted = await retry("Zama encrypted withdrawal input", 8, async () => {
      const input = hre.fhevm.createEncryptedInput(poolAddress, participant);
      input.add64(BigInt(state.amount));
      return input.encrypt();
    });
    const args = [encrypted.value.handles[0], encrypted.value.inputProof, false] as const;
    const estimatedGas = await pool.requestWithdrawal.estimateGas(...args);
    const transaction = await pool.requestWithdrawal(...args, {
      gasLimit: (estimatedGas * 3n) / 2n,
    });
    state.requestTransaction = transaction.hash;
    state.stage = "SUBMITTED";
    await writePrivate(privatePath, state);

    requestReceipt = await transaction.wait();
    if (!requestReceipt || requestReceipt.status !== 1)
      throw new Error("Withdrawal request reverted");
    const event = eventFromReceipt(pool, requestReceipt, "WithdrawalRequested");
    if (!event) throw new Error("Withdrawal receipt has no WithdrawalRequested event");
    if (getAddress(event.args.owner) !== participant || Number(event.args.slot) !== slot) {
      throw new Error("Withdrawal event is not bound to the acceptance position");
    }
    withdrawalId = BigInt(event.args.requestId);
    state.withdrawalId = withdrawalId.toString();
    await writePrivate(privatePath, state);
  }

  if (withdrawalId === 0n) throw new Error("Withdrawal ID could not be recovered");
  state.withdrawalId = withdrawalId.toString();

  let ticket = await pool.withdrawalPublic(withdrawalId);
  let publicDecryptAttempts = 0;
  let publicDecryptLatencyMs = 0;
  let routingReceipt: any = null;
  if (Number(ticket.status) === ROUTING_PENDING) {
    const routingHandle = ticket.routingHandle as `0x${string}`;
    if (routingHandle === ZeroHash) {
      throw new Error("Withdrawal routing handle is not ready");
    }
    const started = Date.now();
    const reveal = await retry("public withdrawal routing decryption", 16, () =>
      hre.fhevm.publicDecrypt([routingHandle]),
    );
    publicDecryptAttempts = reveal.attempts;
    publicDecryptLatencyMs = Date.now() - started;
    const clearValue = reveal.value.clearValues[routingHandle];
    const hasRemainder = clearBoolean(clearValue);
    if (hasRemainder) {
      throw new Error(
        "Withdrawal routed to FIFO unexpectedly; the encrypted claim remains preserved",
      );
    }

    if (state.routingTransaction) {
      routingReceipt = await canonicalReceipt(state.routingTransaction);
    } else {
      const args = [withdrawalId, false, reveal.value.decryptionProof] as const;
      const estimatedGas = await pool.finalizeWithdrawalRouting.estimateGas(...args);
      const transaction = await pool.finalizeWithdrawalRouting(...args, {
        gasLimit: (estimatedGas * 3n) / 2n,
      });
      state.routingTransaction = transaction.hash;
      await writePrivate(privatePath, state);
      routingReceipt = await transaction.wait();
    }
    if (!routingReceipt || routingReceipt.status !== 1) {
      throw new Error("Withdrawal routing finalization reverted");
    }
    ticket = await pool.withdrawalPublic(withdrawalId);
  }

  if (Number(ticket.status) !== IMMEDIATE_SETTLED) {
    throw new Error(`Expected immediate-settled status, received ${ticket.status}`);
  }
  state.stage = "ROUTED";
  await writePrivate(privatePath, state);

  const slotAfter = await pool.slotPublic(slot);
  if (Number(slotAfter.status) !== 2 || BigInt(slotAfter.activeWithdrawalId) !== 0n) {
    throw new Error("Immediate withdrawal did not restore the active slot to an idle state");
  }

  const principalHandleAfter = (await pool.principalHandle(participant)) as string;
  const tokenHandleAfter = (await token.confidentialBalanceOf(participant)) as string;
  const principalAfter = await retry("post-withdrawal principal owner decryption", 16, () =>
    hre.fhevm.userDecryptEuint(FhevmType.euint64, principalHandleAfter, poolAddress, signer),
  );
  const tokenAfter = await retry("post-withdrawal cUSDT owner decryption", 16, () =>
    hre.fhevm.userDecryptEuint(FhevmType.euint64, tokenHandleAfter, tokenAddress, signer),
  );
  const amount = BigInt(state.amount);
  if (principalAfter.value + amount !== BigInt(state.principalBefore)) {
    throw new Error("Private principal reconciliation failed after immediate withdrawal");
  }
  if (tokenAfter.value !== BigInt(state.tokenBalanceBefore) + amount) {
    throw new Error("Private cUSDT reconciliation failed after immediate withdrawal");
  }

  const evidence = {
    schemaVersion: 1,
    product: "VeilSave",
    status: "PASS",
    network: "ethereum-sepolia",
    chainId: 11155111,
    recordedAt: new Date().toISOString(),
    participant,
    pool: poolAddress,
    confidentialToken: tokenAddress,
    slot,
    withdrawalId: withdrawalId.toString(),
    request: receiptRecord(requestReceipt),
    routingFinalization: routingReceipt ? receiptRecord(routingReceipt) : null,
    route: "IMMEDIATE",
    ticketTerminalStatus: "IMMEDIATE_SETTLED",
    slotRemainsActive: true,
    activeWithdrawalCleared: true,
    privateReconciliation: {
      principalDebitedExactlyOnce: true,
      cUsdtReceivedExactlyOnce: true,
      amountSuppressed: true,
    },
    dependencies: {
      zamaInitializationAttempts: initialization.attempts,
      publicDecryptAttempts,
      publicDecryptLatencyMs,
      principalDecryptionAttempts: principalAfter.attempts,
      tokenDecryptionAttempts: tokenAfter.attempts,
    },
    privacy: {
      amountRecordedPublicly: false,
      inputProofRecorded: false,
      ciphertextHandlesRecorded: false,
    },
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: evidence.status,
        network: evidence.network,
        slot: evidence.slot,
        withdrawalId: evidence.withdrawalId,
        requestTransaction: evidence.request.transactionHash,
        routingTransaction: evidence.routingFinalization?.transactionHash ?? null,
        route: evidence.route,
        privateReconciliation: "PASS (amount suppressed)",
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
