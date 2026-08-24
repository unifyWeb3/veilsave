import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ZeroAddress, ZeroHash, parseEther } from "ethers";
import * as hre from "hardhat";

const DAY = 24 * 60 * 60;
const WINNER_ACL_DELAY_BLOCKS = 96;

type Fixture = {
  asset: any;
  token: any;
  pool: any;
  bootstrap: any;
  timelock: any;
  guardian: any;
  winner: any;
  loser: any;
  keeper: any;
  sponsor: any;
};

async function deployFixture(): Promise<Fixture> {
  const signers = await hre.ethers.getSigners();
  const bootstrap = signers[0]!;
  const timelock = signers[1]!;
  const guardian = signers[2]!;
  const winner = signers[3]!;
  const loser = signers[4]!;
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
      epochDuration: 7 * DAY,
      requestTimeout: DAY,
      fulfillmentTimeout: DAY,
      drawTimeout: DAY,
      winnerAclDelayBlocks: WINNER_ACL_DELAY_BLOCKS,
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

  return {
    asset,
    token,
    pool,
    bootstrap,
    timelock,
    guardian,
    winner,
    loser,
    keeper,
    sponsor,
  };
}

function singleWinnerOwners(winner: string): string[] {
  return [winner, ...Array(15).fill(ZeroAddress)];
}

async function setEpochPrize(fixture: Fixture, prize: bigint): Promise<string> {
  await (await fixture.asset.mint(fixture.sponsor.address, prize)).wait();
  await (
    await fixture.asset.connect(fixture.sponsor).approve(await fixture.token.getAddress(), prize)
  ).wait();
  await (
    await fixture.token.connect(fixture.sponsor).wrap(await fixture.pool.getAddress(), prize)
  ).wait();

  const input = hre.fhevm.createEncryptedInput(
    await fixture.pool.getAddress(),
    fixture.bootstrap.address,
  );
  input.add64(prize);
  const encrypted = await input.encrypt();
  await (
    await fixture.pool.testSetEpochPrize(1, encrypted.handles[0], encrypted.inputProof)
  ).wait();
  return fixture.pool.prizeHandle(1);
}

async function prepareDraw(
  fixture: Fixture,
  owners: string[],
  weights: bigint[],
  prize = 0n,
): Promise<{ prizeHandle: string; winnerHandle: string }> {
  const input = hre.fhevm.createEncryptedInput(
    await fixture.pool.getAddress(),
    fixture.bootstrap.address,
  );
  for (const weight of weights) input.add64(weight);
  const encrypted = await input.encrypt();
  await (
    await fixture.pool.testPrepareDraw(owners, encrypted.handles, encrypted.inputProof, 0x1234n)
  ).wait();

  const prizeHandle = prize === 0n ? ZeroHash : await setEpochPrize(fixture, prize);
  await (await fixture.pool.executeEncryptedDraw(1)).wait();
  const winnerState = await fixture.pool.epochWinner(1);
  return { prizeHandle, winnerHandle: winnerState[0] };
}

async function prepareSingleWinner(
  fixture: Fixture,
  prize = 424_242n,
): Promise<{ prizeHandle: string; winnerHandle: string }> {
  return prepareDraw(
    fixture,
    singleWinnerOwners(fixture.winner.address),
    [100n, ...Array(15).fill(0n)],
    prize,
  );
}

async function mineAclDelay(): Promise<void> {
  await hre.network.provider.send("hardhat_mine", [`0x${WINNER_ACL_DELAY_BLOCKS.toString(16)}`]);
}

async function publicReveal(winnerHandle: string) {
  return hre.fhevm.publicDecrypt([winnerHandle]);
}

async function finalizeExpectedWinner(
  fixture: Fixture,
  winnerHandle: string,
  caller = fixture.keeper,
): Promise<void> {
  const reveal = await publicReveal(winnerHandle);
  await mineAclDelay();
  await (
    await fixture.pool
      .connect(caller)
      .finalizeWinner(1, fixture.winner.address, reveal.decryptionProof)
  ).wait();
}

