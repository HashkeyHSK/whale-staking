import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../../shared/helpers.js";

/**
 * Unpause Staking contract
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  printSeparator("Unpause Staking Contract");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Check current status
  const isPaused = await staking.paused();
  console.log("\nCurrent pause status:", isPaused);

  if (!isPaused) {
    console.log("⚠️  Contract is already running");
    return;
  }

  console.log("\nExecuting unpause operation...");
  const tx = await staking.unpause();
  await waitForTransaction(tx, "Unpause contract transaction");

  printSuccess("Contract resumed!");
  
  console.log("\n✅ Users can now:");
  console.log("  - Stake");
  console.log("  - Claim rewards");
  console.log("  - Unstake");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
