import fs from "node:fs/promises";
import path from "node:path";

import { Contract, ZeroHash, getAddress } from "ethers";
import * as hre from "hardhat";

type Draft = {
  chainId: number;
  contracts: {
    confidentialPrizePool: { address: string };
    settlementController: { address: string };
    deterministicTestYieldVault: { address: string };
  };
  external: { confidentialToken: string; underlyingToken: string };
  configuration: { strategyMode: string; strategyId: string };
};

type PrivateState = {
  chainId: 11155111;
  pool: string;
  controller: string;
  strategy: string;
  underlying: string;
  investmentCap: string;
  sponsoredAssets: string;
  investmentStartTransaction?: string;
  investmentSettlementId?: string;
  investmentFinalizeTransaction?: string;
  clearInvestmentAggregate?: string;
  mintTransaction?: string;
  approvalTransaction?: string;
  sponsorshipTransaction?: string;
  harvestStartTransaction?: string;
  harvestSettlementId?: string;
  harvestExecuteTransaction?: string;
};

type ReceiptRecord = {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
};

const SETTLEMENT_AGGREGATE_PENDING = 1;
const SETTLEMENT_COMPLETED = 6;
const RETRY_DELAY_MS = 15_000;
const DEFAULT_INVESTMENT_CAP = 800_000n;
const DEFAULT_SPONSORED_ASSETS = 100_000n;

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
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  throw new Error("Public aggregate proof returned an unsupported uint64 value");
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
  controller: string,
  strategy: string,
  underlying: string,
): void {
  if (
    state.chainId !== 11155111 ||
    getAddress(state.pool) !== pool ||
    getAddress(state.controller) !== controller ||
    getAddress(state.strategy) !== strategy ||
    getAddress(state.underlying) !== underlying ||
    BigInt(state.investmentCap) <= 0n ||
    BigInt(state.sponsoredAssets) <= 0n
  ) {
    throw new Error("Private TEST YIELD state does not match the live Sepolia deployment");
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

async function main(): Promise<void> {
  const draftPath = path.resolve(required("DEPLOYMENT_DRAFT_PATH"));
  const draft = JSON.parse(await fs.readFile(draftPath, "utf8")) as Draft;
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 11155111n || draft.chainId !== 11155111) {
    throw new Error(`Refusing live acceptance on chain ${network.chainId}`);
  }
  if (draft.configuration.strategyMode !== "TEST_YIELD") {
    throw new Error("Configured strategy is not explicitly labeled TEST_YIELD");
  }

  const [signer] = await hre.ethers.getSigners();
  if (!signer) throw new Error("No Sepolia acceptance signer is configured");
  const poolAddress = getAddress(draft.contracts.confidentialPrizePool.address);
  const controllerAddress = getAddress(draft.contracts.settlementController.address);
  const strategyAddress = getAddress(draft.contracts.deterministicTestYieldVault.address);
  const underlyingAddress = getAddress(draft.external.underlyingToken);
  const deploymentDir = path.dirname(draftPath);
  const repositoryRoot = path.resolve(deploymentDir, "../../..");
  const privatePath = path.join(repositoryRoot, "evidence/private/live-test-yield-state.json");
  const evidencePath = path.join(deploymentDir, "live-test-yield-evidence.json");

  const pool: any = await hre.ethers.getContractAt("ConfidentialPrizePool", poolAddress, signer);
  const controller: any = await hre.ethers.getContractAt(
    "SettlementController",
    controllerAddress,
    signer,
  );
  const strategy: any = await hre.ethers.getContractAt(
    "DeterministicTestYieldVault",
    strategyAddress,
    signer,
  );
  const underlying: any = new Contract(
    underlyingAddress,
    [
      "function mint(address to,uint256 assets)",
      "function approve(address spender,uint256 assets) returns (bool)",
      "function allowance(address owner,address spender) view returns (uint256)",
      "function balanceOf(address owner) view returns (uint256)",
    ],
    signer,
  );

  if (!(await pool.active())) throw new Error("Pool is not active");
  if (await controller.investmentsPaused()) throw new Error("Controller investments are paused");
  if (await controller.lossMode()) throw new Error("Controller is in loss mode");
  if ((await strategy.yieldMode()) !== 0n) throw new Error("Vault does not report TEST YIELD mode");
  if ((await strategy.strategyId()) !== draft.configuration.strategyId) {
    throw new Error("Vault strategy ID differs from the deployment draft");
  }

  const initialization = await retry("Zama SDK initialization", 8, async () => {
    await hre.fhevm.initializeCLIApi();
    return true;
  });

  let state = await readJson<PrivateState>(privatePath);
  if (!state) {
    if (
      (await pool.activeSettlementId()) !== 0n ||
      (await controller.activeSettlementId()) !== 0n
    ) {
      throw new Error(
        "An unrecorded settlement is already active; refusing to create a new intent",
      );
    }
    state = {
      chainId: 11155111,
      pool: poolAddress,
      controller: controllerAddress,
      strategy: strategyAddress,
      underlying: underlyingAddress,
      investmentCap: (process.env.ACCEPTANCE_INVESTMENT_CAP
        ? BigInt(process.env.ACCEPTANCE_INVESTMENT_CAP)
        : DEFAULT_INVESTMENT_CAP
      ).toString(),
      sponsoredAssets: (process.env.ACCEPTANCE_TEST_YIELD_ASSETS
        ? BigInt(process.env.ACCEPTANCE_TEST_YIELD_ASSETS)
        : DEFAULT_SPONSORED_ASSETS
      ).toString(),
    };
    await writePrivate(privatePath, state);
  }
  validatePrivateState(state, poolAddress, controllerAddress, strategyAddress, underlyingAddress);

  const investmentCap = BigInt(state.investmentCap);
  const sponsoredAssets = BigInt(state.sponsoredAssets);
  const strategyAssetsBefore = BigInt(await strategy.totalAssets());
  const deployedPrincipalBefore = BigInt(await controller.deployedPrincipal());

  let investmentStartReceipt: any;
  if (state.investmentStartTransaction) {
    investmentStartReceipt = await canonicalReceipt(state.investmentStartTransaction);
  } else if (state.investmentSettlementId) {
    throw new Error("Investment settlement ID exists without its start transaction");
  } else {
    investmentStartReceipt = await sendOrResume(
      state,
      privatePath,
      "investmentStartTransaction",
      async () => {
        const estimatedGas = await pool.beginInvestmentSettlement.estimateGas(investmentCap);
        return pool.beginInvestmentSettlement(investmentCap, {
          gasLimit: (estimatedGas * 3n) / 2n,
        });
      },
    );
  }
  if (investmentStartReceipt.status !== 1) throw new Error("Investment settlement start reverted");

  if (!state.investmentSettlementId) {
    const started = findEvent(controller, investmentStartReceipt, "SettlementStarted");
    if (!started || Number(started.args.kind) !== 1) {
      throw new Error("Investment start receipt contains no bound SettlementStarted event");
    }
    state.investmentSettlementId = BigInt(started.args.settlementId).toString();
    await writePrivate(privatePath, state);
  }
  const investmentSettlementId = BigInt(state.investmentSettlementId);
  let investment = await controller.settlementPublic(investmentSettlementId);
  let aggregateDecryptAttempts = 0;
  let aggregateDecryptLatencyMs = 0;
  let investmentFinalizeReceipt: any = null;

  if (Number(investment.status) === SETTLEMENT_AGGREGATE_PENDING) {
    const aggregateHandle = investment.aggregateHandle as `0x${string}`;
    if (aggregateHandle === ZeroHash) throw new Error("Investment aggregate handle is not ready");
    const started = Date.now();
    const reveal = await retry("public investment aggregate decryption", 16, () =>
      hre.fhevm.publicDecrypt([aggregateHandle]),
    );
    aggregateDecryptAttempts = reveal.attempts;
    aggregateDecryptLatencyMs = Date.now() - started;
    const clearAggregate = clearUint64(reveal.value.clearValues[aggregateHandle]);
    if (clearAggregate === 0n || clearAggregate > investmentCap) {
      throw new Error("Investment aggregate is zero or exceeds the public cap");
    }
    if (
      state.clearInvestmentAggregate &&
      BigInt(state.clearInvestmentAggregate) !== clearAggregate
    ) {
      throw new Error("Recovered investment aggregate differs from the recorded intent");
    }
    state.clearInvestmentAggregate = clearAggregate.toString();
    await writePrivate(privatePath, state);

    investmentFinalizeReceipt = await sendOrResume(
      state,
      privatePath,
      "investmentFinalizeTransaction",
      async () => {
        const args = [
          investmentSettlementId,
          clearAggregate,
          reveal.value.decryptionProof,
        ] as const;
        const estimatedGas = await controller.finalizeInvestmentAggregate.estimateGas(...args);
        return controller.finalizeInvestmentAggregate(...args, {
          gasLimit: (estimatedGas * 3n) / 2n,
        });
      },
    );
    investment = await controller.settlementPublic(investmentSettlementId);
  } else if (state.investmentFinalizeTransaction) {
    investmentFinalizeReceipt = await canonicalReceipt(state.investmentFinalizeTransaction);
  }

  if (Number(investment.status) !== SETTLEMENT_COMPLETED) {
    throw new Error(`Investment settlement is not complete; status=${investment.status}`);
  }
  if ((await pool.activeSettlementId()) !== 0n || (await controller.activeSettlementId()) !== 0n) {
    throw new Error("Investment settlement completed without clearing active settlement state");
  }
  const clearInvestmentAggregate = BigInt(investment.clearAggregate);
  if (clearInvestmentAggregate !== BigInt(state.clearInvestmentAggregate ?? "0")) {
    throw new Error("Completed investment aggregate differs from the proof-bound value");
  }
  const deployedPrincipalAfterInvestment = BigInt(await controller.deployedPrincipal());
  const strategyAssetsAfterInvestment = BigInt(await strategy.totalAssets());
  if (deployedPrincipalAfterInvestment < deployedPrincipalBefore + clearInvestmentAggregate) {
    throw new Error("Controller did not account for the completed public investment");
  }
  if (strategyAssetsAfterInvestment < strategyAssetsBefore + clearInvestmentAggregate) {
    throw new Error("TEST YIELD vault did not receive the completed public investment");
  }

  const signerUnderlyingBefore = BigInt(await underlying.balanceOf(signer.address));
  const mintReceipt = await sendOrResume(state, privatePath, "mintTransaction", () =>
    underlying.mint(signer.address, sponsoredAssets),
  );
  if (
    BigInt(await underlying.balanceOf(signer.address)) <
    signerUnderlyingBefore + sponsoredAssets
  ) {
    throw new Error("Sepolia test-asset mint did not fund the sponsor");
  }

  let approvalReceipt: any = null;
  if (BigInt(await underlying.allowance(signer.address, strategyAddress)) < sponsoredAssets) {
    approvalReceipt = await sendOrResume(state, privatePath, "approvalTransaction", () =>
      underlying.approve(strategyAddress, sponsoredAssets),
    );
  } else if (state.approvalTransaction) {
    approvalReceipt = await canonicalReceipt(state.approvalTransaction);
  }

  const strategyAssetsBeforeSponsor = BigInt(await strategy.totalAssets());
  const sponsorshipReceipt = await sendOrResume(state, privatePath, "sponsorshipTransaction", () =>
    strategy.sponsorTestYield(sponsoredAssets),
  );
  const sponsored = findEvent(strategy, sponsorshipReceipt, "TestYieldSponsored");
  if (!sponsored || BigInt(sponsored.args.assets) !== sponsoredAssets) {
    throw new Error("TEST YIELD sponsorship event is missing or mismatched");
  }
  const strategyAssetsAfterSponsor = BigInt(await strategy.totalAssets());
  if (strategyAssetsAfterSponsor < strategyAssetsBeforeSponsor + sponsoredAssets) {
    throw new Error("TEST YIELD sponsorship did not increase public vault assets");
  }

  let harvestStartReceipt: any;
  if (state.harvestStartTransaction) {
    harvestStartReceipt = await canonicalReceipt(state.harvestStartTransaction);
  } else {
    harvestStartReceipt = await sendOrResume(
      state,
      privatePath,
      "harvestStartTransaction",
      async () => {
        const estimatedGas = await pool.beginYieldHarvest.estimateGas(sponsoredAssets);
        return pool.beginYieldHarvest(sponsoredAssets, { gasLimit: (estimatedGas * 3n) / 2n });
      },
    );
  }

  if (!state.harvestSettlementId) {
    const started = findEvent(controller, harvestStartReceipt, "SettlementStarted");
    if (!started || Number(started.args.kind) !== 3) {
      throw new Error("Harvest start receipt contains no bound SettlementStarted event");
    }
    state.harvestSettlementId = BigInt(started.args.settlementId).toString();
    await writePrivate(privatePath, state);
  }
  const harvestSettlementId = BigInt(state.harvestSettlementId);
  let harvest = await controller.settlementPublic(harvestSettlementId);
  let harvestExecuteReceipt: any = null;
  if (Number(harvest.status) !== SETTLEMENT_COMPLETED) {
    harvestExecuteReceipt = await sendOrResume(
      state,
      privatePath,
      "harvestExecuteTransaction",
      async () => {
        const estimatedGas = await controller.executeSettlement.estimateGas(harvestSettlementId);
        return controller.executeSettlement(harvestSettlementId, {
          gasLimit: (estimatedGas * 3n) / 2n,
        });
      },
    );
    harvest = await controller.settlementPublic(harvestSettlementId);
  } else if (state.harvestExecuteTransaction) {
    harvestExecuteReceipt = await canonicalReceipt(state.harvestExecuteTransaction);
  }

  if (Number(harvest.status) !== SETTLEMENT_COMPLETED) {
    throw new Error(`TEST YIELD harvest is not complete; status=${harvest.status}`);
  }
  if ((await pool.activeSettlementId()) !== 0n || (await controller.activeSettlementId()) !== 0n) {
    throw new Error("Harvest completed without clearing active settlement state");
  }
  const harvestedAssets = BigInt(harvest.publicAssetsReceived);
  if (harvestedAssets === 0n || harvestedAssets > sponsoredAssets) {
    throw new Error("Harvested TEST YIELD amount is zero or exceeds the public sponsorship cap");
  }
  const strategyAssetsAfterHarvest = BigInt(await strategy.totalAssets());
  const deployedPrincipalAfterHarvest = BigInt(await controller.deployedPrincipal());
  if (deployedPrincipalAfterHarvest !== deployedPrincipalAfterInvestment) {
    throw new Error("TEST YIELD harvest changed deployed principal cost basis");
  }

  const evidence = {
    schemaVersion: 1,
    product: "VeilSave",
    status: "PASS",
    network: "ethereum-sepolia",
    chainId: 11155111,
    recordedAt: new Date().toISOString(),
    mode: "TEST_YIELD",
    disclosure: "Sponsored deterministic test value; not organic yield and not APY.",
    pool: poolAddress,
    controller: controllerAddress,
    strategy: strategyAddress,
    publicUnderlying: underlyingAddress,
    investment: {
      settlementId: investmentSettlementId.toString(),
      publicCap: investmentCap.toString(),
      clearAggregate: clearInvestmentAggregate.toString(),
      start: receiptRecord(investmentStartReceipt),
      finalize: investmentFinalizeReceipt ? receiptRecord(investmentFinalizeReceipt) : null,
      deployedPrincipalAfter: deployedPrincipalAfterInvestment.toString(),
      strategyAssetsAfter: strategyAssetsAfterInvestment.toString(),
    },
    sponsorship: {
      publicAssets: sponsoredAssets.toString(),
      mint: receiptRecord(mintReceipt),
      approval: approvalReceipt ? receiptRecord(approvalReceipt) : null,
      sponsor: receiptRecord(sponsorshipReceipt),
      eventObserved: true,
    },
    harvest: {
      settlementId: harvestSettlementId.toString(),
      publicCap: sponsoredAssets.toString(),
      publicAssetsReceived: harvestedAssets.toString(),
      start: receiptRecord(harvestStartReceipt),
      execute: harvestExecuteReceipt ? receiptRecord(harvestExecuteReceipt) : null,
      strategyAssetsAfter: strategyAssetsAfterHarvest.toString(),
      principalCostBasisUnchanged: true,
      encryptedPrizeReserveCredited: true,
    },
    dependencies: {
      zamaInitializationAttempts: initialization.attempts,
      aggregatePublicDecryptAttempts: aggregateDecryptAttempts,
      aggregatePublicDecryptLatencyMs: aggregateDecryptLatencyMs,
    },
    privacy: {
      individualPrincipalRecorded: false,
      individualWeightRecorded: false,
      prizeAmountDecrypted: false,
      aggregateSettlementPublicByDesign: true,
    },
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: evidence.status,
        mode: evidence.mode,
        investmentSettlementId: evidence.investment.settlementId,
        clearAggregate: evidence.investment.clearAggregate,
        sponsorshipTransaction: evidence.sponsorship.sponsor.transactionHash,
        harvestSettlementId: evidence.harvest.settlementId,
        harvestedAssets: evidence.harvest.publicAssetsReceived,
        disclosure: evidence.disclosure,
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
