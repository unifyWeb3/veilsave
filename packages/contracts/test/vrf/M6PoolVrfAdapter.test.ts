import { expect } from "chai";
import { parseEther } from "ethers";
import * as hre from "hardhat";

const DAY = 24 * 60 * 60;

type Fixture = {
  wrapper: any;
  vrf: any;
  pool: any;
  bootstrap: any;
  timelock: any;
  outsider: any;
};

async function deployFixture(): Promise<Fixture> {
  const signers = await hre.ethers.getSigners();
  const bootstrap = signers[0]!;
  const timelock = signers[1]!;
  const guardian = signers[2]!;
  const outsider = signers[3]!;

  const asset: any = await (
    await hre.ethers.getContractFactory("MockSixDecimalAsset", bootstrap)
  ).deploy();
  await asset.waitForDeployment();
  const token: any = await (
    await hre.ethers.getContractFactory("TestConfidentialUSDT", bootstrap)
  ).deploy(await asset.getAddress());
  await token.waitForDeployment();
  const wrapper: any = await (
    await hre.ethers.getContractFactory("MockVrfV2PlusWrapper", bootstrap)
  ).deploy();
  await wrapper.waitForDeployment();
  const vrf: any = await (
    await hre.ethers.getContractFactory("PoolVrfAdapter", bootstrap)
  ).deploy(await wrapper.getAddress(), bootstrap.address, timelock.address);
  await vrf.waitForDeployment();
  const settlement: any = await (
    await hre.ethers.getContractFactory("MockSettlementBinding", bootstrap)
  ).deploy(
    bootstrap.address,
    await token.getAddress(),
    await asset.getAddress(),
    timelock.address,
    guardian.address,
  );
  await settlement.waitForDeployment();
  const pool: any = await (
    await hre.ethers.getContractFactory("ConfidentialPrizePoolHarness", bootstrap)
  ).deploy(
    {
      confidentialToken: await token.getAddress(),
      vrfAdapter: await vrf.getAddress(),
      settlementController: await settlement.getAddress(),
      bootstrapAuthority: bootstrap.address,
      timelock: timelock.address,
      pauseGuardian: guardian.address,
    },
    {
      epochDuration: 7 * DAY,
      requestTimeout: DAY,
      fulfillmentTimeout: DAY,
      drawTimeout: DAY,
      winnerAclDelayBlocks: 96,
      slotBondWei: parseEther("0.001"),
      liquidityTargetBps: 2_000,
    },
  );
  await pool.waitForDeployment();

  await (await vrf.bindPool(await pool.getAddress())).wait();
  await (await settlement.bindPool(await pool.getAddress())).wait();
  await (await vrf.fund({ value: parseEther("0.01") })).wait();
  await (await pool.activate()).wait();
  await hre.fhevm.assertCoprocessorInitialized(pool, "ConfidentialPrizePoolHarness");
  return { wrapper, vrf, pool, bootstrap, timelock, outsider };
}

async function advancePast(timestamp: bigint): Promise<void> {
  const latest = await hre.ethers.provider.getBlock("latest");
  const now = latest?.timestamp ?? 0;
  const delta = Number(timestamp) - now + 1;
  if (delta > 0) {
    await hre.network.provider.send("evm_increaseTime", [delta]);
    await hre.network.provider.send("evm_mine");
  }
}

async function freeze(fixture: Fixture): Promise<void> {
  const epoch = await fixture.pool.epochPublic(1);
  await advancePast(epoch[2]);
  await (await fixture.pool.freezeEpoch(1)).wait();
}

async function request(fixture: Fixture): Promise<bigint> {
  await (await fixture.pool.requestEpochRandomness(1)).wait();
  return (await fixture.pool.epochRandomness(1))[0];
}

