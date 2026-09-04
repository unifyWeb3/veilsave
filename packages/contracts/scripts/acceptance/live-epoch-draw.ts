import fs from "node:fs/promises";
import path from "node:path";

import { FhevmType } from "@fhevm/hardhat-plugin";
import { AbiCoder, Contract, Wallet, ZeroAddress, ZeroHash, getAddress, keccak256 } from "ethers";
import * as hre from "hardhat";

type Draft = {
  chainId: number;
  configuration: {
    participantCapacity: number;
    epochDurationSeconds: number;
    winnerFinalityDelayBlocks: number;
    vrfConfirmations: number;
    vrfCallbackGasLimit: number;
    vrfWords: number;
  };
  contracts: {
    confidentialPrizePool: { address: string };
    poolVrfAdapter: { address: string };
  };
  external: {
    confidentialToken: string;
    vrfWrapper: string;
  };
};

type SecondParticipantState = {
  chainId: 11155111;
  participant: string;
  privateKey: string;
  pool: string;
  token: string;
};

type PrivateState = {
  chainId: 11155111;
  pool: string;
  vrfAdapter: string;
  token: string;
  epochId: string;
  openedAt: string;
  closesAt: string;
  expectedOutcome: "ZERO_WINNER" | "PARTICIPANT_WINNER";
  participants: [string, string];
  participantSlots: [number, number];
  weightPrecheckPassed: boolean;
  eligibleHandlesAtFreeze?: [string, string];
  frozenOwnerCheckPassed?: boolean;
  frozenWeightHandleCheckPassed?: boolean;
  fundingTransaction?: string;
  vrfQuoteWei?: string;
  adapterBalanceBeforeRequestWei?: string;
  freezeTransaction?: string;
  snapshotCommitment?: string;
  frozenSlotCount?: number;
  requestTransaction?: string;
  requestId?: string;
  fulfillmentTransaction?: string;
  fulfillmentBlock?: number;
  callbackGasUsed?: string;
  callbackIsolationCheckPassed?: boolean;
  randomWord?: string;
  syncTransaction?: string;
  drawTransaction?: string;
  drawGlobalHcu?: number;
  drawSequentialHcu?: number;
  drawGasUsed?: string;
  winnerHandle?: string;
  clearWinner?: string;
  winnerProofHash?: string;
  winnerPublicDecryptAttempts?: number;
  winnerPublicDecryptLatencyMs?: number;
  winnerBeforeGrantRejected?: boolean;
  earlyFinalizationRejected?: boolean;
  wrongClearRejected?: boolean;
  wrongHandleRejected?: boolean;
  wrongEpochRejected?: boolean;
  finalizeTransaction?: string;
  replayRejected?: boolean;
  winnerDecryptAttempts?: number;
  winnerDecryptLatencyMs?: number;
  prizeValue?: string;
  winnerTokenBalanceBeforeClaim?: string;
  nonWinnerDecryptRejected?: boolean;
  publicPrizeDecryptRejected?: boolean;
  zeroWinnerParticipantDecryptRejected?: boolean;
  claimTransaction?: string;
  privatePrizeClaimReconciled?: boolean;
  openNextTransaction?: string;
};

type ReceiptRecord = {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
};

const PARTICIPANT_CAPACITY = 16;
const EPOCH_OPEN = 1;
const EPOCH_FROZEN = 2;
const EPOCH_RANDOMNESS_REQUESTED = 3;
const EPOCH_DRAW_READY = 4;
const EPOCH_REVEAL_PENDING = 5;
const EPOCH_TERMINAL = 6;
const SLOT_ACTIVE = 2;
const CALLBACK_GAS_LIMIT = 100_000n;
const REQUEST_GAS_LIMIT = 500_000n;
const MAX_DRAW_GLOBAL_HCU = 17_000_000;
const MAX_DRAW_SEQUENTIAL_HCU = 4_000_000;
const MAX_CALLBACK_GAS = 250_000n;
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
  label: string,
  currentHash: string | undefined,
  recordHash: (hash: string) => Promise<void>,
  send: () => Promise<any>,
): Promise<any> {
  if (currentHash) {
    const receipt = await canonicalReceipt(currentHash);
    if (receipt.status !== 1) throw new Error(`Recorded ${label} transaction reverted`);
    return receipt;
  }
  const transaction = await send();
  await recordHash(transaction.hash);
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`${label} transaction reverted`);
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

function revertName(error: unknown, contract: any): string | null {
  const candidate = error as any;
  if (typeof candidate?.revert?.name === "string") return candidate.revert.name;
  for (const data of [
    candidate?.data,
    candidate?.error?.data,
    candidate?.info?.error?.data,
    candidate?.info?.error?.data?.data,
  ]) {
    if (typeof data !== "string" || !data.startsWith("0x")) continue;
    try {
      return contract.interface.parseError(data)?.name ?? null;
    } catch {
      // Try the next provider error shape.
    }
  }
  return null;
}

async function expectCustomError(
  label: string,
  expected: string,
  contract: any,
  action: () => Promise<unknown>,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    const actual = revertName(error, contract);
    if (actual === expected) return;
    throw new Error(
      `${label} reverted with ${actual ?? "an unclassified error"}, expected ${expected}`,
    );
  }
  throw new Error(`${label} unexpectedly succeeded`);
}

async function expectRevert(label: string, action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch {
    return;
  }
  throw new Error(`${label} unexpectedly succeeded`);
}

async function decryptOwner64(
  label: string,
  handle: string,
  contractAddress: string,
  signer: any,
): Promise<bigint> {
  if (handle === ZeroHash) return 0n;
  const result = await retry(label, 20, () =>
    hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, contractAddress, signer),
  );
  return result.value;
}

async function userDecryptRejected(
  handle: string,
  contractAddress: string,
  signer: any,
): Promise<boolean> {
  try {
    await hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, contractAddress, signer);
    return false;
  } catch {
    return true;
  }
}

