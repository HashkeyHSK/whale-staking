import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../../shared/helpers.js";

/**
 * Set stake end time
 * 
 * Environment variables:
 * - END_TIME: Unix timestamp (required, seconds)
 * 
 * Example:
 * END_TIME="1735689600" npm run config:set-end-time:premium:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.PREMIUM_STAKING_ADDRESS || getStakingAddress(StakingType.PREMIUM, network);

  // Read Unix timestamp from environment variable
  const endTimeStr = process.env.END_TIME;
  if (!endTimeStr) {
    throw new Error(
      "Please provide end time (Unix timestamp):\n" +
      "Method 1: END_TIME=\"1735689600\" npm run config:set-end-time:premium:testnet\n" +
      "Method 2: Set END_TIME=1735689600 in .env file\n\n" +
      "Tip: You can use online tools to convert date to Unix timestamp, e.g.:\n" +
      "  - https://www.epochconverter.com/\n" +
      "  - Or use command: date +%s"
    );
  }

  const newEndTime = parseInt(endTimeStr);
  if (isNaN(newEndTime) || newEndTime <= 0) {
    throw new Error(`Invalid timestamp: ${endTimeStr}, please provide a valid Unix timestamp (seconds)`);
  }

  printSeparator("Set Stake End Time");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);
  console.log("\nNew end time:", new Date(newEndTime * 1000).toISOString());
  console.log("Unix timestamp:", newEndTime);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query current settings
  const currentStartTime = await staking.stakeStartTime();
  const currentEndTime = await staking.stakeEndTime();
  
  console.log("\nCurrent configuration:");
  console.log("  - Start time:", new Date(Number(currentStartTime) * 1000).toISOString());
  console.log("  - End time:", new Date(Number(currentEndTime) * 1000).toISOString());

  // Validate new time must be > current time and > start time
  const now = Math.floor(Date.now() / 1000);
  if (newEndTime <= now) {
    throw new Error("End time must be later than current time");
  }
  
  if (newEndTime <= Number(currentStartTime)) {
    throw new Error("End time must be later than start time");
  }

  console.log("\nExecuting setting...");
  const tx = await staking.setStakeEndTime(newEndTime);
  await waitForTransaction(tx, "Set end time transaction");

  printSuccess("Stake end time updated!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

