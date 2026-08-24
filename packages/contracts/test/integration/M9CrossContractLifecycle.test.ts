import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { AbiCoder, ZeroHash, keccak256, parseEther, toUtf8Bytes } from "ethers";
import * as hre from "hardhat";

const DAY = 24 * 60 * 60;
const ACL_DELAY_BLOCKS = 96;

type Fixture = {
  asset: any;
  token: any;
  strategy: any;
  controller: any;
  wrapper: any;
  vrf: any;
  pool: any;
  bootstrap: any;
  timelock: any;
  guardian: any;
  alice: any;
  bob: any;
  keeper: any;
  sponsor: any;
};

async function deployFixture(): Promise<Fixture> {
  const signers = await hre.ethers.getSigners();
  const bootstrap = signers[0]!;
  const timelock = signers[1]!;
  const guardian = signers[2]!;
  const alice = signers[3]!;
  const bob = signers[4]!;
  const keeper = signers[5]!;
  const sponsor = signers[6]!;

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
  const wrapper: any = await (
    await hre.ethers.getContractFactory("MockVrfV2PlusWrapper", bootstrap)
  ).deploy();
  await wrapper.waitForDeployment();
  const vrf: any = await (
    await hre.ethers.getContractFactory("PoolVrfAdapter", bootstrap)
  ).deploy(await wrapper.getAddress(), bootstrap.address, timelock.address);
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
      winnerAclDelayBlocks: ACL_DELAY_BLOCKS,
      slotBondWei: parseEther("0.001"),
      liquidityTargetBps: 2_000,
    },
  );
  await pool.waitForDeployment();

  await (await controller.bindPool(await pool.getAddress())).wait();
  await (await vrf.bindPool(await pool.getAddress())).wait();
  await (await vrf.fund({ value: parseEther("0.01") })).wait();
  await (await pool.activate()).wait();
  await hre.fhevm.assertCoprocessorInitialized(pool, "ConfidentialPrizePoolHarness");
  await hre.fhevm.assertCoprocessorInitialized(token, "TestConfidentialUSDT");
  await hre.fhevm.assertCoprocessorInitialized(controller, "SettlementController");

  return {
    asset,
    token,
    strategy,
    controller,
    wrapper,
    vrf,
    pool,
    bootstrap,
    timelock,
    guardian,
    alice,
    bob,
    keeper,
    sponsor,
  };
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
    queued: await decrypt64(handles[4]),
    prizeReserve: await decrypt64(handles[5]),
  };
}

