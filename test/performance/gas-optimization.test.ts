import { test, describe, before } from "node:test";
import { strict as assert } from "node:assert";
import {
  createTestFixture,
  fundAccount,
  advanceTime,
} from "../helpers/fixtures.js";
import { getEthers } from "../helpers/test-utils.js";
import { parseEther } from "../helpers/test-utils.js";

describe("Normal Staking - Gas Optimization", () => {
  let fixture: Awaited<ReturnType<typeof createTestFixture>>;

  before(async () => {
    fixture = await createTestFixture();
    await fundAccount(fixture.user1, parseEther("10000"));
    await fundAccount(fixture.user2, parseEther("10000"));
    
    // Fund admin account
    await fundAccount(fixture.admin, parseEther("200000"));

    const rewardTx = await fixture.staking.connect(fixture.admin).updateRewardPool({
      value: parseEther("100000"),
    });
    await rewardTx.wait();

    const startTime = await fixture.staking.stakeStartTime();
    const ethers = await getEthers();
    const now = await ethers.provider
      .getBlock("latest")
      .then((b) => b?.timestamp || 0);
    if (now < startTime) {
      await advanceTime(Number(startTime - BigInt(now)) + 1);
    }
  });

  test("质押操作的 Gas 消耗", async () => {
    const stakeAmount = parseEther("10");
    const tx = await fixture.staking.connect(fixture.user1).stake({
      value: stakeAmount,
    });
    const receipt = await tx.wait();

    if (receipt) {
      const gasUsed = receipt.gasUsed;
      console.log(`Stake gas used: ${gasUsed.toString()}`);
      
      // Gas should be reasonable (less than 500k)
      assert.ok(gasUsed < 500000);
    }
  });

  test("解除质押操作的 Gas 消耗", async () => {
    const stakeAmount = parseEther("100");
    await fixture.staking.connect(fixture.user1).stake({
      value: stakeAmount,
    });

    const positionId = (await fixture.staking.nextPositionId()) - BigInt(1);
    await advanceTime(365 * 24 * 60 * 60 + 1);

    const tx = await fixture.staking
      .connect(fixture.user1)
      .unstake(positionId);
    const receipt = await tx.wait();

    if (receipt) {
      const gasUsed = receipt.gasUsed;
      console.log(`Unstake gas used: ${gasUsed.toString()}`);
      
      // Gas should be reasonable (less than 500k)
      assert.ok(gasUsed < 500000);
    }
  });

  test("领取奖励操作的 Gas 消耗", async () => {
    const stakeAmount = parseEther("1000");
    await fixture.staking.connect(fixture.user1).stake({
      value: stakeAmount,
    });

    const positionId = (await fixture.staking.nextPositionId()) - BigInt(1);
    await advanceTime(30 * 24 * 60 * 60);

    const tx = await fixture.staking
      .connect(fixture.user1)
      .claimReward(positionId);
    const receipt = await tx.wait();

    if (receipt) {
      const gasUsed = receipt.gasUsed;
      console.log(`Claim reward gas used: ${gasUsed.toString()}`);
      
      // Gas should be reasonable (less than 300k)
      assert.ok(gasUsed < 300000);
    }
  });

  test("批量操作的 Gas 消耗", async () => {
    // Test multiple stakes
    const stakeAmount = parseEther("10");
    const numStakes = 5;

    let totalGas = 0n;
    for (let i = 0; i < numStakes; i++) {
      const tx = await fixture.staking.connect(fixture.user1).stake({
        value: stakeAmount,
      });
      const receipt = await tx.wait();
      if (receipt) {
        totalGas += receipt.gasUsed;
      }
    }

    console.log(`Total gas for ${numStakes} stakes: ${totalGas.toString()}`);
    console.log(`Average gas per stake: ${(totalGas / BigInt(numStakes)).toString()}`);
    
    // Average gas should be reasonable
    const avgGas = totalGas / BigInt(numStakes);
    assert.ok(avgGas < 500000, `Average gas ${avgGas} should be less than 500000`);
  });

  test("Gas 优化对比", async () => {
    // Compare gas usage for different operations
    const stakeAmount = parseEther("100");

    // Stake
    const stakeTx = await fixture.staking.connect(fixture.user1).stake({
      value: stakeAmount,
    });
    const stakeReceipt = await stakeTx.wait();
    const stakeGas = stakeReceipt?.gasUsed || 0n;

    const positionId = (await fixture.staking.nextPositionId()) - BigInt(1);
    await advanceTime(30 * 24 * 60 * 60);

    // Claim reward
    const claimTx = await fixture.staking
      .connect(fixture.user1)
      .claimReward(positionId);
    const claimReceipt = await claimTx.wait();
    const claimGas = claimReceipt?.gasUsed || 0n;

    // Unstake
    await advanceTime(365 * 24 * 60 * 60 - 30 * 24 * 60 * 60 + 1);
    const unstakeTx = await fixture.staking
      .connect(fixture.user1)
      .unstake(positionId);
    const unstakeReceipt = await unstakeTx.wait();
    const unstakeGas = unstakeReceipt?.gasUsed || 0n;

    console.log(`Stake gas: ${stakeGas.toString()}`);
    console.log(`Claim reward gas: ${claimGas.toString()}`);
    console.log(`Unstake gas: ${unstakeGas.toString()}`);

    // All operations should use reasonable gas
    assert.ok(stakeGas < 500000);
    assert.ok(claimGas < 300000);
    assert.ok(unstakeGas < 500000);
  });
});

