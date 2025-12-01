import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../../shared/helpers.js";

/**
 * Pause Staking contract
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  printSeparator("Pause Staking Contract");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Check current status
  const isPaused = await staking.paused();
  console.log("\nCurrent pause status:", isPaused);

  if (isPaused) {
    console.log("⚠️  Contract is already paused");
    return;
  }

  console.log("\nExecuting pause operation...");
  const tx = await staking.pause();
  await waitForTransaction(tx, "Pause contract transaction");

  printSuccess("Contract paused!");
  
  console.log("\n⚠️  Note: After pausing, the following will be disabled:");
  console.log("  - New staking");
  console.log("  - Claiming rewards");
  console.log("  But unstaking is not affected");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
