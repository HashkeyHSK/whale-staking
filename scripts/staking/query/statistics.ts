import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, parsePosition } from "../../shared/helpers.js";

/**
 * Query staking statistics
 * Shows top users by staked amount and total statistics
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  printSeparator("Staking Statistics");

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Get contract status
  console.log("Querying contract status...");
  const totalStaked = await staking.totalStaked();
  const totalPendingRewards = await staking.totalPendingRewards();
  const rewardPoolBalance = await staking.rewardPoolBalance();
  const penaltyPoolBalance = await staking.penaltyPoolBalance();
  const nextPositionId = await staking.nextPositionId();
  
  console.log("\nContract Statistics:");
  console.log("  - Total staked:", ethers.formatEther(totalStaked), "HSK");
  console.log("  - Total pending rewards:", ethers.formatEther(totalPendingRewards), "HSK");
  console.log("  - Reward pool balance:", ethers.formatEther(rewardPoolBalance), "HSK");
  console.log("  - Penalty pool balance:", ethers.formatEther(penaltyPoolBalance), "HSK");
  console.log("  - Total positions:", nextPositionId.toString());

  // Query all positions
  console.log("\nQuerying all positions...");
  const positions: Array<{
    positionId: bigint;
    owner: string;
    amount: bigint;
    stakedAt: bigint;
    isUnstaked: boolean;
    isCompletedStake: boolean;
    claimedRewards: bigint;
    earlyUnstakeRequestTime: bigint;
  }> = [];
  
  const positionCount = Number(nextPositionId);
  let activePositions = 0;
  let unstakedPositions = 0;
  let completedStakes = 0;
  let earlyUnstakeRequests = 0;
  
  for (let i = 1; i < positionCount; i++) {
    try {
      const positionId = BigInt(i);
      const positionRaw = await staking.positions(positionId);
      const position = parsePosition(positionRaw);
      
      // Skip if position doesn't exist (owner is zero address)
      if (position.owner === "0x0000000000000000000000000000000000000000") {
        continue;
      }
      
      const claimedRewards = await staking.claimedRewards(positionId);
      const earlyUnstakeRequestTime = await staking.earlyUnstakeRequestTime(positionId);
      
      const isCompletedStake = position.isCompletedStake || false;
      
      positions.push({
        positionId,
        owner: position.owner,
        amount: position.amount,
        stakedAt: position.stakedAt,
        isUnstaked: position.isUnstaked || false,
        isCompletedStake,
        claimedRewards,
        earlyUnstakeRequestTime,
      });
      
      if (!position.isUnstaked) {
        activePositions++;
      } else {
        unstakedPositions++;
      }
      
      if (isCompletedStake) {
        completedStakes++;
      }
      
      if (earlyUnstakeRequestTime > BigInt(0)) {
        earlyUnstakeRequests++;
      }
    } catch (error) {
      // Skip invalid positions
      continue;
    }
  }
  
  console.log("\nPosition Statistics:");
  console.log("  - Total positions:", positions.length);
  console.log("  - Active positions:", activePositions);
  console.log("  - Unstaked positions:", unstakedPositions);
  console.log("  - Completed stakes:", completedStakes);
  console.log("  - Early unstake requests:", earlyUnstakeRequests);

  // Aggregate by user
  const userStats: Map<string, {
    address: string;
    totalStaked: bigint;
    totalClaimed: bigint;
    positionCount: number;
    completedStakes: number;
    earlyUnstakeRequests: number;
  }> = new Map();
  
  for (const pos of positions) {
    const existing = userStats.get(pos.owner.toLowerCase()) || {
      address: pos.owner,
      totalStaked: BigInt(0),
      totalClaimed: BigInt(0),
      positionCount: 0,
      completedStakes: 0,
      earlyUnstakeRequests: 0,
    };
    
    existing.totalStaked += pos.amount;
    existing.totalClaimed += pos.claimedRewards;
    existing.positionCount++;
    if (pos.isCompletedStake) {
      existing.completedStakes++;
    }
    if (pos.earlyUnstakeRequestTime > BigInt(0)) {
      existing.earlyUnstakeRequests++;
    }
    
    userStats.set(pos.owner.toLowerCase(), existing);
  }
  
  // Sort by total staked
  const sortedUsers = Array.from(userStats.values()).sort((a, b) => {
    if (a.totalStaked > b.totalStaked) return -1;
    if (a.totalStaked < b.totalStaked) return 1;
    return 0;
  });
  
  console.log("\nUser Statistics:");
  console.log("  - Total unique users:", sortedUsers.length);
  
  // Show top 20 users
  const topN = Math.min(20, sortedUsers.length);
  console.log(`\nTop ${topN} Users by Staked Amount:`);
  console.log("Rank | Address | Positions | Total Staked | Claimed | Completed | Early Requests");
  console.log("-".repeat(100));
  
  for (let i = 0; i < topN; i++) {
    const user = sortedUsers[i];
    const rank = (i + 1).toString().padStart(4);
    const address = user.address.substring(0, 10) + "..." + user.address.substring(38);
    const positions = user.positionCount.toString().padStart(9);
    const staked = ethers.formatEther(user.totalStaked).padStart(12);
    const claimed = ethers.formatEther(user.totalClaimed).padStart(8);
    const completed = user.completedStakes.toString().padStart(9);
    const earlyRequests = user.earlyUnstakeRequests.toString().padStart(13);
    
    console.log(`${rank} | ${address} | ${positions} | ${staked} HSK | ${claimed} HSK | ${completed} | ${earlyRequests}`);
  }
  
  // Calculate totals
  const totalClaimed = sortedUsers.reduce((sum, u) => sum + u.totalClaimed, BigInt(0));
  const totalCompletedStakes = sortedUsers.reduce((sum, u) => sum + u.completedStakes, 0);
  const totalEarlyRequests = sortedUsers.reduce((sum, u) => sum + u.earlyUnstakeRequests, 0);
  
  console.log("\nOverall Statistics:");
  console.log("  - Total claimed rewards:", ethers.formatEther(totalClaimed), "HSK");
  console.log("  - Total completed stakes:", totalCompletedStakes);
  console.log("  - Total early unstake requests:", totalEarlyRequests);
  
  printSuccess("Statistics query completed!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

