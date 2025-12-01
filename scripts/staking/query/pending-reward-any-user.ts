import hre from "hardhat";
import { getStakingAddress, printSeparator, parsePosition, getUserPositionIds } from "../../shared/helpers.js";

/**
 * Query pending reward for any user/position
 * 
 * This script can query pendingReward for any position, regardless of who owns it.
 * pendingReward function can be called by anyone (no owner restriction).
 * 
 * Usage:
 * 1. Query specific position:
 *    POSITION_ID=1 npm run query:pending-reward-any-user:testnet
 *    or
 *    npm run query:pending-reward-any-user:testnet 1
 * 
 * 2. Query all positions for a user:
 *    USER_ADDRESS=0x... npm run query:pending-reward-any-user:testnet
 *    or
 *    npm run query:pending-reward-any-user:testnet -- --user 0x...
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [signer] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  // Parse command line arguments
  const args = process.argv.slice(2);
  let positionId: string | undefined;
  let userAddress: string | undefined;

  // Check for --user flag
  const userIndex = args.findIndex(arg => arg === "--user" || arg === "-u");
  if (userIndex !== -1 && args[userIndex + 1]) {
    userAddress = args[userIndex + 1];
  }

  // Get positionId from environment variable, command line argument, or first arg
  positionId = process.env.POSITION_ID || (args[0] && !args[0].startsWith("--") ? args[0] : undefined);
  
  // Get userAddress from environment variable if not from command line
  if (!userAddress) {
    userAddress = process.env.USER_ADDRESS;
  }

  printSeparator("Query Pending Reward (Any User)");
  console.log("Contract address:", stakingAddress);
  console.log("Query caller:", signer.address);
  console.log("Note: pendingReward can be called by anyone, no owner restriction");

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Check emergency mode
  const emergencyMode = await staking.emergencyMode();
  if (emergencyMode) {
    console.log("\n⚠️  Contract is in emergency mode");
    console.log("Pending rewards will show as 0 in emergency mode");
  }

  // Mode 1: Query specific position
  if (positionId) {
    await queryPositionReward(staking, ethers, positionId, emergencyMode);
    return;
  }

  // Mode 2: Query all positions for a user
  if (userAddress) {
    await queryUserAllRewards(staking, ethers, userAddress, emergencyMode);
    return;
  }

  // No parameters provided
  throw new Error(
    "Please provide either positionId or userAddress:\n\n" +
    "Query specific position:\n" +
    "  POSITION_ID=1 npm run query:pending-reward-any-user:testnet\n" +
    "  or\n" +
    "  npm run query:pending-reward-any-user:testnet 1\n\n" +
    "Query all positions for a user:\n" +
    "  USER_ADDRESS=0x... npm run query:pending-reward-any-user:testnet\n" +
    "  or\n" +
    "  npm run query:pending-reward-any-user:testnet -- --user 0x..."
  );
}

/**
 * Query pending reward for a specific position
 */
