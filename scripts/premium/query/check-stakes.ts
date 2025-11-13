import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator, parsePosition } from "../../shared/helpers.js";

/**
 * Query user staking information
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [user] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.PREMIUM_STAKING_ADDRESS || getStakingAddress(StakingType.PREMIUM, network);

  // Can specify query user address via environment variable
  const targetAddress = process.env.USER_ADDRESS || user.address;

  printSeparator("Query User Staking Information");
  console.log("Contract address:", stakingAddress);
  console.log("User address:", targetAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query all user positions
  console.log("\nQuerying all user positions...");
  
  // Note: Since userPositions is a public mapping(address => uint256[])
  // Solidity doesn't automatically generate a getter that returns the entire array
  // Two solutions provided here:
  
  // Solution 1: If contract has getUserPositions(address) helper function (recommended)
  // const positionIds = await staking.getUserPositions(targetAddress);
  
  // Solution 2: Iterate to find (currently used, suitable when position count is low)
  console.log("⚠️  Note: This operation may be slow when there are many positions");
  console.log("Recommend adding getUserPositions(address) view function to contract for better efficiency\n");
  
  const nextPositionId = await staking.nextPositionId();
  const userPositions = [];
  
  // Iterate through all positions to find those belonging to this user
  for (let i = 1; i < Number(nextPositionId); i++) {
    try {
      const positionRaw = await staking.positions(i);
      const position = parsePosition(positionRaw);
      
      if (position.owner.toLowerCase() === targetAddress.toLowerCase()) {
        userPositions.push({
          positionId: i,
          ...position
        });
      }
    } catch (error) {
      // Skip non-existent or invalid positions
      continue;
    }
  }

  console.log(`\nFound ${userPositions.length} position(s):\n`);

  if (userPositions.length === 0) {
    console.log("User has no staking records");
    return;
  }

  let totalStaked = BigInt(0);
  let totalPending = BigInt(0);
  let activeCount = 0;

  for (const position of userPositions) {
    console.log(`Position #${position.positionId}:`);
    
    // Safely format amount, check for null/undefined
    if (position.amount !== null && position.amount !== undefined) {
      console.log(`  - Staked amount: ${ethers.formatEther(position.amount)} HSK`);
    } else {
      console.log(`  - Staked amount: Invalid`);
      continue; // Skip invalid position
    }
    
    if (position.stakedAt !== null && position.stakedAt !== undefined) {
      console.log(`  - Staked at: ${new Date(Number(position.stakedAt) * 1000).toLocaleString()}`);
    } else {
      console.log(`  - Staked at: Invalid`);
    }
    
    if (position.lastRewardAt !== null && position.lastRewardAt !== undefined) {
      console.log(`  - Last claim: ${new Date(Number(position.lastRewardAt) * 1000).toLocaleString()}`);
    } else {
      console.log(`  - Last claim: Invalid`);
    }
    
    console.log(`  - Lock period: 365 days`);
    console.log(`  - Is unstaked: ${position.isUnstaked ? 'Yes' : 'No'}`);
    
    if (!position.isUnstaked) {
      activeCount++;
      totalStaked += position.amount;
      
      // Query pending reward
      try {
        const pending = await staking.pendingReward(position.positionId);
        if (pending !== null && pending !== undefined) {
          console.log(`  - Pending reward: ${ethers.formatEther(pending)} HSK`);
          totalPending += pending;
        } else {
          console.log(`  - Pending reward: 0 HSK`);
        }
      } catch (error) {
        console.log(`  - Pending reward: Query failed`);
      }
    }
    
    console.log();
  }

  // Statistics
  printSeparator("Statistics");
  console.log(`Total positions: ${userPositions.length}`);
  console.log(`Active positions: ${activeCount}`);
  console.log(`Total staked: ${ethers.formatEther(totalStaked)} HSK`);
  console.log(`Total pending rewards: ${ethers.formatEther(totalPending)} HSK`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

