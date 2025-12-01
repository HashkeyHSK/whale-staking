import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction, parsePosition } from "../shared/helpers.js";

/**
 * Emergency withdraw principal (only available in emergency mode)
 * Note: Does not include rewards, only returns principal
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [user] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  // Get positionId from environment variable or command line argument
  const positionId = process.env.POSITION_ID || process.argv[2];
  
  if (!positionId) {
    throw new Error("Please provide positionId: POSITION_ID=1 npm run emergency-withdraw:testnet or append argument");
  }

  printSeparator("Emergency Withdraw Principal");
  console.log("User address:", user.address);
  console.log("Contract address:", stakingAddress);
  console.log("Position ID:", positionId);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Check emergency mode
  const emergencyMode = await staking.emergencyMode();
  
  if (!emergencyMode) {
    throw new Error(
      "Contract is not in emergency mode!\n" +
      "Emergency withdraw can only be used in emergency mode.\n" +
      "Please use unstake command in normal circumstances."
    );
  }

  printWarning("⚠️  Contract is in emergency mode");
  console.log("Emergency withdraw only returns principal, no rewards included");

  // Query position information
  console.log("\nQuerying position information...");
  const positionRaw = await staking.positions(positionId);
  const position = parsePosition(positionRaw);
  
  if (position.owner.toLowerCase() !== user.address.toLowerCase()) {
    throw new Error("This position does not belong to the current user");
  }

  if (position.isUnstaked) {
    throw new Error("This position has already been withdrawn");
  }

  console.log("\nPosition information:");
  console.log("  - Staked amount:", ethers.formatEther(position.amount), "HSK");
  console.log("  - Staked at:", new Date(Number(position.stakedAt) * 1000).toLocaleString());

  console.log("\n⚠️  Important notice:");
  console.log("  - Emergency withdraw only returns principal");
  console.log("  - No rewards included");
  console.log("  - This operation is irreversible");

  console.log("\nExecuting emergency withdraw...");
  
  // Execute emergencyWithdraw
  const tx = await staking.emergencyWithdraw(positionId);
  await waitForTransaction(tx, "Emergency withdraw transaction");

  printSuccess(`Successfully withdrew ${ethers.formatEther(position.amount)} HSK principal`);
  printWarning("Note: Rewards have been forfeited due to emergency mode");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
