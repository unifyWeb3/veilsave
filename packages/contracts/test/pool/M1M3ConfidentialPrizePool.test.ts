import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { AbiCoder, ZeroAddress, ZeroHash, parseEther } from "ethers";
import * as hre from "hardhat";

const DAY = 24 * 60 * 60;
const EPOCH_DURATION = 7 * DAY;
const REQUEST_TIMEOUT = DAY;

type Fixture = {
  asset: any;
  token: any;
  vrf: any;
  settlement: any;
  pool: any;
  bootstrap: any;
  timelock: any;
  guardian: any;
  users: any[];
};

async function deployFixture(): Promise<Fixture> {
  const signers = await hre.ethers.getSigners();
  const bootstrap = signers[0]!;
  const timelock = signers[1]!;
  const guardian = signers[2]!;
  const users = signers.slice(3);

  const asset: any = await (
    await hre.ethers.getContractFactory("MockSixDecimalAsset", bootstrap)
  ).deploy();
  await asset.waitForDeployment();
  const token: any = await (
    await hre.ethers.getContractFactory("TestConfidentialUSDT", bootstrap)
  ).deploy(await asset.getAddress());
  await token.waitForDeployment();
  const vrf: any = await (
    await hre.ethers.getContractFactory("MockPoolVrfBinding", bootstrap)
  ).deploy(bootstrap.address, timelock.address);
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
      epochDuration: EPOCH_DURATION,
      requestTimeout: REQUEST_TIMEOUT,
      fulfillmentTimeout: REQUEST_TIMEOUT,
      drawTimeout: REQUEST_TIMEOUT,
      winnerAclDelayBlocks: 96,
      slotBondWei: parseEther("0.001"),
      liquidityTargetBps: 2_000,
    },
  );
  await pool.waitForDeployment();

  await (await vrf.bindPool(await pool.getAddress())).wait();
  await (await settlement.bindPool(await pool.getAddress())).wait();
  await (await pool.activate()).wait();
  await hre.fhevm.assertCoprocessorInitialized(pool, "ConfidentialPrizePoolHarness");
  await hre.fhevm.assertCoprocessorInitialized(token, "TestConfidentialUSDT");

  return { asset, token, vrf, settlement, pool, bootstrap, timelock, guardian, users };
}

async function prepareConfidentialAsset(
  fixture: Fixture,
  signer: any,
  amount: bigint,
): Promise<void> {
  await (await fixture.asset.mint(signer.address, amount)).wait();
  await (
    await (fixture.asset.connect(signer) as any).approve(await fixture.token.getAddress(), amount)
  ).wait();
  await (await (fixture.token.connect(signer) as any).wrap(signer.address, amount)).wait();
}

async function encryptedInput(fixture: Fixture, signer: any, amount: bigint) {
  const input = hre.fhevm.createEncryptedInput(await fixture.token.getAddress(), signer.address);
  input.add64(amount);
  return input.encrypt();
}

async function deposit(
  fixture: Fixture,
  signer: any,
  amount: bigint,
  data?: string,
): Promise<void> {
  const input = await encryptedInput(fixture, signer, amount);
  const route =
    data ?? AbiCoder.defaultAbiCoder().encode(["bytes4"], [await fixture.pool.DEPOSIT_ROUTE()]);
  await (
    await (fixture.token.connect(signer) as any)[
      "confidentialTransferAndCall(address,bytes32,bytes,bytes)"
    ](await fixture.pool.getAddress(), input.handles[0], input.inputProof, route)
  ).wait();
}

async function decrypt64(handle: string): Promise<bigint> {
  if (handle === ZeroHash) return 0n;
  return hre.fhevm.debugger.decryptEuint(FhevmType.euint64, handle);
}

async function accountValues(fixture: Fixture, owner: string) {
  const [eligible, pending] = await fixture.pool.weightHandles(owner);
  const accounting = await fixture.pool.accountingHandles();
  return {
    principal: await decrypt64(await fixture.pool.principalHandle(owner)),
    eligible: await decrypt64(eligible),
    pending: await decrypt64(pending),
    totalLiability: await decrypt64(accounting[0]),
    principalLiquidity: await decrypt64(accounting[1]),
    inFlight: await decrypt64(accounting[2]),
    claimLiquidity: await decrypt64(accounting[3]),
    totalQueued: await decrypt64(accounting[4]),
    prizeReserve: await decrypt64(accounting[5]),
  };
}

async function advance(seconds: number): Promise<void> {
  await hre.network.provider.send("evm_increaseTime", [seconds]);
  await hre.network.provider.send("evm_mine");
}