async function publicPrizeDecryptRejected(handle: string): Promise<boolean> {
  try {
    await hre.fhevm.publicDecryptEuint(FhevmType.euint64, handle);
    return false;
  } catch {
    return true;
  }
}

function printWait(status: string, details: Record<string, unknown>): void {
  console.log(JSON.stringify({ status, network: "ethereum-sepolia", ...details }, null, 2));
}

function validateState(
  state: PrivateState,
  epochId: bigint,
  pool: string,
  vrfAdapter: string,
  token: string,
  primary: string,
  secondary: string,
): void {
  const participants = new Set(state.participants.map(getAddress));
  if (
    state.chainId !== 11155111 ||
    BigInt(state.epochId) !== epochId ||
    getAddress(state.pool) !== pool ||
    getAddress(state.vrfAdapter) !== vrfAdapter ||
    getAddress(state.token) !== token ||
    participants.size !== 2 ||
    !participants.has(primary) ||
    !participants.has(secondary) ||
    state.participantSlots.length !== 2 ||
    !state.weightPrecheckPassed
  ) {
    throw new Error("Private epoch acceptance state does not match the live Sepolia deployment");
  }
}

async function main(): Promise<void> {
  const draftPath = path.resolve(required("DEPLOYMENT_DRAFT_PATH"));
  const draft = JSON.parse(await fs.readFile(draftPath, "utf8")) as Draft;
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 11155111n || draft.chainId !== 11155111) {
    throw new Error(`Refusing live acceptance on chain ${network.chainId}`);
  }
  if (
    draft.configuration.participantCapacity !== PARTICIPANT_CAPACITY ||
    draft.configuration.epochDurationSeconds !== 604_800 ||
    draft.configuration.winnerFinalityDelayBlocks !== 96 ||
    draft.configuration.vrfConfirmations !== 3 ||
    draft.configuration.vrfCallbackGasLimit !== Number(CALLBACK_GAS_LIMIT) ||
    draft.configuration.vrfWords !== 1
  ) {
    throw new Error("Deployment draft differs from the frozen draw configuration");
  }

  const [coordinator] = await hre.ethers.getSigners();
  if (!coordinator) throw new Error("No Sepolia acceptance signer is configured");
  const poolAddress = getAddress(draft.contracts.confidentialPrizePool.address);
  const vrfAddress = getAddress(draft.contracts.poolVrfAdapter.address);
  const tokenAddress = getAddress(draft.external.confidentialToken);
  const wrapperAddress = getAddress(draft.external.vrfWrapper);
  const deploymentDir = path.dirname(draftPath);
  const repositoryRoot = path.resolve(deploymentDir, "../../..");
  const privateDir = path.join(repositoryRoot, "evidence/private");
  const secondParticipantPath = path.join(privateDir, "live-second-participant.json");
  const secondParticipant = await readJson<SecondParticipantState>(secondParticipantPath);
  if (!secondParticipant) throw new Error("The active second-participant private state is missing");
  const secondaryWallet = new Wallet(secondParticipant.privateKey, hre.ethers.provider);
  const primaryAddress = getAddress(coordinator.address);
  const secondaryAddress = getAddress(secondaryWallet.address);
  if (
    secondParticipant.chainId !== 11155111 ||
    getAddress(secondParticipant.participant) !== secondaryAddress ||
    getAddress(secondParticipant.pool) !== poolAddress ||
    getAddress(secondParticipant.token) !== tokenAddress ||
    primaryAddress === secondaryAddress
  ) {
    throw new Error("Second participant is not bound to this deployment");
  }

  const pool: any = await hre.ethers.getContractAt(
    "ConfidentialPrizePool",
    poolAddress,
    coordinator,
  );
  const vrf: any = await hre.ethers.getContractAt("PoolVrfAdapter", vrfAddress, coordinator);
  const token: any = new Contract(
    tokenAddress,
    ["function confidentialBalanceOf(address account) view returns (bytes32)"],
    coordinator,
  );
  const wrapper: any = new Contract(
    wrapperAddress,
    [
      "function calculateRequestPriceNative(uint32 callbackGasLimit,uint32 numWords) view returns (uint256)",
      "function estimateRequestPriceNative(uint32 callbackGasLimit,uint32 numWords,uint256 requestGasPriceWei) view returns (uint256)",
    ],
    hre.ethers.provider,
  );

  if (!(await pool.active())) throw new Error("Pool is not active");
  const targetEpochId = process.env.ACCEPTANCE_EPOCH_ID
    ? BigInt(process.env.ACCEPTANCE_EPOCH_ID)
    : BigInt(await pool.currentEpochId());
  if (targetEpochId <= 0n) throw new Error("ACCEPTANCE_EPOCH_ID must be positive");
  const privatePath = path.join(privateDir, `live-epoch-${targetEpochId}-state.json`);
  const evidencePath = path.join(deploymentDir, `live-epoch-${targetEpochId}-evidence.json`);

  await retry("Zama SDK initialization", 8, async () => {
    await hre.fhevm.initializeCLIApi();
    return true;
  });

  let state = await readJson<PrivateState>(privatePath);
  let epoch = await pool.epochPublic(targetEpochId);
  if (!state) {
    if (Number(epoch.status) !== EPOCH_OPEN) {
      throw new Error("First epoch acceptance run must occur while the target epoch is OPEN");
    }

    const participants: [string, string] = [primaryAddress, secondaryAddress];
    const participantSigners = [coordinator, secondaryWallet];
    const slots: number[] = [];
    const eligibleHandles: string[] = [];
    const eligibleWeights: bigint[] = [];
    const pendingWeights: bigint[] = [];
    for (let index = 0; index < participants.length; ++index) {
      const participant = participants[index]!;
      const signer = participantSigners[index]!;
      const [occupied, slotValue] = (await pool.slotOf(participant)) as [boolean, bigint];
      if (!occupied) throw new Error("A draw participant has no active slot");
      const slot = Number(slotValue);
      const slotState = await pool.slotPublic(slot);
      if (Number(slotState.status) !== SLOT_ACTIVE || BigInt(slotState.activeWithdrawalId) !== 0n) {
        throw new Error("A draw participant slot is not active and idle");
      }
      const [eligibleHandle, pendingHandle] = await pool.weightHandles(participant);
      eligibleHandles.push(eligibleHandle as string);
      eligibleWeights.push(
        await decryptOwner64(
          "eligible-weight precheck",
          eligibleHandle as string,
          poolAddress,
          signer,
        ),
      );
      pendingWeights.push(
        await decryptOwner64(
          "pending-weight precheck",
          pendingHandle as string,
          poolAddress,
          signer,
        ),
      );
      slots.push(slot);
    }

    const occupiedOwners: string[] = [];
    for (let slot = 0; slot < PARTICIPANT_CAPACITY; ++slot) {
      const slotState = await pool.slotPublic(slot);
      if (getAddress(slotState.owner) !== ZeroAddress)
        occupiedOwners.push(getAddress(slotState.owner));
    }
    if (
      occupiedOwners.length !== 2 ||
      !occupiedOwners.includes(primaryAddress) ||
      !occupiedOwners.includes(secondaryAddress)
    ) {
      throw new Error("Live draw acceptance requires exactly the two recorded participants");
    }

    const eligibleTotal = eligibleWeights[0]! + eligibleWeights[1]!;
    const pendingTotal = pendingWeights[0]! + pendingWeights[1]!;
    const expectedOutcome = eligibleTotal === 0n ? "ZERO_WINNER" : "PARTICIPANT_WINNER";
    if (
      (expectedOutcome === "ZERO_WINNER" && pendingTotal <= 0n) ||
      (expectedOutcome === "PARTICIPANT_WINNER" && eligibleWeights.some((value) => value <= 0n))
    ) {
      throw new Error("Encrypted weight precheck does not match the expected maturity stage");
    }

    state = {
      chainId: 11155111,
      pool: poolAddress,
      vrfAdapter: vrfAddress,
      token: tokenAddress,
      epochId: targetEpochId.toString(),
      openedAt: BigInt(epoch.openedAt).toString(),
      closesAt: BigInt(epoch.closesAt).toString(),
      expectedOutcome,
      participants,
      participantSlots: [slots[0]!, slots[1]!],
      weightPrecheckPassed: true,
      eligibleHandlesAtFreeze: [eligibleHandles[0]!, eligibleHandles[1]!],
    };
    await writePrivate(privatePath, state);
  }

  validateState(
    state,
    targetEpochId,
    poolAddress,
    vrfAddress,
    tokenAddress,
    primaryAddress,
    secondaryAddress,
  );
  const signerFor = (participant: string): any =>
    getAddress(participant) === primaryAddress ? coordinator : secondaryWallet;

  if (Number(epoch.status) === EPOCH_OPEN) {
    const eligibleHandles: string[] = [];
    const eligibleWeights: bigint[] = [];
    const pendingWeights: bigint[] = [];

    for (let index = 0; index < state.participants.length; ++index) {
      const participant = getAddress(state.participants[index]!);
      const [occupied, slotValue] = (await pool.slotOf(participant)) as [boolean, bigint];
      if (!occupied || Number(slotValue) !== state.participantSlots[index]) {
        throw new Error("Participant slot ownership changed after the recorded precheck");
      }
      const slot = Number(slotValue);
      const slotState = await pool.slotPublic(slot);
      if (Number(slotState.status) !== SLOT_ACTIVE || BigInt(slotState.activeWithdrawalId) !== 0n) {
        throw new Error("A draw participant is no longer active and idle before freeze");
      }

      const [eligibleHandle, pendingHandle] = await pool.weightHandles(participant);
      eligibleHandles.push(eligibleHandle as string);
      eligibleWeights.push(
        await decryptOwner64(
          "eligible-weight freeze precheck",
          eligibleHandle as string,
          poolAddress,
          signerFor(participant),
        ),
      );
      pendingWeights.push(
        await decryptOwner64(
          "pending-weight freeze precheck",
          pendingHandle as string,
          poolAddress,
          signerFor(participant),
        ),
      );
    }

    for (let slot = 0; slot < PARTICIPANT_CAPACITY; ++slot) {
      const slotState = await pool.slotPublic(slot);
      const expectedIndex = state.participantSlots.indexOf(slot);
      const expectedOwner =
        expectedIndex === -1 ? ZeroAddress : getAddress(state.participants[expectedIndex]!);
      if (getAddress(slotState.owner) !== expectedOwner) {
        throw new Error(`Live slot ${slot} differs from the recorded two-participant draw`);
      }
    }

    const eligibleTotal = eligibleWeights[0]! + eligibleWeights[1]!;
    const pendingTotal = pendingWeights[0]! + pendingWeights[1]!;
    if (
      (state.expectedOutcome === "ZERO_WINNER" && (eligibleTotal !== 0n || pendingTotal <= 0n)) ||
      (state.expectedOutcome === "PARTICIPANT_WINNER" &&
        eligibleWeights.some((value) => value <= 0n))
    ) {
      throw new Error("Live encrypted weights changed outside the expected maturity stage");
    }

    state.eligibleHandlesAtFreeze = [eligibleHandles[0]!, eligibleHandles[1]!];
    state.weightPrecheckPassed = true;
    await writePrivate(privatePath, state);
  }

  const latestBeforeFreeze = await hre.ethers.provider.getBlock("latest");
  if (!latestBeforeFreeze) throw new Error("Latest Sepolia block is unavailable");
  if (
    Number(epoch.status) === EPOCH_OPEN &&
    BigInt(latestBeforeFreeze.timestamp) < BigInt(state.closesAt)
  ) {
    printWait("WAIT_EPOCH_CLOSE", {
      epochId: state.epochId,
      closesAt: new Date(Number(BigInt(state.closesAt)) * 1000).toISOString(),
      secondsRemaining: (BigInt(state.closesAt) - BigInt(latestBeforeFreeze.timestamp)).toString(),
      expectedOutcome: state.expectedOutcome,
      statePersisted: true,
    });
    return;
  }

  let freezeReceipt: any = null;
  if (Number(epoch.status) === EPOCH_OPEN) {
    freezeReceipt = await sendOrResume(
      "epoch freeze",
      state.freezeTransaction,
      async (hash) => {
        state!.freezeTransaction = hash;
        await writePrivate(privatePath, state!);
      },
      async () => {
        const estimatedGas = await pool.freezeEpoch.estimateGas(targetEpochId);
        return pool.freezeEpoch(targetEpochId, { gasLimit: (estimatedGas * 3n) / 2n });
      },
    );
    epoch = await pool.epochPublic(targetEpochId);
  } else if (state.freezeTransaction) {
    freezeReceipt = await canonicalReceipt(state.freezeTransaction);
  }
  if (Number(epoch.status) < EPOCH_FROZEN || Number(epoch.status) > EPOCH_TERMINAL) {
    throw new Error(`Epoch is not in a recognized post-freeze state; status=${epoch.status}`);
  }
  if (freezeReceipt && !state.snapshotCommitment) {
    const frozen = findEvent(pool, freezeReceipt, "EpochFrozen");
    if (!frozen || BigInt(frozen.args.epochId) !== targetEpochId) {
      throw new Error("Freeze receipt has no bound EpochFrozen event");
    }
    state.snapshotCommitment = frozen.args.snapshotCommitment;
    state.frozenSlotCount = Number(frozen.args.frozenSlotCount);
    await writePrivate(privatePath, state);
  }
  if (state.frozenSlotCount !== 2) {
    throw new Error("Frozen draw snapshot does not contain exactly two occupied slots");
  }
  if (!state.eligibleHandlesAtFreeze) {
    throw new Error("Frozen epoch has no recorded immediately-pre-freeze weight handles");
  }
  if (!state.frozenOwnerCheckPassed || !state.frozenWeightHandleCheckPassed) {
    for (let slot = 0; slot < PARTICIPANT_CAPACITY; ++slot) {
      const expectedIndex = state.participantSlots.indexOf(slot);
      const expectedOwner =
        expectedIndex === -1 ? ZeroAddress : getAddress(state.participants[expectedIndex]!);
      if (getAddress(await pool.epochSlotOwner(targetEpochId, slot)) !== expectedOwner) {
        throw new Error(`Frozen epoch owner at slot ${slot} differs from the pre-freeze state`);
      }
    }
    state.frozenOwnerCheckPassed = true;

    for (let index = 0; index < state.participantSlots.length; ++index) {
      const frozenHandle = String(
        await pool.epochWeightHandle(targetEpochId, state.participantSlots[index]!),
      );
      if (frozenHandle.toLowerCase() !== state.eligibleHandlesAtFreeze[index]!.toLowerCase()) {
        throw new Error(
          "Frozen encrypted weight handle differs from the pre-freeze eligible handle",
        );
      }
    }
    state.frozenWeightHandleCheckPassed = true;
    await writePrivate(privatePath, state);
  }

  let requestReceipt: any = null;
  if (Number(epoch.status) === EPOCH_FROZEN) {
    const latest = await hre.ethers.provider.getBlock("latest");
    if (!latest) throw new Error("Latest Sepolia block is unavailable");
    if (BigInt(latest.timestamp) > BigInt(epoch.requestDeadline)) {
      throw new Error("Epoch VRF request deadline expired; no reroll is permitted");
    }

    const feeData = await hre.ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    if (!gasPrice || gasPrice <= 0n) throw new Error("Sepolia gas price is unavailable");
    const estimatedQuote = BigInt(
      await wrapper.estimateRequestPriceNative(CALLBACK_GAS_LIMIT, 1, gasPrice),
    );
    const quote = BigInt(
      await wrapper.calculateRequestPriceNative(CALLBACK_GAS_LIMIT, 1, { gasPrice }),
    );
    if (quote <= 0n || estimatedQuote <= 0n) throw new Error("VRF wrapper quote is not positive");
    state.vrfQuoteWei = quote.toString();
    let adapterBalance = await hre.ethers.provider.getBalance(vrfAddress);
    state.adapterBalanceBeforeRequestWei = adapterBalance.toString();
    await writePrivate(privatePath, state);

    if (adapterBalance < quote * 2n) {
      const topUp = quote * 2n - adapterBalance;
      const fundingReceipt = await sendOrResume(
        "VRF adapter funding",
        state.fundingTransaction,
        async (hash) => {
          state!.fundingTransaction = hash;
          await writePrivate(privatePath, state!);
        },
        () => vrf.fund({ value: topUp }),
      );
      if (!findEvent(vrf, fundingReceipt, "VrfFunded")) {
        throw new Error("VRF adapter funding event is missing");
      }
      adapterBalance = await hre.ethers.provider.getBalance(vrfAddress);
      if (adapterBalance < quote) throw new Error("VRF adapter remains below the request quote");
    }

    requestReceipt = await sendOrResume(
      "epoch VRF request",
      state.requestTransaction,
      async (hash) => {
        state!.requestTransaction = hash;
        await writePrivate(privatePath, state!);
      },
      () => pool.requestEpochRandomness(targetEpochId, { gasLimit: REQUEST_GAS_LIMIT }),
    );
    epoch = await pool.epochPublic(targetEpochId);
  } else if (state.requestTransaction) {
    requestReceipt = await canonicalReceipt(state.requestTransaction);
  }
  if (requestReceipt && !state.requestId) {
    const requested = findEvent(pool, requestReceipt, "EpochRandomnessRequested");
    const adapterRequested = findEvent(vrf, requestReceipt, "VrfRequestCreated");
    if (
      !requested ||
      !adapterRequested ||
      BigInt(requested.args.epochId) !== targetEpochId ||
      BigInt(requested.args.requestId) !== BigInt(adapterRequested.args.requestId)
    ) {
      throw new Error("VRF request receipt does not bind pool and adapter request IDs");
    }
    if (
      state.snapshotCommitment &&
      String(adapterRequested.args.snapshotCommitment).toLowerCase() !==
        state.snapshotCommitment.toLowerCase()
    ) {
      throw new Error("VRF request commitment differs from the frozen snapshot");
    }
    state.requestId = BigInt(requested.args.requestId).toString();
    await writePrivate(privatePath, state);
  }

  let syncReceipt: any = null;
  if (Number(epoch.status) === EPOCH_RANDOMNESS_REQUESTED) {
    if (!state.requestId) throw new Error("Randomness-requested epoch has no recorded request ID");
    const requestId = BigInt(state.requestId);
    const fulfillment = await vrf.getFulfillment(requestId);
    if (!fulfillment.fulfilled) {
      const latest = await hre.ethers.provider.getBlock("latest");
      if (!latest) throw new Error("Latest Sepolia block is unavailable");
      if (BigInt(latest.timestamp) > BigInt((await pool.epochRandomness(targetEpochId))[1])) {
        throw new Error("VRF fulfillment deadline expired; no replacement request is permitted");
      }
      printWait("WAIT_VRF_FULFILLMENT", {
        epochId: state.epochId,
        requestId: state.requestId,
        snapshotCommitment: state.snapshotCommitment,
        callbackStoresRandomnessOnly: true,
      });
      return;
    }
    if (
      BigInt(fulfillment.epochId) !== targetEpochId ||
      (state.snapshotCommitment &&
        String(fulfillment.snapshotCommitment).toLowerCase() !==
          state.snapshotCommitment.toLowerCase())
    ) {
      throw new Error("VRF fulfillment is not bound to the target epoch snapshot");
    }

    const fulfilledBlock = Number(fulfillment.fulfilledBlock);
    const logs = await vrf.queryFilter(
      vrf.filters.VrfFulfilled(requestId, targetEpochId),
      fulfilledBlock,
      fulfilledBlock,
    );
    const fulfillmentLog = logs.at(-1);
    if (!fulfillmentLog) throw new Error("VRF fulfillment record has no canonical event");
    const fulfillmentReceipt = await hre.ethers.provider.getTransactionReceipt(
      fulfillmentLog.transactionHash,
    );
    if (!fulfillmentReceipt || fulfillmentReceipt.status !== 1) {
      throw new Error("VRF callback has no successful canonical receipt");
    }
    state.fulfillmentTransaction = fulfillmentReceipt.hash;
    state.fulfillmentBlock = fulfillmentReceipt.blockNumber;
    state.callbackGasUsed = fulfillmentReceipt.gasUsed.toString();
    state.randomWord = BigInt(fulfillment.randomWord).toString();
    if (fulfillmentReceipt.gasUsed > MAX_CALLBACK_GAS) {
      throw new Error("VRF callback gas exceeds the small-callback acceptance envelope");
    }
    const postCallbackEpoch = await pool.epochPublic(targetEpochId);
    const postCallbackRandomness = await pool.epochRandomness(targetEpochId);
    const postCallbackWinner = await pool.epochWinner(targetEpochId);
    if (
      Number(postCallbackEpoch.status) !== EPOCH_RANDOMNESS_REQUESTED ||
      BigInt(postCallbackRandomness[2]) !== 0n ||
      BigInt(postCallbackRandomness[3]) !== 0n ||
      BigInt(postCallbackRandomness[4]) !== 0n ||
      String(postCallbackWinner[0]) !== ZeroHash
    ) {
      throw new Error("VRF callback modified pool randomness/draw state before synchronization");
    }
    state.callbackIsolationCheckPassed = true;
    await writePrivate(privatePath, state);

    syncReceipt = await sendOrResume(
      "epoch randomness synchronization",
      state.syncTransaction,
      async (hash) => {
        state!.syncTransaction = hash;
        await writePrivate(privatePath, state!);
      },
      async () => {
        const estimatedGas = await pool.syncEpochRandomness.estimateGas(targetEpochId);
        return pool.syncEpochRandomness(targetEpochId, {
          gasLimit: (estimatedGas * 3n) / 2n,
        });
      },
    );
    epoch = await pool.epochPublic(targetEpochId);
  } else if (state.syncTransaction) {
    syncReceipt = await canonicalReceipt(state.syncTransaction);
  }

  let drawReceipt: any = null;
  if (Number(epoch.status) === EPOCH_DRAW_READY) {
    drawReceipt = await sendOrResume(
      "isolated 16-slot FHE draw",
      state.drawTransaction,
      async (hash) => {
        state!.drawTransaction = hash;
        await writePrivate(privatePath, state!);
      },
      async () => {
        const estimatedGas = await pool.executeEncryptedDraw.estimateGas(targetEpochId);
        return pool.executeEncryptedDraw(targetEpochId, {
          gasLimit: (estimatedGas * 3n) / 2n,
        });
      },
    );
    epoch = await pool.epochPublic(targetEpochId);
  } else if (state.drawTransaction) {
    drawReceipt = await canonicalReceipt(state.drawTransaction);
  }
  if (drawReceipt && (!state.drawGlobalHcu || !state.drawSequentialHcu)) {
    const hcu = hre.fhevm.computeTransactionHCU(drawReceipt);
    state.drawGlobalHcu = hcu.globalHCU;
    state.drawSequentialHcu = hcu.maxHCUDepth;
    state.drawGasUsed = drawReceipt.gasUsed.toString();
    const drawEvent = findEvent(pool, drawReceipt, "EncryptedDrawExecuted");
    if (!drawEvent || BigInt(drawEvent.args.epochId) !== targetEpochId) {
      throw new Error("FHE draw receipt has no bound EncryptedDrawExecuted event");
    }
    state.winnerHandle = drawEvent.args.winnerHandle;
    if (hcu.globalHCU > MAX_DRAW_GLOBAL_HCU || hcu.maxHCUDepth > MAX_DRAW_SEQUENTIAL_HCU) {
      throw new Error("Live draw exceeds the frozen HCU safety budget");
    }
    await writePrivate(privatePath, state);
  }

  if (Number(epoch.status) !== EPOCH_REVEAL_PENDING && Number(epoch.status) !== EPOCH_TERMINAL) {
    throw new Error(`Epoch did not reach winner reveal; status=${epoch.status}`);
  }

  let winnerState = await pool.epochWinner(targetEpochId);
  const winnerHandle = winnerState[0] as `0x${string}`;
  if (winnerHandle === ZeroHash) throw new Error("Encrypted winner handle is missing");
  if (state.winnerHandle && state.winnerHandle.toLowerCase() !== winnerHandle.toLowerCase()) {
    throw new Error("Winner handle differs from the recorded FHE draw output");
  }
  state.winnerHandle = winnerHandle;

  let winnerReveal: Awaited<ReturnType<typeof hre.fhevm.publicDecrypt>> | null = null;
  if (Number(epoch.status) === EPOCH_REVEAL_PENDING) {
    const started = Date.now();
    const reveal = await retry("public winner decryption", 24, () =>
      hre.fhevm.publicDecrypt([winnerHandle]),
    );
    winnerReveal = reveal.value;
    const [decodedWinner] = AbiCoder.defaultAbiCoder().decode(
      ["address"],
      winnerReveal.abiEncodedClearValues,
    );
    const clearWinner = getAddress(decodedWinner);
    if (state.expectedOutcome === "ZERO_WINNER" && clearWinner !== ZeroAddress) {
      throw new Error("Zero-weight epoch produced a nonzero winner");
    }
    if (
      state.expectedOutcome === "PARTICIPANT_WINNER" &&
      (clearWinner === ZeroAddress || !state.participants.map(getAddress).includes(clearWinner))
    ) {
      throw new Error("Weighted epoch winner is not one of the frozen participants");
    }
    state.clearWinner = clearWinner;
    state.winnerProofHash = keccak256(winnerReveal.decryptionProof);
    state.winnerPublicDecryptAttempts = reveal.attempts;
    state.winnerPublicDecryptLatencyMs = Date.now() - started;
    await writePrivate(privatePath, state);

    const prizeHandle = (await pool.prizeHandle(targetEpochId)) as string;
    if (clearWinner !== ZeroAddress && !state.winnerBeforeGrantRejected) {
      const rejected = await userDecryptRejected(prizeHandle, poolAddress, signerFor(clearWinner));
      if (!rejected) throw new Error("Winner decrypted the prize before finalization ACL grant");
      state.winnerBeforeGrantRejected = true;
      await writePrivate(privatePath, state);
    }

    const latestBlock = await hre.ethers.provider.getBlockNumber();
    const grantBlock = BigInt(winnerState[1]);
    if (BigInt(latestBlock) < grantBlock) {
      if (!state.earlyFinalizationRejected) {
        await expectCustomError(
          "winner finalization before 96-block delay",
          "WinnerAclDelayNotReached",
          pool,
          () =>
            pool.finalizeWinner.staticCall(
              targetEpochId,
              clearWinner,
              winnerReveal!.decryptionProof,
            ),
        );
        state.earlyFinalizationRejected = true;
        await writePrivate(privatePath, state);
      }
      printWait("WAIT_WINNER_FINALITY", {
        epochId: state.epochId,
        requestId: state.requestId,
        winnerHandle: state.winnerHandle,
        aclGrantNotBeforeBlock: grantBlock.toString(),
        currentBlock: latestBlock,
        blocksRemaining: (grantBlock - BigInt(latestBlock)).toString(),
      });
      return;
    }

    if (!state.wrongClearRejected) {
      const wrongWinner = clearWinner === primaryAddress ? secondaryAddress : primaryAddress;
      await expectRevert("winner proof with wrong clear address", () =>
        pool.finalizeWinner.staticCall(targetEpochId, wrongWinner, winnerReveal!.decryptionProof),
      );
      state.wrongClearRejected = true;
      await writePrivate(privatePath, state);
    }
    if (targetEpochId > 1n && !state.wrongHandleRejected) {
      const priorWinnerHandle = String((await pool.epochWinner(targetEpochId - 1n))[0]);
      if (
        priorWinnerHandle === ZeroHash ||
        priorWinnerHandle.toLowerCase() === winnerHandle.toLowerCase()
      ) {
        throw new Error("A distinct prior public winner handle is unavailable for the live check");
      }
      const priorReveal = await retry("prior winner public decryption", 24, () =>
        hre.fhevm.publicDecrypt([priorWinnerHandle]),
      );
      const [priorClearWinner] = AbiCoder.defaultAbiCoder().decode(
        ["address"],
        priorReveal.value.abiEncodedClearValues,
      );
      await expectRevert("winner proof generated for a different encrypted handle", () =>
        pool.finalizeWinner.staticCall(
          targetEpochId,
          getAddress(priorClearWinner),
          priorReveal.value.decryptionProof,
        ),
      );
      state.wrongHandleRejected = true;
      await writePrivate(privatePath, state);
    }
    if (!state.wrongEpochRejected) {
      await expectCustomError("winner proof with wrong epoch", "WrongEpochState", pool, () =>
        pool.finalizeWinner.staticCall(
          targetEpochId + 999n,
          clearWinner,
          winnerReveal!.decryptionProof,
        ),
      );
      state.wrongEpochRejected = true;
      await writePrivate(privatePath, state);
    }

    const finalizeReceipt = await sendOrResume(
      "winner finalization",
      state.finalizeTransaction,
      async (hash) => {
        state!.finalizeTransaction = hash;
        await writePrivate(privatePath, state!);
      },
      async () => {
        const args = [targetEpochId, clearWinner, winnerReveal!.decryptionProof] as const;
        const estimatedGas = await pool.finalizeWinner.estimateGas(...args);
        return pool.finalizeWinner(...args, { gasLimit: (estimatedGas * 3n) / 2n });
      },
    );
    if (!findEvent(pool, finalizeReceipt, "EpochTerminal")) {
      throw new Error("Winner finalization has no terminal epoch event");
    }
    epoch = await pool.epochPublic(targetEpochId);
    winnerState = await pool.epochWinner(targetEpochId);
  }

  if (Number(epoch.status) !== EPOCH_TERMINAL || !winnerState[3]) {
    throw new Error("Winner finalization did not terminalize the epoch");
  }
  if (!state.finalizeTransaction) {
    throw new Error("Terminal epoch has no recorded winner-finalization transaction");
  }
  const finalizeReceipt = await canonicalReceipt(state.finalizeTransaction);
  const finalizedWinner = getAddress(winnerState[2]);
  if (!state.clearWinner || finalizedWinner !== getAddress(state.clearWinner)) {
    throw new Error("Finalized winner differs from the authenticated public reveal");
  }
  if (!state.replayRejected) {
    await expectCustomError("duplicate winner finalization", "WrongEpochState", pool, () =>
      pool.finalizeWinner.staticCall(targetEpochId, finalizedWinner, "0x"),
    );
    state.replayRejected = true;
    await writePrivate(privatePath, state);
  }

  const prizeHandle = (await pool.prizeHandle(targetEpochId)) as string;
  let claimReceipt: any = null;
  if (finalizedWinner === ZeroAddress) {
    if (!state.zeroWinnerParticipantDecryptRejected) {
      const rejected = await Promise.all([
        userDecryptRejected(prizeHandle, poolAddress, coordinator),
        userDecryptRejected(prizeHandle, poolAddress, secondaryWallet),
      ]);
      if (rejected.some((value) => !value)) {
        throw new Error("Zero-winner epoch granted participant prize decryption access");
      }
      state.zeroWinnerParticipantDecryptRejected = true;
      await writePrivate(privatePath, state);
    }
    if (!state.publicPrizeDecryptRejected) {
      if (!(await publicPrizeDecryptRejected(prizeHandle))) {
        throw new Error("Zero-winner epoch prize became publicly decryptable");
      }
      state.publicPrizeDecryptRejected = true;
      await writePrivate(privatePath, state);
    }
  } else {
    const winnerSigner = signerFor(finalizedWinner);
    const nonWinnerAddress = finalizedWinner === primaryAddress ? secondaryAddress : primaryAddress;
    const nonWinnerSigner = signerFor(nonWinnerAddress);
    if (!state.prizeValue) {
      const started = Date.now();
      const winnerDecrypt = await retry("winner-only prize decryption", 24, () =>
        hre.fhevm.userDecryptEuint(FhevmType.euint64, prizeHandle, poolAddress, winnerSigner),
      );
      if (winnerDecrypt.value <= 0n) throw new Error("Finalized winner decrypted a zero prize");
      state.prizeValue = winnerDecrypt.value.toString();
      state.winnerDecryptAttempts = winnerDecrypt.attempts;
      state.winnerDecryptLatencyMs = Date.now() - started;
      await writePrivate(privatePath, state);
    }
    if (!state.nonWinnerDecryptRejected) {
      if (!(await userDecryptRejected(prizeHandle, poolAddress, nonWinnerSigner))) {
        throw new Error("Non-winner decrypted the epoch prize");
      }
      state.nonWinnerDecryptRejected = true;
      await writePrivate(privatePath, state);
    }
    if (!state.publicPrizeDecryptRejected) {
      if (!(await publicPrizeDecryptRejected(prizeHandle))) {
        throw new Error("Epoch prize became publicly decryptable");
      }
      state.publicPrizeDecryptRejected = true;
      await writePrivate(privatePath, state);
    }

    if (!state.winnerTokenBalanceBeforeClaim) {
      state.winnerTokenBalanceBeforeClaim = (
        await decryptOwner64(
          "winner pre-claim cUSDT decryption",
          (await token.confidentialBalanceOf(finalizedWinner)) as string,
          tokenAddress,
          winnerSigner,
        )
      ).toString();
      await writePrivate(privatePath, state);
    }
    claimReceipt = await sendOrResume(
      "winner confidential prize claim",
      state.claimTransaction,
      async (hash) => {
        state!.claimTransaction = hash;
        await writePrivate(privatePath, state!);
      },
      async () => {
        const winnerPool = pool.connect(winnerSigner) as any;
        const estimatedGas = await winnerPool.claimPrize.estimateGas(targetEpochId);
        return winnerPool.claimPrize(targetEpochId, {
          gasLimit: (estimatedGas * 3n) / 2n,
        });
      },
    );
    if (!state.privatePrizeClaimReconciled) {
      const tokenAfter = await decryptOwner64(
        "winner post-claim cUSDT decryption",
        (await token.confidentialBalanceOf(finalizedWinner)) as string,
        tokenAddress,
        winnerSigner,
      );
      if (tokenAfter !== BigInt(state.winnerTokenBalanceBeforeClaim) + BigInt(state.prizeValue)) {
        throw new Error("Winner confidential prize claim did not reconcile privately");
      }
      state.privatePrizeClaimReconciled = true;
      await writePrivate(privatePath, state);
    }
  }

  let openNextReceipt: any = null;
  const currentEpochId = BigInt(await pool.currentEpochId());
  if (currentEpochId === targetEpochId) {
    openNextReceipt = await sendOrResume(
      "next epoch opening",
      state.openNextTransaction,
      async (hash) => {
        state!.openNextTransaction = hash;
        await writePrivate(privatePath, state!);
      },
      async () => {
        const estimatedGas = await pool.openNextEpoch.estimateGas();
        return pool.openNextEpoch({ gasLimit: (estimatedGas * 3n) / 2n });
      },
    );
  } else if (currentEpochId === targetEpochId + 1n && state.openNextTransaction) {
    openNextReceipt = await canonicalReceipt(state.openNextTransaction);
  } else {
    throw new Error("Canonical current epoch does not match the recorded next-epoch transition");
  }
  if (BigInt(await pool.currentEpochId()) !== targetEpochId + 1n) {
    throw new Error("Next epoch did not open after terminal winner handling");
  }

  if (
    !freezeReceipt ||
    !requestReceipt ||
    !state.fulfillmentTransaction ||
    !syncReceipt ||
    !drawReceipt ||
    !state.drawGlobalHcu ||
    !state.drawSequentialHcu ||
    !state.winnerProofHash ||
    !state.clearWinner ||
    !openNextReceipt
  ) {
    throw new Error("Terminal epoch evidence is incomplete");
  }
  const fulfillmentReceipt = await canonicalReceipt(state.fulfillmentTransaction);
  const evidence = {
    schemaVersion: 1,
    product: "VeilSave",
    status: "PASS",
    network: "ethereum-sepolia",
    chainId: 11155111,
    recordedAt: new Date().toISOString(),
    epoch: {
      id: state.epochId,
      openedAt: state.openedAt,
      closesAt: state.closesAt,
      expectedOutcome: state.expectedOutcome,
      frozenSlotCount: state.frozenSlotCount,
      snapshotCommitment: state.snapshotCommitment,
      frozenOwnersMatchPrecheck: state.frozenOwnerCheckPassed === true,
      frozenWeightHandlesMatchPrecheck: state.frozenWeightHandleCheckPassed === true,
      freeze: receiptRecord(freezeReceipt),
      terminal: true,
    },
    vrf: {
      requestId: state.requestId,
      quoteWei: state.vrfQuoteWei,
      adapterBalanceBeforeRequestWei: state.adapterBalanceBeforeRequestWei,
      funding: state.fundingTransaction
        ? receiptRecord(await canonicalReceipt(state.fundingTransaction))
        : null,
      request: receiptRecord(requestReceipt),
      fulfillment: receiptRecord(fulfillmentReceipt),
      callbackGasUsed: state.callbackGasUsed,
      callbackStoresRandomnessOnly: state.callbackIsolationCheckPassed === true,
      randomWord: state.randomWord,
      sync: receiptRecord(syncReceipt),
      confirmations: 3,
      words: 1,
    },
    draw: {
      transaction: receiptRecord(drawReceipt),
      participantCapacity: PARTICIPANT_CAPACITY,
      globalHcu: state.drawGlobalHcu,
      maxSequentialDepthHcu: state.drawSequentialHcu,
      targetGlobalHcu: MAX_DRAW_GLOBAL_HCU,
      targetSequentialDepthHcu: MAX_DRAW_SEQUENTIAL_HCU,
      withinSafetyBudget: true,
      isolatedFromVrfCallback: true,
      winnerHandle: state.winnerHandle,
    },
    winner: {
      publicDecrypt: {
        clearWinner: state.clearWinner,
        proofHash: state.winnerProofHash,
        attempts: state.winnerPublicDecryptAttempts,
        latencyMs: state.winnerPublicDecryptLatencyMs,
      },
      aclGrantNotBeforeBlock: BigInt(winnerState[1]).toString(),
      earlyFinalizationRejected: state.earlyFinalizationRejected === true,
      wrongClearRejected: state.wrongClearRejected === true,
      wrongHandleRejected: targetEpochId === 1n ? null : state.wrongHandleRejected === true,
      wrongEpochRejected: state.wrongEpochRejected === true,
      finalize: receiptRecord(finalizeReceipt),
      replayRejected: state.replayRejected === true,
      finalizedWinner,
    },
    prizeAcl: {
      prizePubliclyDecryptable: false,
      winnerBeforeGrantRejected:
        finalizedWinner === ZeroAddress ? null : state.winnerBeforeGrantRejected === true,
      winnerDecryptionPassed: finalizedWinner === ZeroAddress ? null : Boolean(state.prizeValue),
      nonWinnerDecryptionRejected:
        finalizedWinner === ZeroAddress
          ? state.zeroWinnerParticipantDecryptRejected === true
          : state.nonWinnerDecryptRejected === true,
      publicDecryptionRejected: state.publicPrizeDecryptRejected === true,
      aclPropagationAttempts: finalizedWinner === ZeroAddress ? null : state.winnerDecryptAttempts,
      aclPropagationLatencyMs:
        finalizedWinner === ZeroAddress ? null : state.winnerDecryptLatencyMs,
      prizeAmountRecordedPublicly: false,
    },
    prizeClaim:
      finalizedWinner === ZeroAddress
        ? null
        : {
            transaction: claimReceipt ? receiptRecord(claimReceipt) : null,
            privateTokenReconciliation: state.privatePrizeClaimReconciled === true,
            prizeAmountRecordedPublicly: false,
          },
    nextEpoch: {
      id: (targetEpochId + 1n).toString(),
      opening: receiptRecord(openNextReceipt),
    },
    privacy: {
      participantPrincipalRecorded: false,
      participantWeightsRecorded: false,
      prizeAmountRecorded: false,
      decryptionProofRecorded: false,
      privateKeysRecordedPublicly: false,
      winnerAddressPublicByDesign: true,
    },
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: evidence.status,
        network: evidence.network,
        epochId: evidence.epoch.id,
        expectedOutcome: evidence.epoch.expectedOutcome,
        requestId: evidence.vrf.requestId,
        drawTransaction: evidence.draw.transaction.transactionHash,
        globalHcu: evidence.draw.globalHcu,
        maxSequentialDepthHcu: evidence.draw.maxSequentialDepthHcu,
        finalizedWinner: evidence.winner.finalizedWinner,
        prizeAcl: finalizedWinner === ZeroAddress ? "ZERO_WINNER_ROLL_FORWARD" : "WINNER_ONLY_PASS",
        nextEpochId: evidence.nextEpoch.id,
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
