import hre from "hardhat";
import { StakingType } from "../shared/types.js";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction } from "../shared/helpers.js";

/**
 * Withdraw excess reward pool funds
 * Can only withdraw amount exceeding totalPendingRewards
 * Owner only
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.NORMAL_STAKING_ADDRESS || getStakingAddress(StakingType.NORMAL, network);

  printSeparator("Withdraw Excess Reward Pool Funds");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query reward pool status
  console.log("\nQuerying reward pool status...");
  const rewardPoolBalance = await staking.rewardPoolBalance();
  const totalPendingRewards = await staking.totalPendingRewards();
  const excessRewards = rewardPoolBalance - totalPendingRewards;

  console.log("Reward pool balance:", ethers.formatEther(rewardPoolBalance), "HSK");
  console.log("Reserved rewards:", ethers.formatEther(totalPendingRewards), "HSK");
  console.log("Withdrawable balance:", ethers.formatEther(excessRewards), "HSK");

  if (excessRewards <= 0) {
    printWarning("No excess funds available to withdraw");
    console.log("\nAll funds in reward pool are reserved for users, cannot withdraw.");
    return;
  }

  // Read withdraw amount from environment variable, or withdraw all available balance
  const withdrawAmountEther = process.env.WITHDRAW_AMOUNT || ethers.formatEther(excessRewards);
  const withdrawAmount = ethers.parseEther(withdrawAmountEther);

  if (withdrawAmount > excessRewards) {
    throw new Error(
      `Withdraw amount exceeds available balance!\n` +
      `Requested: ${ethers.formatEther(withdrawAmount)} HSK\n` +
      `Available: ${ethers.formatEther(excessRewards)} HSK`
    );
  }

  console.log(`\nPreparing to withdraw ${ethers.formatEther(withdrawAmount)} HSK...`);

  // Execute withdrawal
  const tx = await staking.withdrawExcessRewardPool(withdrawAmount);
  await waitForTransaction(tx, "Withdraw excess funds transaction");

  printSuccess(`Successfully withdrew ${ethers.formatEther(withdrawAmount)} HSK`);

  // Query updated status
  const newBalance = await staking.rewardPoolBalance();
  const newExcess = newBalance - totalPendingRewards;
  
  console.log("\nUpdated status:");
  console.log("  - Reward pool balance:", ethers.formatEther(newBalance), "HSK");
  console.log("  - Reserved rewards:", ethers.formatEther(totalPendingRewards), "HSK");
  console.log("  - Remaining withdrawable:", ethers.formatEther(newExcess), "HSK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
