import { test, describe, before } from "node:test";
import { strict as assert } from "node:assert";
import { createPremiumTestFixture } from "../helpers/fixtures.js";
import {
  expectBigIntEqual,
  parseEther,
  expectAddressEqual,
  getEthers,
  expectRevert,
} from "../helpers/test-utils.js";

describe("Premium Staking - Deployment", () => {
  let fixture: Awaited<ReturnType<typeof createPremiumTestFixture>>;

  before(async () => {
    fixture = await createPremiumTestFixture();
  });

  test("should deploy Premium Staking contract correctly", async () => {
    assert.ok(fixture.staking !== undefined, "Staking contract should be deployed");
    const address = await fixture.staking.getAddress();
    assert.ok(address !== undefined && address !== "", "Staking contract should have an address");
  });

  test("should initialize contract parameters correctly", async () => {
    const minStake = await fixture.staking.minStakeAmount();
    const rewardRate = await fixture.staking.rewardRate();
    const maxTotalStaked = await fixture.staking.maxTotalStaked();

    expectBigIntEqual(minStake, parseEther("100"), "Premium min stake should be 100 HSK (temporarily reduced for testing)");
    assert.strictEqual(rewardRate.toString(), "1600", "Premium reward rate should be 16%");
    expectBigIntEqual(maxTotalStaked, parseEther("20000000"), "Premium max total staked should be 20,000,000 HSK");
  });

  test("should set whitelist mode to enabled correctly", async () => {
    const whitelistMode = await fixture.staking.onlyWhitelistCanStake();
    assert.strictEqual(whitelistMode, true, "Whitelist mode should be enabled");
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
    assert.strictEqual(nextPositionId.toString(), "1", "Next position ID should start at 1");
  });

  test("should reject invalid initialization parameters", async () => {
    const ethers = await getEthers();
    const HSKStaking = await ethers.getContractFactory("HSKStaking");
    const impl = await HSKStaking.deploy();
    await impl.waitForDeployment();

    const PremiumProxy = await ethers.getContractFactory("PremiumStakingProxy");
    const [deployer] = await ethers.getSigners();
    const now = Math.floor(Date.now() / 1000);

    // Test invalid endTime < startTime
    const invalidInitData = impl.interface.encodeFunctionData("initialize", [
      parseEther("100"),
      1600,
      now + 86400,
      now + 3600, // endTime before startTime
      true,
      parseEther("20000000"), // Max total staked (20 million HSK)
    ]);

    await expectRevert(
      PremiumProxy.deploy(await impl.getAddress(), deployer.address, invalidInitData)
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