async function expectUserDecryptFailure(
  handle: string,
  contractAddress: string,
  signer: any,
): Promise<void> {
  let rejected = false;
  try {
    await hre.fhevm.userDecryptEuint(FhevmType.euint64, handle, contractAddress, signer);
  } catch {
    rejected = true;
  }
  expect(rejected).to.equal(true);
}

async function expectPublicDecryptFailure(handle: string): Promise<void> {
  let rejected = false;
  try {
    await hre.fhevm.publicDecryptEuint(FhevmType.euint64, handle);
  } catch {
    rejected = true;
  }
  expect(rejected).to.equal(true);
}

async function debugDecrypt64(handle: string): Promise<bigint> {
  if (handle === ZeroHash) return 0n;
  return hre.fhevm.debugger.decryptEuint(FhevmType.euint64, handle);
}

describe("M8 winner reveal, prize ACL, and claim", function () {
  this.timeout(900_000);

  it("verifies the winner proof after the ACL delay and finalizes once", async function () {
    const fixture = await deployFixture();
    const prepared = await prepareSingleWinner(fixture);
    const reveal = await publicReveal(prepared.winnerHandle);

    await expect(
      fixture.pool
        .connect(fixture.keeper)
        .finalizeWinner(1, fixture.winner.address, reveal.decryptionProof),
    ).to.be.revertedWithCustomError(fixture.pool, "WinnerAclDelayNotReached");

    await mineAclDelay();
    await expect(
      fixture.pool
        .connect(fixture.keeper)
        .finalizeWinner(1, fixture.winner.address, reveal.decryptionProof),
    )
      .to.emit(fixture.pool, "WinnerFinalized")
      .withArgs(1, fixture.winner.address);

    const winnerState = await fixture.pool.epochWinner(1);
    expect(winnerState[2]).to.equal(fixture.winner.address);
    expect(winnerState[3]).to.equal(true);
    expect((await fixture.pool.epochPublic(1))[0]).to.equal(6n); // TERMINAL

    await expect(
      fixture.pool.finalizeWinner(1, fixture.winner.address, reveal.decryptionProof),
    ).to.be.revertedWithCustomError(fixture.pool, "WrongEpochState");
  });

  it("rejects forged cleartext, a proof for another handle, and a wrong epoch", async function () {
    const fixture = await deployFixture();
    const prepared = await prepareSingleWinner(fixture);
    const reveal = await publicReveal(prepared.winnerHandle);
    await mineAclDelay();

    await expect(fixture.pool.finalizeWinner(1, fixture.loser.address, reveal.decryptionProof)).to
      .be.reverted;

    const other = await deployFixture();
    const otherPrepared = await prepareSingleWinner(other, 7n);
    const otherReveal = await publicReveal(otherPrepared.winnerHandle);
    await expect(fixture.pool.finalizeWinner(1, other.winner.address, otherReveal.decryptionProof))
      .to.be.reverted;

    await expect(
      fixture.pool.finalizeWinner(999, fixture.winner.address, reveal.decryptionProof),
    ).to.be.revertedWithCustomError(fixture.pool, "WrongEpochState");
  });

  it("rejects a valid proof whose clear winner is not a frozen slot owner", async function () {
    const fixture = await deployFixture();
    const owners = singleWinnerOwners(fixture.winner.address);
    const input = hre.fhevm.createEncryptedInput(
      await fixture.pool.getAddress(),
      fixture.bootstrap.address,
    );
    input.addAddress(fixture.loser.address);
    const encrypted = await input.encrypt();
    await (
      await fixture.pool.testPrepareReveal(1, owners, encrypted.handles[0], encrypted.inputProof)
    ).wait();
    const winnerHandle = (await fixture.pool.epochWinner(1))[0];
    const reveal = await publicReveal(winnerHandle);
    await mineAclDelay();

    await expect(
      fixture.pool.finalizeWinner(1, fixture.loser.address, reveal.decryptionProof),
    ).to.be.revertedWithCustomError(fixture.pool, "WinnerNotFrozenParticipant");
    expect((await fixture.pool.epochPublic(1))[0]).to.equal(5n); // REVEAL_PENDING
  });

  it("rolls a zero-winner prize back to the reserve without granting access", async function () {
    const fixture = await deployFixture();
    const prize = 123_456n;
    const prepared = await prepareDraw(
      fixture,
      Array(16).fill(ZeroAddress),
      Array(16).fill(0n),
      prize,
    );
    const reveal = await publicReveal(prepared.winnerHandle);
    await mineAclDelay();

    await expect(fixture.pool.finalizeWinner(1, ZeroAddress, reveal.decryptionProof)).to.emit(
      fixture.pool,
      "EpochNoWinner",
    );

    const accounting = await fixture.pool.accountingHandles();
    expect(await debugDecrypt64(accounting[5])).to.equal(prize);
    expect(await debugDecrypt64(await fixture.pool.prizeHandle(1))).to.equal(0n);
    expect((await fixture.pool.epochWinner(1))[2]).to.equal(ZeroAddress);
    expect(await fixture.pool.testPrizeAllowed(1, fixture.winner.address)).to.equal(false);
    expect(await fixture.pool.testPrizePubliclyDecryptable(1)).to.equal(false);
  });

  it("grants prize decryption only to the finalized winner", async function () {
    const fixture = await deployFixture();
    const prize = 424_242n;
    const prepared = await prepareSingleWinner(fixture, prize);
    const poolAddress = await fixture.pool.getAddress();

    await expectUserDecryptFailure(prepared.prizeHandle, poolAddress, fixture.winner);
    await finalizeExpectedWinner(fixture, prepared.winnerHandle);

    expect(await fixture.pool.testPrizeAllowed(1, poolAddress)).to.equal(true);
    expect(await fixture.pool.testPrizeAllowed(1, fixture.winner.address)).to.equal(true);
    expect(await fixture.pool.testPrizeAllowed(1, fixture.loser.address)).to.equal(false);
    expect(await fixture.pool.testPrizeAllowed(1, fixture.bootstrap.address)).to.equal(false);
    expect(await fixture.pool.testPrizeAllowed(1, fixture.timelock.address)).to.equal(false);
    expect(await fixture.pool.testPrizeAllowed(1, fixture.guardian.address)).to.equal(false);
    expect(await fixture.pool.testPrizeAllowed(1, fixture.keeper.address)).to.equal(false);
    expect(await fixture.pool.testPrizePubliclyDecryptable(1)).to.equal(false);

    expect(
      await hre.fhevm.userDecryptEuint(
        FhevmType.euint64,
        prepared.prizeHandle,
        poolAddress,
        fixture.winner,
      ),
    ).to.equal(prize);
    await expectUserDecryptFailure(prepared.prizeHandle, poolAddress, fixture.loser);
    await expectUserDecryptFailure(prepared.prizeHandle, poolAddress, fixture.bootstrap);
    await expectUserDecryptFailure(prepared.prizeHandle, poolAddress, fixture.keeper);
    await expectPublicDecryptFailure(prepared.prizeHandle);
  });

  it("lets only the winner claim and makes a repeated claim harmless", async function () {
    const fixture = await deployFixture();
    const prize = 88_000n;
    const prepared = await prepareSingleWinner(fixture, prize);
    await finalizeExpectedWinner(fixture, prepared.winnerHandle);

    await expect(fixture.pool.connect(fixture.loser).claimPrize(1)).to.be.revertedWithCustomError(
      fixture.pool,
      "NotFinalizedWinner",
    );

    await expect(fixture.pool.connect(fixture.winner).claimPrize(1))
      .to.emit(fixture.pool, "PrizeClaimProcessed")
      .withArgs(1, fixture.winner.address);
    const winnerBalance = await fixture.token.confidentialBalanceOf(fixture.winner.address);
    expect(await debugDecrypt64(winnerBalance)).to.equal(prize);
    expect(await debugDecrypt64(await fixture.pool.prizeHandle(1))).to.equal(0n);

    await (await fixture.pool.connect(fixture.winner).claimPrize(1)).wait();
    const repeatedBalance = await fixture.token.confidentialBalanceOf(fixture.winner.address);
    expect(await debugDecrypt64(repeatedBalance)).to.equal(prize);
    expect(await debugDecrypt64(await fixture.pool.prizeHandle(1))).to.equal(0n);
  });
});
