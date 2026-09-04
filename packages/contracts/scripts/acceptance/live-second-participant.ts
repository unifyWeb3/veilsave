import { randomInt } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { FhevmType } from "@fhevm/hardhat-plugin";
import { AbiCoder, Contract, Wallet, ZeroHash, getAddress, parseEther } from "ethers";
import * as hre from "hardhat";

type Draft = {
  chainId: number;
  contracts: { confidentialPrizePool: { address: string; deploymentBlock: number } };
  external: { confidentialToken: string; underlyingToken: string };
};

type PrivateState = {
  chainId: 11155111;
  participant: string;
  privateKey: string;
  pool: string;
  token: string;
  underlying: string;
  mintAndWrapAmount: string;
  depositAmount: string;
  fundingTransaction?: string;
  mintTransaction?: string;
  approvalTransaction?: string;
  wrapTransaction?: string;
  reservationTransaction?: string;
  slot?: number;
  depositTransaction?: string;
  pendingEpoch?: string;
};

type ReceiptRecord = {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
};

const MINT_AND_WRAP_AMOUNT = 1_000_000n;
const FUNDING_TARGET = parseEther("0.02");
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

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writePrivate(file: string, state: PrivateState): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await fs.writeFile(file, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function validatePrivateState(
  state: PrivateState,
  pool: string,
  token: string,
  underlying: string,
): void {
  const wallet = new Wallet(state.privateKey);
  if (
    state.chainId !== 11155111 ||
    getAddress(state.participant) !== getAddress(wallet.address) ||
    getAddress(state.pool) !== pool ||
    getAddress(state.token) !== token ||
    getAddress(state.underlying) !== underlying ||
    BigInt(state.mintAndWrapAmount) !== MINT_AND_WRAP_AMOUNT ||
    BigInt(state.depositAmount) <= 0n ||
    BigInt(state.depositAmount) >= MINT_AND_WRAP_AMOUNT
  ) {
    throw new Error("Private participant state does not match the live Sepolia deployment");
  }
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
  state: PrivateState,
  privatePath: string,
  field: keyof PrivateState,
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

  const [funder] = await hre.ethers.getSigners();
  if (!funder) throw new Error("No Sepolia acceptance funder is configured");
  const poolAddress = getAddress(draft.contracts.confidentialPrizePool.address);
  const tokenAddress = getAddress(draft.external.confidentialToken);
  const underlyingAddress = getAddress(draft.external.underlyingToken);
  const deploymentDir = path.dirname(draftPath);
  const repositoryRoot = path.resolve(deploymentDir, "../../..");
  const privatePath = path.join(repositoryRoot, "evidence/private/live-second-participant.json");
  const evidencePath = path.join(deploymentDir, "live-second-participant-evidence.json");

  let state = await readJson<PrivateState>(privatePath);
  if (
    process.env.ROTATE_SECOND_PARTICIPANT === "true" &&
    state &&
    !state.fundingTransaction &&
    !state.mintTransaction &&
    !state.approvalTransaction &&
    !state.wrapTransaction &&
    !state.reservationTransaction &&
    !state.depositTransaction
  ) {
    // Rotate an unused local acceptance key before any funds or protocol state exist.
    // The old key is never printed or reused.
    state = null;
    await fs.rm(privatePath, { force: true });
  }
  if (!state) {
    const wallet = Wallet.createRandom();
    state = {
      chainId: 11155111,
      participant: getAddress(wallet.address),
      privateKey: wallet.privateKey,
      pool: poolAddress,
      token: tokenAddress,
      underlying: underlyingAddress,
      mintAndWrapAmount: MINT_AND_WRAP_AMOUNT.toString(),
      depositAmount: BigInt(randomInt(850_000, 950_001)).toString(),
    };
    await writePrivate(privatePath, state);
  }
  validatePrivateState(state, poolAddress, tokenAddress, underlyingAddress);

  const participant = new Wallet(state.privateKey, hre.ethers.provider);
  const participantAddress = getAddress(participant.address);
  const pool: any = await hre.ethers.getContractAt(
    "ConfidentialPrizePool",
    poolAddress,
    participant,
  );
  const token: any = new Contract(
    tokenAddress,
    [
      "function confidentialBalanceOf(address account) view returns (bytes32)",
      "function wrap(address to,uint256 amount) returns (bytes32)",
      "function confidentialTransferAndCall(address to,bytes32 amount,bytes inputProof,bytes data) returns (bool)",
    ],
    participant,
  );
  const underlying: any = new Contract(
    underlyingAddress,
    [
      "function mint(address to,uint256 amount)",
      "function approve(address spender,uint256 amount) returns (bool)",
      "function allowance(address owner,address spender) view returns (uint256)",
      "function balanceOf(address owner) view returns (uint256)",
    ],
    participant,
  );

  const initialization = await retry("Zama SDK initialization", 8, async () => {
    await hre.fhevm.initializeCLIApi();
    return true;
  });

  let fundingReceipt: any = null;
  const participantEthBefore = await hre.ethers.provider.getBalance(participantAddress);
  if (participantEthBefore < FUNDING_TARGET / 2n) {
    fundingReceipt = await sendOrResume(state, privatePath, "fundingTransaction", () =>
      funder.sendTransaction({ to: participantAddress, value: FUNDING_TARGET }),
    );
  } else if (state.fundingTransaction) {
    fundingReceipt = await canonicalReceipt(state.fundingTransaction);
  }
  if ((await hre.ethers.provider.getBalance(participantAddress)) < parseEther("0.005")) {
    throw new Error("Second participant has insufficient Sepolia ETH for acceptance transactions");
  }

  let reservationReceipt: any = null;
  let [occupied, slotIndex] = (await pool.slotOf(participantAddress)) as [boolean, bigint];
  if (!occupied) {
    reservationReceipt = await sendOrResume(state, privatePath, "reservationTransaction", () =>
      pool.reserveSlot({ value: parseEther("0.001") }),
    );
    [occupied, slotIndex] = (await pool.slotOf(participantAddress)) as [boolean, bigint];
  } else if (state.reservationTransaction) {
    reservationReceipt = await canonicalReceipt(state.reservationTransaction);
  }
  if (!occupied) throw new Error("Second participant slot reservation did not persist");
  state.slot = Number(slotIndex);
  await writePrivate(privatePath, state);
  const slotBeforeDeposit = await pool.slotPublic(slotIndex);
  if (![1, 2].includes(Number(slotBeforeDeposit.status))) {
    throw new Error("Second participant slot is neither reserved nor active");
  }

  const participantUnderlying = BigInt(await underlying.balanceOf(participantAddress));
  let mintReceipt: any = null;
  if (!state.mintTransaction && participantUnderlying < MINT_AND_WRAP_AMOUNT) {
    mintReceipt = await sendOrResume(state, privatePath, "mintTransaction", () =>
      underlying.mint(participantAddress, MINT_AND_WRAP_AMOUNT - participantUnderlying),
    );
  } else if (state.mintTransaction) {
    mintReceipt = await canonicalReceipt(state.mintTransaction);
  }

  let approvalReceipt: any = null;
  if (
    !state.wrapTransaction &&
    BigInt(await underlying.allowance(participantAddress, tokenAddress)) < MINT_AND_WRAP_AMOUNT
  ) {
    approvalReceipt = await sendOrResume(state, privatePath, "approvalTransaction", () =>
      underlying.approve(tokenAddress, MINT_AND_WRAP_AMOUNT),
    );
  } else if (state.approvalTransaction) {
    approvalReceipt = await canonicalReceipt(state.approvalTransaction);
  }

  let wrapReceipt: any = null;
  if (!state.wrapTransaction) {
    wrapReceipt = await sendOrResume(state, privatePath, "wrapTransaction", () =>
      token.wrap(participantAddress, MINT_AND_WRAP_AMOUNT),
    );
  } else {
    wrapReceipt = await canonicalReceipt(state.wrapTransaction);
  }

  const tokenHandleBeforeDeposit = (await token.confidentialBalanceOf(
    participantAddress,
  )) as string;
  if (tokenHandleBeforeDeposit === ZeroHash) throw new Error("Second participant has no cUSDT");
  const tokenBalanceBeforeDeposit = await retry("second participant cUSDT decryption", 12, () =>
    hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      tokenHandleBeforeDeposit,
      tokenAddress,
      participant,
    ),
  );
  if (tokenBalanceBeforeDeposit.value < BigInt(state.depositAmount)) {
    throw new Error("Second participant cUSDT is below the recorded encrypted deposit intent");
  }

  let depositReceipt: any = null;
  if (!state.depositTransaction) {
    if (Number(slotBeforeDeposit.status) !== 1) {
      throw new Error(
        "Active second-participant slot has no recorded deposit; refusing duplicate intent",
      );
    }
    const encrypted = await retry("second participant encrypted deposit input", 8, async () => {
      const input = hre.fhevm.createEncryptedInput(tokenAddress, participantAddress);
      input.add64(BigInt(state.depositAmount));
      return input.encrypt();
    });
    const route = await pool.DEPOSIT_ROUTE();
    const routeData = AbiCoder.defaultAbiCoder().encode(["bytes4"], [route]);
    const args = [
      poolAddress,
      encrypted.value.handles[0],
      encrypted.value.inputProof,
      routeData,
    ] as const;
    depositReceipt = await sendOrResume(state, privatePath, "depositTransaction", async () => {
      const estimatedGas = await token.confidentialTransferAndCall.estimateGas(...args);
      return token.confidentialTransferAndCall(...args, { gasLimit: (estimatedGas * 3n) / 2n });
    });
  } else {
    depositReceipt = await canonicalReceipt(state.depositTransaction);
  }

  const depositEvent = findEvent(pool, depositReceipt, "DepositProcessed");
  if (!depositEvent || getAddress(depositEvent.args.owner) !== participantAddress) {
    throw new Error("Second participant deposit event is missing or mismatched");
  }
  state.pendingEpoch = BigInt(depositEvent.args.pendingEpoch).toString();
  await writePrivate(privatePath, state);

  const slotAfter = await pool.slotPublic(slotIndex);
  if (Number(slotAfter.status) !== 2 || BigInt(slotAfter.activeWithdrawalId) !== 0n) {
    throw new Error("Second participant slot did not become an idle active slot");
  }
  const principalHandle = (await pool.principalHandle(participantAddress)) as string;
  const tokenHandleAfter = (await token.confidentialBalanceOf(participantAddress)) as string;
  const principal = await retry("second participant principal decryption", 16, () =>
    hre.fhevm.userDecryptEuint(FhevmType.euint64, principalHandle, poolAddress, participant),
  );
  const tokenAfter = await retry("second participant post-deposit cUSDT decryption", 16, () =>
    hre.fhevm.userDecryptEuint(FhevmType.euint64, tokenHandleAfter, tokenAddress, participant),
  );
  const depositAmount = BigInt(state.depositAmount);
  if (principal.value !== depositAmount) {
    throw new Error("Second participant private principal reconciliation failed");
  }
  if (tokenAfter.value + depositAmount !== tokenBalanceBeforeDeposit.value) {
    throw new Error("Second participant private cUSDT reconciliation failed");
  }

  const evidence = {
    schemaVersion: 1,
    product: "VeilSave",
    status: "PASS",
    network: "ethereum-sepolia",
    chainId: 11155111,
    recordedAt: new Date().toISOString(),
    participant: participantAddress,
    pool: poolAddress,
    confidentialToken: tokenAddress,
    publicUnderlying: underlyingAddress,
    funding: fundingReceipt ? receiptRecord(fundingReceipt) : null,
    publicAssetPreparation: {
      mintAndWrapBaseUnits: MINT_AND_WRAP_AMOUNT.toString(),
      mint: mintReceipt ? receiptRecord(mintReceipt) : null,
      approval: approvalReceipt ? receiptRecord(approvalReceipt) : null,
      wrap: wrapReceipt ? receiptRecord(wrapReceipt) : null,
      note: "Public Sepolia mock-USDT mint and wrap; not a confidential deposit amount.",
    },
    slot: {
      index: Number(slotIndex),
      bondWei: "1000000000000000",
      denomination: "Sepolia ETH",
      refundable: true,
      reservation: reservationReceipt ? receiptRecord(reservationReceipt) : null,
    },
    deposit: {
      ...receiptRecord(depositReceipt),
      pendingEpoch: state.pendingEpoch,
      eventObserved: true,
      slotActivated: true,
      privatePrincipalReconciled: true,
      privateTokenBalanceReconciled: true,
    },
    dependencies: {
      zamaInitializationAttempts: initialization.attempts,
      principalDecryptionAttempts: principal.attempts,
      tokenDecryptionAttempts: tokenAfter.attempts,
    },
    privacy: {
      depositAmountRecordedPublicly: false,
      inputProofRecorded: false,
      ciphertextHandlesRecorded: false,
      privateKeyRecordedPublicly: false,
    },
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: evidence.status,
        participant: evidence.participant,
        slot: evidence.slot.index,
        reservationTransaction: evidence.slot.reservation?.transactionHash ?? null,
        depositTransaction: evidence.deposit.transactionHash,
        pendingEpoch: evidence.deposit.pendingEpoch,
        privateReconciliation: "PASS (deposit amount and wallet key suppressed)",
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
