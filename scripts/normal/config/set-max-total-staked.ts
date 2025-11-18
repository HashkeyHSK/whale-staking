import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../../shared/helpers.js";

/**
 * Set maximum total staked amount
 * Owner only
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.NORMAL_STAKING_ADDRESS || getStakingAddress(StakingType.NORMAL, network);

  // Read new maximum total staked amount from environment variable
  // Default: 10,000,000 HSK (10 million)
  const newMaxTotalStakedEther = process.env.NEW_MAX_TOTAL_STAKED || "10000000";
  const newMaxTotalStaked = ethers.parseEther(newMaxTotalStakedEther);

  printSeparator("Set Maximum Total Staked Amount");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);
  console.log("\nNew maximum total staked amount:", newMaxTotalStakedEther, "HSK");
  console.log("Note: Set to 0 to remove the limit");

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query current settings
  const currentMaxTotalStaked = await staking.maxTotalStaked();
  const currentTotalStaked = await staking.totalStaked();
  
  console.log("\nCurrent configuration:");
  console.log("  - Current max total staked:", currentMaxTotalStaked === BigInt(0) ? "No limit" : ethers.formatEther(currentMaxTotalStaked) + " HSK");
  console.log("  - Current total staked:", ethers.formatEther(currentTotalStaked), "HSK");
  console.log("  - New max total staked:", newMaxTotalStaked === BigInt(0) ? "No limit" : newMaxTotalStakedEther + " HSK");

  if (currentMaxTotalStaked === newMaxTotalStaked) {
    console.log("\n⚠️  New value is same as current value, no update needed");
    return;
  }

  // Validate: if setting a limit, it should be >= current total staked
  if (newMaxTotalStaked > BigInt(0) && newMaxTotalStaked < currentTotalStaked) {
    throw new Error(
      `Cannot set max total staked (${newMaxTotalStakedEther} HSK) less than current total staked (${ethers.formatEther(currentTotalStaked)} HSK)`
    );
  }

  console.log("\nExecuting setting...");
  const tx = await staking.setMaxTotalStaked(newMaxTotalStaked);
  await waitForTransaction(tx, "Set maximum total staked amount transaction");

  printSuccess("Maximum total staked amount updated!");

  // Verify
  const updatedMaxTotalStaked = await staking.maxTotalStaked();
  console.log("\nVerification result:");
  console.log("  - Updated value:", updatedMaxTotalStaked === BigInt(0) ? "No limit" : ethers.formatEther(updatedMaxTotalStaked) + " HSK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

