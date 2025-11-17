import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator, parsePosition } from "../../shared/helpers.js";

/**
 * Query position information (including owner)
 * This script can be used to check any position's details, including who owns it
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [user] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.NORMAL_STAKING_ADDRESS || getStakingAddress(StakingType.NORMAL, network);

  // Get positionId from environment variable or command line argument
  const positionId = process.env.POSITION_ID || process.argv[2];
  
  if (!positionId) {
    throw new Error("Please provide positionId: POSITION_ID=5 npm run query:position-info:testnet or append argument");
  }

  printSeparator("Query Position Information");
  console.log("Current caller:", user.address);
  console.log("Contract address:", stakingAddress);
  console.log("Position ID:", positionId);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query position information
  const positionRaw = await staking.positions(positionId);
  const position = parsePosition(positionRaw);
  
  // Check if position exists
  if (position.owner === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Position ${positionId} does not exist`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("Position Information:");
  console.log("=".repeat(50));
  console.log("  - Position ID:", positionId);
  console.log("  - Owner:", position.owner);
  console.log("  - Staked amount:", ethers.formatEther(position.amount), "HSK");
  console.log("  - Staked at:", new Date(Number(position.stakedAt) * 1000).toLocaleString());
  console.log("  - Last reward claim:", new Date(Number(position.lastRewardAt) * 1000).toLocaleString());
  console.log("  - Is unstaked:", position.isUnstaked ? "Yes" : "No");
  
  // Check if current caller is the owner
  const isOwner = position.owner.toLowerCase() === user.address.toLowerCase();
  console.log("  - Current caller is owner:", isOwner ? "Yes ✅" : "No ❌");
  
  if (!isOwner) {
    console.log("\n⚠️  IMPORTANT: To query pending reward for this position:");
    console.log(`   You must use the account that owns this position: ${position.owner}`);
    console.log("   The pendingReward function checks msg.sender and returns 0 if it doesn't match the owner");
  }

  // Check emergency mode
  const emergencyMode = await staking.emergencyMode();
  console.log("\nContract Status:");
  console.log("  - Emergency mode:", emergencyMode ? "Yes ⚠️" : "No ✅");
  
  if (emergencyMode) {
    console.log("  - Note: In emergency mode, pendingReward returns 0");
  }

  // If caller is owner, try to query pending reward
  if (isOwner && !position.isUnstaked && !emergencyMode) {
    console.log("\nQuerying pending reward...");
    try {
      const stakingWithSigner = staking.connect(user) as any;
      const pendingReward = await stakingWithSigner.pendingReward(positionId);
      console.log("  - Pending reward:", ethers.formatEther(pendingReward), "HSK");
      
      if (pendingReward === BigInt(0)) {
        console.log("\n  Note: Reward is 0, possible reasons:");
        console.log("    1. Position was just created (rewards accumulate over time)");
        console.log("    2. Not enough time has passed since last reward claim");
        console.log("    3. Reward pool may be insufficient");
      }
    } catch (error: any) {
      console.log("  - Pending reward: Query failed -", error.message);
    }
  } else if (isOwner && position.isUnstaked) {
    console.log("\n⚠️  This position has been unstaked, cannot accumulate more rewards");
  }

  // Calculate reward details
  if (!emergencyMode && !position.isUnstaked) {
    const rewardRate = await staking.rewardRate();
    const lockPeriod = 365 * 24 * 60 * 60; // 365 days
    const now = Math.floor(Date.now() / 1000);
    const stakedTime = now - Number(position.stakedAt);
    const lockEndTime = Number(position.stakedAt) + lockPeriod;
    
    console.log("\nReward Calculation Details:");
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

  console.log("\n" + "=".repeat(50));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

