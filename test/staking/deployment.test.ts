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

describe("Staking - Deployment", () => {
  let fixture: Awaited<ReturnType<typeof createTestFixture>>;

  before(async () => {
    fixture = await createTestFixture();
  });

  test("should deploy Staking contract correctly", async () => {
    assert.ok(fixture.staking !== undefined, "Staking contract should be deployed");
    const address = await fixture.staking.getAddress();
    assert.ok(address !== undefined && address !== "", "Staking contract should have an address");
  });

  test("should initialize contract parameters correctly", async () => {
    const minStake = await fixture.staking.minStakeAmount();
    const rewardRate = await fixture.staking.rewardRate();
    const maxTotalStaked = await fixture.staking.maxTotalStaked();

    expectBigIntEqual(minStake, parseEther("1000"), "Min stake should be 1000 HSK");
    assert.strictEqual(rewardRate.toString(), "500", "Reward rate should be 5%");
    expectBigIntEqual(maxTotalStaked, parseEther("30000000"), "Max total staked should be 30,000,000 HSK");
  });

  test("should set whitelist mode to disabled correctly", async () => {
    const whitelistMode = await fixture.staking.onlyWhitelistCanStake();
    assert.strictEqual(whitelistMode, false, "Whitelist mode should be disabled");
  });

  test("should set staking time window correctly", async () => {
    const startTime = await fixture.staking.stakeStartTime();
    const endTime = await fixture.staking.stakeEndTime();

    assert.ok(startTime > 0n, "Start time should be greater than 0");
    assert.ok(endTime > startTime, "End time should be greater than start time");
  });

  test("should initialize state variables correctly", async () => {
    const totalStaked = await fixture.staking.totalStaked();
    const nextPositionId = await fixture.staking.nextPositionId();

    expectBigIntEqual(totalStaked, BigInt(0), "Total staked should be 0");
    // Note: nextPositionId starts at 1 in StakingStorage initialization (line 63)
    assert.strictEqual(nextPositionId.toString(), "1", "Next position ID should start at 1");
  });

  test("should reject invalid initialization parameters", async () => {
    // This test verifies that the contract rejects invalid initialization
    // Since we're using a proxy, we test by trying to deploy with invalid params
    const ethers = await getEthers();
    const HSKStaking = await ethers.getContractFactory("HSKStaking");
    const impl = await HSKStaking.deploy();
    await impl.waitForDeployment();

    const StakingProxy = await ethers.getContractFactory("StakingProxy");
    const [deployer] = await ethers.getSigners();
    const now = Math.floor(Date.now() / 1000);

    // Test invalid endTime < startTime
    const invalidInitData = impl.interface.encodeFunctionData("initialize", [
      parseEther("1000"),
      500,
      now + 86400,
      now + 3600, // endTime before startTime
      false,
      parseEther("30000000"), // Max total staked (30 million HSK)
    ]);

    await expectRevert(
      StakingProxy.deploy(await impl.getAddress(), deployer.address, invalidInitData)
    );
  });

  test("should set owner correctly", async () => {
    const owner = await fixture.staking.owner();
    expectAddressEqual(
      owner,
      await fixture.deployer.getAddress(),
      "Owner should be deployer"
    );
  });
});

