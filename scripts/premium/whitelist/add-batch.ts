import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator, printSuccess, waitForTransaction } from "../../shared/helpers.js";

/**
 * Add users to whitelist (batch operation)
 * 
 * Environment variables:
 * - WHITELIST_ADDRESSES: Comma-separated list of addresses (required)
 * 
 * Example:
 * WHITELIST_ADDRESSES="0x123...,0x456..." npm run whitelist:add-batch:premium:testnet
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
      "Please provide addresses to add to whitelist:\n" +
      "Method 1: WHITELIST_ADDRESSES=\"0x123...,0x456...\" npm run whitelist:add-batch:premium:testnet\n" +
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

  printSeparator("Add Users to Whitelist (Batch)");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);
  console.log("\nAddresses to add:", addresses.length);
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
    if (isWhitelisted) {
      console.log(`  ⚠️  ${addr} is already whitelisted`);
    }
  }

  // Filter out already whitelisted addresses
  const addressesToAdd = addresses.filter((addr, index) => !statusBefore[index]);
  
  if (addressesToAdd.length === 0) {
    console.log("\n⚠️  All addresses are already whitelisted, no operation needed");
    return;
  }

  console.log(`\nAdding ${addressesToAdd.length} address(es) to whitelist...`);

  // Execute batch update
  const tx = await staking.updateWhitelistBatch(addressesToAdd, true);
  await waitForTransaction(tx, "Add to whitelist transaction");

  printSuccess(`Successfully added ${addressesToAdd.length} address(es) to whitelist!`);

  // Verify whitelist status
  console.log("\nVerifying whitelist status...");
  for (const addr of addressesToAdd) {
    const isWhitelisted = await staking.whitelisted(addr);
    if (!isWhitelisted) {
      console.log(`  ⚠️  Warning: ${addr} is not whitelisted after operation`);
    } else {
      console.log(`  ✅ ${addr} is now whitelisted`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

