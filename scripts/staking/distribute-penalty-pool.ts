import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction, parsePosition } from "../shared/helpers.js";
import { parsePositionIds, validateAdminIsOwner, validateStakingPeriodEnded, validatePenaltyPoolHasBalance } from "../shared/validations.js";

/**
 * Distribute penalty pool to users who completed full staking period
 * Only positions that completed full staking period (via unstake()) are eligible
 * Distribution is proportional based on staked amounts
 * 
 * Environment variables:
 * - POSITION_IDS: Comma-separated position IDs (e.g., "1,2,3")
 * 
 * Example:
 * POSITION_IDS="1,2,3" npm run distribute-penalty-pool:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  // Get positionIds from environment variable
  const positionIdsStr = process.env.POSITION_IDS || process.argv[2];
  
  if (!positionIdsStr) {
    throw new Error(
      "Please provide position IDs:\n" +
      "POSITION_IDS=\"1,2,3\" npm run distribute-penalty-pool:testnet\n" +
      "or\n" +
      "npm run distribute-penalty-pool:testnet \"1,2,3\""
    );
  }

  // Parse position IDs
  const positionIds = parsePositionIds(positionIdsStr);

  printSeparator("Distribute Penalty Pool");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);
  console.log("Position IDs:", positionIds.join(", "));

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Validate admin is owner
  await validateAdminIsOwner(staking, admin.address);

  // Validate staking period ended
  await validateStakingPeriodEnded(staking);

  // Check penalty pool balance
  const penaltyPoolBalance = await validatePenaltyPoolHasBalance(staking);
  console.log("\nPenalty pool balance:", ethers.formatEther(penaltyPoolBalance), "HSK");

  // Validate all positions
  console.log("\nValidating positions...");
  let totalCompletedStaked = BigInt(0);
  const positions: Array<{ id: string; position: any; owner: string; amount: bigint }> = [];
  
  for (const positionId of positionIds) {
    const positionRaw = await staking.positions(positionId);
    const position = parsePosition(positionRaw);
    
    if (position.owner === "0x0000000000000000000000000000000000000000") {
      throw new Error(`Position ${positionId} does not exist`);
    }
    
    if (!position.isCompletedStake) {
      throw new Error(
        `Position ${positionId} did not complete full staking period.\n` +
        `Only positions that completed full staking period (via unstake()) are eligible.`
      );
    }
    
    if (!position.isUnstaked) {
      throw new Error(`Position ${positionId} must be unstaked`);
    }
    
    positions.push({
      id: positionId.toString(),
      position,
      owner: position.owner,
      amount: position.amount,
    });
    
    totalCompletedStaked += position.amount;
  }
  
  if (totalCompletedStaked === BigInt(0)) {
    throw new Error("No valid completed positions");
  }

  console.log("\nValidated positions:");
  console.log("  - Total positions:", positions.length);
  console.log("  - Total completed staked:", ethers.formatEther(totalCompletedStaked), "HSK");
  
  // Calculate distribution
  console.log("\nDistribution calculation:");
  const distributions: Array<{ positionId: string; owner: string; share: bigint; shareFormatted: string }> = [];
  
  for (const pos of positions) {
    const share = (penaltyPoolBalance * pos.amount) / totalCompletedStaked;
    distributions.push({
      positionId: pos.id,
      owner: pos.owner,
      share,
      shareFormatted: ethers.formatEther(share),
    });
    console.log(`  - Position ${pos.id}: ${ethers.formatEther(pos.amount)} HSK → ${ethers.formatEther(share)} HSK`);
  }
  
  const totalDistributed = distributions.reduce((sum, d) => sum + d.share, BigInt(0));
  console.log("\nTotal to distribute:", ethers.formatEther(totalDistributed), "HSK");
  console.log("Penalty pool balance:", ethers.formatEther(penaltyPoolBalance), "HSK");
  
  if (totalDistributed > penaltyPoolBalance) {
    printWarning("Warning: Calculated distribution exceeds penalty pool balance");
  }

  printWarning("Important:");
  console.log("  - Only positions that completed full staking period are eligible");
  console.log("  - Distribution is proportional based on staked amounts");
  console.log("  - Early unstake positions are NOT eligible");

  console.log("\nExecuting distribute penalty pool...");
  
  // Execute distributePenaltyPool
  const tx = await staking.distributePenaltyPool(positionIds);
  await waitForTransaction(tx, "Distribute penalty pool transaction");

  // Verify distribution
  const newPenaltyPoolBalance = await staking.penaltyPoolBalance();
  const distributed = penaltyPoolBalance - newPenaltyPoolBalance;
  
  printSuccess("Penalty pool distributed successfully!");
  console.log("\nDistribution summary:");
  console.log("  - Positions distributed:", positions.length);
  console.log("  - Total distributed:", ethers.formatEther(distributed), "HSK");
  console.log("  - Remaining penalty pool:", ethers.formatEther(newPenaltyPoolBalance), "HSK");
  
  console.log("\nDistribution details:");
  for (const dist of distributions) {
    console.log(`  - Position ${dist.positionId} (${dist.owner}): ${dist.shareFormatted} HSK`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
