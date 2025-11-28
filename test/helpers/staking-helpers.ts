/**
 * Common helper functions for staking tests
 * Provides reusable setup and utility functions
 */

import { createTestFixture, fundAccount, advanceTime } from "./fixtures.js";
import { getEthers, getEvent } from "./test-utils.js";
import { parseEther } from "./test-utils.js";

export interface TestSetupOptions {
  user1Balance?: bigint;
  user2Balance?: bigint;
  user3Balance?: bigint;
  adminBalance?: bigint;
  rewardPoolAmount?: bigint;
}

/**
 * Common test setup: create fixture, fund accounts, add reward pool, advance time
 */
export async function setupStakingTest(options: TestSetupOptions = {}): Promise<Awaited<ReturnType<typeof createTestFixture>>> {
  const fixture = await createTestFixture();

  // Fund user accounts with default or custom amounts
  const user1Balance = options.user1Balance ?? parseEther("10000");
  const user2Balance = options.user2Balance ?? parseEther("10000");
  const user3Balance = options.user3Balance ?? parseEther("10000");
  const adminBalance = options.adminBalance ?? parseEther("20000");

  await fundAccount(fixture.user1, user1Balance);
  await fundAccount(fixture.user2, user2Balance);
  await fundAccount(fixture.user3, user3Balance);
  await fundAccount(fixture.admin, adminBalance);

  // Add reward pool
  const rewardPoolAmount = options.rewardPoolAmount ?? parseEther("10000");
  const rewardTx = await fixture.staking.connect(fixture.admin).updateRewardPool({
    value: rewardPoolAmount,
  });
  await rewardTx.wait();

  // Advance time to start time
  await advanceTimeToStartTime(fixture);

  return fixture;
}

/**
 * Advance time to stake start time
 */
export async function advanceTimeToStartTime(fixture: Awaited<ReturnType<typeof createTestFixture>>): Promise<void> {
  const startTime = await fixture.staking.stakeStartTime();
  const ethers = await getEthers();
  const now = await ethers.provider
    .getBlock("latest")
    .then((b: any) => b?.timestamp || 0);
  if (now < startTime) {
    await advanceTime(Number(startTime - BigInt(now)) + 1);
  }
}

/**
 * Get positionId from stake transaction receipt
 * Handles Hardhat EDR limitations gracefully
 */
export async function getPositionIdFromReceipt(
  staking: any,
  receipt: any,
  nextPositionIdBefore?: bigint
): Promise<bigint | null> {
  // First try to get from event (most reliable)
  if (receipt && receipt.logs && receipt.logs.length > 0) {
    const event = getEvent(receipt, "PositionCreated", staking);
    if (event && event.args && event.args.positionId !== undefined) {
      return event.args.positionId;
    }
  }

  // Fallback: get from state
  if (nextPositionIdBefore !== undefined) {
    const nextPositionIdAfter = await staking.nextPositionId();
    if (nextPositionIdAfter > nextPositionIdBefore) {
      return nextPositionIdBefore;
    }
  } else {
    // Try to get current positionId
    const nextPositionId = await staking.nextPositionId();
    if (nextPositionId > 0n) {
      return nextPositionId - BigInt(1);
    }
  }

  return null;
}

/**
 * Stake and get positionId with proper error handling
 * This is a wrapper that handles Hardhat EDR limitations
 */
export async function stakeAndGetPositionIdSafe(
  staking: any,
  user: any,
  amount: bigint
): Promise<{ positionId: bigint; receipt: any } | null> {
  const nextPositionIdBefore = await staking.nextPositionId();
  const tx = await staking.connect(user).stake({ value: amount });
  const receipt = await tx.wait();

  if (receipt?.status !== 1) {
    return null;
  }

  const positionId = await getPositionIdFromReceipt(staking, receipt, nextPositionIdBefore);
  
  if (positionId === null) {
    // Transaction succeeded but positionId not available (Hardhat EDR limitation)
    return null;
  }

  // Verify position exists
  try {
    const position = await staking.positions(positionId);
    if (position.owner === "0x0000000000000000000000000000000000000000") {
      return null; // Position not created yet
    }
  } catch {
    return null; // Position query failed
  }

  return { positionId, receipt };
}

/**
 * Ensure account has sufficient balance, fund if needed
 */
export async function ensureAccountBalance(
  account: any,
  requiredBalance: bigint
): Promise<void> {
  const ethers = await getEthers();
  const address = await account.getAddress();
  const currentBalance = await ethers.provider.getBalance(address);
  
  if (currentBalance < requiredBalance) {
    await fundAccount(account, requiredBalance);
  }
}