async function acquireAndDeposit(fixture: Fixture, signer: any, amount: bigint): Promise<void> {
  await (await fixture.asset.mint(signer.address, amount)).wait();
  await (
    await fixture.asset.connect(signer).approve(await fixture.token.getAddress(), amount)
  ).wait();
  await (await fixture.token.connect(signer).wrap(signer.address, amount)).wait();
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

async function advancePast(timestamp: bigint): Promise<void> {
  const latest = await hre.ethers.provider.getBlock("latest");
  const delta = Number(timestamp) - (latest?.timestamp ?? 0) + 1;
  if (delta > 0) {
    await hre.network.provider.send("evm_increaseTime", [delta]);
    await hre.network.provider.send("evm_mine");
  }
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

describe("M9 cross-contract lifecycle", function () {
  this.timeout(900_000);

  it("runs deposit, maturity, TEST YIELD, VRF, draw, ACL, prize, and queued redemption end to end", async function () {
    const fixture = await deployFixture();
    await acquireAndDeposit(fixture, fixture.alice, 300_000n);
    await acquireAndDeposit(fixture, fixture.bob, 200_000n);

    await (await fixture.pool.beginInvestmentSettlement(500_000)).wait();
    const investmentId = await fixture.pool.activeSettlementId();
    await finalizeInvestment(fixture, investmentId, 400_000n);
    expect(await fixture.controller.deployedPrincipal()).to.equal(400_000n);

    await (await fixture.asset.mint(fixture.sponsor.address, 50_000n)).wait();
    await (
      await fixture.asset
        .connect(fixture.sponsor)
        .approve(await fixture.strategy.getAddress(), 50_000n)
    ).wait();
    await (await fixture.strategy.connect(fixture.sponsor).sponsorTestYield(50_000n)).wait();
    await (await fixture.pool.beginYieldHarvest(50_000)).wait();
    await (
      await fixture.controller.executeSettlement(await fixture.pool.activeSettlementId())
    ).wait();
    const harvestedPrize = (await accounting(fixture)).prizeReserve;
    expect(harvestedPrize).to.be.greaterThan(0n);
    expect(harvestedPrize).to.be.at.most(50_000n);

    // Epoch 1 has no eligible weight. Freezing it matures deposits for epoch 2,
    // then a terminal timeout rolls its prize forward without rerolling randomness.
    await advancePast((await fixture.pool.epochPublic(1))[2]);
    await (await fixture.pool.freezeEpoch(1)).wait();
    expect(await decrypt64(await fixture.pool.epochWeightHandle(1, 0))).to.equal(0n);
    await advancePast((await fixture.pool.epochPublic(1))[4]);
    await (await fixture.pool.abandonUnrequestedEpoch(1)).wait();
    await (await fixture.pool.openNextEpoch()).wait();

    await advancePast((await fixture.pool.epochPublic(2))[2]);
    await (await fixture.pool.freezeEpoch(2)).wait();
    expect(await decrypt64(await fixture.pool.epochWeightHandle(2, 0))).to.equal(300_000n);
    expect(await decrypt64(await fixture.pool.epochWeightHandle(2, 1))).to.equal(200_000n);

    await (await fixture.pool.requestEpochRandomness(2)).wait();
    const requestId = (await fixture.pool.epochRandomness(2))[0];
    const callback = await (await fixture.wrapper.fulfill(requestId, [0n])).wait();
    expect(callback.gasUsed).to.be.lessThan(200_000n);
    expect((await fixture.pool.epochPublic(2))[0]).to.equal(3n); // RANDOMNESS_REQUESTED
    await (await fixture.pool.syncEpochRandomness(2)).wait();
    const draw = await (await fixture.pool.executeEncryptedDraw(2)).wait();
    const hcu = hre.fhevm.computeTransactionHCU(draw);
    expect(hcu.globalHCU).to.be.lessThanOrEqual(17_000_000);
    expect(hcu.maxHCUDepth).to.be.lessThanOrEqual(4_000_000);

    const winnerState = await fixture.pool.epochWinner(2);
    const winnerReveal = await hre.fhevm.publicDecrypt([winnerState[0]]);
    await hre.network.provider.send("hardhat_mine", [`0x${ACL_DELAY_BLOCKS.toString(16)}`]);
    await (
      await fixture.pool
        .connect(fixture.keeper)
        .finalizeWinner(2, fixture.alice.address, winnerReveal.decryptionProof)
    ).wait();
    expect((await fixture.pool.epochWinner(2))[2]).to.equal(fixture.alice.address);

    const prizeHandle = await fixture.pool.prizeHandle(2);
    expect(
      await hre.fhevm.userDecryptEuint(
        FhevmType.euint64,
        prizeHandle,
        await fixture.pool.getAddress(),
        fixture.alice,
      ),
    ).to.equal(harvestedPrize);
    await (await fixture.pool.connect(fixture.alice).claimPrize(2)).wait();

    const withdrawalId = await requestWithdrawal(fixture, fixture.alice, 180_000n);
    await finalizeRouting(fixture, withdrawalId, true);
    expect(await decrypt64(await fixture.pool.withdrawalHandle(withdrawalId))).to.equal(80_000n);

    await (await fixture.pool.beginWithdrawalSettlement(80_000)).wait();
    const redemptionId = await fixture.pool.activeSettlementId();
    const aggregateHandle = (await fixture.controller.settlementPublic(redemptionId))[5];
    const aggregateReveal = await hre.fhevm.publicDecrypt([aggregateHandle]);
    await (
      await fixture.controller.finalizePrincipalRedemption(
        redemptionId,
        80_000,
        aggregateReveal.decryptionProof,
      )
    ).wait();
    expect((await accounting(fixture)).claimLiquidity).to.equal(80_000n);
    await (await fixture.pool.serviceFifoHead()).wait();
    await finalizeCompletion(fixture, withdrawalId, true);

    const aliceBalance = await fixture.token.confidentialBalanceOf(fixture.alice.address);
    expect(await decrypt64(aliceBalance)).to.equal(harvestedPrize + 180_000n);
    const finalAccounting = await accounting(fixture);
    expect(finalAccounting.liability).to.equal(320_000n);
    expect(finalAccounting.principalLiquidity).to.equal(0n);
    expect(finalAccounting.inFlight).to.equal(0n);
    expect(finalAccounting.claimLiquidity).to.equal(0n);
    expect(finalAccounting.queued).to.equal(0n);
    expect(finalAccounting.prizeReserve).to.equal(0n);
    expect(await fixture.controller.deployedPrincipal()).to.equal(320_000n);
    const strategyAssets = await fixture.strategy.totalAssets();
    expect(strategyAssets).to.be.at.least(320_000n);
    expect(strategyAssets - 320_000n).to.be.at.most(1n);
  });

  it("keeps a failed cross-contract investment retryable without changing intent", async function () {
    const fixture = await deployFixture();
    await acquireAndDeposit(fixture, fixture.alice, 100_000n);
    await (await fixture.strategy.connect(fixture.guardian).pauseDeposits()).wait();

    await (await fixture.pool.beginInvestmentSettlement(100_000)).wait();
    const settlementId = await fixture.pool.activeSettlementId();
    await finalizeInvestment(fixture, settlementId, 80_000n);
    let state = await fixture.controller.settlementPublic(settlementId);
    expect(state[1]).to.equal(5n); // FAILED_RETRYABLE
    expect(state[2]).to.equal(2n); // STRATEGY_ACTION_PENDING
    expect(state[6]).to.equal(80_000n);
    expect((await accounting(fixture)).inFlight).to.equal(80_000n);

    await (await fixture.strategy.connect(fixture.timelock).unpauseDeposits()).wait();
    await (await fixture.controller.executeSettlement(settlementId)).wait();
    state = await fixture.controller.settlementPublic(settlementId);
    expect(state[1]).to.equal(6n); // COMPLETED
    expect(state[12]).to.equal(1n);
    expect(await fixture.pool.activeSettlementId()).to.equal(0n);
    expect((await accounting(fixture)).inFlight).to.equal(0n);
    expect(await fixture.controller.deployedPrincipal()).to.equal(80_000n);
  });
});
