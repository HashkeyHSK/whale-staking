import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator } from "../../shared/helpers.js";

/**
 * Query whitelist configuration and status
 * 
 * Environment variables:
 * - USER_ADDRESS: Optional user address to check (can specify multiple comma-separated)
 * 
 * Example:
 * USER_ADDRESS="0x123...,0x456..." npm run query:check-whitelist:premium:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.PREMIUM_STAKING_ADDRESS || getStakingAddress(StakingType.PREMIUM, network);

  printSeparator("Query Whitelist Configuration");
  console.log("Contract address:", stakingAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query whitelist configuration
  const onlyWhitelistCanStake = await staking.onlyWhitelistCanStake();

  console.log("\nWhitelist configuration:");
  console.log("  - Whitelist mode:", onlyWhitelistCanStake ? "Enabled ✅" : "Disabled");

  if (onlyWhitelistCanStake) {
    console.log("\n⚠️  Note: Only whitelisted users can stake");
  } else {
    console.log("\n✅ Note: All users can stake (whitelist not enforced)");
  }

  // Check specific users if provided
  const userAddressesStr = process.env.USER_ADDRESS;
  if (userAddressesStr) {
    const userAddresses = userAddressesStr.split(",").map(addr => addr.trim()).filter(addr => addr.length > 0);
    
    if (userAddresses.length > 0) {
      console.log("\n" + "=".repeat(50));
      console.log("User Whitelist Status:");
      console.log("=".repeat(50));
      
      for (const userAddr of userAddresses) {
        if (!ethers.isAddress(userAddr)) {
          console.log(`\n❌ Invalid address: ${userAddr}`);
          continue;
        }
        
        const isWhitelisted = await staking.whitelisted(userAddr);
        console.log(`\n${userAddr}:`);
        console.log(`  - Whitelisted: ${isWhitelisted ? "Yes ✅" : "No ❌"}`);
        console.log(`  - Can stake: ${onlyWhitelistCanStake ? (isWhitelisted ? "Yes ✅" : "No ❌") : "Yes ✅"}`);
      }
    }
  } else {
    console.log("\n💡 Tip: To check specific users, set USER_ADDRESS environment variable:");
    console.log('  USER_ADDRESS="0x123...,0x456..." npm run query:check-whitelist:premium:testnet');
  }

  printSeparator();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

