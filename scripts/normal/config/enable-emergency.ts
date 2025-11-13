import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction } from "../../shared/helpers.js";

/**
 * Enable emergency mode
 * ⚠️ Warning: This operation is irreversible!
 * After enabling:
 * - Users can only call emergencyWithdraw to withdraw principal
 * - No rewards will be distributed
 * - Cannot return to normal mode
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.NORMAL_STAKING_ADDRESS || getStakingAddress(StakingType.NORMAL, network);

  printSeparator("Enable Emergency Mode");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Check current status
  const emergencyMode = await staking.emergencyMode();
  
  if (emergencyMode) {
    printWarning("Contract is already in emergency mode");
    return;
  }

  // Display severe warning
  console.log("\n" + "=".repeat(50));
  console.log("⚠️  ⚠️  ⚠️   SEVERE WARNING   ⚠️  ⚠️  ⚠️");
  console.log("=".repeat(50));
  console.log("\nAfter enabling emergency mode:");
  console.log("  1. ❌ This operation is irreversible, cannot return to normal mode");
  console.log("  2. ❌ Users can only withdraw principal, no rewards");
  console.log("  3. ❌ Cannot perform normal operations like staking, claiming rewards");
  console.log("  4. ✅ Users can withdraw principal via emergencyWithdraw");
  
  console.log("\nEmergency mode use cases:");
  console.log("  - Discovered critical security vulnerability");
  console.log("  - Need to immediately stop all operations");
  console.log("  - Protect user funds");

  // Query current contract status
  const totalStaked = await staking.totalStaked();
  const totalPendingRewards = await staking.totalPendingRewards();
  const rewardPoolBalance = await staking.rewardPoolBalance();
  
  console.log("\nCurrent contract status:");
  console.log("  - Total staked:", ethers.formatEther(totalStaked), "HSK");
  console.log("  - Total pending rewards:", ethers.formatEther(totalPendingRewards), "HSK");
  console.log("  - Reward pool balance:", ethers.formatEther(rewardPoolBalance), "HSK");

  // Require explicit confirmation
  const confirm = process.env.CONFIRM_EMERGENCY;
  
  if (confirm !== "YES_I_UNDERSTAND") {
    console.log("\n" + "=".repeat(50));
    console.log("⚠️  Operation not confirmed");
    console.log("=".repeat(50));
    console.log("\nIf you confirm to enable emergency mode, please set environment variable:");
    console.log("CONFIRM_EMERGENCY=YES_I_UNDERSTAND npm run config:enable-emergency:testnet");
    console.log("\nPlease think twice! This operation is irreversible!");
    return;
  }

  printWarning("Confirming to enable emergency mode...");
  console.log("\nExecuting enable emergency mode...");
  
  const tx = await staking.enableEmergencyMode();
  await waitForTransaction(tx, "Enable emergency mode transaction");

  printSuccess("Emergency mode enabled!");
  
  console.log("\n" + "=".repeat(50));
  console.log("⚠️  Contract has entered emergency mode");
  console.log("=".repeat(50));
  console.log("\nNext steps:");
  console.log("  1. Notify all users that contract has entered emergency mode");
  console.log("  2. Users need to use emergency-withdraw command to withdraw principal");
  console.log("  3. Prepare contract upgrade or migration plan");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
