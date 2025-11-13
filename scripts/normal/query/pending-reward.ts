import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator, parsePosition } from "../../shared/helpers.js";

/**
 * Query pending reward for specified position
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [user] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.NORMAL_STAKING_ADDRESS || getStakingAddress(StakingType.NORMAL, network);

  // Get positionId from environment variable or command line argument
  const positionId = process.env.POSITION_ID || process.argv[2];
  
  if (!positionId) {
    throw new Error("Please provide positionId: POSITION_ID=1 npm run query:pending-reward:testnet or append argument");
  }

  printSeparator("Query Pending Reward");
  console.log("User address:", user.address);
  console.log("Contract address:", stakingAddress);
  console.log("Position ID:", positionId);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query position information
  const positionRaw = await staking.positions(positionId);
  const position = parsePosition(positionRaw);
  
  if (position.owner.toLowerCase() !== user.address.toLowerCase()) {
    throw new Error("This position does not belong to the current user");
  }

  console.log("\nPosition information:");
  console.log("  - Staked amount:", ethers.formatEther(position.amount), "HSK");
  console.log("  - Staked at:", new Date(Number(position.stakedAt) * 1000).toLocaleString());
  console.log("  - Last claim:", new Date(Number(position.lastRewardAt) * 1000).toLocaleString());
  console.log("  - Is unstaked:", position.isUnstaked ? "Yes" : "No");

  // Check emergency mode
  const emergencyMode = await staking.emergencyMode();
  
  if (emergencyMode) {
    console.log("\n⚠️  Contract is in emergency mode");
    console.log("Cannot claim rewards in emergency mode, pending reward shows as 0");
  }

  // Query pending reward
  const pendingReward = await staking.pendingReward(positionId);
  
  console.log("\n" + "=".repeat(50));
  console.log("Pending reward:", ethers.formatEther(pendingReward), "HSK");
  console.log("=".repeat(50));

  if (position.isUnstaked) {
    console.log("\n⚠️  This position has been unstaked, cannot accumulate more rewards");
  } else if (pendingReward === BigInt(0)) {
    console.log("\nNo reward available to claim");
  } else {
    console.log("\nYou can use the following command to claim rewards:");
    console.log(`POSITION_ID=${positionId} npm run claim:testnet`);
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
