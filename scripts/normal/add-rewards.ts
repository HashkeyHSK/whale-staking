import hre from "hardhat";
import { StakingType } from "../shared/types.js";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../shared/helpers.js";

/**
 * Add rewards to Normal Staking contract reward pool
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.NORMAL_STAKING_ADDRESS || getStakingAddress(StakingType.NORMAL, network);

  printSeparator("Add Rewards to Normal Staking Contract");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Set reward amount (read from environment variable, or use default value)
  const rewardAmountEther = process.env.REWARD_AMOUNT || "10000";
  const rewardAmount = ethers.parseEther(rewardAmountEther);
  
  console.log(`\nPreparing to add ${ethers.formatEther(rewardAmount)} HSK to reward pool...`);

  // Query current reward pool balance
  const currentBalance = await staking.rewardPoolBalance();
  console.log("Current reward pool balance:", ethers.formatEther(currentBalance), "HSK");

  // Add rewards
  const tx = await staking.updateRewardPool({ value: rewardAmount });
  await waitForTransaction(tx, "Add rewards transaction");
  
  printSuccess("Rewards added successfully!");

  // Query updated balance
  const newBalance = await staking.rewardPoolBalance();
  console.log("\nUpdated reward pool balance:", ethers.formatEther(newBalance), "HSK");
  console.log("Amount added:", ethers.formatEther(newBalance - currentBalance), "HSK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
