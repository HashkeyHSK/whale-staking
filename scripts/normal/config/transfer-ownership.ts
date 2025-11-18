import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction } from "../../shared/helpers.js";

/**
 * Transfer ownership of Normal Staking contract (Step 1 of 2)
 * 
 * This is the first step of the two-step ownership transfer process.
 * After calling this script, the new owner must call accept-ownership.ts to complete the transfer.
 * 
 * Environment variables:
 * - NORMAL_STAKING_ADDRESS: Staking contract address (optional, will use from constants if not provided)
 * - NEW_OWNER_ADDRESS: Address of the new owner (required)
 * 
 * Example:
 * NEW_OWNER_ADDRESS="0x..." npm run config:transfer-ownership:normal:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [currentOwner] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.NORMAL_STAKING_ADDRESS || getStakingAddress(StakingType.NORMAL, network);

  printSeparator("Transfer Ownership - Step 1: Initiate Transfer");
  console.log("Current owner address:", currentOwner.address);
  console.log("Contract address:", stakingAddress);

  // Get new owner address from environment variable
  const newOwnerAddress = process.env.NEW_OWNER_ADDRESS;
  if (!newOwnerAddress) {
    throw new Error(
      "Please provide new owner address:\n" +
      "Method 1: NEW_OWNER_ADDRESS=\"0x...\" npm run config:transfer-ownership:normal:testnet\n" +
      "Method 2: Set NEW_OWNER_ADDRESS=0x... in .env file"
    );
  }

  // Validate address format
  if (!ethers.isAddress(newOwnerAddress)) {
    throw new Error(`Invalid address format: ${newOwnerAddress}`);
  }

  console.log("New owner address:", newOwnerAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Check current owner
  const currentOwnerAddress = await staking.owner();
  console.log("\nCurrent contract owner:", currentOwnerAddress);

  if (currentOwnerAddress.toLowerCase() !== currentOwner.address.toLowerCase()) {
    throw new Error(
      `Current signer (${currentOwner.address}) is not the contract owner.\n` +
      `Contract owner: ${currentOwnerAddress}\n` +
      `Please use the correct account.`
    );
  }

  // Check pending owner (if any)
  try {
    const pendingOwner = await staking.pendingOwner();
    if (pendingOwner && pendingOwner !== ethers.ZeroAddress) {
      printWarning(`There is already a pending ownership transfer to: ${pendingOwner}`);
      console.log("You can either:");
      console.log("  1. Wait for the pending owner to accept ownership");
      console.log("  2. Cancel the pending transfer and start a new one");
      console.log("  3. Continue with this transfer (will replace the pending transfer)");
    }
  } catch (error) {
    // pendingOwner() might not exist in older versions, continue anyway
    console.log("Note: Could not check pending owner (function may not exist)");
  }

  if (newOwnerAddress.toLowerCase() === currentOwnerAddress.toLowerCase()) {
    throw new Error("New owner address is the same as current owner address");
  }

  console.log("\n⚠️  Important: This is Step 1 of a two-step process");
  console.log("After this transaction:");
  console.log("  1. Ownership will NOT be transferred immediately");
  console.log("  2. The new owner must call accept-ownership.ts to complete the transfer");
  console.log("  3. The current owner can cancel the transfer before acceptance");

  console.log("\nExecuting transferOwnership...");
  const tx = await staking.transferOwnership(newOwnerAddress);
  await waitForTransaction(tx, "Transfer ownership transaction");

  printSuccess("Ownership transfer initiated!");
  
  console.log("\n📋 Next Steps:");
  console.log("  1. The new owner must call: npm run config:accept-ownership:normal:testnet");
  console.log("  2. Or use the script: scripts/normal/config/accept-ownership.ts");
  console.log("  3. The new owner must use the account:", newOwnerAddress);
  
  // Verify pending owner
  try {
    const pendingOwner = await staking.pendingOwner();
    if (pendingOwner && pendingOwner.toLowerCase() === newOwnerAddress.toLowerCase()) {
      console.log("\n✅ Verified: Pending owner is set correctly");
    }
  } catch (error) {
    console.log("\n⚠️  Note: Could not verify pending owner (function may not exist)");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

