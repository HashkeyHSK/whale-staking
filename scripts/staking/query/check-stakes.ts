import hre from "hardhat";
import { getStakingAddress, printSeparator, parsePosition, getUserPositionIds } from "../../shared/helpers.js";

/**
 * Query user staking information
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [user] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  // Can specify query user address via environment variable
  const targetAddress = process.env.USER_ADDRESS || user.address;

  printSeparator("Query User Staking Information");
  console.log("Contract address:", stakingAddress);
  console.log("User address:", targetAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query all user positions
  console.log("\nQuerying all user positions...");
  
  // Get all position IDs for the user
  const positionIds = await getUserPositionIds(staking, targetAddress);
  
  if (positionIds.length === 0) {
    console.log("\nUser has no staking records");
    return;
  }

  // Query position details for each position ID
  const userPositions = [];
  for (const positionId of positionIds) {
    try {
      const positionRaw = await staking.positions(positionId);
      const position = parsePosition(positionRaw);
      userPositions.push({
        positionId: Number(positionId),
        ...position
      });
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
      // Note: pendingReward requires msg.sender to match position.owner
      // So we need to use the correct signer if querying for a different user
      try {
        // If querying for current user's positions, use current signer
        // Otherwise, we can't query pending reward (would return 0)
        if (targetAddress.toLowerCase() === user.address.toLowerCase()) {
          const stakingWithSigner = staking.connect(user);
          const pending = await stakingWithSigner.pendingReward(position.positionId);
          if (pending !== null && pending !== undefined) {
            console.log(`  - Pending reward: ${ethers.formatEther(pending)} HSK`);
            totalPending += pending;
          } else {
            console.log(`  - Pending reward: 0 HSK`);
          }
        } else {
          console.log(`  - Pending reward: Cannot query (requires owner's account)`);
          console.log(`    Note: pendingReward only works when called by position owner`);
        }
      } catch (error: any) {
        console.log(`  - Pending reward: Query failed - ${error.message}`);
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