describe("M6 PoolVrfAdapter", function () {
  this.timeout(300_000);

  it("binds one request to the frozen snapshot, stores one word, and synchronizes separately", async function () {
    const fixture = await deployFixture();
    await freeze(fixture);
    const frozen = await fixture.pool.epochPublic(1);
    const requestId = await request(fixture);
    expect(await fixture.vrf.requestForEpoch(1)).to.equal(requestId);
    const record = await fixture.vrf.requestRecord(requestId);
    expect(record.epochId).to.equal(1n);
    expect(record.snapshotCommitment).to.equal(frozen[6]);

    const callback = await (await fixture.wrapper.fulfill(requestId, [123n])).wait();
    expect(callback.gasUsed).to.be.lessThan(200_000n);
    expect((await fixture.pool.epochPublic(1))[0]).to.equal(3n); // RANDOMNESS_REQUESTED
    expect(await fixture.vrf.pendingRequestCount()).to.equal(0n);

    await (await fixture.pool.syncEpochRandomness(1)).wait();
    const randomness = await fixture.pool.epochRandomness(1);
    expect((await fixture.pool.epochPublic(1))[0]).to.equal(4n); // DRAW_READY
    expect(randomness[2]).to.equal(123n);
    expect(randomness[4]).to.equal(randomness[3] + BigInt(DAY));

    await (await fixture.wrapper.fulfill(requestId, [999n])).wait();
    expect((await fixture.vrf.requestRecord(requestId)).randomWord).to.equal(123n);
    await expect(fixture.pool.requestEpochRandomness(1)).to.be.revertedWithCustomError(
      fixture.pool,
      "WrongEpochState",
    );
  });

  it("makes a missed request deadline terminal without creating replacement randomness", async function () {
    const fixture = await deployFixture();
    await freeze(fixture);
    const frozen = await fixture.pool.epochPublic(1);
    await advancePast(frozen[4]);
    await expect(fixture.pool.requestEpochRandomness(1)).to.be.revertedWithCustomError(
      fixture.pool,
      "EpochRequestDeadlineExpired",
    );
    await (await fixture.pool.abandonUnrequestedEpoch(1)).wait();
    expect((await fixture.pool.epochPublic(1))[0]).to.equal(7n); // ABANDONED
    expect(await fixture.vrf.requestForEpoch(1)).to.equal(0n);
  });

  it("rejects a late fulfillment and abandons without rerolling", async function () {
    const fixture = await deployFixture();
    await freeze(fixture);
    const requestId = await request(fixture);
    const randomness = await fixture.pool.epochRandomness(1);
    await advancePast(randomness[1]);
    await (await fixture.wrapper.fulfill(requestId, [777n])).wait();
    await expect(fixture.pool.syncEpochRandomness(1)).to.be.revertedWithCustomError(
      fixture.pool,
      "InvalidVrfFulfillment",
    );
    await (await fixture.pool.abandonUnfulfilledEpoch(1)).wait();
    expect((await fixture.pool.epochPublic(1))[0]).to.equal(7n);
    await expect(fixture.pool.requestEpochRandomness(1)).to.be.revertedWithCustomError(
      fixture.pool,
      "WrongEpochState",
    );
  });

  it("abandons a timely but unexecuted fulfillment using its original fulfillment time", async function () {
    const fixture = await deployFixture();
    await freeze(fixture);
    const requestId = await request(fixture);
    await (await fixture.wrapper.fulfill(requestId, [55n])).wait();
    const fulfilled = await fixture.vrf.requestRecord(requestId);
    await advancePast(fulfilled.fulfilledAt + BigInt(DAY));
    await expect(fixture.pool.syncEpochRandomness(1)).to.be.revertedWithCustomError(
      fixture.pool,
      "EpochDrawDeadlineExpired",
    );
    await (await fixture.pool.abandonUnexecutedEpoch(1)).wait();
    expect((await fixture.pool.epochPublic(1))[0]).to.equal(7n);
  });

  it("ignores spoofed, unknown, duplicate, and empty callbacks and locks surplus while pending", async function () {
    const fixture = await deployFixture();
    await freeze(fixture);
    const requestId = await request(fixture);
    await expect(
      fixture.vrf.connect(fixture.outsider).rawFulfillRandomWords(requestId, [1n]),
    ).to.be.revertedWithCustomError(fixture.vrf, "OnlyVRFWrapperCanFulfill");
    await expect(
      fixture.vrf.connect(fixture.timelock).withdrawSurplus(fixture.timelock.address, 1),
    ).to.be.revertedWithCustomError(fixture.vrf, "PendingRequests");

    await (await fixture.wrapper.fulfillTo(await fixture.vrf.getAddress(), 999_999, [7n])).wait();
    await (await fixture.wrapper.fulfill(requestId, [])).wait();
    expect(await fixture.vrf.pendingRequestCount()).to.equal(1n);
    expect((await fixture.vrf.requestRecord(requestId)).fulfilled).to.equal(false);

    await (await fixture.wrapper.fulfill(requestId, [7n])).wait();
    await (await fixture.wrapper.fulfill(requestId, [8n])).wait();
    expect((await fixture.vrf.requestRecord(requestId)).randomWord).to.equal(7n);
    expect(await fixture.vrf.pendingRequestCount()).to.equal(0n);
    await (
      await fixture.vrf.connect(fixture.timelock).withdrawSurplus(fixture.timelock.address, 1)
    ).wait();
  });
});
