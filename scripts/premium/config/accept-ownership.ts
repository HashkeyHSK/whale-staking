import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction } from "../../shared/helpers.js";

/**
 * Accept ownership of Premium Staking contract (Step 2 of 2)
 * 
 * This is the second step of the two-step ownership transfer process.
 * The current owner must have called transfer-ownership.ts first.
 * 
 * Environment variables:
 * - PREMIUM_STAKING_ADDRESS: Staking contract address (optional, will use from constants if not provided)
 * 
 * Example:
 * npm run config:accept-ownership:premium:testnet
 * 
 * Note: The signer must be the address that was set as pending owner in Step 1
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [newOwner] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.PREMIUM_STAKING_ADDRESS || getStakingAddress(StakingType.PREMIUM, network);

  printSeparator("Accept Ownership - Step 2: Complete Transfer");
  console.log("New owner address:", newOwner.address);
  console.log("Contract address:", stakingAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Check current owner
  const currentOwnerAddress = await staking.owner();
  console.log("\nCurrent contract owner:", currentOwnerAddress);

  // Check pending owner
  let pendingOwnerAddress: string;
  try {
    pendingOwnerAddress = await staking.pendingOwner();
    if (!pendingOwnerAddress || pendingOwnerAddress === ethers.ZeroAddress) {
      throw new Error("No pending ownership transfer found");
    }
    console.log("Pending owner:", pendingOwnerAddress);
  } catch (error: any) {
    throw new Error(
      `Could not check pending owner: ${error.message}\n` +
      `Make sure Step 1 (transfer-ownership.ts) has been executed first.`
    );
  }

  if (pendingOwnerAddress.toLowerCase() !== newOwner.address.toLowerCase()) {
    throw new Error(
      `Current signer (${newOwner.address}) is not the pending owner.\n` +
      `Pending owner: ${pendingOwnerAddress}\n` +
      `Please use the correct account.`
    );
  }

  console.log("\n✅ Verified: Current signer matches pending owner");
  console.log("\nExecuting acceptOwnership...");
  const tx = await staking.acceptOwnership();
  await waitForTransaction(tx, "Accept ownership transaction");

  printSuccess("Ownership transfer completed!");
  
  // Verify new owner
  const finalOwner = await staking.owner();
  if (finalOwner.toLowerCase() === newOwner.address.toLowerCase()) {
    console.log("\n✅ Verified: Contract owner is now:", finalOwner);
  } else {
    printWarning(`Warning: Ownership verification failed. Expected: ${newOwner.address}, Got: ${finalOwner}`);
  }

  console.log("\n📋 Ownership Transfer Complete!");
  console.log("The new owner can now:");
  console.log("  - Pause/unpause the contract");
  console.log("  - Update configuration parameters");
  console.log("  - Manage whitelist (for Premium Staking)");
  console.log("  - Enable emergency mode");
  console.log("  - Manage reward pool");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

