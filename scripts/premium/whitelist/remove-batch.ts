import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../../shared/helpers.js";

/**
 * Remove users from whitelist (batch operation)
 * 
 * Environment variables:
 * - WHITELIST_ADDRESSES: Comma-separated list of addresses (required)
 * 
 * Example:
 * WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:remove-batch:premium:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.PREMIUM_STAKING_ADDRESS || getStakingAddress(StakingType.PREMIUM, network);

  // Read addresses from environment variable
  const addressesStr = process.env.WHITELIST_ADDRESSES;
  if (!addressesStr) {
    throw new Error(
      "Please provide addresses to remove from whitelist:\n" +
      "Method 1: WHITELIST_ADDRESSES=\"0x123...,0x456...\" npm run whitelist:remove-batch:premium:testnet\n" +
      "Method 2: Set WHITELIST_ADDRESSES=0x123...,0x456... in .env file\n\n" +
      "Note: Maximum 100 addresses per batch"
    );
  }

  // Parse addresses
  const addresses = addressesStr.split(",").map(addr => addr.trim()).filter(addr => addr.length > 0);
  
  if (addresses.length === 0) {
    throw new Error("No valid addresses provided");
  }

  if (addresses.length > 100) {
    throw new Error("Maximum 100 addresses per batch");
  }

  // Validate addresses
  for (const addr of addresses) {
    if (!ethers.isAddress(addr)) {
      throw new Error(`Invalid address: ${addr}`);
    }
  }

  printSeparator("Remove Users from Whitelist (Batch)");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);
  console.log("\nAddresses to remove:", addresses.length);
  addresses.forEach((addr, index) => {
    console.log(`  ${index + 1}. ${addr}`);
  });

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Check whitelist mode
  const onlyWhitelistCanStake = await staking.onlyWhitelistCanStake();
  console.log("\nWhitelist mode:", onlyWhitelistCanStake ? "Enabled ✅" : "Disabled");

  // Check current whitelist status
  console.log("\nChecking current whitelist status...");
  const statusBefore: boolean[] = [];
  for (const addr of addresses) {
    const isWhitelisted = await staking.whitelisted(addr);
    statusBefore.push(isWhitelisted);
    if (!isWhitelisted) {
      console.log(`  ⚠️  ${addr} is not whitelisted`);
    }
  }

  // Filter out addresses that are not whitelisted
  const addressesToRemove = addresses.filter((addr, index) => statusBefore[index]);
  
  if (addressesToRemove.length === 0) {
    console.log("\n⚠️  None of the addresses are whitelisted, no operation needed");
    return;
  }

  console.log(`\nRemoving ${addressesToRemove.length} address(es) from whitelist...`);

  // Execute batch update
  const tx = await staking.updateWhitelistBatch(addressesToRemove, false);
  await waitForTransaction(tx, "Remove from whitelist transaction");

  printSuccess(`Successfully removed ${addressesToRemove.length} address(es) from whitelist!`);

  // Verify whitelist status
  console.log("\nVerifying whitelist status...");
  for (const addr of addressesToRemove) {
    const isWhitelisted = await staking.whitelisted(addr);
    if (isWhitelisted) {
      console.log(`  ⚠️  Warning: ${addr} is still whitelisted after operation`);
    } else {
      console.log(`  ✅ ${addr} has been removed from whitelist`);
    }
  }

  console.log("\n⚠️  Note: Removed users will not be able to stake new positions");
  console.log("  Existing positions are not affected");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

