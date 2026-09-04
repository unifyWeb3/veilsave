import { randomInt } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { FhevmType } from "@fhevm/hardhat-plugin";
import { AbiCoder, Contract, ZeroHash, getAddress } from "ethers";
import * as hre from "hardhat";

type Draft = {
  chainId: number;
  contracts: { confidentialPrizePool: { address: string; deploymentBlock: number } };
  external: { confidentialToken: string };
};

type ReceiptRecord = {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
};

type PrivateAcceptanceState = {
  chainId: 11155111;
  pool: string;
  token: string;
  participant: string;
  slot: number;
  depositAmount: string;
  depositTransaction: string;
  pendingEpoch: string;
};

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
        console.log(`${label} pending (${attempt}/${attempts}); retrying without changing intent`);
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

async function latestSlotReservation(
  pool: any,
  owner: string,
  slotIndex: bigint,
  fromBlock: number,
  toBlock: number,
): Promise<any | null> {
  let latest: any | null = null;
  for (let start = fromBlock; start <= toBlock; start += 10) {
    const end = Math.min(start + 9, toBlock);
    const logs = await pool.queryFilter(pool.filters.SlotReserved(owner, slotIndex), start, end);
    if (logs.length > 0) latest = logs.at(-1) ?? latest;
  }
  return latest;
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

  const poolAddress = getAddress(draft.contracts.confidentialPrizePool.address);
  const tokenAddress = getAddress(draft.external.confidentialToken);
  const deploymentDir = path.dirname(draftPath);
  const repositoryRoot = path.resolve(deploymentDir, "../../..");
  const privateDir = path.join(repositoryRoot, "evidence/private");
  const privateStatePath = path.join(privateDir, "live-acceptance-state.json");
  const pool: any = await hre.ethers.getContractAt("ConfidentialPrizePool", poolAddress, signer);
  const token: any = new Contract(
    tokenAddress,
    [
      "function confidentialBalanceOf(address account) view returns (bytes32)",
      "function confidentialTransferAndCall(address to,bytes32 amount,bytes inputProof,bytes data) returns (bool)",
    ],
    signer,
  );

  const [occupied, slotIndex] = (await pool.slotOf(signer.address)) as [boolean, bigint];
  if (!occupied) throw new Error("The acceptance signer has no reserved pool slot");
  const slotBefore = await pool.slotPublic(slotIndex);
  if (Number(slotBefore.status) === 2) {
    let resumed: PrivateAcceptanceState;
    try {
      resumed = JSON.parse(await fs.readFile(privateStatePath, "utf8")) as PrivateAcceptanceState;
    } catch {
      throw new Error(
        "The slot is already active, but the private acceptance state is unavailable; refusing to resubmit",
      );
    }
    if (
      resumed.chainId !== 11155111 ||
      getAddress(resumed.pool) !== poolAddress ||
      getAddress(resumed.token) !== tokenAddress ||
      getAddress(resumed.participant) !== getAddress(signer.address) ||
      resumed.slot !== Number(slotIndex)
    ) {
      throw new Error("Private acceptance state does not match the active Sepolia position");
    }
    const receipt = await hre.ethers.provider.getTransactionReceipt(resumed.depositTransaction);
    if (!receipt || receipt.status !== 1) {
      throw new Error("The recorded encrypted deposit has no successful canonical receipt");
    }
    const depositEvent = receipt.logs
      .map((log: unknown) => {
        try {
          return pool.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event: any) => event?.name === "DepositProcessed");
    if (!depositEvent)
      throw new Error("Recorded deposit receipt contains no DepositProcessed event");
    const reservation = await latestSlotReservation(
      pool,
      signer.address,
      slotIndex,
      draft.contracts.confidentialPrizePool.deploymentBlock,
      receipt.blockNumber,
    );
    const evidencePath = path.join(deploymentDir, "live-deposit-evidence.json");
    const evidence = {
      schemaVersion: 1,
      product: "VeilSave",
      status: "PASS",
      network: "ethereum-sepolia",
      chainId: 11155111,
      recordedAt: new Date().toISOString(),
      participant: getAddress(signer.address),
      pool: poolAddress,
      confidentialToken: tokenAddress,
      slot: Number(slotIndex),
      slotBond: {
        denomination: "Sepolia ETH",
        refundable: true,
        transactionHash: reservation?.transactionHash ?? null,
        blockNumber: reservation?.blockNumber ?? null,
      },
      deposit: {
        ...receiptRecord(receipt),
        route: "VEILSAVE_DEPOSIT_V1",
        pendingEpoch: resumed.pendingEpoch,
        eventObserved: true,
        slotActivated: true,
        principalCiphertextChanged: true,
        pendingWeightCiphertextChanged: true,
        privatePrincipalReconciled: true,
        privateTokenBalanceReconciled: true,
        resumedWithoutResubmission: true,
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
          reservationTransaction: evidence.slotBond.transactionHash,
          depositTransaction: evidence.deposit.transactionHash,
          depositBlock: evidence.deposit.blockNumber,
          gasUsed: evidence.deposit.gasUsed,
          pendingEpoch: evidence.deposit.pendingEpoch,
          resumedWithoutResubmission: true,
          privateReconciliation: "PASS (amount suppressed)",
          evidencePath,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (Number(slotBefore.status) !== 1) {
    throw new Error(
      `Expected RESERVED slot before first deposit, received status ${slotBefore.status}`,
    );
  }

  const initialization = await retry("Zama SDK initialization", 8, async () => {
    await hre.fhevm.initializeCLIApi();
    return true;
  });

  const tokenHandleBefore = (await token.confidentialBalanceOf(signer.address)) as string;
  if (tokenHandleBefore === ZeroHash)
    throw new Error("Acceptance signer has no confidential cUSDT");
  const tokenBalanceBefore = await retry("cUSDT owner decryption", 8, () =>
    hre.fhevm.userDecryptEuint(FhevmType.euint64, tokenHandleBefore, tokenAddress, signer),
  );
  if (tokenBalanceBefore.value < 1_000_000n) {
    throw new Error("Acceptance signer has insufficient confidential cUSDT");
  }

  // The exact amount is intentionally non-derivable from source or public evidence.
  const maximum = Number(
    tokenBalanceBefore.value > 1_750_000n ? 1_750_000n : tokenBalanceBefore.value,
  );
  const minimum = Math.min(750_000, maximum - 1);
  const amount = BigInt(randomInt(minimum, maximum));
  const principalHandleBefore = (await pool.principalHandle(signer.address)) as string;
  const pendingBefore = (await pool.weightHandles(signer.address))[1] as string;

  const encrypted = await retry("Zama encrypted input", 8, async () => {
    const input = hre.fhevm.createEncryptedInput(tokenAddress, signer.address);
    input.add64(amount);
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
  const estimatedGas = await token.confidentialTransferAndCall.estimateGas(...args);
  const gasLimit = (estimatedGas * 3n) / 2n;
  const transaction = await token.confidentialTransferAndCall(...args, { gasLimit });
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Encrypted cUSDT deposit reverted");

  const depositEvent = receipt.logs
    .map((log: unknown) => {
      try {
        return pool.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((event: any) => event?.name === "DepositProcessed");
  if (!depositEvent) throw new Error("Deposit receipt contains no DepositProcessed event");
  if (getAddress(depositEvent.args.owner) !== getAddress(signer.address)) {
    throw new Error("Deposit event owner mismatch");
  }

  const slotAfter = await pool.slotPublic(slotIndex);
  const principalHandleAfter = (await pool.principalHandle(signer.address)) as string;
  const pendingAfter = (await pool.weightHandles(signer.address))[1] as string;
  const tokenHandleAfter = (await token.confidentialBalanceOf(signer.address)) as string;
  if (Number(slotAfter.status) !== 2) throw new Error("Deposit did not activate the reserved slot");
  if (principalHandleAfter === ZeroHash || principalHandleAfter === principalHandleBefore) {
    throw new Error("Principal ciphertext did not change");
  }
  if (pendingAfter === ZeroHash || pendingAfter === pendingBefore) {
    throw new Error("Pending-weight ciphertext did not change");
  }
  if (tokenHandleAfter === tokenHandleBefore)
    throw new Error("Sender cUSDT ciphertext did not change");

  const principalAfter = await retry("principal owner decryption", 12, () =>
    hre.fhevm.userDecryptEuint(FhevmType.euint64, principalHandleAfter, poolAddress, signer),
  );
  const tokenBalanceAfter = await retry("post-deposit cUSDT owner decryption", 12, () =>
    hre.fhevm.userDecryptEuint(FhevmType.euint64, tokenHandleAfter, tokenAddress, signer),
  );
  const principalBefore =
    principalHandleBefore === ZeroHash
      ? 0n
      : (
          await retry("prior principal owner decryption", 8, () =>
            hre.fhevm.userDecryptEuint(
              FhevmType.euint64,
              principalHandleBefore,
              poolAddress,
              signer,
            ),
          )
        ).value;
  if (principalAfter.value !== principalBefore + amount) {
    throw new Error("Private principal reconciliation failed");
  }
  if (tokenBalanceAfter.value + amount !== tokenBalanceBefore.value) {
    throw new Error("Private cUSDT balance reconciliation failed");
  }

  await fs.mkdir(privateDir, { recursive: true, mode: 0o700 });
  await fs.writeFile(
    privateStatePath,
    `${JSON.stringify(
      {
        chainId: 11155111,
        pool: poolAddress,
        token: tokenAddress,
        participant: getAddress(signer.address),
        slot: Number(slotIndex),
        depositAmount: amount.toString(),
        depositTransaction: receipt.hash,
        pendingEpoch: depositEvent.args.pendingEpoch.toString(),
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", mode: 0o600 },
  );

  const reservation = await latestSlotReservation(
    pool,
    signer.address,
    slotIndex,
    draft.contracts.confidentialPrizePool.deploymentBlock,
    receipt.blockNumber,
  );
  const evidence = {
    schemaVersion: 1,
    product: "VeilSave",
    status: "PASS",
    network: "ethereum-sepolia",
    chainId: 11155111,
    recordedAt: new Date().toISOString(),
    participant: getAddress(signer.address),
    pool: poolAddress,
    confidentialToken: tokenAddress,
    slot: Number(slotIndex),
    slotBond: {
      denomination: "Sepolia ETH",
      refundable: true,
      transactionHash: reservation?.transactionHash ?? null,
      blockNumber: reservation?.blockNumber ?? null,
    },
    deposit: {
      ...receiptRecord(receipt),
      route: "VEILSAVE_DEPOSIT_V1",
      pendingEpoch: depositEvent.args.pendingEpoch.toString(),
      eventObserved: true,
      slotActivated: true,
      principalCiphertextChanged: true,
      pendingWeightCiphertextChanged: true,
      privatePrincipalReconciled: true,
      privateTokenBalanceReconciled: true,
    },
    dependencies: {
      zamaInitializationAttempts: initialization.attempts,
      encryptionAttempts: encrypted.attempts,
      principalDecryptionAttempts: principalAfter.attempts,
      tokenDecryptionAttempts: tokenBalanceAfter.attempts,
    },
    privacy: {
      amountRecordedPublicly: false,
      inputProofRecorded: false,
      ciphertextHandlesRecorded: false,
    },
  };
  const evidencePath = path.join(deploymentDir, "live-deposit-evidence.json");
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        status: evidence.status,
        network: evidence.network,
        slot: evidence.slot,
        reservationTransaction: evidence.slotBond.transactionHash,
        depositTransaction: evidence.deposit.transactionHash,
        depositBlock: evidence.deposit.blockNumber,
        gasUsed: evidence.deposit.gasUsed,
        pendingEpoch: evidence.deposit.pendingEpoch,
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
