import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../../shared/helpers.js";

/**
 * Set minimum stake amount
 * Owner only, can be called when not in emergency mode
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  // Read new minimum stake amount from environment variable
  const newMinStakeAmountEther = process.env.NEW_MIN_STAKE || "1";
  const newMinStakeAmount = ethers.parseEther(newMinStakeAmountEther);

  printSeparator("Set Minimum Stake Amount");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);
  console.log("\nNew minimum stake amount:", newMinStakeAmountEther, "HSK");

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Check emergency mode
  const emergencyMode = await staking.emergencyMode();
  if (emergencyMode) {
    throw new Error("Contract is in emergency mode, cannot modify configuration");
  }

  // Query current settings
  const currentMinStake = await staking.minStakeAmount();
  
  console.log("\nCurrent configuration:");
  console.log("  - Current min stake:", ethers.formatEther(currentMinStake), "HSK");
  console.log("  - New min stake:", newMinStakeAmountEther, "HSK");

  if (currentMinStake === newMinStakeAmount) {
    console.log("\n⚠️  New value is same as current value, no update needed");
    return;
  }

  if (newMinStakeAmount === BigInt(0)) {
    throw new Error("Minimum stake amount cannot be 0");
  }

  console.log("\nExecuting setting...");
  const tx = await staking.setMinStakeAmount(newMinStakeAmount);
  await waitForTransaction(tx, "Set minimum stake amount transaction");

  printSuccess("Minimum stake amount updated!");

  // Verify
  const updatedMinStake = await staking.minStakeAmount();
  console.log("\nVerification result:");
  console.log("  - Updated value:", ethers.formatEther(updatedMinStake), "HSK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
