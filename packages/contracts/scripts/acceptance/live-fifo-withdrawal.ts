import fs from "node:fs/promises";
import path from "node:path";

import { FhevmType } from "@fhevm/hardhat-plugin";
import { Contract, Wallet, ZeroHash, getAddress } from "ethers";
import * as hre from "hardhat";

type Draft = {
  chainId: number;
  configuration: { strategyMode: string };
  contracts: {
    confidentialPrizePool: { address: string };
    settlementController: { address: string };
    deterministicTestYieldVault: { address: string };
  };
  external: { confidentialToken: string };
};

type SecondParticipantState = {
  chainId: 11155111;
  participant: string;
  privateKey: string;
  pool: string;
  token: string;
  slot?: number;
};

type WithdrawalIntent = {
  participant: string;
  slot: number;
  amount: string;
  principalBefore: string;
  tokenBalanceBefore: string;
  requestTransaction?: string;
  withdrawalId?: string;
  initialQueuedRemainder?: string;
  routingTransaction?: string;
};

type SettlementIntent = {
  publicCap: string;
  startTransaction?: string;
  settlementId?: string;
  clearAggregate?: string;
  publicAssetsReceived?: string;
  finalizeTransaction?: string;
  retryTransaction?: string;
  publicDecryptAttempts?: number;
  publicDecryptLatencyMs?: number;
  wrongClearProofRejected?: boolean;
};

type PrivateState = {
  chainId: 11155111;
  pool: string;
  controller: string;
  strategy: string;
  token: string;
  epochId: string;
  epochClosesAt: string;
  expectedLiquidityAfterInvestment: string;
  investment: SettlementIntent | null;
  older: WithdrawalIntent;
  later: WithdrawalIntent;
  laterRoutingBlockedByOlder?: boolean;
  partialSettlement: SettlementIntent;
  finalSettlement: SettlementIntent;
  partialServiceTransaction?: string;
  partialCompletionTransaction?: string;
  olderFinalServiceTransaction?: string;
  olderFinalCompletionTransaction?: string;
  laterServiceTransaction?: string;
  laterCompletionTransaction?: string;
  olderRemainingAfterPartial?: string;
  laterRemainingBeforeFinal?: string;
  noFifoHeadAfterClaims?: boolean;
  duplicateCompletionRejected?: boolean;
};

type ReceiptRecord = {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
};

type Position = {
  participant: string;
  slot: number;
  signer: any;
  principal: bigint;
  tokenBalance: bigint;
};

const SLOT_ACTIVE = 2;
const EPOCH_OPEN = 1;
const WITHDRAWAL_ROUTING_PENDING = 1;
const WITHDRAWAL_QUEUED = 2;
const WITHDRAWAL_PAYOUT_STATUS_PENDING = 3;
const WITHDRAWAL_CLAIMED = 5;
const SETTLEMENT_AGGREGATE_PENDING = 1;
const SETTLEMENT_STRATEGY_PENDING = 2;
const SETTLEMENT_REWRAP_PENDING = 3;
const SETTLEMENT_FAILED_RETRYABLE = 5;
const SETTLEMENT_COMPLETED = 6;
const INVESTMENT_KIND = 1;
const REDEMPTION_KIND = 2;
const LIQUIDITY_TARGET_BPS = 2_000n;
const BPS_DENOMINATOR = 10_000n;
const MIN_RETAINED_PRINCIPAL = 100_000n;
const FIRST_QUEUED_REMAINDER = 150_000n;
const LATER_REQUEST_TARGET = 200_000n;
const MIN_LATER_REQUEST = 100_000n;
const PARTIAL_REDEMPTION_CAP = 50_000n;
const FINAL_REDEMPTION_CAP = 2_000_000n;
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

function clearUint64(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return BigInt(value);
  }
  if (typeof value === "string") return BigInt(value);
  throw new Error("Public aggregate proof returned an unsupported uint64 value");
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
  throw new Error("Public boolean proof returned an unsupported value");
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
  const dataCandidates = [
    candidate?.data,
    candidate?.error?.data,
    candidate?.info?.error?.data,
    candidate?.info?.error?.data?.data,
  ];
  for (const data of dataCandidates) {
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
  const result = await retry(label, 16, () =>
    hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, contractAddress, signer),
  );
  return result.value;
}

async function readPosition(
  pool: any,
  tokenAddress: string,
  token: any,
  signer: any,
): Promise<Position> {
  const participant = getAddress(await signer.getAddress());
  const [occupied, slotValue] = (await pool.slotOf(participant)) as [boolean, bigint];
  if (!occupied) throw new Error("A configured FIFO participant has no live pool slot");
  const slot = Number(slotValue);
  const slotState = await pool.slotPublic(slot);
  if (Number(slotState.status) !== SLOT_ACTIVE || BigInt(slotState.activeWithdrawalId) !== 0n) {
    throw new Error("FIFO initialization requires two idle active participant slots");
  }

  const principalHandle = (await pool.principalHandle(participant)) as string;
  const tokenHandle = (await token.confidentialBalanceOf(participant)) as string;
  if (principalHandle === ZeroHash) throw new Error("A FIFO participant has no principal handle");
  return {
    participant,
    slot,
    signer,
    principal: await decryptOwner64(
      "participant principal decryption",
      principalHandle,
      await pool.getAddress(),
      signer,
    ),
    tokenBalance: await decryptOwner64(
      "participant cUSDT decryption",
      tokenHandle,
      tokenAddress,
      signer,
    ),
  };
}

