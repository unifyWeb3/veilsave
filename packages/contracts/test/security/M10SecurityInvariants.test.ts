import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { AbiCoder, ZeroAddress, ZeroHash, keccak256, parseEther, toUtf8Bytes } from "ethers";
import * as hre from "hardhat";

const DAY = 24 * 60 * 60;
const SLOT_BOND = parseEther("0.001");
const ALL_PAUSE_SCOPES = 15n;

type StrategyKind = "test" | "lossy" | "reentrant";

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
  keeper: any;
  sponsor: any;
  outsider: any;
  users: any[];
};

async function deployFixture(options?: {
  strategyKind?: StrategyKind;
  bind?: boolean;
  activate?: boolean;
}): Promise<Fixture> {
  const signers = await hre.ethers.getSigners();
  const bootstrap = signers[0]!;
  const timelock = signers[1]!;
  const guardian = signers[2]!;
  const alice = signers[3]!;
  const bob = signers[4]!;
  const keeper = signers[5]!;
  const sponsor = signers[6]!;
  const outsider = signers[7]!;
  const strategyKind = options?.strategyKind ?? "test";
  const bind = options?.bind ?? true;
  const activate = options?.activate ?? true;

  const asset: any = await (
    await hre.ethers.getContractFactory("MockSixDecimalAsset", bootstrap)
  ).deploy();
  await asset.waitForDeployment();
  const token: any = await (
    await hre.ethers.getContractFactory("TestConfidentialUSDT", bootstrap)
  ).deploy(await asset.getAddress());
  await token.waitForDeployment();

  const strategyId = keccak256(toUtf8Bytes(`VEILSAVE_${strategyKind.toUpperCase()}_V1`));
  let strategy: any;
  if (strategyKind === "reentrant") {
    strategy = await (
      await hre.ethers.getContractFactory("ReentrantTestYieldVault", bootstrap)
    ).deploy(await asset.getAddress(), strategyId);
  } else {
    const factoryName =
      strategyKind === "lossy" ? "TestLossyYieldVault" : "DeterministicTestYieldVault";
    strategy = await (
      await hre.ethers.getContractFactory(factoryName, bootstrap)
    ).deploy(await asset.getAddress(), timelock.address, guardian.address, strategyId);
  }
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
  if (strategyKind === "reentrant") {
    await (await strategy.setController(await controller.getAddress())).wait();
  }

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
      slotBondWei: SLOT_BOND,
      liquidityTargetBps: 2_000,
    },
  );
  await pool.waitForDeployment();
  await hre.fhevm.assertCoprocessorInitialized(pool, "ConfidentialPrizePoolHarness");
  await hre.fhevm.assertCoprocessorInitialized(token, "TestConfidentialUSDT");
  await hre.fhevm.assertCoprocessorInitialized(controller, "SettlementController");

  if (bind) {
    await (await controller.bindPool(await pool.getAddress())).wait();
    await (await vrf.bindPool(await pool.getAddress())).wait();
  }
  if (activate) {
    await (await pool.activate()).wait();
  }

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
    keeper,
    sponsor,
    outsider,
    users: signers.slice(3, 19),
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
    totalQueued: await decrypt64(handles[4]),
    prizeReserve: await decrypt64(handles[5]),
  };
}

async function position(fixture: Fixture, owner: string) {
  const weights = await fixture.pool.weightHandles(owner);
  return {
    principal: await decrypt64(await fixture.pool.principalHandle(owner)),
    eligible: await decrypt64(weights[0]),
    pending: await decrypt64(weights[1]),
  };
}

async function acquireConfidentialAsset(
  fixture: Fixture,
  signer: any,
  amount: bigint,
): Promise<void> {
  await (await fixture.asset.mint(signer.address, amount)).wait();
  await (
    await fixture.asset.connect(signer).approve(await fixture.token.getAddress(), amount)
  ).wait();
  await (await fixture.token.connect(signer).wrap(signer.address, amount)).wait();
}

