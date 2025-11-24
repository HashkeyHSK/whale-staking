import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../../shared/helpers.js";

/**
 * Set stake start time
 * 
 * Environment variables:
 * - START_TIME: Unix timestamp (required, seconds)
 * 
 * Example:
 * START_TIME="1735689600" npm run config:set-start-time:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  // Read Unix timestamp from environment variable
  const startTimeStr = process.env.START_TIME;
  if (!startTimeStr) {
    throw new Error(
      "Please provide start time (Unix timestamp):\n" +
      "Method 1: START_TIME=\"1735689600\" npm run config:set-start-time:testnet\n" +
      "Method 2: Set START_TIME=1735689600 in .env file\n\n" +
      "Tip: You can use online tools to convert date to Unix timestamp, e.g.:\n" +
      "  - https://www.epochconverter.com/\n" +
      "  - Or use command: date +%s"
    );
  }

  const newStartTime = parseInt(startTimeStr);
  if (isNaN(newStartTime) || newStartTime <= 0) {
    throw new Error(`Invalid timestamp: ${startTimeStr}, please provide a valid Unix timestamp (seconds)`);
  }

  printSeparator("Set Stake Start Time");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);
  console.log("\nNew start time:", new Date(newStartTime * 1000).toISOString());
  console.log("Unix timestamp:", newStartTime);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query current settings
  const currentStartTime = await staking.stakeStartTime();
  const currentEndTime = await staking.stakeEndTime();
  
  console.log("\nCurrent configuration:");
  console.log("  - Start time:", new Date(Number(currentStartTime) * 1000).toISOString());
  console.log("  - End time:", new Date(Number(currentEndTime) * 1000).toISOString());

  // Validate new time must be < end time
  if (newStartTime >= Number(currentEndTime)) {
    throw new Error("Start time must be earlier than end time");
  }

  console.log("\nExecuting setting...");
  const tx = await staking.setStakeStartTime(newStartTime);
  await waitForTransaction(tx, "Set start time transaction");

  printSuccess("Stake start time updated!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