function validateState(
  state: PrivateState,
  pool: string,
  controller: string,
  strategy: string,
  token: string,
  primary: string,
  secondary: string,
): void {
  const participants = new Set([
    getAddress(state.older.participant),
    getAddress(state.later.participant),
  ]);
  if (
    state.chainId !== 11155111 ||
    getAddress(state.pool) !== pool ||
    getAddress(state.controller) !== controller ||
    getAddress(state.strategy) !== strategy ||
    getAddress(state.token) !== token ||
    participants.size !== 2 ||
    !participants.has(primary) ||
    !participants.has(secondary) ||
    BigInt(state.older.amount) <= 0n ||
    BigInt(state.later.amount) <= 0n ||
    BigInt(state.partialSettlement.publicCap) !== PARTIAL_REDEMPTION_CAP ||
    BigInt(state.finalSettlement.publicCap) !== FINAL_REDEMPTION_CAP
  ) {
    throw new Error("Private FIFO state does not match the live Sepolia deployment");
  }
}

async function publicDecrypt64(
  label: string,
  handle: `0x${string}`,
): Promise<{ clear: bigint; proof: string; attempts: number; latencyMs: number }> {
  if (handle === ZeroHash) throw new Error(`${label} handle is not ready`);
  const started = Date.now();
  const result = await retry(label, 20, () => hre.fhevm.publicDecrypt([handle]));
  return {
    clear: clearUint64(result.value.clearValues[handle]),
    proof: result.value.decryptionProof,
    attempts: result.attempts,
    latencyMs: Date.now() - started,
  };
}

async function publicDecryptBool(
  label: string,
  handle: `0x${string}`,
): Promise<{ clear: boolean; proof: string }> {
  if (handle === ZeroHash) throw new Error(`${label} handle is not ready`);
  const result = await retry(label, 20, () => hre.fhevm.publicDecrypt([handle]));
  return {
    clear: clearBoolean(result.value.clearValues[handle]),
    proof: result.value.decryptionProof,
  };
}