async function advancePast(timestamp: bigint): Promise<void> {
  const block = await hre.ethers.provider.getBlock("latest");
  const now = block?.timestamp ?? 0;
  const target = Number(timestamp);
  if (target >= now) await advance(target - now + 1);
}

async function reserve(fixture: Fixture, signer: any): Promise<number> {
  const tx = await (fixture.pool.connect(signer) as any).reserveSlot({
    value: parseEther("0.001"),
  });
  const receipt = await tx.wait();
  const event = receipt.logs
    .map((log: any) => {
      try {
        return fixture.pool.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed: any) => parsed?.name === "SlotReserved");
  return Number(event?.args?.slot ?? -1);
}

async function freeze(fixture: Fixture, epochId = 1n): Promise<void> {
  const state = await fixture.pool.epochPublic(epochId);
  await advancePast(state[2]);
  await (await fixture.pool.freezeEpoch(epochId)).wait();
}

async function abandonUnrequested(fixture: Fixture, epochId = 1n): Promise<void> {
  const state = await fixture.pool.epochPublic(epochId);
  await advancePast(state[4]);
  await (await fixture.pool.abandonUnrequestedEpoch(epochId)).wait();
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

describe("ConfidentialPrizePool M1-M3", function () {
  this.timeout(900_000);

  describe("M1 confidential asset integration", function () {
    it("credits the actual callback amount and grants owner-only principal access", async function () {
      const fixture = await deployFixture();
      const [alice, outsider] = fixture.users;
      await prepareConfidentialAsset(fixture, alice, 250_000n);
      await reserve(fixture, alice);

      await deposit(fixture, alice, 250_000n);
      let values = await accountValues(fixture, alice.address);
      expect(values.principal).to.equal(250_000n);
      expect(values.pending).to.equal(250_000n);
      expect(values.eligible).to.equal(0n);
      expect(values.totalLiability).to.equal(250_000n);
      expect(values.principalLiquidity).to.equal(250_000n);
      expect(
        await decrypt64(await fixture.token.confidentialBalanceOf(await fixture.pool.getAddress())),
      ).to.equal(250_000n);

      expect(
        await hre.fhevm.userDecryptEuint(
          FhevmType.euint64,
          await fixture.pool.principalHandle(alice.address),
          await fixture.pool.getAddress(),
          alice,
        ),
      ).to.equal(250_000n);
      let outsiderRejected = false;
      try {
        await hre.fhevm.userDecryptEuint(
          FhevmType.euint64,
          await fixture.pool.principalHandle(alice.address),
          await fixture.pool.getAddress(),
          outsider,
        );
      } catch {
        outsiderRejected = true;
      }
      expect(outsiderRejected).to.equal(true);

      // The requested amount is larger than the remaining confidential balance;
      // ERC-7984 supplies the callback with no additional spendable amount.
      await deposit(fixture, alice, 900_000n);
      values = await accountValues(fixture, alice.address);
      expect(values.principal).to.equal(250_000n);
      expect(values.totalLiability).to.equal(250_000n);
      expect(
        await decrypt64(await fixture.token.confidentialBalanceOf(await fixture.pool.getAddress())),
      ).to.equal(250_000n);
    });

    it("rejects malformed routes without changing encrypted accounting", async function () {
      const fixture = await deployFixture();
      const [alice] = fixture.users;
      await prepareConfidentialAsset(fixture, alice, 100_000n);
      await reserve(fixture, alice);
      const before = await decrypt64(await fixture.token.confidentialBalanceOf(alice.address));

      await deposit(fixture, alice, 100_000n, "0x");
      const values = await accountValues(fixture, alice.address);
      expect(values.principal).to.equal(0n);
      expect(values.totalLiability).to.equal(0n);
      expect(await decrypt64(await fixture.token.confidentialBalanceOf(alice.address))).to.equal(
        before,
      );
      expect(
        await decrypt64(await fixture.token.confidentialBalanceOf(await fixture.pool.getAddress())),
      ).to.equal(0n);
    });

    it("rejects direct callbacks from a non-token caller", async function () {
      const fixture = await deployFixture();
      const [, outsider] = fixture.users;
      await expect(
        (fixture.pool.connect(outsider) as any).onConfidentialTransferReceived(
          outsider.address,
          outsider.address,
          ZeroHash,
          "0x",
        ),
      ).to.be.revertedWithCustomError(fixture.pool, "InvalidAssetConfiguration");
    });
  });

  describe("M2 accounting", function () {
    it("keeps principal, pending weight, liability, and liquidity synchronized", async function () {
      const fixture = await deployFixture();
      const [alice, bob] = fixture.users;
      await prepareConfidentialAsset(fixture, alice, 100_000n);
      await prepareConfidentialAsset(fixture, bob, 50_000n);
      await reserve(fixture, alice);
      await reserve(fixture, bob);
      await deposit(fixture, alice, 100_000n);
      await deposit(fixture, bob, 50_000n);

      const aliceValues = await accountValues(fixture, alice.address);
      const bobValues = await accountValues(fixture, bob.address);
      expect(aliceValues.principal).to.equal(aliceValues.pending);
      expect(bobValues.principal).to.equal(bobValues.pending);
      expect(aliceValues.eligible + aliceValues.pending).to.be.lte(aliceValues.principal);
      expect(bobValues.eligible + bobValues.pending).to.be.lte(bobValues.principal);
      expect(aliceValues.totalLiability).to.equal(150_000n);
      expect(aliceValues.principalLiquidity).to.equal(150_000n);
      expect(aliceValues.inFlight).to.equal(0n);
      expect(aliceValues.prizeReserve).to.equal(0n);
    });

    it("pauses deposits without blocking existing encrypted state", async function () {
      const fixture = await deployFixture();
      const [alice, bob] = fixture.users;
      await prepareConfidentialAsset(fixture, alice, 100_000n);
      await prepareConfidentialAsset(fixture, bob, 50_000n);
      await reserve(fixture, alice);
      await reserve(fixture, bob);
      await deposit(fixture, alice, 100_000n);
      await (await fixture.pool.connect(fixture.guardian).pause(2)).wait();
      await deposit(fixture, bob, 50_000n);

      expect((await accountValues(fixture, alice.address)).principal).to.equal(100_000n);
      expect((await accountValues(fixture, bob.address)).principal).to.equal(0n);
      expect(await fixture.pool.pauseMask()).to.equal(2n);
    });
  });

  describe("M3 slots and epoch maturity", function () {
    it("enforces exactly 16 slots, stable ownership, and duplicate rejection", async function () {
      const fixture = await deployFixture();
      const participants = fixture.users.slice(0, 17);
      const slots: number[] = [];
      for (const participant of participants.slice(0, 16)) {
        slots.push(await reserve(fixture, participant));
      }
      expect(slots).to.deep.equal([...Array(16).keys()]);
      await expect(
        (fixture.pool.connect(participants[0]) as any).reserveSlot({
          value: parseEther("0.001"),
        }),
      ).to.be.revertedWithCustomError(fixture.pool, "SlotAlreadyOwned");
      await expect(
        (fixture.pool.connect(participants[16]) as any).reserveSlot({
          value: parseEther("0.001"),
        }),
      ).to.be.revertedWithCustomError(fixture.pool, "NoAvailableSlot");
      const ownership = await fixture.pool.slotOf(participants[7].address);
      expect(ownership[0]).to.equal(true);
      expect(ownership[1]).to.equal(7n);
    });

    it("rejects early and wrong-state freezes, then preserves snapshots across later deposits", async function () {
      const fixture = await deployFixture();
      const [alice, bob] = fixture.users;
      await prepareConfidentialAsset(fixture, alice, 125_000n);
      await prepareConfidentialAsset(fixture, bob, 50_000n);
      const aliceSlot = await reserve(fixture, alice);
      await reserve(fixture, bob);
      await deposit(fixture, alice, 100_000n);

      await expect(fixture.pool.freezeEpoch(99)).to.be.revertedWithCustomError(
        fixture.pool,
        "WrongEpoch",
      );
      await expect(fixture.pool.freezeEpoch(1)).to.be.revertedWithCustomError(
        fixture.pool,
        "EpochCloseNotReached",
      );

      await freeze(fixture, 1n);
      const firstSnapshot = await fixture.pool.epochWeightHandle(1, aliceSlot);
      expect(await decrypt64(firstSnapshot)).to.equal(0n);
      expect((await accountValues(fixture, alice.address)).eligible).to.equal(100_000n);

      await abandonUnrequested(fixture, 1n);
      await (await fixture.pool.openNextEpoch()).wait();
      await deposit(fixture, bob, 50_000n);
      await freeze(fixture, 2n);
      const secondSnapshotBeforeLaterDeposit = await fixture.pool.epochWeightHandle(2, aliceSlot);
      expect(await decrypt64(secondSnapshotBeforeLaterDeposit)).to.equal(100_000n);

      // A deposit after E2 freezes is first eligible for E4, so it cannot
      // alter E2's historical snapshot or E3's snapshot.
      await prepareConfidentialAsset(fixture, alice, 25_000n);
      await deposit(fixture, alice, 25_000n);
      expect(await fixture.pool.epochWeightHandle(2, aliceSlot)).to.equal(
        secondSnapshotBeforeLaterDeposit,
      );

      await abandonUnrequested(fixture, 2n);
      await (await fixture.pool.openNextEpoch()).wait();
      await freeze(fixture, 3n);
      expect(await decrypt64(await fixture.pool.epochWeightHandle(3, aliceSlot))).to.equal(
        100_000n,
      );
      expect((await accountValues(fixture, alice.address)).eligible).to.equal(125_000n);
    });

    it("requires the request timeout before abandoning a frozen epoch", async function () {
      const fixture = await deployFixture();
      await freeze(fixture, 1n);
      await expect(fixture.pool.abandonUnrequestedEpoch(1)).to.be.revertedWithCustomError(
        fixture.pool,
        "EpochRequestDeadlineNotReached",
      );
      const state = await fixture.pool.epochPublic(1);
      await advancePast(state[4]);
      await (await fixture.pool.abandonUnrequestedEpoch(1)).wait();
      expect((await fixture.pool.epochPublic(1))[0]).to.equal(7n); // ABANDONED
      await expect(fixture.pool.abandonUnrequestedEpoch(1)).to.be.revertedWithCustomError(
        fixture.pool,
        "WrongEpochState",
      );
    });

    it("returns an unused reservation bond and reuses the lowest free slot", async function () {
      const fixture = await deployFixture();
      const [alice, bob] = fixture.users;
      expect(await reserve(fixture, alice)).to.equal(0);
      expect(await hre.ethers.provider.getBalance(await fixture.pool.getAddress())).to.equal(
        parseEther("0.001"),
      );

      await expect(fixture.pool.connect(alice).releaseSlot(0))
        .to.emit(fixture.pool, "SlotReleased")
        .withArgs(alice.address, 0, parseEther("0.001"));
      expect((await fixture.pool.slotOf(alice.address))[0]).to.equal(false);
      expect(await hre.ethers.provider.getBalance(await fixture.pool.getAddress())).to.equal(0n);
      expect(await reserve(fixture, bob)).to.equal(0);
    });

    it("withdraws the stored encrypted principal before releasing a referenced slot", async function () {
      const fixture = await deployFixture();
      const [alice, bob] = fixture.users;
      await prepareConfidentialAsset(fixture, alice, 150_000n);
      await reserve(fixture, alice);
      await deposit(fixture, alice, 150_000n);

      await expect(fixture.pool.connect(alice).releaseSlot(0)).to.be.revertedWithCustomError(
        fixture.pool,
        "WrongWithdrawalState",
      );
      await expect(fixture.pool.connect(alice).requestWithdrawal(ZeroHash, "0x", true)).to.emit(
        fixture.pool,
        "SlotClosing",
      );
      const withdrawalId = (await fixture.pool.nextWithdrawalId()) - 1n;
      expect((await fixture.pool.slotPublic(0))[1]).to.equal(3n); // CLOSING
      expect((await accountValues(fixture, alice.address)).principal).to.equal(0n);
      expect(await decrypt64(await fixture.token.confidentialBalanceOf(alice.address))).to.equal(
        150_000n,
      );
      await finalizeRouting(fixture, withdrawalId, false);

      await freeze(fixture, 1n);
      await expect(fixture.pool.connect(alice).releaseSlot(0)).to.be.revertedWithCustomError(
        fixture.pool,
        "WrongEpochState",
      );
      await abandonUnrequested(fixture, 1n);
      await expect(fixture.pool.connect(alice).releaseSlot(0))
        .to.emit(fixture.pool, "SlotReleased")
        .withArgs(alice.address, 0, parseEther("0.001"));

      const released = await fixture.pool.slotPublic(0);
      expect(released[0]).to.equal(ZeroAddress);
      expect(released[1]).to.equal(0n); // FREE
      expect((await fixture.pool.slotOf(alice.address))[0]).to.equal(false);
      expect(await reserve(fixture, bob)).to.equal(0);
    });
  });

  describe("M4 confidential withdrawals and strict FIFO", function () {
    it("caps an immediate request, debits eligible weight before pending weight, and finalizes once", async function () {
      const fixture = await deployFixture();
      const [alice] = fixture.users;
      await prepareConfidentialAsset(fixture, alice, 150_000n);
      await reserve(fixture, alice);
      await deposit(fixture, alice, 100_000n);
      await freeze(fixture, 1n);
      await abandonUnrequested(fixture, 1n);
      await (await fixture.pool.openNextEpoch()).wait();
      await deposit(fixture, alice, 50_000n);

      const before = await decrypt64(await fixture.token.confidentialBalanceOf(alice.address));
      const requestId = await requestWithdrawal(fixture, alice, 120_000n);
      expect((await accountValues(fixture, alice.address)).principal).to.equal(30_000n);
      expect((await accountValues(fixture, alice.address)).eligible).to.equal(0n);
      expect((await accountValues(fixture, alice.address)).pending).to.equal(30_000n);
      expect(
        (await decrypt64(await fixture.token.confidentialBalanceOf(alice.address))) - before,
      ).to.equal(120_000n);
      expect(await decrypt64(await fixture.pool.withdrawalHandle(requestId))).to.equal(0n);

      const routing = await fixture.pool.withdrawalPublic(requestId);
      const routingProof = await hre.fhevm.publicDecrypt([routing[7]]);
      await expect(
        fixture.pool.finalizeWithdrawalRouting(requestId, true, routingProof.decryptionProof),
      ).to.be.reverted;
      await (
        await fixture.pool.finalizeWithdrawalRouting(requestId, false, routingProof.decryptionProof)
      ).wait();
      expect((await fixture.pool.withdrawalPublic(requestId))[6]).to.equal(4n); // IMMEDIATE_SETTLED
      expect((await fixture.pool.slotPublic(0))[3]).to.equal(0n);
      await expect(
        fixture.pool.finalizeWithdrawalRouting(requestId, false, routingProof.decryptionProof),
      ).to.be.revertedWithCustomError(fixture.pool, "WrongWithdrawalState");
    });

    it("uses request-time FIFO for partial settlement and never skips an older routing ticket", async function () {
      const fixture = await deployFixture();
      const [alice, bob] = fixture.users;
      await prepareConfidentialAsset(fixture, alice, 300_000n);
      await prepareConfidentialAsset(fixture, bob, 200_000n);
      await reserve(fixture, alice);
      await reserve(fixture, bob);
      await deposit(fixture, alice, 300_000n);
      await deposit(fixture, bob, 200_000n);
      await (await fixture.pool.testMoveAllPrincipalLiquidityToInFlight()).wait();

      const aliceId = await requestWithdrawal(fixture, alice, 180_000n);
      const bobId = await requestWithdrawal(fixture, bob, 120_000n);
      expect(aliceId).to.equal(1n);
      expect(bobId).to.equal(2n);

      // Proof arrival order is intentionally reversed. The later ticket becomes
      // QUEUED, but cannot pass Alice while Alice is still routing pending.
      await finalizeRouting(fixture, bobId, true);
      await expect(fixture.pool.serviceFifoHead()).to.be.revertedWithCustomError(
        fixture.pool,
        "OlderWithdrawalRoutingPending",
      );
      await finalizeRouting(fixture, aliceId, true);
      expect((await fixture.pool.fifoHead())[0]).to.equal(aliceId);

      await (await fixture.pool.testReturnPrincipalClaimLiquidity(100_000)).wait();
      await (await fixture.pool.serviceFifoHead()).wait();
      expect(await decrypt64(await fixture.pool.withdrawalHandle(aliceId))).to.equal(80_000n);
      await finalizeCompletion(fixture, aliceId, false);
      expect((await fixture.pool.fifoHead())[0]).to.equal(aliceId);
      expect(await decrypt64(await fixture.pool.withdrawalHandle(bobId))).to.equal(120_000n);

      await (await fixture.pool.testReturnPrincipalClaimLiquidity(80_000)).wait();
      await (await fixture.pool.serviceFifoHead()).wait();
      await finalizeCompletion(fixture, aliceId, true);
      expect((await fixture.pool.fifoHead())[0]).to.equal(bobId);

      // Returning more than remains in flight cannot create claim liquidity.
      await (await fixture.pool.testReturnPrincipalClaimLiquidity(999_999)).wait();
      await (await fixture.pool.serviceFifoHead()).wait();
      await finalizeCompletion(fixture, bobId, true);
      expect(await decrypt64(await fixture.pool.withdrawalHandle(bobId))).to.equal(0n);
      expect((await fixture.pool.fifoHead())[0]).to.equal(0n);

      const aliceValues = await accountValues(fixture, alice.address);
      expect(aliceValues.totalQueued).to.equal(0n);
      expect(aliceValues.claimLiquidity).to.equal(200_000n);
      expect(aliceValues.totalLiability).to.equal(200_000n);
      await expect(fixture.pool.serviceFifoHead()).to.be.revertedWithCustomError(
        fixture.pool,
        "NoFifoWithdrawal",
      );
    });
  });
});