async function depositExistingSlot(fixture: Fixture, signer: any, amount: bigint): Promise<void> {
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

async function reserveAndDeposit(fixture: Fixture, signer: any, amount: bigint): Promise<void> {
  await acquireConfidentialAsset(fixture, signer, amount);
  await (await fixture.pool.connect(signer).reserveSlot({ value: SLOT_BOND })).wait();
  await depositExistingSlot(fixture, signer, amount);
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

async function requestClosingWithdrawal(fixture: Fixture, signer: any): Promise<bigint> {
  await (await fixture.pool.connect(signer).requestWithdrawal(ZeroHash, "0x", true)).wait();
  return (await fixture.pool.nextWithdrawalId()) - 1n;
}

async function publicProof(handle: string) {
  return hre.fhevm.publicDecrypt([handle]);
}

async function finalizeRouting(
  fixture: Fixture,
  withdrawalId: bigint,
  hasRemainder: boolean,
): Promise<void> {
  const state = await fixture.pool.withdrawalPublic(withdrawalId);
  const reveal = await publicProof(state[7]);
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
  const reveal = await publicProof(state[8]);
  await (
    await fixture.pool.finalizeWithdrawalCompletion(withdrawalId, complete, reveal.decryptionProof)
  ).wait();
}

async function finalizeInvestment(fixture: Fixture, settlementId: bigint): Promise<bigint> {
  const settlement = await fixture.controller.settlementPublic(settlementId);
  const unwrapHandle = await fixture.token.unwrapAmount(settlement[7]);
  const clearAmount = await decrypt64(unwrapHandle);
  const reveal = await publicProof(unwrapHandle);
  await (
    await fixture.controller.finalizeInvestmentAggregate(
      settlementId,
      clearAmount,
      reveal.decryptionProof,
    )
  ).wait();
  return clearAmount;
}

async function finalizeRedemption(fixture: Fixture, settlementId: bigint): Promise<bigint> {
  const settlement = await fixture.controller.settlementPublic(settlementId);
  const clearAmount = await decrypt64(settlement[5]);
  const reveal = await publicProof(settlement[5]);
  await (
    await fixture.controller.finalizePrincipalRedemption(
      settlementId,
      clearAmount,
      reveal.decryptionProof,
    )
  ).wait();
  return clearAmount;
}

async function advancePast(timestamp: bigint): Promise<void> {
  const latest = await hre.ethers.provider.getBlock("latest");
  const delta = Number(timestamp) - (latest?.timestamp ?? 0) + 1;
  if (delta > 0) {
    await hre.network.provider.send("evm_increaseTime", [delta]);
    await hre.network.provider.send("evm_mine");
  }
}

async function deployReplacementStrategy(fixture: Fixture, asset?: string) {
  const replacement: any = await (
    await hre.ethers.getContractFactory("DeterministicTestYieldVault", fixture.bootstrap)
  ).deploy(
    asset ?? (await fixture.asset.getAddress()),
    fixture.timelock.address,
    fixture.guardian.address,
    keccak256(toUtf8Bytes("VEILSAVE_REPLACEMENT_TEST_YIELD_V1")),
  );
  await replacement.waitForDeployment();
  return replacement;
}

describe("M10 security, property, and invariant hardening", function () {
  this.timeout(1_200_000);

  it("preserves principal conservation and principal/prize separation across settlement", async function () {
    const fixture = await deployFixture();
    await reserveAndDeposit(fixture, fixture.alice, 300_000n);
    await reserveAndDeposit(fixture, fixture.bob, 200_000n);

    let ledger = await accounting(fixture);
    expect(ledger).to.deep.equal({
      liability: 500_000n,
      principalLiquidity: 500_000n,
      inFlight: 0n,
      claimLiquidity: 0n,
      totalQueued: 0n,
      prizeReserve: 0n,
    });

    await (await fixture.pool.beginInvestmentSettlement(500_000)).wait();
    const investmentId = await fixture.pool.activeSettlementId();
    expect(await finalizeInvestment(fixture, investmentId)).to.equal(400_000n);
    ledger = await accounting(fixture);
    expect(ledger.liability).to.equal(500_000n);
    expect(ledger.principalLiquidity).to.equal(100_000n);
    expect(ledger.inFlight).to.equal(0n);
    expect(await fixture.controller.deployedPrincipal()).to.equal(400_000n);
    expect(ledger.liability).to.equal(
      ledger.principalLiquidity +
        ledger.claimLiquidity +
        (await fixture.controller.deployedPrincipal()),
    );

    const withdrawalId = await requestWithdrawal(fixture, fixture.alice, 250_000n);
    await finalizeRouting(fixture, withdrawalId, true);
    ledger = await accounting(fixture);
    expect((await position(fixture, fixture.alice.address)).principal).to.equal(50_000n);
    expect(ledger.totalQueued).to.equal(150_000n);
    expect(ledger.liability).to.equal(400_000n);
    expect(
      await decrypt64(await fixture.token.confidentialBalanceOf(fixture.alice.address)),
    ).to.equal(100_000n);

    await (await fixture.pool.beginWithdrawalSettlement(100_000)).wait();
    await finalizeRedemption(fixture, await fixture.pool.activeSettlementId());
    await (await fixture.pool.serviceFifoHead()).wait();
    await finalizeCompletion(fixture, withdrawalId, false);

    ledger = await accounting(fixture);
    expect(ledger.totalQueued).to.equal(50_000n);
    expect(ledger.liability).to.equal(300_000n);
    expect(await fixture.controller.deployedPrincipal()).to.equal(300_000n);
    expect(
      await decrypt64(await fixture.token.confidentialBalanceOf(fixture.alice.address)),
    ).to.equal(200_000n);

    await (await fixture.pool.beginWithdrawalSettlement(50_000)).wait();
    await finalizeRedemption(fixture, await fixture.pool.activeSettlementId());
    await (await fixture.pool.serviceFifoHead()).wait();
    await finalizeCompletion(fixture, withdrawalId, true);

    ledger = await accounting(fixture);
    const alice = await position(fixture, fixture.alice.address);
    const bob = await position(fixture, fixture.bob.address);
    expect(alice.principal + bob.principal + ledger.totalQueued).to.equal(ledger.liability);
    expect(ledger.liability).to.equal(250_000n);
    expect(await fixture.controller.deployedPrincipal()).to.equal(250_000n);
    expect(
      await decrypt64(await fixture.token.confidentialBalanceOf(fixture.alice.address)),
    ).to.equal(250_000n);

    await (await fixture.asset.mint(fixture.sponsor.address, 30_000n)).wait();
    await (
      await fixture.asset
        .connect(fixture.sponsor)
        .approve(await fixture.strategy.getAddress(), 30_000n)
    ).wait();
    await (await fixture.strategy.connect(fixture.sponsor).sponsorTestYield(30_000n)).wait();
    await (await fixture.pool.beginYieldHarvest(30_000)).wait();
    await (
      await fixture.controller.executeSettlement(await fixture.pool.activeSettlementId())
    ).wait();

    ledger = await accounting(fixture);
    expect(ledger.prizeReserve).to.be.greaterThan(0n);
    expect(ledger.prizeReserve).to.be.lte(30_000n);
    expect(ledger.liability).to.equal(250_000n);
    expect(await fixture.controller.deployedPrincipal()).to.equal(250_000n);
    expect(await fixture.strategy.maxWithdraw(await fixture.controller.getAddress())).to.equal(
      250_000n,
    );
    expect(alice.eligible + alice.pending).to.be.lte(alice.principal);
    expect(bob.eligible + bob.pending).to.be.lte(bob.principal);
  });

  it("enters loss mode atomically, pauses new risk, and keeps impaired exits live", async function () {
    const fixture = await deployFixture({ strategyKind: "lossy" });
    await reserveAndDeposit(fixture, fixture.alice, 500_000n);
    await (await fixture.pool.beginInvestmentSettlement(500_000)).wait();
    await finalizeInvestment(fixture, await fixture.pool.activeSettlementId());

    await (await fixture.strategy.forceLoss(fixture.outsider.address, 100_000n)).wait();
    await expect(fixture.controller.connect(fixture.keeper).enterLossMode())
      .to.emit(fixture.controller, "LossModeEntered")
      .withArgs(400_000n, 300_000n)
      .and.to.emit(fixture.pool, "PauseScopesAdded")
      .withArgs(15, 15);

    expect(await fixture.controller.lossMode()).to.equal(true);
    expect(await fixture.controller.investmentsPaused()).to.equal(true);
    expect(await fixture.pool.pauseMask()).to.equal(ALL_PAUSE_SCOPES);
    await expect(fixture.pool.connect(fixture.timelock).unpause(15)).to.be.revertedWithCustomError(
      fixture.pool,
      "PauseScopeActive",
    );
    await expect(
      fixture.pool.connect(fixture.bob).reserveSlot({ value: SLOT_BOND }),
    ).to.be.revertedWithCustomError(fixture.pool, "PauseScopeActive");

    await acquireConfidentialAsset(fixture, fixture.alice, 10_000n);
    await depositExistingSlot(fixture, fixture.alice, 10_000n);
    expect((await position(fixture, fixture.alice.address)).principal).to.equal(500_000n);
    expect(
      await decrypt64(await fixture.token.confidentialBalanceOf(fixture.alice.address)),
    ).to.equal(10_000n);
    await expect(fixture.pool.beginInvestmentSettlement(1)).to.be.revertedWithCustomError(
      fixture.pool,
      "PauseScopeActive",
    );
    await expect(fixture.pool.beginYieldHarvest(1)).to.be.revertedWithCustomError(
      fixture.controller,
      "LossModeActive",
    );

    const epoch = await fixture.pool.epochPublic(1);
    await advancePast(epoch[2]);
    await (await fixture.pool.freezeEpoch(1)).wait();
    await advancePast((await fixture.pool.epochPublic(1))[4]);
    await (await fixture.pool.abandonUnrequestedEpoch(1)).wait();
    await expect(fixture.pool.openNextEpoch()).to.be.revertedWithCustomError(
      fixture.pool,
      "PauseScopeActive",
    );

    const closing = await requestClosingWithdrawal(fixture, fixture.alice);
    await finalizeRouting(fixture, closing, true);
    await (await fixture.pool.beginWithdrawalSettlement(500_000)).wait();
    await finalizeRedemption(fixture, await fixture.pool.activeSettlementId());
    await (await fixture.pool.serviceFifoHead()).wait();
    await finalizeCompletion(fixture, closing, false);

    const ledger = await accounting(fixture);
    expect(await decrypt64(await fixture.pool.withdrawalHandle(closing))).to.equal(100_000n);
    expect(ledger.totalQueued).to.equal(100_000n);
    expect(ledger.liability).to.equal(100_000n);
    expect(await fixture.controller.deployedPrincipal()).to.equal(100_000n);
    expect(await fixture.strategy.maxWithdraw(await fixture.controller.getAddress())).to.equal(0n);
    expect((await fixture.pool.fifoHead())[0]).to.equal(closing);
    expect(
      await decrypt64(await fixture.token.confidentialBalanceOf(fixture.alice.address)),
    ).to.equal(410_000n);
  });

  it("enforces timelocked, paused, idle, drained, same-asset strategy replacement", async function () {
    const fixture = await deployFixture();
    const replacement = await deployReplacementStrategy(fixture);

    await expect(
      fixture.controller.connect(fixture.outsider).setStrategy(await replacement.getAddress()),
    ).to.be.revertedWithCustomError(fixture.controller, "NotTimelock");
    await expect(
      fixture.controller.connect(fixture.timelock).setStrategy(await replacement.getAddress()),
    ).to.be.revertedWithCustomError(fixture.controller, "InvestmentNotPaused");

    await (await fixture.controller.connect(fixture.guardian).pauseInvestments()).wait();
    const wrongAsset: any = await (
      await hre.ethers.getContractFactory("MockSixDecimalAsset", fixture.bootstrap)
    ).deploy();
    await wrongAsset.waitForDeployment();
    const wrongStrategy = await deployReplacementStrategy(fixture, await wrongAsset.getAddress());
    await expect(
      fixture.controller.connect(fixture.timelock).setStrategy(await wrongStrategy.getAddress()),
    ).to.be.revertedWithCustomError(fixture.controller, "InvalidStrategy");

    await expect(
      fixture.controller.connect(fixture.timelock).setStrategy(await replacement.getAddress()),
    )
      .to.emit(fixture.controller, "StrategyChanged")
      .withArgs(
        await fixture.strategy.getAddress(),
        await replacement.getAddress(),
        0,
        await replacement.strategyId(),
      );
    expect(await fixture.controller.strategy()).to.equal(await replacement.getAddress());

    const funded = await deployFixture();
    await reserveAndDeposit(funded, funded.alice, 100_000n);
    await (await funded.pool.beginInvestmentSettlement(100_000)).wait();
    await finalizeInvestment(funded, await funded.pool.activeSettlementId());
    await (await funded.controller.connect(funded.guardian).pauseInvestments()).wait();
    const fundedReplacement = await deployReplacementStrategy(funded);
    await expect(
      funded.controller.connect(funded.timelock).setStrategy(await fundedReplacement.getAddress()),
    ).to.be.revertedWithCustomError(funded.controller, "StrategyNotDrained");

    const active = await deployFixture();
    await reserveAndDeposit(active, active.alice, 100_000n);
    await (await active.pool.testMoveAllPrincipalLiquidityToInFlight()).wait();
    const withdrawalId = await requestWithdrawal(active, active.alice, 50_000n);
    await finalizeRouting(active, withdrawalId, true);
    await (await active.pool.beginWithdrawalSettlement(50_000)).wait();
    await (await active.controller.connect(active.guardian).pauseInvestments()).wait();
    const activeReplacement = await deployReplacementStrategy(active);
    await expect(
      active.controller.connect(active.timelock).setStrategy(await activeReplacement.getAddress()),
    ).to.be.revertedWithCustomError(active.controller, "ActiveSettlement");
  });

  it("locks bootstrap authority and exposes no privileged winner or accounting mutation", async function () {
    const fixture = await deployFixture({ bind: false, activate: false });

    await expect(
      fixture.pool.connect(fixture.alice).reserveSlot({ value: SLOT_BOND }),
    ).to.be.revertedWithCustomError(fixture.pool, "NotActive");
    await expect(fixture.pool.freezeEpoch.staticCall(0)).to.be.revertedWithCustomError(
      fixture.pool,
      "NotActive",
    );
    await expect(
      fixture.pool.beginInvestmentSettlement.staticCall(1),
    ).to.be.revertedWithCustomError(fixture.pool, "NotActive");
    await expect(
      fixture.controller.connect(fixture.outsider).bindPool(await fixture.pool.getAddress()),
    ).to.be.revertedWithCustomError(fixture.controller, "BootstrapOnly");
    await expect(
      fixture.vrf.connect(fixture.outsider).bindPool(await fixture.pool.getAddress()),
    ).to.be.revertedWithCustomError(fixture.vrf, "BootstrapOnly");
    await expect(fixture.pool.activate()).to.be.revertedWithCustomError(
      fixture.pool,
      "DependencyBindingMismatch",
    );

    await (await fixture.controller.bindPool(await fixture.pool.getAddress())).wait();
    await (await fixture.vrf.bindPool(await fixture.pool.getAddress())).wait();
    await expect(fixture.pool.connect(fixture.outsider).activate()).to.be.revertedWithCustomError(
      fixture.pool,
      "BootstrapOnly",
    );
    await (await fixture.pool.activate()).wait();

    expect(await fixture.pool.bootstrapAuthority()).to.equal(ZeroAddress);
    expect(await fixture.controller.bootstrapAuthority()).to.equal(ZeroAddress);
    expect(await fixture.vrf.bootstrapAuthority()).to.equal(ZeroAddress);
    await expect(
      fixture.controller.bindPool(await fixture.pool.getAddress()),
    ).to.be.revertedWithCustomError(fixture.controller, "BootstrapOnly");
    await expect(
      fixture.vrf.bindPool(await fixture.pool.getAddress()),
    ).to.be.revertedWithCustomError(fixture.vrf, "BootstrapOnly");
    await expect(fixture.pool.activate()).to.be.reverted;

    expect(await fixture.pool.PARTICIPANT_CAPACITY()).to.equal(16n);
    expect(await fixture.pool.epochDuration()).to.equal(7n * BigInt(DAY));
    const forbiddenFunctions = [
      "setWinner",
      "setWeight",
      "setPrizeRecipient",
      "setParticipantCapacity",
      "setFee",
      "setVrfAdapter",
      "grantPrizeAccess",
      "upgradeTo",
      "upgradeToAndCall",
    ];
    for (const functionName of forbiddenFunctions) {
      expect(fixture.pool.interface.getFunction(functionName)).to.equal(null);
    }

    await expect(fixture.pool.connect(fixture.timelock).pause(1)).to.be.revertedWithCustomError(
      fixture.pool,
      "NotPauseGuardian",
    );
    await expect(fixture.pool.connect(fixture.guardian).unpause(1)).to.be.revertedWithCustomError(
      fixture.pool,
      "NotTimelock",
    );
    await expect(
      fixture.controller.connect(fixture.outsider).startPrincipalRedemption(ZeroHash, 1),
    ).to.be.revertedWithCustomError(fixture.controller, "NotPool");
  });

  it("binds withdrawal proofs to the current handle, value, state, and version", async function () {
    const fixture = await deployFixture();
    await reserveAndDeposit(fixture, fixture.alice, 200_000n);
    await reserveAndDeposit(fixture, fixture.bob, 100_000n);
    await (await fixture.pool.testMoveAllPrincipalLiquidityToInFlight()).wait();

    const aliceId = await requestWithdrawal(fixture, fixture.alice, 100_000n);
    const bobId = await requestWithdrawal(fixture, fixture.bob, 50_000n);
    const aliceRouting = await fixture.pool.withdrawalPublic(aliceId);
    const aliceRoutingProof = await publicProof(aliceRouting[7]);

    await expect(
      fixture.pool.finalizeWithdrawalRouting(bobId, true, aliceRoutingProof.decryptionProof),
    ).to.be.reverted;
    await (
      await fixture.pool.finalizeWithdrawalRouting(aliceId, true, aliceRoutingProof.decryptionProof)
    ).wait();
    await expect(
      fixture.pool.finalizeWithdrawalRouting(aliceId, true, aliceRoutingProof.decryptionProof),
    ).to.be.revertedWithCustomError(fixture.pool, "WrongWithdrawalState");
    await finalizeRouting(fixture, bobId, true);

    await (await fixture.pool.testReturnPrincipalClaimLiquidity(60_000)).wait();
    await (await fixture.pool.serviceFifoHead()).wait();
    const firstCompletion = await fixture.pool.withdrawalPublic(aliceId);
    const firstCompletionProof = await publicProof(firstCompletion[8]);
    await expect(
      fixture.pool.finalizeWithdrawalCompletion(
        aliceId,
        true,
        firstCompletionProof.decryptionProof,
      ),
    ).to.be.reverted;
    await (
      await fixture.pool.finalizeWithdrawalCompletion(
        aliceId,
        false,
        firstCompletionProof.decryptionProof,
      )
    ).wait();

    await (await fixture.pool.testReturnPrincipalClaimLiquidity(40_000)).wait();
    await (await fixture.pool.serviceFifoHead()).wait();
    await expect(
      fixture.pool.finalizeWithdrawalCompletion(
        aliceId,
        false,
        firstCompletionProof.decryptionProof,
      ),
    ).to.be.reverted;
    const finalState = await fixture.pool.withdrawalPublic(aliceId);
    const finalProof = await publicProof(finalState[8]);
    await (
      await fixture.pool.finalizeWithdrawalCompletion(aliceId, true, finalProof.decryptionProof)
    ).wait();
    await expect(
      fixture.pool.finalizeWithdrawalCompletion(aliceId, true, finalProof.decryptionProof),
    ).to.be.revertedWithCustomError(fixture.pool, "WrongWithdrawalState");
    expect((await fixture.pool.fifoHead())[0]).to.equal(bobId);
  });

  it("keeps aggregate settlement intent unchanged after malformed proof and replay", async function () {
    const fixture = await deployFixture();
    await reserveAndDeposit(fixture, fixture.alice, 100_000n);
    await (await fixture.pool.beginInvestmentSettlement(100_000)).wait();
    const settlementId = await fixture.pool.activeSettlementId();
    const settlement = await fixture.controller.settlementPublic(settlementId);
    const unwrapHandle = await fixture.token.unwrapAmount(settlement[7]);
    const clearAmount = await decrypt64(unwrapHandle);
    const reveal = await publicProof(unwrapHandle);

    await expect(
      fixture.controller.finalizeInvestmentAggregate(
        settlementId,
        clearAmount + 1n,
        reveal.decryptionProof,
      ),
    ).to.be.reverted;
    expect(await fixture.pool.activeSettlementId()).to.equal(settlementId);
    expect(await fixture.controller.activeSettlementId()).to.equal(settlementId);
    expect((await fixture.controller.settlementPublic(settlementId))[1]).to.equal(1n);
    expect(await fixture.asset.balanceOf(await fixture.controller.getAddress())).to.equal(0n);

    await (
      await fixture.controller.finalizeInvestmentAggregate(
        settlementId,
        clearAmount,
        reveal.decryptionProof,
      )
    ).wait();
    expect(await fixture.controller.deployedPrincipal()).to.equal(clearAmount);
    await expect(
      fixture.controller.finalizeInvestmentAggregate(
        settlementId,
        clearAmount,
        reveal.decryptionProof,
      ),
    ).to.be.revertedWithCustomError(fixture.controller, "WrongSettlement");
  });

  it("blocks strategy and bond-return reentrancy without blocking the intended action", async function () {
    const fixture = await deployFixture({ strategyKind: "reentrant" });
    await reserveAndDeposit(fixture, fixture.alice, 100_000n);
    await (await fixture.pool.beginInvestmentSettlement(100_000)).wait();
    const settlementId = await fixture.pool.activeSettlementId();
    const invested = await finalizeInvestment(fixture, settlementId);
    expect(invested).to.equal(80_000n);
    expect(await fixture.strategy.reentryAttempted()).to.equal(true);
    expect(await fixture.strategy.reentrySucceeded()).to.equal(false);
    expect(await fixture.controller.activeSettlementId()).to.equal(0n);
    expect(await fixture.controller.deployedPrincipal()).to.equal(80_000n);

    const slotFixture = await deployFixture();
    const owner: any = await (
      await hre.ethers.getContractFactory("ReentrantSlotOwner", slotFixture.outsider)
    ).deploy(await slotFixture.pool.getAddress());
    await owner.waitForDeployment();
    await (await owner.reserve({ value: SLOT_BOND })).wait();
    expect((await slotFixture.pool.slotOf(await owner.getAddress()))[0]).to.equal(true);
    await (await owner.release(0)).wait();
    expect(await owner.reentryAttempted()).to.equal(true);
    expect(await owner.reentrySucceeded()).to.equal(false);
    expect((await slotFixture.pool.slotOf(await owner.getAddress()))[0]).to.equal(false);
    expect(await hre.ethers.provider.getBalance(await owner.getAddress())).to.equal(SLOT_BOND);
  });

  it("matches a strict request-time FIFO model across partial randomized liquidity", async function () {
    const fixture = await deployFixture();
    const users = fixture.users.slice(0, 4);
    const deposits = [130_000n, 90_000n, 70_000n, 50_000n];
    const requests = [80_000n, 50_000n, 70_000n, 20_000n];
    const ids: bigint[] = [];

    for (let index = 0; index < users.length; index += 1) {
      await reserveAndDeposit(fixture, users[index], deposits[index]!);
    }
    await (await fixture.pool.testMoveAllPrincipalLiquidityToInFlight()).wait();
    for (let index = 0; index < users.length; index += 1) {
      ids.push(await requestWithdrawal(fixture, users[index], requests[index]!));
    }

    for (let index = ids.length - 1; index > 0; index -= 1) {
      await finalizeRouting(fixture, ids[index]!, true);
    }
    await expect(fixture.pool.serviceFifoHead()).to.be.revertedWithCustomError(
      fixture.pool,
      "OlderWithdrawalRoutingPending",
    );
    await finalizeRouting(fixture, ids[0]!, true);

    const remaining = [...requests];
    const chunks = [30_000n, 50_000n, 50_000n, 20_000n, 50_000n, 20_000n];
    let headIndex = 0;
    for (const chunk of chunks) {
      await (await fixture.pool.testReturnPrincipalClaimLiquidity(chunk)).wait();
      const currentClaim = remaining[headIndex]!;
      const expectedPayment = chunk < currentClaim ? chunk : currentClaim;
      await (await fixture.pool.serviceFifoHead()).wait();
      remaining[headIndex] = currentClaim - expectedPayment;
      const complete = remaining[headIndex] === 0n;
      await finalizeCompletion(fixture, ids[headIndex]!, complete);
      if (complete) headIndex += 1;

      const ledger = await accounting(fixture);
      const expectedQueued = remaining.reduce((total, value) => total + value, 0n);
      expect(ledger.totalQueued).to.equal(expectedQueued);
      if (headIndex < ids.length) {
        expect((await fixture.pool.fifoHead())[0]).to.equal(ids[headIndex]);
      }
    }

    const ledger = await accounting(fixture);
    expect(remaining).to.deep.equal([0n, 0n, 0n, 0n]);
    expect(ledger.totalQueued).to.equal(0n);
    expect(ledger.claimLiquidity).to.equal(0n);
    expect(ledger.liability).to.equal(120_000n);
    expect(ledger.inFlight).to.equal(120_000n);
    expect((await fixture.pool.fifoHead())[0]).to.equal(0n);
    for (let index = 0; index < users.length; index += 1) {
      expect(
        await decrypt64(await fixture.token.confidentialBalanceOf(users[index].address)),
      ).to.equal(requests[index]);
      const userPosition = await position(fixture, users[index].address);
      expect(userPosition.principal).to.equal(deposits[index]! - requests[index]!);
      expect(userPosition.eligible + userPosition.pending).to.be.lte(userPosition.principal);
    }
  });
});