async function main(): Promise<void> {
  const draftPath = path.resolve(required("DEPLOYMENT_DRAFT_PATH"));
  const draft = JSON.parse(await fs.readFile(draftPath, "utf8")) as Draft;
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 11155111n || draft.chainId !== 11155111) {
    throw new Error(`Refusing live acceptance on chain ${network.chainId}`);
  }
  if (draft.configuration.strategyMode !== "TEST_YIELD") {
    throw new Error("Live FIFO acceptance requires the explicitly labeled TEST_YIELD strategy");
  }

  const [coordinator] = await hre.ethers.getSigners();
  if (!coordinator) throw new Error("No Sepolia acceptance signer is configured");

  const poolAddress = getAddress(draft.contracts.confidentialPrizePool.address);
  const controllerAddress = getAddress(draft.contracts.settlementController.address);
  const strategyAddress = getAddress(draft.contracts.deterministicTestYieldVault.address);
  const tokenAddress = getAddress(draft.external.confidentialToken);
  const deploymentDir = path.dirname(draftPath);
  const repositoryRoot = path.resolve(deploymentDir, "../../..");
  const privateDir = path.join(repositoryRoot, "evidence/private");
  const secondParticipantPath = path.join(privateDir, "live-second-participant.json");
  const privatePath = path.join(privateDir, "live-fifo-withdrawal-state.json");
  const evidencePath = path.join(deploymentDir, "live-fifo-withdrawal-evidence.json");

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
    throw new Error("Second-participant private state is not bound to this deployment");
  }

  const pool: any = await hre.ethers.getContractAt(
    "ConfidentialPrizePool",
    poolAddress,
    coordinator,
  );
  const controller: any = await hre.ethers.getContractAt(
    "SettlementController",
    controllerAddress,
    coordinator,
  );
  const strategy: any = await hre.ethers.getContractAt(
    "DeterministicTestYieldVault",
    strategyAddress,
    coordinator,
  );
  const token: any = new Contract(
    tokenAddress,
    [
      "function confidentialBalanceOf(address account) view returns (bytes32)",
      "function unwrapAmount(bytes32 requestId) view returns (bytes32)",
    ],
    coordinator,
  );

  if (!(await pool.active())) throw new Error("Pool is not active");
  if ((await strategy.yieldMode()) !== 0n)
    throw new Error("Strategy does not report TEST YIELD mode");
  if (await controller.lossMode()) throw new Error("Controller is in loss mode");
  if (await controller.investmentsPaused()) throw new Error("Controller investments are paused");

  await retry("Zama SDK initialization", 8, async () => {
    await hre.fhevm.initializeCLIApi();
    return true;
  });

  let state = await readJson<PrivateState>(privatePath);
  if (!state) {
    if (
      (await pool.activeSettlementId()) !== 0n ||
      (await controller.activeSettlementId()) !== 0n
    ) {
      throw new Error("An unrecorded settlement is active; refusing a new FIFO intent");
    }
    const [headId] = await pool.fifoHead();
    if (BigInt(headId) !== 0n) {
      throw new Error("An unrecorded FIFO withdrawal exists; refusing a new FIFO intent");
    }

    const epochId = BigInt(await pool.currentEpochId());
    const epoch = await pool.epochPublic(epochId);
    if (Number(epoch.status) !== EPOCH_OPEN) {
      throw new Error("FIFO initialization requires the current epoch to remain OPEN");
    }

    const primary = await readPosition(pool, tokenAddress, token, coordinator);
    const secondary = await readPosition(pool, tokenAddress, token, secondaryWallet);
    const totalPrincipal = primary.principal + secondary.principal;
    const deployedPrincipal = BigInt(await controller.deployedPrincipal());
    if (deployedPrincipal > totalPrincipal) {
      throw new Error("Public deployed-principal cost basis exceeds private participant principal");
    }
    const currentLiquidity = totalPrincipal - deployedPrincipal;
    const liquidityTarget = (totalPrincipal * LIQUIDITY_TARGET_BPS) / BPS_DENOMINATOR;
    const investmentCap =
      currentLiquidity > liquidityTarget ? currentLiquidity - liquidityTarget : 0n;
    const expectedLiquidity = currentLiquidity - investmentCap;

    const candidates = [primary, secondary]
      .map((position) => ({
        position,
        available:
          position.principal > MIN_RETAINED_PRINCIPAL
            ? position.principal - MIN_RETAINED_PRINCIPAL
            : 0n,
      }))
      .filter(({ available }) => available >= expectedLiquidity + FIRST_QUEUED_REMAINDER)
      .sort((left, right) => (left.available > right.available ? -1 : 1));
    const selected = candidates[0];
    if (!selected) {
      throw new Error("Neither participant can create a queued request while preserving principal");
    }
    const olderPosition = selected.position;
    const laterPosition = olderPosition.participant === primary.participant ? secondary : primary;
    const laterAvailable =
      laterPosition.principal > MIN_RETAINED_PRINCIPAL
        ? laterPosition.principal - MIN_RETAINED_PRINCIPAL
        : 0n;
    const laterAmount =
      laterAvailable > LATER_REQUEST_TARGET ? LATER_REQUEST_TARGET : laterAvailable;
    if (laterAmount < MIN_LATER_REQUEST) {
      throw new Error("The later participant cannot preserve principal and exercise FIFO");
    }

    state = {
      chainId: 11155111,
      pool: poolAddress,
      controller: controllerAddress,
      strategy: strategyAddress,
      token: tokenAddress,
      epochId: epochId.toString(),
      epochClosesAt: BigInt(epoch.closesAt).toString(),
      expectedLiquidityAfterInvestment: expectedLiquidity.toString(),
      investment:
        investmentCap === 0n
          ? null
          : {
              publicCap: investmentCap.toString(),
            },
      older: {
        participant: olderPosition.participant,
        slot: olderPosition.slot,
        amount: (expectedLiquidity + FIRST_QUEUED_REMAINDER).toString(),
        principalBefore: olderPosition.principal.toString(),
        tokenBalanceBefore: olderPosition.tokenBalance.toString(),
      },
      later: {
        participant: laterPosition.participant,
        slot: laterPosition.slot,
        amount: laterAmount.toString(),
        principalBefore: laterPosition.principal.toString(),
        tokenBalanceBefore: laterPosition.tokenBalance.toString(),
      },
      partialSettlement: { publicCap: PARTIAL_REDEMPTION_CAP.toString() },
      finalSettlement: { publicCap: FINAL_REDEMPTION_CAP.toString() },
    };
    await writePrivate(privatePath, state);
  }

  validateState(
    state,
    poolAddress,
    controllerAddress,
    strategyAddress,
    tokenAddress,
    primaryAddress,
    secondaryAddress,
  );

  const signerFor = (participant: string): any =>
    getAddress(participant) === primaryAddress ? coordinator : secondaryWallet;

  const investmentReceiptRecords: {
    start: ReceiptRecord;
    finalize: ReceiptRecord | null;
  } | null = state.investment ? { start: null as never, finalize: null } : null;

  if (state.investment) {
    let investmentStartReceipt: any;
    if (state.investment.startTransaction) {
      investmentStartReceipt = await canonicalReceipt(state.investment.startTransaction);
    } else {
      if (
        (await pool.activeSettlementId()) !== 0n ||
        (await controller.activeSettlementId()) !== 0n
      ) {
        throw new Error("An unrecorded settlement appeared before FIFO liquidity preparation");
      }
      const cap = BigInt(state.investment.publicCap);
      investmentStartReceipt = await sendOrResume(
        "FIFO liquidity-preparation investment",
        state.investment.startTransaction,
        async (hash) => {
          state!.investment!.startTransaction = hash;
          await writePrivate(privatePath, state!);
        },
        async () => {
          const estimatedGas = await pool.beginInvestmentSettlement.estimateGas(cap);
          return pool.beginInvestmentSettlement(cap, { gasLimit: (estimatedGas * 3n) / 2n });
        },
      );
    }
    if (investmentStartReceipt.status !== 1) throw new Error("Liquidity preparation reverted");
    investmentReceiptRecords!.start = receiptRecord(investmentStartReceipt);

    if (!state.investment.settlementId) {
      const started = findEvent(controller, investmentStartReceipt, "SettlementStarted");
      if (!started || Number(started.args.kind) !== INVESTMENT_KIND) {
        throw new Error("Liquidity preparation has no bound investment settlement event");
      }
      state.investment.settlementId = BigInt(started.args.settlementId).toString();
      await writePrivate(privatePath, state);
    }

    const settlementId = BigInt(state.investment.settlementId);
    let settlement = await controller.settlementPublic(settlementId);
    if (Number(settlement.status) === SETTLEMENT_AGGREGATE_PENDING) {
      const handle = settlement.aggregateHandle as `0x${string}`;
      const reveal = await publicDecrypt64("FIFO investment aggregate decryption", handle);
      if (reveal.clear !== BigInt(state.investment.publicCap)) {
        throw new Error("Liquidity-preparation aggregate differs from its fixed public cap");
      }
      if (
        state.investment.clearAggregate &&
        BigInt(state.investment.clearAggregate) !== reveal.clear
      ) {
        throw new Error("Recovered investment aggregate differs from private acceptance state");
      }
      state.investment.clearAggregate = reveal.clear.toString();
      state.investment.publicDecryptAttempts = reveal.attempts;
      state.investment.publicDecryptLatencyMs = reveal.latencyMs;
      await writePrivate(privatePath, state);

      const finalizeReceipt = await sendOrResume(
        "FIFO investment aggregate finalization",
        state.investment.finalizeTransaction,
        async (hash) => {
          state!.investment!.finalizeTransaction = hash;
          await writePrivate(privatePath, state!);
        },
        async () => {
          const args = [settlementId, reveal.clear, reveal.proof] as const;
          const estimatedGas = await controller.finalizeInvestmentAggregate.estimateGas(...args);
          return controller.finalizeInvestmentAggregate(...args, {
            gasLimit: (estimatedGas * 3n) / 2n,
          });
        },
      );
      investmentReceiptRecords!.finalize = receiptRecord(finalizeReceipt);
      settlement = await controller.settlementPublic(settlementId);
    } else if (state.investment.finalizeTransaction) {
      investmentReceiptRecords!.finalize = receiptRecord(
        await canonicalReceipt(state.investment.finalizeTransaction),
      );
    }
    if (Number(settlement.status) !== SETTLEMENT_COMPLETED) {
      throw new Error(
        `Liquidity-preparation investment is not complete; status=${settlement.status}`,
      );
    }
  }

  if ((await pool.activeSettlementId()) !== 0n || (await controller.activeSettlementId()) !== 0n) {
    throw new Error("Liquidity preparation did not clear active settlement state");
  }

  async function ensureWithdrawal(intent: WithdrawalIntent, label: string): Promise<any> {
    const signer = signerFor(intent.participant);
    const participantPool = pool.connect(signer) as any;
    let receipt: any;
    if (intent.requestTransaction) {
      receipt = await canonicalReceipt(intent.requestTransaction);
      if (receipt.status !== 1) throw new Error(`Recorded ${label} request reverted`);
    } else {
      const slot = await pool.slotPublic(intent.slot);
      if (
        getAddress(slot.owner) !== getAddress(intent.participant) ||
        Number(slot.status) !== SLOT_ACTIVE ||
        BigInt(slot.activeWithdrawalId) !== 0n
      ) {
        throw new Error(`An unrecorded active withdrawal appeared for the ${label} participant`);
      }
      const encrypted = await retry(`${label} encrypted withdrawal input`, 8, async () => {
        const input = hre.fhevm.createEncryptedInput(poolAddress, intent.participant);
        input.add64(BigInt(intent.amount));
        return input.encrypt();
      });
      const args = [encrypted.value.handles[0], encrypted.value.inputProof, false] as const;
      receipt = await sendOrResume(
        `${label} withdrawal request`,
        intent.requestTransaction,
        async (hash) => {
          intent.requestTransaction = hash;
          await writePrivate(privatePath, state!);
        },
        async () => {
          const estimatedGas = await participantPool.requestWithdrawal.estimateGas(...args);
          return participantPool.requestWithdrawal(...args, {
            gasLimit: (estimatedGas * 3n) / 2n,
          });
        },
      );
    }

    if (!intent.withdrawalId) {
      const requested = findEvent(pool, receipt, "WithdrawalRequested");
      if (
        !requested ||
        getAddress(requested.args.owner) !== getAddress(intent.participant) ||
        Number(requested.args.slot) !== intent.slot
      ) {
        throw new Error(`${label} withdrawal request event is missing or mismatched`);
      }
      intent.withdrawalId = BigInt(requested.args.requestId).toString();
      await writePrivate(privatePath, state!);
    }

    const withdrawalId = BigInt(intent.withdrawalId);
    const ticket = await pool.withdrawalPublic(withdrawalId);
    if (
      getAddress(ticket.owner) !== getAddress(intent.participant) ||
      Number(ticket.slot) !== intent.slot
    ) {
      throw new Error(`${label} withdrawal ticket is not bound to its private intent`);
    }
    if (!intent.initialQueuedRemainder) {
      if (![WITHDRAWAL_ROUTING_PENDING, WITHDRAWAL_QUEUED].includes(Number(ticket.status))) {
        throw new Error(`${label} queued remainder was not recorded before ticket progression`);
      }
      const handle = (await pool.withdrawalHandle(withdrawalId)) as string;
      const remaining = await decryptOwner64(
        `${label} queued-claim decryption`,
        handle,
        poolAddress,
        signer,
      );
      if (remaining <= 0n) throw new Error(`${label} withdrawal did not enter the FIFO route`);
      intent.initialQueuedRemainder = remaining.toString();
      await writePrivate(privatePath, state!);
    }
    return receipt;
  }

  const olderRequestReceipt = await ensureWithdrawal(state.older, "older");
  const laterRequestReceipt = await ensureWithdrawal(state.later, "later");
  const olderId = BigInt(state.older.withdrawalId!);
  const laterId = BigInt(state.later.withdrawalId!);
  const olderTicketAtRequest = await pool.withdrawalPublic(olderId);
  const laterTicketAtRequest = await pool.withdrawalPublic(laterId);
  if (BigInt(olderTicketAtRequest.fifoSequence) >= BigInt(laterTicketAtRequest.fifoSequence)) {
    throw new Error("Withdrawal request-time FIFO sequences are not strictly ordered");
  }

  async function routeQueued(intent: WithdrawalIntent, label: string): Promise<any> {
    const withdrawalId = BigInt(intent.withdrawalId!);
    let ticket = await pool.withdrawalPublic(withdrawalId);
    let receipt: any = null;
    if (Number(ticket.status) === WITHDRAWAL_ROUTING_PENDING) {
      const reveal = await publicDecryptBool(
        `${label} withdrawal routing decryption`,
        ticket.routingHandle as `0x${string}`,
      );
      if (!reveal.clear) throw new Error(`${label} withdrawal unexpectedly settled immediately`);
      receipt = await sendOrResume(
        `${label} queued routing finalization`,
        intent.routingTransaction,
        async (hash) => {
          intent.routingTransaction = hash;
          await writePrivate(privatePath, state!);
        },
        async () => {
          const args = [withdrawalId, true, reveal.proof] as const;
          const estimatedGas = await pool.finalizeWithdrawalRouting.estimateGas(...args);
          return pool.finalizeWithdrawalRouting(...args, {
            gasLimit: (estimatedGas * 3n) / 2n,
          });
        },
      );
      ticket = await pool.withdrawalPublic(withdrawalId);
    } else if (intent.routingTransaction) {
      receipt = await canonicalReceipt(intent.routingTransaction);
    }
    if (
      ![WITHDRAWAL_QUEUED, WITHDRAWAL_PAYOUT_STATUS_PENDING, WITHDRAWAL_CLAIMED].includes(
        Number(ticket.status),
      )
    ) {
      throw new Error(`${label} withdrawal is not queued; status=${ticket.status}`);
    }
    return receipt;
  }

  const laterRoutingReceipt = await routeQueued(state.later, "later");
  if (!state.laterRoutingBlockedByOlder) {
    const [headId, headStatus] = await pool.fifoHead();
    if (BigInt(headId) !== olderId || Number(headStatus) !== WITHDRAWAL_ROUTING_PENDING) {
      throw new Error("The older request is not the routing-pending FIFO head");
    }
    await expectCustomError(
      "later FIFO service while older routing is pending",
      "OlderWithdrawalRoutingPending",
      pool,
      () => pool.serviceFifoHead.staticCall(),
    );
    state.laterRoutingBlockedByOlder = true;
    await writePrivate(privatePath, state);
  }
  const olderRoutingReceipt = await routeQueued(state.older, "older");
  if (!state.partialSettlement.startTransaction) {
    const [headAfterRouting, headStatusAfterRouting] = await pool.fifoHead();
    if (
      BigInt(headAfterRouting) !== olderId ||
      Number(headStatusAfterRouting) !== WITHDRAWAL_QUEUED
    ) {
      throw new Error("Request-time FIFO did not preserve the older queued head");
    }
  }

  async function runRedemption(
    intent: SettlementIntent,
    label: string,
    requireExactCap: boolean,
    testWrongClear: boolean,
  ): Promise<{ start: any; finalize: any; settlement: any }> {
    const cap = BigInt(intent.publicCap);
    let startReceipt: any;
    if (intent.startTransaction) {
      startReceipt = await canonicalReceipt(intent.startTransaction);
      if (startReceipt.status !== 1) throw new Error(`Recorded ${label} start reverted`);
    } else {
      if (
        (await pool.activeSettlementId()) !== 0n ||
        (await controller.activeSettlementId()) !== 0n
      ) {
        throw new Error(`An unrecorded settlement appeared before ${label}`);
      }
      startReceipt = await sendOrResume(
        `${label} start`,
        intent.startTransaction,
        async (hash) => {
          intent.startTransaction = hash;
          await writePrivate(privatePath, state!);
        },
        async () => {
          const estimatedGas = await pool.beginWithdrawalSettlement.estimateGas(cap);
          return pool.beginWithdrawalSettlement(cap, {
            gasLimit: (estimatedGas * 3n) / 2n,
          });
        },
      );
    }

    if (!intent.settlementId) {
      const started = findEvent(controller, startReceipt, "SettlementStarted");
      if (!started || Number(started.args.kind) !== REDEMPTION_KIND) {
        throw new Error(`${label} has no bound principal-redemption event`);
      }
      intent.settlementId = BigInt(started.args.settlementId).toString();
      await writePrivate(privatePath, state!);
    }

    const settlementId = BigInt(intent.settlementId);
    let settlement = await controller.settlementPublic(settlementId);
    let finalizeReceipt: any = null;
    if (Number(settlement.status) === SETTLEMENT_AGGREGATE_PENDING) {
      const reveal = await publicDecrypt64(
        `${label} aggregate public decryption`,
        settlement.aggregateHandle as `0x${string}`,
      );
      if (reveal.clear <= 0n || reveal.clear > cap || (requireExactCap && reveal.clear !== cap)) {
        throw new Error(
          `${label} aggregate is zero, exceeds its cap, or is not the expected partial cap`,
        );
      }
      if (intent.clearAggregate && BigInt(intent.clearAggregate) !== reveal.clear) {
        throw new Error(`${label} aggregate differs from its recorded proof-bound value`);
      }
      intent.clearAggregate = reveal.clear.toString();
      intent.publicDecryptAttempts = reveal.attempts;
      intent.publicDecryptLatencyMs = reveal.latencyMs;
      await writePrivate(privatePath, state!);

      if (testWrongClear && !intent.wrongClearProofRejected) {
        const wrongClear = reveal.clear === 0n ? 1n : reveal.clear - 1n;
        await expectRevert(`${label} wrong-clear proof replay`, () =>
          controller.finalizePrincipalRedemption.staticCall(settlementId, wrongClear, reveal.proof),
        );
        const unchanged = await controller.settlementPublic(settlementId);
        if (Number(unchanged.status) !== SETTLEMENT_AGGREGATE_PENDING) {
          throw new Error(`${label} changed state after a rejected wrong-clear proof`);
        }
        intent.wrongClearProofRejected = true;
        await writePrivate(privatePath, state!);
      }

      finalizeReceipt = await sendOrResume(
        `${label} aggregate finalization`,
        intent.finalizeTransaction,
        async (hash) => {
          intent.finalizeTransaction = hash;
          await writePrivate(privatePath, state!);
        },
        async () => {
          const args = [settlementId, reveal.clear, reveal.proof] as const;
          const estimatedGas = await controller.finalizePrincipalRedemption.estimateGas(...args);
          return controller.finalizePrincipalRedemption(...args, {
            gasLimit: (estimatedGas * 3n) / 2n,
          });
        },
      );
      settlement = await controller.settlementPublic(settlementId);
    } else if (intent.finalizeTransaction) {
      finalizeReceipt = await canonicalReceipt(intent.finalizeTransaction);
    }

    if (
      [
        SETTLEMENT_STRATEGY_PENDING,
        SETTLEMENT_REWRAP_PENDING,
        SETTLEMENT_FAILED_RETRYABLE,
      ].includes(Number(settlement.status))
    ) {
      const retryReceipt = await sendOrResume(
        `${label} same-settlement retry`,
        intent.retryTransaction,
        async (hash) => {
          intent.retryTransaction = hash;
          await writePrivate(privatePath, state!);
        },
        async () => {
          const estimatedGas = await controller.executeSettlement.estimateGas(settlementId);
          return controller.executeSettlement(settlementId, {
            gasLimit: (estimatedGas * 3n) / 2n,
          });
        },
      );
      if (!finalizeReceipt) finalizeReceipt = retryReceipt;
      settlement = await controller.settlementPublic(settlementId);
    }

    if (Number(settlement.status) !== SETTLEMENT_COMPLETED) {
      throw new Error(`${label} is not complete; status=${settlement.status}`);
    }
    if (
      (await pool.activeSettlementId()) !== 0n ||
      (await controller.activeSettlementId()) !== 0n
    ) {
      throw new Error(`${label} completed without clearing active settlement state`);
    }
    intent.publicAssetsReceived = BigInt(settlement.publicAssetsReceived).toString();
    await writePrivate(privatePath, state!);
    return { start: startReceipt, finalize: finalizeReceipt, settlement };
  }

  async function serviceAndFinalize(
    intent: WithdrawalIntent,
    label: string,
    expectedComplete: boolean,
    serviceField: keyof PrivateState,
    completionField: keyof PrivateState,
  ): Promise<{ service: any; completion: any }> {
    const withdrawalId = BigInt(intent.withdrawalId!);
    let ticket = await pool.withdrawalPublic(withdrawalId);
    const serviceHash = state![serviceField] as string | undefined;
    const completionHash = state![completionField] as string | undefined;
    if (completionHash) {
      if (!serviceHash) throw new Error(`${label} completion exists without its service intent`);
      const serviceReceipt = await canonicalReceipt(serviceHash);
      const completionReceipt = await canonicalReceipt(completionHash);
      const acceptableStatuses = expectedComplete
        ? [WITHDRAWAL_CLAIMED]
        : [WITHDRAWAL_QUEUED, WITHDRAWAL_PAYOUT_STATUS_PENDING, WITHDRAWAL_CLAIMED];
      if (!acceptableStatuses.includes(Number(ticket.status))) {
        throw new Error(`${label} resumed at incompatible status ${ticket.status}`);
      }
      return { service: serviceReceipt, completion: completionReceipt };
    }

    const [headId] = await pool.fifoHead();
    if (BigInt(headId) !== withdrawalId) {
      throw new Error(`${label} is not the canonical FIFO head`);
    }

    let serviceReceipt: any;
    if (Number(ticket.status) === WITHDRAWAL_QUEUED) {
      serviceReceipt = await sendOrResume(
        `${label} FIFO service`,
        serviceHash,
        async (hash) => {
          (state! as Record<string, unknown>)[serviceField] = hash;
          await writePrivate(privatePath, state!);
        },
        async () => {
          const estimatedGas = await pool.serviceFifoHead.estimateGas();
          return pool.serviceFifoHead({ gasLimit: (estimatedGas * 3n) / 2n });
        },
      );
      ticket = await pool.withdrawalPublic(withdrawalId);
    } else {
      if (!serviceHash) throw new Error(`${label} advanced without a recorded FIFO service intent`);
      serviceReceipt = await canonicalReceipt(serviceHash);
    }
    if (Number(ticket.status) !== WITHDRAWAL_PAYOUT_STATUS_PENDING) {
      throw new Error(`${label} did not enter payout-proof pending state`);
    }

    const reveal = await publicDecryptBool(
      `${label} completion public decryption`,
      ticket.completionHandle as `0x${string}`,
    );
    if (reveal.clear !== expectedComplete) {
      throw new Error(`${label} completion proof differs from the expected partial/full result`);
    }

    const completionReceipt = await sendOrResume(
      `${label} completion finalization`,
      completionHash,
      async (hash) => {
        (state! as Record<string, unknown>)[completionField] = hash;
        await writePrivate(privatePath, state!);
      },
      async () => {
        const args = [withdrawalId, expectedComplete, reveal.proof] as const;
        const estimatedGas = await pool.finalizeWithdrawalCompletion.estimateGas(...args);
        return pool.finalizeWithdrawalCompletion(...args, {
          gasLimit: (estimatedGas * 3n) / 2n,
        });
      },
    );
    ticket = await pool.withdrawalPublic(withdrawalId);
    const expectedStatus = expectedComplete ? WITHDRAWAL_CLAIMED : WITHDRAWAL_QUEUED;
    if (Number(ticket.status) !== expectedStatus) {
      throw new Error(`${label} completion finalized to status ${ticket.status}`);
    }
    return { service: serviceReceipt, completion: completionReceipt };
  }

  const partial = await runRedemption(
    state.partialSettlement,
    "partial FIFO redemption",
    true,
    true,
  );
  const partialClaim = await serviceAndFinalize(
    state.older,
    "older partial claim",
    false,
    "partialServiceTransaction",
    "partialCompletionTransaction",
  );

  const olderSigner = signerFor(state.older.participant);
  const laterSigner = signerFor(state.later.participant);
  if (!state.olderRemainingAfterPartial || !state.laterRemainingBeforeFinal) {
    const olderRemaining = await decryptOwner64(
      "older post-partial claim decryption",
      (await pool.withdrawalHandle(olderId)) as string,
      poolAddress,
      olderSigner,
    );
    if (olderRemaining !== BigInt(state.older.initialQueuedRemainder!) - PARTIAL_REDEMPTION_CAP) {
      throw new Error("Partial settlement did not reduce only the older claim by its public cap");
    }
    const laterRemaining = await decryptOwner64(
      "later untouched claim decryption",
      (await pool.withdrawalHandle(laterId)) as string,
      poolAddress,
      laterSigner,
    );
    if (laterRemaining !== BigInt(state.later.initialQueuedRemainder!)) {
      throw new Error("Partial settlement changed the later FIFO claim");
    }
    state.olderRemainingAfterPartial = olderRemaining.toString();
    state.laterRemainingBeforeFinal = laterRemaining.toString();
    await writePrivate(privatePath, state);
  }
  const olderRemainingAfterPartial = BigInt(state.olderRemainingAfterPartial);
  const laterRemainingBeforeFinal = BigInt(state.laterRemainingBeforeFinal);

  const finalRedemption = await runRedemption(
    state.finalSettlement,
    "final aggregate FIFO redemption",
    false,
    false,
  );
  const olderFinalClaim = await serviceAndFinalize(
    state.older,
    "older final claim",
    true,
    "olderFinalServiceTransaction",
    "olderFinalCompletionTransaction",
  );
  if (!state.laterCompletionTransaction) {
    const [headAfterOlder] = await pool.fifoHead();
    if (BigInt(headAfterOlder) !== laterId) {
      throw new Error("Later request did not become head only after the older request completed");
    }
  }
  const laterFinalClaim = await serviceAndFinalize(
    state.later,
    "later final claim",
    true,
    "laterServiceTransaction",
    "laterCompletionTransaction",
  );
  if (olderFinalClaim.completion.blockNumber >= laterFinalClaim.service.blockNumber) {
    throw new Error("Later FIFO service was mined before the older request became terminal");
  }

  if (!state.noFifoHeadAfterClaims) {
    await expectCustomError("FIFO service after all claims", "NoFifoWithdrawal", pool, () =>
      pool.serviceFifoHead.staticCall(),
    );
    state.noFifoHeadAfterClaims = true;
    await writePrivate(privatePath, state);
  }
  if (!state.duplicateCompletionRejected) {
    await expectCustomError(
      "duplicate older withdrawal completion",
      "WrongWithdrawalState",
      pool,
      () => pool.finalizeWithdrawalCompletion.staticCall(olderId, true, "0x"),
    );
    state.duplicateCompletionRejected = true;
    await writePrivate(privatePath, state);
  }

  const [finalHead] = await pool.fifoHead();
  if (BigInt(finalHead) !== 0n) throw new Error("FIFO head remains after both claims completed");

  async function verifyFinalPosition(intent: WithdrawalIntent, label: string): Promise<void> {
    const signer = signerFor(intent.participant);
    const slot = await pool.slotPublic(intent.slot);
    if (
      getAddress(slot.owner) !== getAddress(intent.participant) ||
      Number(slot.status) !== SLOT_ACTIVE ||
      BigInt(slot.activeWithdrawalId) !== 0n
    ) {
      throw new Error(`${label} slot is not active and idle after FIFO completion`);
    }
    const principal = await decryptOwner64(
      `${label} final principal decryption`,
      (await pool.principalHandle(intent.participant)) as string,
      poolAddress,
      signer,
    );
    const tokenBalance = await decryptOwner64(
      `${label} final cUSDT decryption`,
      (await token.confidentialBalanceOf(intent.participant)) as string,
      tokenAddress,
      signer,
    );
    const [eligibleHandle, pendingHandle] = await pool.weightHandles(intent.participant);
    const eligible = await decryptOwner64(
      `${label} final eligible-weight decryption`,
      eligibleHandle as string,
      poolAddress,
      signer,
    );
    const pending = await decryptOwner64(
      `${label} final pending-weight decryption`,
      pendingHandle as string,
      poolAddress,
      signer,
    );
    const expectedPrincipal = BigInt(intent.principalBefore) - BigInt(intent.amount);
    if (
      principal !== expectedPrincipal ||
      principal < MIN_RETAINED_PRINCIPAL ||
      tokenBalance !== BigInt(intent.tokenBalanceBefore) + BigInt(intent.amount) ||
      eligible !== 0n ||
      pending !== expectedPrincipal
    ) {
      throw new Error(`${label} private principal/token/weight reconciliation failed`);
    }
  }

  await verifyFinalPosition(state.older, "older participant");
  await verifyFinalPosition(state.later, "later participant");

  const epochId = BigInt(state.epochId);
  const finalEpoch = await pool.epochPublic(epochId);
  if (
    BigInt(await pool.currentEpochId()) !== epochId ||
    Number(finalEpoch.status) !== EPOCH_OPEN ||
    BigInt(finalEpoch.closesAt) !== BigInt(state.epochClosesAt)
  ) {
    throw new Error("FIFO acceptance changed the canonical open epoch schedule");
  }

  const finalSettlementClear = BigInt(state.finalSettlement.clearAggregate!);
  const expectedFinalAggregate =
    olderRemainingAfterPartial + BigInt(state.later.initialQueuedRemainder!);
  if (finalSettlementClear !== expectedFinalAggregate) {
    throw new Error("Final public aggregate did not equal the remaining encrypted FIFO debt");
  }

  const publicSettlement = (intent: SettlementIntent, run: any) => ({
    settlementId: intent.settlementId,
    publicCap: intent.publicCap,
    clearAggregate: intent.clearAggregate,
    publicAssetsReceived: intent.publicAssetsReceived,
    start: receiptRecord(run.start),
    finalize: run.finalize ? receiptRecord(run.finalize) : null,
  });

  const evidence = {
    schemaVersion: 1,
    product: "VeilSave",
    status: "PASS",
    network: "ethereum-sepolia",
    chainId: 11155111,
    recordedAt: new Date().toISOString(),
    mode: "TEST_YIELD",
    disclosure: "Sepolia TEST YIELD acceptance; no mainnet or organic-yield claim.",
    pool: poolAddress,
    controller: controllerAddress,
    strategy: strategyAddress,
    confidentialToken: tokenAddress,
    epoch: {
      id: state.epochId,
      status: "OPEN",
      closesAt: state.epochClosesAt,
      scheduleUnchanged: true,
    },
    liquidityPreparation: state.investment
      ? {
          settlementId: state.investment.settlementId,
          publicCap: state.investment.publicCap,
          clearAggregate: state.investment.clearAggregate,
          start: investmentReceiptRecords?.start,
          finalize: investmentReceiptRecords?.finalize,
        }
      : null,
    withdrawals: {
      older: {
        requestId: state.older.withdrawalId,
        slot: state.older.slot,
        participant: state.older.participant,
        fifoSequence: BigInt(olderTicketAtRequest.fifoSequence).toString(),
        request: receiptRecord(olderRequestReceipt),
        routing: olderRoutingReceipt ? receiptRecord(olderRoutingReceipt) : null,
        amountRecordedPublicly: false,
      },
      later: {
        requestId: state.later.withdrawalId,
        slot: state.later.slot,
        participant: state.later.participant,
        fifoSequence: BigInt(laterTicketAtRequest.fifoSequence).toString(),
        request: receiptRecord(laterRequestReceipt),
        routing: laterRoutingReceipt ? receiptRecord(laterRoutingReceipt) : null,
        amountRecordedPublicly: false,
      },
      routingProofOrder: [state.later.withdrawalId, state.older.withdrawalId],
      laterServiceBlockedUntilOlderRouting: state.laterRoutingBlockedByOlder === true,
      requestTimePriorityPreserved: true,
    },
    settlements: {
      partial: publicSettlement(state.partialSettlement, partial),
      aggregateFinal: publicSettlement(state.finalSettlement, finalRedemption),
      aggregateAmountsPublicByDesign: true,
      wrongClearProofRejected: state.partialSettlement.wrongClearProofRejected === true,
      sameSettlementFinalizedAfterRejectedProof: true,
      resumableWithoutReplacementIntent: true,
    },
    claims: {
      olderPartial: {
        service: receiptRecord(partialClaim.service),
        completion: receiptRecord(partialClaim.completion),
        terminal: false,
      },
      olderFinal: {
        service: receiptRecord(olderFinalClaim.service),
        completion: receiptRecord(olderFinalClaim.completion),
        terminal: true,
      },
      laterFinal: {
        service: receiptRecord(laterFinalClaim.service),
        completion: receiptRecord(laterFinalClaim.completion),
        terminal: true,
      },
      olderCompletedBeforeLater: true,
      noFifoHeadAfterClaims: state.noFifoHeadAfterClaims === true,
      duplicateCompletionRejected: state.duplicateCompletionRejected === true,
      privatePrincipalTokenWeightReconciliation: true,
      bothSlotsRemainActiveForEpoch2: true,
    },
    privacy: {
      individualWithdrawalAmountsRecorded: false,
      individualPrincipalRecorded: false,
      individualWeightsRecorded: false,
      ciphertextHandlesRecorded: false,
      inputProofsRecorded: false,
      privateKeysRecordedPublicly: false,
      aggregateSettlementLeakageAcknowledged: true,
    },
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: evidence.status,
        network: evidence.network,
        mode: evidence.mode,
        olderRequestId: evidence.withdrawals.older.requestId,
        laterRequestId: evidence.withdrawals.later.requestId,
        partialSettlementId: evidence.settlements.partial.settlementId,
        finalSettlementId: evidence.settlements.aggregateFinal.settlementId,
        strictRequestTimeFifo: "PASS",
        privateReconciliation: "PASS (individual amounts suppressed)",
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
