import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { AbiCoder, ZeroHash, keccak256, parseEther, toUtf8Bytes } from "ethers";
import * as hre from "hardhat";

const DAY = 24 * 60 * 60;

type Fixture = {
  asset: any;
  token: any;
  strategy: any;
  controller: any;
  vrf: any;
  pool: any;
  bootstrap: any;
  timelock: any;
  guardian: any;
  alice: any;
  bob: any;
  sponsor: any;
};

async function deployFixture(): Promise<Fixture> {
  const signers = await hre.ethers.getSigners();
  const bootstrap = signers[0]!;
  const timelock = signers[1]!;
  const guardian = signers[2]!;
  const alice = signers[3]!;
  const bob = signers[4]!;
  const sponsor = signers[5]!;

  const asset: any = await (
    await hre.ethers.getContractFactory("MockSixDecimalAsset", bootstrap)
  ).deploy();
  await asset.waitForDeployment();
  const token: any = await (
    await hre.ethers.getContractFactory("TestConfidentialUSDT", bootstrap)
  ).deploy(await asset.getAddress());
  await token.waitForDeployment();
  const strategy: any = await (
    await hre.ethers.getContractFactory("DeterministicTestYieldVault", bootstrap)
  ).deploy(
    await asset.getAddress(),
    timelock.address,
    guardian.address,
    keccak256(toUtf8Bytes("VEILSAVE_TEST_YIELD_V1")),
  );
  await strategy.waitForDeployment();
  const controller: any = await (
    await hre.ethers.getContractFactory("SettlementController", bootstrap)
  ).deploy(
    await token.getAddress(),
    await asset.getAddress(),
    await strategy.getAddress(),
    bootstrap.address,
    timelock.address,
    guardian.address,
  );
  await controller.waitForDeployment();
  const vrf: any = await (
    await hre.ethers.getContractFactory("MockPoolVrfBinding", bootstrap)
  ).deploy(bootstrap.address, timelock.address);
  await vrf.waitForDeployment();
  const pool: any = await (
    await hre.ethers.getContractFactory("ConfidentialPrizePoolHarness", bootstrap)
  ).deploy(
    {
      confidentialToken: await token.getAddress(),
      vrfAdapter: await vrf.getAddress(),
      settlementController: await controller.getAddress(),
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

  await (await controller.bindPool(await pool.getAddress())).wait();
  await (await vrf.bindPool(await pool.getAddress())).wait();
  await (await pool.activate()).wait();
  await hre.fhevm.assertCoprocessorInitialized(pool, "ConfidentialPrizePoolHarness");
  await hre.fhevm.assertCoprocessorInitialized(token, "TestConfidentialUSDT");
  await hre.fhevm.assertCoprocessorInitialized(controller, "SettlementController");

  return {
    asset,
    token,
    strategy,
    controller,
    vrf,
    pool,
    bootstrap,
    timelock,
    guardian,
    alice,
    bob,
    sponsor,
  };
}

async function prepare(fixture: Fixture, signer: any, amount: bigint): Promise<void> {
  await (await fixture.asset.mint(signer.address, amount)).wait();
  await (
    await fixture.asset.connect(signer).approve(await fixture.token.getAddress(), amount)
  ).wait();
  await (await fixture.token.connect(signer).wrap(signer.address, amount)).wait();
}

async function reserveAndDeposit(fixture: Fixture, signer: any, amount: bigint): Promise<void> {
  await prepare(fixture, signer, amount);
  await (await fixture.pool.connect(signer).reserveSlot({ value: parseEther("0.001") })).wait();
  const input = hre.fhevm.createEncryptedInput(await fixture.token.getAddress(), signer.address);
  input.add64(amount);
  const encrypted = await input.encrypt();
  const route = AbiCoder.defaultAbiCoder().encode(["bytes4"], [await fixture.pool.DEPOSIT_ROUTE()]);
  await (
    await fixture.token
      .connect(signer)
      [
        "confidentialTransferAndCall(address,bytes32,bytes,bytes)"
      ](await fixture.pool.getAddress(), encrypted.handles[0], encrypted.inputProof, route)
  ).wait();
}

async function decrypt64(handle: string): Promise<bigint> {
  if (handle === ZeroHash) return 0n;
  return hre.fhevm.debugger.decryptEuint(FhevmType.euint64, handle);
}

async function accounting(fixture: Fixture) {
  const handles = await fixture.pool.accountingHandles();
  return {
    liability: await decrypt64(handles[0]),
    principalLiquidity: await decrypt64(handles[1]),
    inFlight: await decrypt64(handles[2]),
    claimLiquidity: await decrypt64(handles[3]),
    totalQueued: await decrypt64(handles[4]),
    prizeReserve: await decrypt64(handles[5]),
  };
}

async function finalizeInvestment(
  fixture: Fixture,
  settlementId: bigint,
  clearAmount: bigint,
): Promise<void> {
  const settlement = await fixture.controller.settlementPublic(settlementId);
  const unwrapHandle = await fixture.token.unwrapAmount(settlement[7]);
  const reveal = await hre.fhevm.publicDecrypt([unwrapHandle]);
  await (
    await fixture.controller.finalizeInvestmentAggregate(
      settlementId,
      clearAmount,
      reveal.decryptionProof,
    )
  ).wait();
}

async function requestWithdrawal(fixture: Fixture, signer: any, amount: bigint): Promise<bigint> {
  const input = hre.fhevm.createEncryptedInput(await fixture.pool.getAddress(), signer.address);
  input.add64(amount);
  const encrypted = await input.encrypt();
  await (
    await fixture.pool
      .connect(signer)
      .requestWithdrawal(encrypted.handles[0], encrypted.inputProof, false)
  ).wait();
  return (await fixture.pool.nextWithdrawalId()) - 1n;
}

async function finalizeRouting(
  fixture: Fixture,
  withdrawalId: bigint,
  hasRemainder: boolean,
): Promise<void> {
  const state = await fixture.pool.withdrawalPublic(withdrawalId);
  const reveal = await hre.fhevm.publicDecrypt([state[7]]);
  await (
    await fixture.pool.finalizeWithdrawalRouting(withdrawalId, hasRemainder, reveal.decryptionProof)
  ).wait();
}

async function finalizeCompletion(
  fixture: Fixture,
  withdrawalId: bigint,
  complete: boolean,
): Promise<void> {
  const state = await fixture.pool.withdrawalPublic(withdrawalId);
  const reveal = await hre.fhevm.publicDecrypt([state[8]]);
  await (
    await fixture.pool.finalizeWithdrawalCompletion(withdrawalId, complete, reveal.decryptionProof)
  ).wait();
}

async function finalizeRedemption(
  fixture: Fixture,
  settlementId: bigint,
  clearAmount: bigint,
): Promise<void> {
  const settlement = await fixture.controller.settlementPublic(settlementId);
  const reveal = await hre.fhevm.publicDecrypt([settlement[5]]);
  await (
    await fixture.controller.finalizePrincipalRedemption(
      settlementId,
      clearAmount,
      reveal.decryptionProof,
    )
  ).wait();
}

describe("M5 settlement controller and TEST YIELD strategy", function () {
  this.timeout(900_000);

  it("invests only encrypted excess liquidity and harvests only sponsored TEST YIELD", async function () {
    const fixture = await deployFixture();
    await reserveAndDeposit(fixture, fixture.alice, 300_000n);
    await reserveAndDeposit(fixture, fixture.bob, 200_000n);

    await (await fixture.pool.beginInvestmentSettlement(500_000)).wait();
    const investmentId = await fixture.pool.activeSettlementId();
    const investment = await fixture.controller.settlementPublic(investmentId);
    expect(await decrypt64(investment[5])).to.equal(400_000n);
    await finalizeInvestment(fixture, investmentId, 400_000n);

    expect(await fixture.controller.deployedPrincipal()).to.equal(400_000n);
    expect(await fixture.strategy.totalAssets()).to.equal(400_000n);
    expect(await fixture.strategy.yieldMode()).to.equal(0n);
    let values = await accounting(fixture);
    expect(values.principalLiquidity).to.equal(100_000n);
    expect(values.inFlight).to.equal(0n);
    expect(values.liability).to.equal(500_000n);

    await (await fixture.asset.mint(fixture.sponsor.address, 50_000n)).wait();
    await (
      await fixture.asset
        .connect(fixture.sponsor)
        .approve(await fixture.strategy.getAddress(), 50_000n)
    ).wait();
    await (await fixture.strategy.connect(fixture.sponsor).sponsorTestYield(50_000n)).wait();
    expect(await fixture.strategy.totalAssets()).to.equal(450_000n);
    const expectedHarvest =
      (await fixture.strategy.maxWithdraw(await fixture.controller.getAddress())) - 400_000n;

    await (await fixture.pool.beginYieldHarvest(50_000)).wait();
    const harvestId = await fixture.pool.activeSettlementId();
    await (await fixture.controller.executeSettlement(harvestId)).wait();
    expect(await fixture.controller.deployedPrincipal()).to.equal(400_000n);
    expect(await fixture.strategy.totalAssets()).to.equal(450_000n - expectedHarvest);
    values = await accounting(fixture);
    expect(values.prizeReserve).to.equal(expectedHarvest);
    expect(values.principalLiquidity).to.equal(100_000n);
    expect(await fixture.pool.activeSettlementId()).to.equal(0n);
    expect(await fixture.controller.activeSettlementId()).to.equal(0n);
  });

  it("redeems aggregate principal into confidential FIFO liquidity across partial settlements", async function () {
    const fixture = await deployFixture();
    await reserveAndDeposit(fixture, fixture.alice, 300_000n);
    await reserveAndDeposit(fixture, fixture.bob, 200_000n);
    await (await fixture.pool.beginInvestmentSettlement(500_000)).wait();
    await finalizeInvestment(fixture, await fixture.pool.activeSettlementId(), 400_000n);

    const withdrawalId = await requestWithdrawal(fixture, fixture.alice, 180_000n);
    await finalizeRouting(fixture, withdrawalId, true);
    expect(await decrypt64(await fixture.pool.withdrawalHandle(withdrawalId))).to.equal(80_000n);

    await (await fixture.pool.beginWithdrawalSettlement(50_000)).wait();
    let settlementId = await fixture.pool.activeSettlementId();
    await finalizeRedemption(fixture, settlementId, 50_000n);
    expect((await accounting(fixture)).claimLiquidity).to.equal(50_000n);
    await (await fixture.pool.serviceFifoHead()).wait();
    await finalizeCompletion(fixture, withdrawalId, false);
    expect(await decrypt64(await fixture.pool.withdrawalHandle(withdrawalId))).to.equal(30_000n);

    await (await fixture.pool.beginWithdrawalSettlement(30_000)).wait();
    settlementId = await fixture.pool.activeSettlementId();
    await finalizeRedemption(fixture, settlementId, 30_000n);
    await (await fixture.pool.serviceFifoHead()).wait();
    await finalizeCompletion(fixture, withdrawalId, true);

    const values = await accounting(fixture);
    expect(values.totalQueued).to.equal(0n);
    expect(values.claimLiquidity).to.equal(0n);
    expect(values.liability).to.equal(320_000n);
    expect(await fixture.controller.deployedPrincipal()).to.equal(320_000n);
    expect(await fixture.strategy.totalAssets()).to.equal(320_000n);
    expect((await fixture.pool.fifoHead())[0]).to.equal(0n);
  });

  it("never redeems principal already covered by returned confidential claim liquidity", async function () {
    const fixture = await deployFixture();
    await reserveAndDeposit(fixture, fixture.alice, 300_000n);
    await reserveAndDeposit(fixture, fixture.bob, 200_000n);
    await expect(fixture.pool.beginWithdrawalSettlement(1)).to.be.revertedWithCustomError(
      fixture.pool,
      "NoFifoWithdrawal",
    );

    await (await fixture.pool.beginInvestmentSettlement(500_000)).wait();
    await finalizeInvestment(fixture, await fixture.pool.activeSettlementId(), 400_000n);
    const withdrawalId = await requestWithdrawal(fixture, fixture.alice, 180_000n);
    await finalizeRouting(fixture, withdrawalId, true);

    await (await fixture.pool.beginWithdrawalSettlement(50_000)).wait();
    let settlementId = await fixture.pool.activeSettlementId();
    await finalizeRedemption(fixture, settlementId, 50_000n);
    expect((await accounting(fixture)).claimLiquidity).to.equal(50_000n);
    expect(await fixture.controller.deployedPrincipal()).to.equal(350_000n);

    await (await fixture.pool.beginWithdrawalSettlement(80_000)).wait();
    settlementId = await fixture.pool.activeSettlementId();
    let settlement = await fixture.controller.settlementPublic(settlementId);
    expect(await decrypt64(settlement[5])).to.equal(30_000n);
    await finalizeRedemption(fixture, settlementId, 30_000n);
    expect((await accounting(fixture)).claimLiquidity).to.equal(80_000n);
    expect(await fixture.controller.deployedPrincipal()).to.equal(320_000n);

    // All queued principal is already confidential claim liquidity. A repeated
    // permissionless settlement proves zero and completes without redemption.
    await (await fixture.pool.beginWithdrawalSettlement(80_000)).wait();
    settlementId = await fixture.pool.activeSettlementId();
    settlement = await fixture.controller.settlementPublic(settlementId);
    expect(await decrypt64(settlement[5])).to.equal(0n);
    await finalizeRedemption(fixture, settlementId, 0n);
    expect((await fixture.controller.settlementPublic(settlementId))[1]).to.equal(6n);
    expect(await fixture.controller.deployedPrincipal()).to.equal(320_000n);
    expect((await accounting(fixture)).claimLiquidity).to.equal(80_000n);

    await (await fixture.pool.serviceFifoHead()).wait();
    await finalizeCompletion(fixture, withdrawalId, true);
    expect((await accounting(fixture)).totalQueued).to.equal(0n);
    expect((await accounting(fixture)).claimLiquidity).to.equal(0n);
  });

  it("retains a proof-bound investment across strategy failure and retries the same intent", async function () {
    const fixture = await deployFixture();
    await reserveAndDeposit(fixture, fixture.alice, 100_000n);
    await (await fixture.strategy.connect(fixture.guardian).pauseDeposits()).wait();
    await (await fixture.pool.beginInvestmentSettlement(100_000)).wait();
    const settlementId = await fixture.pool.activeSettlementId();
    const settlement = await fixture.controller.settlementPublic(settlementId);
    const unwrapHandle = await fixture.token.unwrapAmount(settlement[7]);
    const reveal = await hre.fhevm.publicDecrypt([unwrapHandle]);

    await expect(
      fixture.controller.finalizeInvestmentAggregate(settlementId, 79_999, reveal.decryptionProof),
    ).to.be.reverted;
    await (
      await fixture.controller.finalizeInvestmentAggregate(
        settlementId,
        80_000,
        reveal.decryptionProof,
      )
    ).wait();

    expect((await fixture.controller.settlementPublic(settlementId))[1]).to.equal(5n); // FAILED_RETRYABLE
    expect(await fixture.asset.balanceOf(await fixture.controller.getAddress())).to.equal(80_000n);
    expect((await accounting(fixture)).inFlight).to.equal(80_000n);
    expect(await fixture.pool.activeSettlementId()).to.equal(settlementId);

    await (await fixture.strategy.connect(fixture.timelock).unpauseDeposits()).wait();
    await (await fixture.controller.retrySettlement(settlementId)).wait();
    expect((await fixture.controller.settlementPublic(settlementId))[1]).to.equal(6n); // COMPLETED
    expect(await fixture.controller.deployedPrincipal()).to.equal(80_000n);
    expect((await accounting(fixture)).inFlight).to.equal(0n);
    expect(await fixture.pool.activeSettlementId()).to.equal(0n);
  });
});
