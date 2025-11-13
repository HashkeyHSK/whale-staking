import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator } from "../../shared/helpers.js";

/**
 * Check user whitelist status
 * 
 * Environment variables:
 * - USER_ADDRESS: User address to check (optional, defaults to signer address)
 * 
 * Example:
 * USER_ADDRESS="0x123..." npm run whitelist:check-user:premium:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [user] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.PREMIUM_STAKING_ADDRESS || getStakingAddress(StakingType.PREMIUM, network);

  // Get user address from environment variable or use signer address
  const targetAddress = process.env.USER_ADDRESS || user.address;

  if (!ethers.isAddress(targetAddress)) {
    throw new Error(`Invalid address: ${targetAddress}`);
  }

  printSeparator("Check User Whitelist Status");
  console.log("Contract address:", stakingAddress);
  console.log("User address:", targetAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query whitelist status
  const onlyWhitelistCanStake = await staking.onlyWhitelistCanStake();
  const isWhitelisted = await staking.whitelisted(targetAddress);

  console.log("\nWhitelist configuration:");
  console.log("  - Whitelist mode:", onlyWhitelistCanStake ? "Enabled ✅" : "Disabled");
  console.log("  - User whitelisted:", isWhitelisted ? "Yes ✅" : "No ❌");

  if (onlyWhitelistCanStake) {
    if (isWhitelisted) {
      console.log("\n✅ User can stake");
    } else {
      console.log("\n❌ User cannot stake (not whitelisted)");
      console.log("\nTo add user to whitelist:");
      console.log(`WHITELIST_ADDRESSES="${targetAddress}" npm run whitelist:add-batch:premium:testnet`);
    }
  } else {
    console.log("\n✅ All users can stake (whitelist mode disabled)");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

