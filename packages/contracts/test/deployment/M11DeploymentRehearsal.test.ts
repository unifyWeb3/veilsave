import { expect } from "chai";
import { ZeroAddress, ZeroHash, keccak256, parseEther, toUtf8Bytes } from "ethers";
import * as hre from "hardhat";

const DAY = 24 * 60 * 60;

async function advance(seconds: number): Promise<void> {
  await hre.network.provider.send("evm_increaseTime", [seconds]);
  await hre.network.provider.send("evm_mine");
}

describe("M11 deployment and governance rehearsal", function () {
  this.timeout(900_000);

  it("deploys in production order, locks bootstrap roles, and enforces the 24-hour timelock", async function () {
    const signers = await hre.ethers.getSigners();
    const deployer = signers[0]!;
    const safe = signers[1]!;
    const openExecutor = signers[2]!;

    const asset: any = await (
      await hre.ethers.getContractFactory("MockSixDecimalAsset", deployer)
    ).deploy();
    await asset.waitForDeployment();
    const token: any = await (
      await hre.ethers.getContractFactory("TestConfidentialUSDT", deployer)
    ).deploy(await asset.getAddress());
    await token.waitForDeployment();
    const wrapper: any = await (
      await hre.ethers.getContractFactory("MockVrfV2PlusWrapper", deployer)
    ).deploy();
    await wrapper.waitForDeployment();

    const timelock: any = await (
      await hre.ethers.getContractFactory(
        "@openzeppelin/contracts/governance/TimelockController.sol:TimelockController",
        deployer,
      )
    ).deploy(DAY, [safe.address], [ZeroAddress], ZeroAddress);
    await timelock.waitForDeployment();

    const strategyId = keccak256(toUtf8Bytes("VEILSAVE_TEST_YIELD_V1_REHEARSAL"));
    const strategy: any = await (
      await hre.ethers.getContractFactory("DeterministicTestYieldVault", deployer)
    ).deploy(await asset.getAddress(), await timelock.getAddress(), safe.address, strategyId);
    await strategy.waitForDeployment();
    const controller: any = await (
      await hre.ethers.getContractFactory("SettlementController", deployer)
    ).deploy(
      await token.getAddress(),
      await asset.getAddress(),
      await strategy.getAddress(),
      safe.address,
      await timelock.getAddress(),
      safe.address,
    );
    await controller.waitForDeployment();
    const vrf: any = await (
      await hre.ethers.getContractFactory("PoolVrfAdapter", deployer)
    ).deploy(await wrapper.getAddress(), safe.address, await timelock.getAddress());
    await vrf.waitForDeployment();
    const pool: any = await (
      await hre.ethers.getContractFactory("ConfidentialPrizePool", deployer)
    ).deploy(
      {
        confidentialToken: await token.getAddress(),
        vrfAdapter: await vrf.getAddress(),
        settlementController: await controller.getAddress(),
        bootstrapAuthority: safe.address,
        timelock: await timelock.getAddress(),
        pauseGuardian: safe.address,
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

    expect(await pool.active()).to.equal(false);
    await expect(
      controller.connect(deployer).bindPool(await pool.getAddress()),
    ).to.be.revertedWithCustomError(controller, "BootstrapOnly");
    await (await controller.connect(safe).bindPool(await pool.getAddress())).wait();
    await (await vrf.connect(safe).bindPool(await pool.getAddress())).wait();
    await (await pool.connect(safe).activate()).wait();

    expect(await pool.active()).to.equal(true);
    expect(await pool.currentEpochId()).to.equal(1n);
    expect(await controller.pool()).to.equal(await pool.getAddress());
    expect(await vrf.pool()).to.equal(await pool.getAddress());
    expect(await pool.bootstrapAuthority()).to.equal(ZeroAddress);
    expect(await controller.bootstrapAuthority()).to.equal(ZeroAddress);
    expect(await vrf.bootstrapAuthority()).to.equal(ZeroAddress);
    expect(await pool.PARTICIPANT_CAPACITY()).to.equal(16n);
    expect(await pool.epochDuration()).to.equal(7n * BigInt(DAY));
    expect(await pool.slotBondWei()).to.equal(parseEther("0.001"));
    expect(await pool.winnerAclDelayBlocks()).to.equal(96n);
    expect(await vrf.REQUEST_CONFIRMATIONS()).to.equal(3n);
    expect(await vrf.CALLBACK_GAS_LIMIT()).to.equal(100_000n);
    expect(await strategy.yieldMode()).to.equal(0n);

    const proposerRole = await timelock.PROPOSER_ROLE();
    const cancellerRole = await timelock.CANCELLER_ROLE();
    const executorRole = await timelock.EXECUTOR_ROLE();
    const adminRole = await timelock.DEFAULT_ADMIN_ROLE();
    expect(await timelock.hasRole(proposerRole, safe.address)).to.equal(true);
    expect(await timelock.hasRole(cancellerRole, safe.address)).to.equal(true);
    expect(await timelock.hasRole(executorRole, ZeroAddress)).to.equal(true);
    expect(await timelock.hasRole(adminRole, await timelock.getAddress())).to.equal(true);
    expect(await timelock.hasRole(adminRole, deployer.address)).to.equal(false);
    expect(await timelock.getMinDelay()).to.equal(BigInt(DAY));

    const replacement: any = await (
      await hre.ethers.getContractFactory("DeterministicTestYieldVault", deployer)
    ).deploy(
      await asset.getAddress(),
      await timelock.getAddress(),
      safe.address,
      keccak256(toUtf8Bytes("VEILSAVE_TEST_YIELD_V2_REHEARSAL")),
    );
    await replacement.waitForDeployment();
    await (await controller.connect(safe).pauseInvestments()).wait();
    await expect(
      controller.connect(safe).setStrategy(await replacement.getAddress()),
    ).to.be.revertedWithCustomError(controller, "NotTimelock");

    const target = await controller.getAddress();
    const data = controller.interface.encodeFunctionData("setStrategy", [
      await replacement.getAddress(),
    ]);
    const salt = keccak256(toUtf8Bytes("VEILSAVE_STRATEGY_REPLACEMENT_REHEARSAL"));
    await (await timelock.connect(safe).schedule(target, 0, data, ZeroHash, salt, DAY)).wait();
    await expect(timelock.connect(openExecutor).execute(target, 0, data, ZeroHash, salt)).to.be
      .reverted;
    await advance(DAY + 1);
    await (await timelock.connect(openExecutor).execute(target, 0, data, ZeroHash, salt)).wait();
    expect(await controller.strategy()).to.equal(await replacement.getAddress());

    const artifact = await hre.artifacts.readArtifact("ConfidentialPrizePool");
    expect((artifact.deployedBytecode.length - 2) / 2).to.be.lte(24_576);
  });
});
