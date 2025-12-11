import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction } from "../../shared/helpers.js";

/**
 * Set reward rate (APY) for Staking contract
 * 
 * This function requires the contract to have the setRewardRate() function.
 * If your contract doesn't have this function, you need to upgrade it first.
 * 
 * Environment variables:
 * - STAKING_ADDRESS: Staking contract address (optional, will use from constants if not provided)
 * - NEW_REWARD_RATE: New reward rate in basis points (required, e.g., 513 for 5.13%, 500 for 5%)
 * 
 * Example:
 * NEW_REWARD_RATE=513 npm run config:set-reward-rate:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  printSeparator("Set Reward Rate (APY)");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);

  // Get new reward rate from environment variable
  const newRewardRateStr = process.env.NEW_REWARD_RATE;
  if (!newRewardRateStr) {
    throw new Error(
      "Please provide new reward rate (basis points):\n" +
      "Method 1: NEW_REWARD_RATE=\"513\" npm run config:set-reward-rate:testnet\n" +
      "Method 2: Set NEW_REWARD_RATE=513 in .env file\n\n" +
      "Examples:\n" +
      "  - 500 = 5% APY\n" +
      "  - 513 = 5.13% APY\n" +
      "  - 800 = 8% APY"
    );
  }

  const newRewardRate = parseInt(newRewardRateStr);
  if (isNaN(newRewardRate) || newRewardRate <= 0 || newRewardRate > 10000) {
    throw new Error(
      `Invalid reward rate: ${newRewardRateStr}\n` +
      `Reward rate must be between 1 and 10000 (basis points)\n` +
      `Example: 513 = 5.13% APY`
    );
  }

  const apyPercentage = newRewardRate / 100;
  console.log("\nNew reward rate:", newRewardRate, "basis points =", apyPercentage, "% APY");

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Check current reward rate
  let currentRewardRate: bigint;
  try {
    currentRewardRate = await staking.rewardRate();
    const currentApyPercentage = Number(currentRewardRate) / 100;
    console.log("Current reward rate:", currentRewardRate.toString(), "basis points =", currentApyPercentage, "% APY");
    
    if (Number(currentRewardRate) === newRewardRate) {
      printWarning("New reward rate is the same as current reward rate. No change needed.");
      return;
    }
  } catch (error: any) {
    throw new Error(
      `Could not read current reward rate: ${error.message}\n` +
      `Make sure the contract address is correct.`
    );
  }

  // Check if contract has setRewardRate function
  try {
    // Try to get the function signature
    const setRewardRateFunction = staking.interface.getFunction("setRewardRate");
    if (!setRewardRateFunction) {
      throw new Error("setRewardRate function not found");
    }
  } catch (error: any) {
    throw new Error(
      `Contract does not have setRewardRate() function.\n` +
      `You need to upgrade the contract implementation first.\n` +
      `Please run: npm run upgrade:testnet\n` +
      `Then run this script again.`
    );
  }

  // Check if contract is paused
  const isPaused = await staking.paused();
  if (isPaused) {
    printWarning("Contract is paused. setRewardRate can still be called.");
  }

  // Check if contract is in emergency mode
  const isEmergency = await staking.emergencyMode();
  if (isEmergency) {
    throw new Error("Contract is in emergency mode. Cannot set reward rate.");
  }

  // Check if admin is owner
  const owner = await staking.owner();
  if (owner.toLowerCase() !== admin.address.toLowerCase()) {
    throw new Error(
      `Current signer (${admin.address}) is not the contract owner.\n` +
      `Contract owner: ${owner}\n` +
      `Please use the correct account.`
    );
  }

  console.log("\n⚠️  Important Notes:");
  console.log("  - This will change the reward rate for ALL future staking positions");
  console.log("  - Existing positions will continue using their original reward rate");
  console.log("  - Only NEW positions created after this change will use the new rate");
  console.log(`  - Changing from ${Number(currentRewardRate) / 100}% to ${apyPercentage}% APY`);

  console.log("\nExecuting setRewardRate...");
  const tx = await staking.setRewardRate(newRewardRate);
  await waitForTransaction(tx, "Set reward rate transaction");

  printSuccess("Reward rate updated!");
  
  // Verify new reward rate
  const verifiedRewardRate = await staking.rewardRate();
  const verifiedApyPercentage = Number(verifiedRewardRate) / 100;
  
  if (Number(verifiedRewardRate) === newRewardRate) {
    console.log("\n✅ Verified: Reward rate is now", verifiedRewardRate.toString(), "basis points =", verifiedApyPercentage, "% APY");
  } else {
    printWarning(`Verification failed. Expected: ${newRewardRate}, Got: ${verifiedRewardRate}`);
  }

  console.log("\n📋 Next Steps:");
  console.log("  - New staking positions will use the new reward rate");
  console.log("  - Existing positions are not affected");
  console.log("  - Monitor the contract to ensure everything works correctly");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

