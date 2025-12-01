import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction, parsePosition } from "../shared/helpers.js";

/**
 * Unstake and claim rewards
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [user] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  // Get positionId from environment variable or command line argument
  const positionId = process.env.POSITION_ID || process.argv[2];
  
  if (!positionId) {
    throw new Error("Please provide positionId: POSITION_ID=1 npm run unstake:testnet or npm run unstake:testnet 1");
  }

  printSeparator("Unstake (Staking)");
  console.log("User address:", user.address);
  console.log("Contract address:", stakingAddress);
  console.log("Position ID:", positionId);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query position information
  console.log("\nQuerying position information...");
  const positionRaw = await staking.positions(positionId);
  const position = parsePosition(positionRaw);
  
  if (position.owner.toLowerCase() !== user.address.toLowerCase()) {
    throw new Error("This position does not belong to the current user");
  }

  if (position.isUnstaked) {
    throw new Error("This position has already been unstaked");
  }

  console.log("\nPosition information:");
  console.log("  - Staked amount:", ethers.formatEther(position.amount), "HSK");
  console.log("  - Staked at:", new Date(Number(position.stakedAt) * 1000).toLocaleString());
  console.log("  - Lock period: 365 days");
  
  // Check lock period
  const lockEndTime = Number(position.stakedAt) + (365 * 24 * 60 * 60);
  const now = Math.floor(Date.now() / 1000);
  
  if (now < lockEndTime) {
    const remainingDays = Math.ceil((lockEndTime - now) / (24 * 60 * 60));
    throw new Error(`Lock period not completed, please wait ${remainingDays} more days`);
  }

  // Query pending reward
  const pendingReward = await staking.pendingReward(positionId);
  console.log("\nPending reward:", ethers.formatEther(pendingReward), "HSK");
  console.log("Total to receive:", ethers.formatEther(position.amount + pendingReward), "HSK");

  console.log("\nExecuting unstake...");
  
  // Execute unstake (will automatically claim all rewards)
  const tx = await staking.unstake(positionId);
  await waitForTransaction(tx, "Unstake transaction");

  printSuccess("Unstake successful! Principal and rewards have been returned.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
