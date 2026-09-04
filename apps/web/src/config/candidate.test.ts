import { describe, expect, it } from "vitest";

import { DeploymentStatus } from "@veilsave/shared";

import { SEPOLIA_CANDIDATE_READ_MODEL, validateCandidateReadModel } from "./candidate";

describe("Sepolia candidate read model", () => {
  it("is a REHEARSAL read model, never an ACTIVE manifest", () => {
    const model = validateCandidateReadModel(SEPOLIA_CANDIDATE_READ_MODEL);
    expect(model.status).toBe(DeploymentStatus.Rehearsal);
    expect(model.status).not.toBe("ACTIVE");
    expect(model.chainId).toBe(11155111);
    expect(model.evidence).toBeNull();
  });

  it("pins the audited pool configuration constants", () => {
    const model = validateCandidateReadModel(SEPOLIA_CANDIDATE_READ_MODEL);
    expect(model.pool.participantCapacity).toBe(16);
    expect(model.pool.epochDurationSeconds).toBe(604800);
    expect(model.pool.slotBondWei).toBe("1000000000000000");
    expect(model.pool.winnerFinalityDelayBlocks).toBe(96);
    expect(model.pool.strategyTimelockSeconds).toBe(86400);
  });

  it("pins the audited Sepolia contract addresses", () => {
    const model = validateCandidateReadModel(SEPOLIA_CANDIDATE_READ_MODEL);
    expect(model.contracts.confidentialPrizePool.address).toBe(
      "0x6e543f7e6f3175824a2C36E37c09829200195D4d",
    );
    expect(model.contracts.poolVrfAdapter.address).toBe(
      "0x23bD336d4E42Aa70DAea529C0EB75Ca98e3CeeEC",
    );
    expect(model.contracts.settlementController.address).toBe(
      "0x8CF1984Aa1F3eE119aDCa5901DD58C28fb19589c",
    );
    expect(model.contracts.deterministicTestYieldVault.address).toBe(
      "0x70d70205a992aE5e02e628EEcD8AE54Ce65Da529",
    );
    expect(model.contracts.timelockController.address).toBe(
      "0x6aE428EE7f575720A7d696e566193A7484A8ff84",
    );
    expect(model.external.confidentialToken).toBe("0x4E7B06D78965594eB5EF5414c357ca21E1554491");
    expect(model.governance.safe).toBe("0x429F46ADdDe54E4b05493C87d121efb75e3e9711");
  });

  it("rejects promotion to ACTIVE", () => {
    expect(() =>
      validateCandidateReadModel({
        ...SEPOLIA_CANDIDATE_READ_MODEL,
        status: DeploymentStatus.Active,
      }),
    ).toThrow(/REHEARSAL/);
  });

  it("rejects release evidence on the candidate", () => {
    expect(() =>
      validateCandidateReadModel({
        ...SEPOLIA_CANDIDATE_READ_MODEL,
        evidence: { hcuReportSha256: `0x${"1".repeat(64)}` },
      }),
    ).toThrow(/evidence/);
  });

  it("rejects a wrong chain", () => {
    expect(() =>
      validateCandidateReadModel({ ...SEPOLIA_CANDIDATE_READ_MODEL, chainId: 1 }),
    ).toThrow(/chain/);
  });

  it("pins the audited runtime code hashes", () => {
    const model = validateCandidateReadModel(SEPOLIA_CANDIDATE_READ_MODEL);
    expect(model.contracts.timelockController.runtimeCodeHash).toBe(
      "0x55b4aa2e389f3dea87705315083756984234bc74a579bebcc96ebd0609f542be",
    );
    expect(model.contracts.confidentialPrizePool.runtimeCodeHash).toBe(
      "0x96729278491e3925da9fd819df77f1d193135c9de4926046d294ad2cba35028f",
    );
    expect(model.contracts.poolVrfAdapter.runtimeCodeHash).toBe(
      "0x7d0efe4bb6ac0353bd987138f5f7adfba2c0f464fc3949578937a615929c910f",
    );
    expect(model.contracts.settlementController.runtimeCodeHash).toBe(
      "0x90b4f70711e9031fa2dc952b01dab62fab53dfda08d80c14eae7956b82bbec2d",
    );
    expect(model.contracts.deterministicTestYieldVault.runtimeCodeHash).toBe(
      "0x509c31d274de8c70f8a90bbd025152f5d548d135beba313a33e18db378eed7de",
    );
    expect(model.external.runtimeCodeHashes.confidentialToken).toBe(
      "0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6",
    );
    expect(model.external.runtimeCodeHashes.underlyingToken).toBe(
      "0x8af98e1e713811b600f06c8c7ae4834e974efc30de6eebdb746e0aaa39718269",
    );
    expect(model.external.runtimeCodeHashes.acl).toBe(
      "0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6",
    );
    expect(model.external.runtimeCodeHashes.fheExecutor).toBe(
      "0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6",
    );
    expect(model.external.runtimeCodeHashes.kmsVerifier).toBe(
      "0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6",
    );
    expect(model.external.runtimeCodeHashes.inputVerifier).toBe(
      "0x864cc9ad53b338b82da1f7cab85ab0b3d5c8861acb422b6fec63cf36234f36a6",
    );
    expect(model.external.runtimeCodeHashes.vrfCoordinator).toBe(
      "0x5e22d4163e7c1b059a946f0600759a4d38eb3e04592d0e359def022cec36bdbc",
    );
    expect(model.external.runtimeCodeHashes.vrfWrapper).toBe(
      "0x079cd722dd7b8789bdb5f313d032e4f8fe66bb75e93f07acd6ec33b50d1dc42b",
    );
  });
});
