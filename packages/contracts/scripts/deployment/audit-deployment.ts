import fs from "node:fs/promises";
import path from "node:path";

import { Contract, ZeroAddress, getAddress, keccak256 } from "ethers";
import * as hre from "hardhat";

type Draft = {
  chainId: number;
  external: Record<string, string>;
  governance: {
    safe: string;
    guardian: string;
    timelock: string;
    timelockDelaySeconds: string;
  };
  configuration: Record<string, string | number>;
  contracts: Record<
    string,
    {
      address: string;
      runtimeCodeHash: string;
      runtimeBytes: number;
    }
  >;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function sameAddress(actual: string, expected: string, label: string): void {
  if (getAddress(actual) !== getAddress(expected)) {
    throw new Error(`${label} mismatch: expected ${expected}, received ${actual}`);
  }
}

function sameBigInt(actual: bigint, expected: bigint, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, received ${actual}`);
  }
}

async function main(): Promise<void> {
  const draftPath = path.resolve(required("DEPLOYMENT_DRAFT_PATH"));
  const draft = JSON.parse(await fs.readFile(draftPath, "utf8")) as Draft;
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== BigInt(draft.chainId) || network.chainId !== 11155111n) {
    throw new Error(`Draft/network chain mismatch: draft=${draft.chainId} rpc=${network.chainId}`);
  }

  const codeChecks: Record<
    string,
    { address: string; runtimeCodeHash: string; runtimeBytes: number }
  > = {};
  for (const [name, record] of Object.entries(draft.contracts)) {
    const code = await hre.ethers.provider.getCode(record.address);
    if (code === "0x") throw new Error(`${name} has no runtime code at ${record.address}`);
    const runtimeCodeHash = keccak256(code);
    const runtimeBytes = (code.length - 2) / 2;
    if (runtimeCodeHash !== record.runtimeCodeHash) {
      throw new Error(`${name} runtime code hash differs from deployment draft`);
    }
    if (runtimeBytes !== record.runtimeBytes) {
      throw new Error(`${name} runtime byte size differs from deployment draft`);
    }
    codeChecks[name] = { address: getAddress(record.address), runtimeCodeHash, runtimeBytes };
  }
  if (codeChecks.confidentialPrizePool!.runtimeBytes > 24_576) {
    throw new Error("ConfidentialPrizePool exceeds the EIP-170 runtime limit");
  }

  const poolRecord = draft.contracts.confidentialPrizePool!;
  const controllerRecord = draft.contracts.settlementController!;
  const vrfRecord = draft.contracts.poolVrfAdapter!;
  const strategyRecord = draft.contracts.deterministicTestYieldVault!;
  const timelockRecord = draft.contracts.timelockController!;

  const pool: any = await hre.ethers.getContractAt("ConfidentialPrizePool", poolRecord.address);
  const controller: any = await hre.ethers.getContractAt(
    "SettlementController",
    controllerRecord.address,
  );
  const vrf: any = await hre.ethers.getContractAt("PoolVrfAdapter", vrfRecord.address);
  const strategy: any = await hre.ethers.getContractAt(
    "DeterministicTestYieldVault",
    strategyRecord.address,
  );
  const timelock: any = await hre.ethers.getContractAt(
    "@openzeppelin/contracts/governance/TimelockController.sol:TimelockController",
    timelockRecord.address,
  );

  if (!(await pool.active())) {
    throw new Error(
      "Pool is not active. Execute the generated Safe bind/bind/activate batch before auditing.",
    );
  }
  sameAddress(await controller.pool(), poolRecord.address, "controller pool binding");
  sameAddress(await vrf.pool(), poolRecord.address, "VRF pool binding");
  sameAddress(await pool.confidentialToken(), draft.external.confidentialToken!, "pool cUSDT");
  sameAddress(await pool.underlying(), draft.external.underlyingToken!, "pool underlying");
  sameAddress(await pool.vrfAdapter(), vrfRecord.address, "pool VRF adapter");
  sameAddress(
    await pool.settlementController(),
    controllerRecord.address,
    "pool settlement controller",
  );
  sameAddress(await pool.timelock(), timelockRecord.address, "pool timelock");
  sameAddress(await pool.pauseGuardian(), draft.governance.guardian, "pool guardian");
  sameAddress(await controller.strategy(), strategyRecord.address, "controller strategy");
  sameAddress(
    await controller.confidentialToken(),
    draft.external.confidentialToken!,
    "controller cUSDT",
  );
  sameAddress(
    await controller.underlying(),
    draft.external.underlyingToken!,
    "controller underlying",
  );
  sameAddress(await controller.timelock(), timelockRecord.address, "controller timelock");
  sameAddress(await controller.pauseGuardian(), draft.governance.guardian, "controller guardian");
  sameAddress(await vrf.timelock(), timelockRecord.address, "VRF timelock");
  sameAddress(await vrf.i_vrfV2PlusWrapper(), draft.external.vrfWrapper!, "VRF wrapper");
  sameAddress(await strategy.asset(), draft.external.underlyingToken!, "strategy asset");
  sameAddress(await strategy.timelock(), timelockRecord.address, "strategy timelock");
  sameAddress(await strategy.pauseGuardian(), draft.governance.guardian, "strategy guardian");

  sameAddress(await pool.bootstrapAuthority(), ZeroAddress, "pool bootstrap authority");
  sameAddress(await controller.bootstrapAuthority(), ZeroAddress, "controller bootstrap authority");
  sameAddress(await vrf.bootstrapAuthority(), ZeroAddress, "VRF bootstrap authority");
  sameBigInt(await pool.currentEpochId(), 1n, "current epoch");
  sameBigInt(await pool.PARTICIPANT_CAPACITY(), 16n, "participant capacity");
  sameBigInt(await pool.epochDuration(), 604_800n, "epoch duration");
  sameBigInt(await pool.requestTimeout(), 86_400n, "request timeout");
  sameBigInt(await pool.fulfillmentTimeout(), 86_400n, "fulfillment timeout");
  sameBigInt(await pool.drawTimeout(), 86_400n, "draw timeout");
  sameBigInt(await pool.winnerAclDelayBlocks(), 96n, "winner ACL delay");
  sameBigInt(await pool.slotBondWei(), 1_000_000_000_000_000n, "slot bond");
  sameBigInt(await pool.liquidityTargetBps(), 2_000n, "liquidity target");
  sameBigInt(await vrf.CALLBACK_GAS_LIMIT(), 100_000n, "VRF callback gas");
  sameBigInt(await vrf.REQUEST_CONFIRMATIONS(), 3n, "VRF confirmations");
  sameBigInt(await vrf.NUM_WORDS(), 1n, "VRF words");
  sameBigInt(await strategy.yieldMode(), 0n, "strategy TEST YIELD mode");
  sameBigInt(
    await timelock.getMinDelay(),
    BigInt(draft.governance.timelockDelaySeconds),
    "timelock delay",
  );

  const safe = getAddress(draft.governance.safe);
  const proposerRole = await timelock.PROPOSER_ROLE();
  const cancellerRole = await timelock.CANCELLER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const adminRole = await timelock.DEFAULT_ADMIN_ROLE();
  if (!(await timelock.hasRole(proposerRole, safe))) throw new Error("Safe lacks proposer role");
  if (!(await timelock.hasRole(cancellerRole, safe))) throw new Error("Safe lacks canceller role");
  if (!(await timelock.hasRole(executorRole, ZeroAddress))) {
    throw new Error("Timelock executor role is not open");
  }
  if (!(await timelock.hasRole(adminRole, timelockRecord.address))) {
    throw new Error("Timelock is not self-administered");
  }

  const token: any = new Contract(
    draft.external.confidentialToken!,
    [
      "function underlying() view returns (address)",
      "function decimals() view returns (uint8)",
      "function rate() view returns (uint256)",
    ],
    hre.ethers.provider,
  );
  sameAddress(await token.underlying(), draft.external.underlyingToken!, "cUSDT underlying");
  sameBigInt(await token.decimals(), 6n, "cUSDT decimals");
  sameBigInt(await token.rate(), 1n, "cUSDT rate");

  const audit = {
    schemaVersion: 1,
    product: "VeilSave",
    auditedAt: new Date().toISOString(),
    chainId: Number(network.chainId),
    deploymentDraft: draftPath,
    status: "PASS",
    codeChecks,
    bindingsLocked: true,
    bootstrapAuthoritiesCleared: true,
    governance: {
      safe,
      timelock: getAddress(timelockRecord.address),
      minDelaySeconds: (await timelock.getMinDelay()).toString(),
      safeProposer: true,
      safeCanceller: true,
      openExecutor: true,
      selfAdmin: true,
    },
    pool: {
      active: true,
      currentEpochId: (await pool.currentEpochId()).toString(),
      participantCapacity: (await pool.PARTICIPANT_CAPACITY()).toString(),
      runtimeBytes: codeChecks.confidentialPrizePool!.runtimeBytes,
    },
  };
  const outputPath = path.join(path.dirname(draftPath), "post-deploy-audit.json");
  await fs.writeFile(outputPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  console.log(`Sepolia deployment audit passed: ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
