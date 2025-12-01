import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction, parsePosition } from "../shared/helpers.js";
import { validatePosition, validateEarlyUnstakeRequest } from "../shared/validations.js";

/**
 * Complete early unstake after 7-day waiting period
 * User receives 50% of calculated rewards (based on request time)
 * 50% penalty goes to penalty pool
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [user] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  // Get positionId from environment variable or command line argument
  const positionId = process.env.POSITION_ID || process.argv[2];
  
  if (!positionId) {
    throw new Error("Please provide positionId: POSITION_ID=1 npm run complete-early-unstake:testnet or npm run complete-early-unstake:testnet 1");
  }

  printSeparator("Complete Early Unstake");
  console.log("User address:", user.address);
  console.log("Contract address:", stakingAddress);
  console.log("Position ID:", positionId);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query and validate position information
  console.log("\nQuerying position information...");
  const position = await validatePosition(staking, positionId, await user.getAddress());

  // Check early unstake request and waiting period
  const requestInfo = await validateEarlyUnstakeRequest(staking, positionId);
  
  if (!requestInfo.canComplete) {
    const remainingDays = Math.ceil(requestInfo.remainingSeconds / (24 * 60 * 60));
    const remainingHours = Math.ceil(requestInfo.remainingSeconds / (60 * 60));
    
    throw new Error(
      `Waiting period not completed.\n` +
      `Request time: ${new Date(Number(requestInfo.requestTime) * 1000).toLocaleString()}\n` +
      `Can complete after: ${new Date(requestInfo.completeTime * 1000).toLocaleString()}\n` +
      `Remaining time: ${remainingDays} days (${remainingHours} hours)`
    );
  }

  console.log("\nPosition information:");
  console.log("  - Staked amount:", ethers.formatEther(position.amount), "HSK");
  console.log("  - Staked at:", new Date(Number(position.stakedAt) * 1000).toLocaleString());
  console.log("  - Request time:", new Date(Number(requestInfo.requestTime) * 1000).toLocaleString());
  
  // Query reward information
  const claimedRewards = await staking.claimedRewards(positionId);
  const rewardRate = await staking.rewardRate();
  
  console.log("\nReward information:");
  console.log("  - Claimed rewards:", ethers.formatEther(claimedRewards), "HSK");
  console.log("  - Reward rate:", Number(rewardRate) / 100, "% APY");
  
  printWarning("Early Unstake Penalty:");
  console.log("  - You will receive 50% of calculated rewards (based on request time)");
  console.log("  - 50% penalty goes to penalty pool");
  console.log("  - If you claimed more than 50%, excess will be deducted from principal");
  console.log("  - Early unstake positions are NOT eligible for penalty pool distribution");

  // Get user balance before
  const balanceBefore = await ethers.provider.getBalance(user.address);
  
  console.log("\nExecuting complete early unstake...");
  
  // Execute completeEarlyUnstake
  const tx = await staking.completeEarlyUnstake(positionId);
  const receipt = await waitForTransaction(tx, "Complete early unstake transaction");

  // Get user balance after
  const balanceAfter = await ethers.provider.getBalance(user.address);
  let gasCost = BigInt(0);
  if (receipt && 'gasUsed' in receipt && 'gasPrice' in receipt) {
    const gasUsed = BigInt(receipt.gasUsed?.toString() || '0');
    const gasPrice = BigInt(receipt.gasPrice?.toString() || '0');
    gasCost = gasUsed * gasPrice;
  }
  const received = balanceAfter - balanceBefore + gasCost;

  printSuccess("Early unstake completed successfully!");
  console.log("\nTransaction details:");
  console.log("  - Received amount:", ethers.formatEther(received), "HSK");
  console.log("  - Gas used:", receipt?.gasUsed?.toString() || "N/A");
  
  // Verify position is unstaked
  const updatedPositionRaw = await staking.positions(positionId);
  const updatedPosition = parsePosition(updatedPositionRaw);
  
  if (!updatedPosition.isUnstaked) {
    printWarning("Warning: Position not marked as unstaked. Please check contract state.");
  } else {
    console.log("\n✅ Position marked as unstaked");
    console.log("  - Is completed stake:", updatedPosition.isCompletedStake || false);
    console.log("  - Note: Early unstake positions are NOT eligible for penalty pool distribution");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