async function queryPositionReward(
  staking: any,
  ethers: any,
  positionId: string,
  emergencyMode: boolean
) {
  console.log("\nPosition ID:", positionId);

  // Query position information
  const positionRaw = await staking.positions(positionId);
  const position = parsePosition(positionRaw);
  
  // Check if position exists
  if (position.owner === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Position ${positionId} does not exist`);
  }

  console.log("\nPosition information:");
  console.log("  - Position owner:", position.owner);
  console.log("  - Staked amount:", ethers.formatEther(position.amount), "HSK");
  console.log("  - Staked at:", new Date(Number(position.stakedAt) * 1000).toLocaleString());
  console.log("  - Last claim:", new Date(Number(position.lastRewardAt) * 1000).toLocaleString());
  console.log("  - Is unstaked:", position.isUnstaked ? "Yes" : "No");

  // Query pending reward - can be called by anyone
  const pendingReward = await staking.pendingReward(positionId);
  
  console.log("\n" + "=".repeat(50));
  console.log("Pending reward:", ethers.formatEther(pendingReward), "HSK");
  console.log("=".repeat(50));

  if (position.isUnstaked) {
    console.log("\n⚠️  This position has been unstaked, cannot accumulate more rewards");
  } else if (pendingReward === BigInt(0)) {
    console.log("\n⚠️  No reward available to claim");
    console.log("\nPossible reasons for zero reward:");
    console.log("  1. Position was just created (rewards accumulate over time)");
    console.log("  2. Emergency mode is enabled");
    console.log("  3. Not enough time has passed since last reward claim");
    console.log("  4. Reward pool may be insufficient");
  }

  // Calculate reward details
  if (!emergencyMode && !position.isUnstaked) {
    const rewardRate = await staking.rewardRate();
    const lockPeriod = 365 * 24 * 60 * 60; // 365 days
    const now = Math.floor(Date.now() / 1000);
    const stakedTime = now - Number(position.stakedAt);
    const lockEndTime = Number(position.stakedAt) + lockPeriod;
    
    console.log("\nReward calculation details:");
    console.log("  - APY:", Number(rewardRate) / 100, "%");
    console.log("  - Days staked:", Math.floor(stakedTime / (24 * 60 * 60)), "days");
    
    if (now < lockEndTime) {
      const remainingDays = Math.ceil((lockEndTime - now) / (24 * 60 * 60));
      console.log("  - Days until unlock:", remainingDays, "days");
      console.log("  - Unlock time:", new Date(lockEndTime * 1000).toLocaleString());
      
      // Estimate total reward at maturity
      const totalReward = (position.amount * BigInt(rewardRate)) / BigInt(10000);
      console.log("  - Estimated total reward at maturity:", ethers.formatEther(totalReward), "HSK");
    } else {
      console.log("  - Status: ✅ Unlocked, can unstake");
    }
  }
}

/**
 * Query all pending rewards for a user
 */
async function queryUserAllRewards(
  staking: any,
  ethers: any,
  userAddress: string,
  emergencyMode: boolean
) {
  console.log("\nUser address:", userAddress);

  // Get all position IDs for the user
  const positionIds = await getUserPositionIds(staking, userAddress);
  
  if (positionIds.length === 0) {
    console.log("\nUser has no staking positions");
    return;
  }

  console.log(`\nFound ${positionIds.length} position(s):\n`);

  let totalStaked = BigInt(0);
  let totalPending = BigInt(0);
  let activeCount = 0;
  const positions: Array<{
    positionId: bigint;
    amount: bigint;
    pendingReward: bigint;
    isUnstaked: boolean;
    stakedAt: bigint;
  }> = [];

  // Query each position
  for (const positionId of positionIds) {
    try {
      const positionRaw = await staking.positions(positionId);
      const position = parsePosition(positionRaw);
      
      // Skip if position doesn't exist
      if (position.owner === "0x0000000000000000000000000000000000000000") {
        continue;
      }

      // Query pending reward - can be called by anyone
      const pendingReward = await staking.pendingReward(positionId);

      positions.push({
        positionId,
        amount: position.amount,
        pendingReward,
        isUnstaked: position.isUnstaked,
        stakedAt: position.stakedAt,
      });

      if (!position.isUnstaked) {
        activeCount++;
        totalStaked += position.amount;
        totalPending += pendingReward;
      }
    } catch (error: any) {
      console.error(`Failed to query position ${positionId}:`, error.message);
      continue;
    }
  }

  // Display results
  for (const pos of positions) {
    console.log(`Position #${pos.positionId}:`);
    console.log(`  - Staked amount: ${ethers.formatEther(pos.amount)} HSK`);
    console.log(`  - Staked at: ${new Date(Number(pos.stakedAt) * 1000).toLocaleString()}`);
    console.log(`  - Is unstaked: ${pos.isUnstaked ? "Yes" : "No"}`);
    console.log(`  - Pending reward: ${ethers.formatEther(pos.pendingReward)} HSK`);
    console.log();
  }

  // Statistics
  printSeparator("Statistics");
  console.log(`Total positions: ${positions.length}`);
  console.log(`Active positions: ${activeCount}`);
  console.log(`Total staked: ${ethers.formatEther(totalStaked)} HSK`);
  console.log(`Total pending rewards: ${ethers.formatEther(totalPending)} HSK`);
  
  if (emergencyMode) {
    console.log("\n⚠️  Note: Contract is in emergency mode, pending rewards show as 0");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


