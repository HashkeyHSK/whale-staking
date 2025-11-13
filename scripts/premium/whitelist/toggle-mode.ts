import hre from "hardhat";
import { StakingType } from "../../shared/types.js";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction } from "../../shared/helpers.js";

/**
 * Toggle whitelist mode (enable/disable)
 * 
 * Environment variables:
 * - ENABLE: "true" to enable, "false" to disable (optional, defaults to toggle)
 * 
 * Example:
 * ENABLE="true" npm run whitelist:toggle-mode:premium:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.PREMIUM_STAKING_ADDRESS || getStakingAddress(StakingType.PREMIUM, network);

  printSeparator("Toggle Whitelist Mode");
  console.log("Admin address:", admin.address);
  console.log("Contract address:", stakingAddress);

  // Connect to contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Query current status
  const currentMode = await staking.onlyWhitelistCanStake();
  console.log("\nCurrent whitelist mode:", currentMode ? "Enabled ✅" : "Disabled");

  // Determine new mode
  let newMode: boolean;
  const enableStr = process.env.ENABLE;
  
  if (enableStr !== undefined) {
    if (enableStr.toLowerCase() === "true") {
      newMode = true;
    } else if (enableStr.toLowerCase() === "false") {
      newMode = false;
    } else {
      throw new Error(`Invalid ENABLE value: ${enableStr}. Use "true" or "false"`);
    }
  } else {
    // Toggle mode
    newMode = !currentMode;
  }

  if (currentMode === newMode) {
    console.log(`\n⚠️  Whitelist mode is already ${newMode ? "enabled" : "disabled"}, no change needed`);
    return;
  }

  console.log(`\nNew whitelist mode: ${newMode ? "Enabled ✅" : "Disabled"}`);

  if (newMode) {
    printWarning("⚠️  After enabling whitelist mode:");
    console.log("  - Only whitelisted users can stake");
    console.log("  - Non-whitelisted users will be rejected");
    console.log("  - Existing positions are not affected");
  } else {
    printWarning("⚠️  After disabling whitelist mode:");
    console.log("  - All users can stake");
    console.log("  - Whitelist entries are preserved but not enforced");
  }

  console.log("\nExecuting toggle...");
  const tx = await staking.setWhitelistOnlyMode(newMode);
  await waitForTransaction(tx, "Toggle whitelist mode transaction");

  printSuccess(`Whitelist mode ${newMode ? "enabled" : "disabled"}!`);

  // Verify
  const updatedMode = await staking.onlyWhitelistCanStake();
  console.log("\nVerification:");
  console.log("  - Updated mode:", updatedMode ? "Enabled ✅" : "Disabled");
  
  if (updatedMode !== newMode) {
    throw new Error("Whitelist mode update verification failed!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

