import hre from "hardhat";
import { StakingType } from "../shared/types.js";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction } from "../shared/helpers.js";

/**
 * Upgrade Normal Staking proxy contract to a new implementation
 * 
 * This script:
 * 1. Deploys a new HSKStaking implementation contract
 * 2. Upgrades the proxy to point to the new implementation
 * 3. Verifies the upgrade was successful
 * 
 * Environment variables:
 * - PROXY_ADMIN_ADDRESS: ProxyAdmin address (required, usually the deployer address)
 * - NEW_IMPLEMENTATION_ADDRESS: If provided, use existing implementation instead of deploying new one
 * 
 * Example:
 * PROXY_ADMIN_ADDRESS="0x..." npm run upgrade:normal:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const proxyAddress = process.env.NORMAL_STAKING_ADDRESS || getStakingAddress(StakingType.NORMAL, network);

  printSeparator("Upgrade Normal Staking Proxy Contract");
  console.log("Admin address:", admin.address);
  console.log("Proxy address:", proxyAddress);

  // Get ProxyAdmin address
  const proxyAdminAddress = process.env.PROXY_ADMIN_ADDRESS || admin.address;
  console.log("ProxyAdmin address:", proxyAdminAddress);

  // Connect to proxy contract to get current implementation
  const proxy = await ethers.getContractAt("NormalStakingProxy", proxyAddress);
  const staking = await ethers.getContractAt("HSKStaking", proxyAddress);

  // Query current implementation
  // TransparentUpgradeableProxy stores implementation at ERC1967 storage slot
  const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const currentImplementationAddress = await ethers.provider.getStorage(proxyAddress, IMPLEMENTATION_SLOT);
  const currentImplementation = "0x" + currentImplementationAddress.slice(-40);
  
  console.log("\nCurrent implementation:", currentImplementation);

  // Check current contract status before upgrade
  console.log("\nQuerying current contract status...");
  const totalStaked = await staking.totalStaked();
  const rewardPoolBalance = await staking.rewardPoolBalance();
  const totalPendingRewards = await staking.totalPendingRewards();
  const minStakeAmount = await staking.minStakeAmount();
  const rewardRate = await staking.rewardRate();
  const nextPositionId = await staking.nextPositionId();

  console.log("Current status:");
  console.log("  - Total staked:", ethers.formatEther(totalStaked), "HSK");
  console.log("  - Reward pool balance:", ethers.formatEther(rewardPoolBalance), "HSK");
  console.log("  - Total pending rewards:", ethers.formatEther(totalPendingRewards), "HSK");
  console.log("  - Min stake amount:", ethers.formatEther(minStakeAmount), "HSK");
  console.log("  - APY:", Number(rewardRate) / 100, "%");
  console.log("  - Next Position ID:", nextPositionId.toString());

  // Deploy new implementation or use existing one
  let newImplementationAddress: string;
  
  if (process.env.NEW_IMPLEMENTATION_ADDRESS) {
    newImplementationAddress = process.env.NEW_IMPLEMENTATION_ADDRESS;
    console.log("\nUsing existing implementation:", newImplementationAddress);
  } else {
    console.log("\nDeploying new HSKStaking implementation contract...");
    const HSKStaking = await ethers.getContractFactory("HSKStaking");
    const newImplementation = await HSKStaking.deploy();
    await newImplementation.waitForDeployment();
    newImplementationAddress = await newImplementation.getAddress();
    printSuccess(`New implementation deployed: ${newImplementationAddress}`);
  }

  if (newImplementationAddress.toLowerCase() === currentImplementation.toLowerCase()) {
    printWarning("New implementation address is same as current implementation, no upgrade needed");
    return;
  }

  printWarning("⚠️  About to upgrade proxy contract");
  console.log("  - Current implementation:", currentImplementation);
  console.log("  - New implementation:", newImplementationAddress);
  console.log("\n⚠️  Important:");
  console.log("  - All existing data and state will be preserved");
  console.log("  - Only implementation logic will be updated");
  console.log("  - Make sure new implementation is compatible with existing storage layout");

  // Check if ProxyAdmin is a contract or EOA
  // In TransparentUpgradeableProxy, admin can be either EOA or ProxyAdmin contract
  const code = await ethers.provider.getCode(proxyAdminAddress);
  const isContract = code !== "0x";

  if (isContract) {
    // Admin is a ProxyAdmin contract
    console.log("\nProxyAdmin is a contract, using ProxyAdmin.upgrade()...");
    const proxyAdmin = await ethers.getContractAt("ProxyAdmin", proxyAdminAddress);
    
    // Verify admin can upgrade
    try {
      const proxyAdminOwner = await proxyAdmin.owner();
      if (proxyAdminOwner.toLowerCase() !== admin.address.toLowerCase()) {
        throw new Error(
          `Current signer (${admin.address}) is not the ProxyAdmin owner.\n` +
          `ProxyAdmin owner: ${proxyAdminOwner}\n` +
          `Please use the correct account or set PROXY_ADMIN_ADDRESS environment variable.`
        );
      }
    } catch (error: any) {
      // If owner() doesn't exist, try upgrade anyway
      console.log("⚠️  Could not verify ProxyAdmin owner, proceeding with upgrade...");
    }

    console.log("\nExecuting upgrade via ProxyAdmin...");
    const tx = await proxyAdmin.upgrade(proxyAddress, newImplementationAddress);
    await waitForTransaction(tx, "Upgrade transaction (via ProxyAdmin)");
  } else {
    // Admin is EOA, call upgradeToAndCall directly on proxy
    // Only admin can call this function
    if (admin.address.toLowerCase() !== proxyAdminAddress.toLowerCase()) {
      throw new Error(
        `Current signer (${admin.address}) is not the proxy admin.\n` +
        `Proxy admin: ${proxyAdminAddress}\n` +
        `Please use the correct account or set PROXY_ADMIN_ADDRESS environment variable.`
      );
    }

    console.log("\nProxyAdmin is EOA, calling upgradeToAndCall directly...");
    console.log("⚠️  Note: Only the admin address can call this function");
    
    // For TransparentUpgradeableProxy, admin calls upgradeToAndCall directly
    const upgradeData = "0x"; // Empty calldata for simple upgrade
    const tx = await proxy.upgradeToAndCall(newImplementationAddress, upgradeData);
    await waitForTransaction(tx, "Upgrade transaction (direct)");
  }

  printSuccess("Proxy upgraded successfully!");

  // Verify new implementation
  const newImplementationCheck = await ethers.provider.getStorage(proxyAddress, IMPLEMENTATION_SLOT);
  const verifiedNewImplementation = "0x" + newImplementationCheck.slice(-40);
  
  console.log("\nVerification:");
  console.log("  - Old implementation:", currentImplementation);
  console.log("  - New implementation:", verifiedNewImplementation);
  
  if (verifiedNewImplementation.toLowerCase() !== newImplementationAddress.toLowerCase()) {
    throw new Error("Upgrade verification failed! Implementation address mismatch.");
  }

  // Verify contract state is preserved
  console.log("\nVerifying contract state preservation...");
  const newTotalStaked = await staking.totalStaked();
  const newRewardPoolBalance = await staking.rewardPoolBalance();
  const newTotalPendingRewards = await staking.totalPendingRewards();
  const newMinStakeAmount = await staking.minStakeAmount();
  const newRewardRate = await staking.rewardRate();
  const newNextPositionId = await staking.nextPositionId();

  if (
    newTotalStaked !== totalStaked ||
    newRewardPoolBalance !== rewardPoolBalance ||
    newTotalPendingRewards !== totalPendingRewards ||
    newMinStakeAmount !== minStakeAmount ||
    newRewardRate !== rewardRate ||
    newNextPositionId !== nextPositionId
  ) {
    printWarning("⚠️  Warning: Some state values changed after upgrade!");
    console.log("  - Total staked:", ethers.formatEther(newTotalStaked), "HSK");
    console.log("  - Reward pool balance:", ethers.formatEther(newRewardPoolBalance), "HSK");
    console.log("  - Total pending rewards:", ethers.formatEther(newTotalPendingRewards), "HSK");
  } else {
    printSuccess("✅ All contract state preserved correctly!");
  }

  printSeparator("✅ Upgrade Complete");
  console.log("\nNext steps:");
  console.log("  1. Verify new implementation contract:");
  console.log(`     IMPLEMENTATION_ADDRESS="${newImplementationAddress}" npm run verify:forge:testnet`);
  console.log("  2. Test contract functionality to ensure upgrade was successful");
  console.log("  3. Monitor contract for any issues");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

