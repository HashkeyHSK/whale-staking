import { test, describe, before } from "node:test";
import { strict as assert } from "node:assert";
import { createTestFixture } from "../helpers/fixtures.js";
import {
  expectBigIntEqual,
  parseEther,
  expectAddressEqual,
  getEthers,
  expectRevert,
} from "../helpers/test-utils.js";

describe("Normal Staking - Deployment", () => {
  let fixture: Awaited<ReturnType<typeof createTestFixture>>;

  before(async () => {
    fixture = await createTestFixture();
  });

  test("应该正确部署 Normal Staking 合约", async () => {
    assert.ok(fixture.staking !== undefined, "Staking contract should be deployed");
    const address = await fixture.staking.getAddress();
    assert.ok(address !== undefined && address !== "", "Staking contract should have an address");
  });

  test("应该正确初始化合约参数", async () => {
    const minStake = await fixture.staking.minStakeAmount();
    const rewardRate = await fixture.staking.rewardRate();

    expectBigIntEqual(minStake, parseEther("1"), "Normal min stake should be 1 HSK");
    assert.strictEqual(rewardRate.toString(), "800", "Normal reward rate should be 8%");
  });

  test("应该正确设置白名单模式为关闭", async () => {
    const whitelistMode = await fixture.staking.onlyWhitelistCanStake();
    assert.strictEqual(whitelistMode, false, "Whitelist mode should be disabled");
  });

  test("应该正确设置质押时间窗口", async () => {
    const startTime = await fixture.staking.stakeStartTime();
    const endTime = await fixture.staking.stakeEndTime();

    assert.ok(startTime > 0n, "Start time should be greater than 0");
    assert.ok(endTime > startTime, "End time should be greater than start time");
  });

  test("应该正确初始化状态变量", async () => {
    const totalStaked = await fixture.staking.totalStaked();
    const nextPositionId = await fixture.staking.nextPositionId();

    expectBigIntEqual(totalStaked, BigInt(0), "Total staked should be 0");
    // Note: nextPositionId starts at 1 in StakingStorage initialization (line 63)
    assert.strictEqual(nextPositionId.toString(), "1", "Next position ID should start at 1");
  });

  test("应该拒绝无效的初始化参数", async () => {
    // This test verifies that the contract rejects invalid initialization
    // Since we're using a proxy, we test by trying to deploy with invalid params
    const ethers = await getEthers();
    const HSKStaking = await ethers.getContractFactory("HSKStaking");
    const impl = await HSKStaking.deploy();
    await impl.waitForDeployment();

    const NormalProxy = await ethers.getContractFactory("NormalStakingProxy");
    const [deployer] = await ethers.getSigners();
    const now = Math.floor(Date.now() / 1000);

    // Test invalid endTime < startTime
    const invalidInitData = impl.interface.encodeFunctionData("initialize", [
      parseEther("1"),
      800,
      now + 86400,
      now + 3600, // endTime before startTime
      false,
    ]);

    await expectRevert(
      NormalProxy.deploy(await impl.getAddress(), deployer.address, invalidInitData)
    );
  });

  test("应该正确设置 owner", async () => {
    const owner = await fixture.staking.owner();
    expectAddressEqual(
      owner,
      await fixture.deployer.getAddress(),
      "Owner should be deployer"
    );
  });
});

