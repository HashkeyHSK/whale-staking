import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction } from "../shared/helpers.js";
import { validatePosition, validateEarlyUnstakeRequest, validateLockPeriodNotEnded } from "../shared/validations.js";

/**
 * Request early unstake for a position
 * After requesting, user must wait 7 days before completing early unstake
 * Note: Reward calculation stops at request time, not completion time
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [user] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  // Get positionId from environment variable or command line argument
  const positionId = process.env.POSITION_ID || process.argv[2];
  
  if (!positionId) {
    throw new Error("Please provide positionId: POSITION_ID=1 npm run request-early-unstake:testnet or npm run request-early-unstake:testnet 1");
  }

  printSeparator("Request Early Unstake");
  console.log("User address:", user.address);
  console.log("Contract address:", stakingAddress);
  console.log("Position ID:", positionId);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query and validate position information
  console.log("\nQuerying position information...");
  const position = await validatePosition(staking, positionId, await user.getAddress());

  // Check if already requested
  try {
    const requestInfo = await validateEarlyUnstakeRequest(staking, positionId);
    if (requestInfo.canComplete) {
      throw new Error(
        `Early unstake already requested. Waiting period completed.\n` +
        `Request time: ${new Date(Number(requestInfo.requestTime) * 1000).toLocaleString()}\n` +
        `You can now complete early unstake using: npm run complete-early-unstake:testnet`
      );
    } else {
      const remainingDays = Math.ceil(requestInfo.remainingSeconds / (24 * 60 * 60));
      throw new Error(
        `Early unstake already requested.\n` +
        `Request time: ${new Date(Number(requestInfo.requestTime) * 1000).toLocaleString()}\n` +
        `Please wait ${remainingDays} more days before completing early unstake`
      );
    }
  } catch (error: any) {
    // If error message is "not requested", continue; otherwise rethrow
    if (!error.message.includes("not requested")) {
      throw error;
    }
  }

  // Check lock period
  await validateLockPeriodNotEnded(position);
  
  const LOCK_PERIOD = 365 * 24 * 60 * 60; // 365 days
  const lockEndTime = Number(position.stakedAt) + LOCK_PERIOD;

  console.log("\nPosition information:");
  console.log("  - Staked amount:", ethers.formatEther(position.amount), "HSK");
  console.log("  - Staked at:", new Date(Number(position.stakedAt) * 1000).toLocaleString());
  console.log("  - Lock period: 365 days");
  console.log("  - Lock end time:", new Date(lockEndTime * 1000).toLocaleString());
  
  // Query pending reward
  const pendingReward = await staking.pendingReward(positionId);
  const claimedRewards = await staking.claimedRewards(positionId);
  
  console.log("\nReward information:");
  console.log("  - Pending reward:", ethers.formatEther(pendingReward), "HSK");
  console.log("  - Claimed rewards:", ethers.formatEther(claimedRewards), "HSK");

  printWarning("Important Notes:");
  console.log("  - After requesting, reward calculation stops at request time");
  console.log("  - You must wait 7 days before completing early unstake");
  console.log("  - Early unstake incurs 50% penalty on rewards");
  console.log("  - Penalty goes to penalty pool (distributed to users who complete full staking period)");
  console.log("  - If you claimed more than 50% of rewards, excess will be deducted from principal");

  console.log("\nExecuting request early unstake...");
  
  // Execute requestEarlyUnstake
  const tx = await staking.requestEarlyUnstake(positionId);
  await waitForTransaction(tx, "Request early unstake transaction");

  // Verify request
  const newRequestTime = await staking.earlyUnstakeRequestTime(positionId);
  const completeTime = Number(newRequestTime) + (7 * 24 * 60 * 60);
  
  printSuccess("Early unstake requested successfully!");
  console.log("\nNext steps:");
  console.log("  - Request time:", new Date(Number(newRequestTime) * 1000).toLocaleString());
  console.log("  - You can complete early unstake after:", new Date(completeTime * 1000).toLocaleString());
  console.log("  - Use command: POSITION_ID=" + positionId + " npm run complete-early-unstake:testnet");
  console.log("\n⚠️  Note: Reward calculation stops at request time. The 7-day waiting period does not generate additional rewards.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
