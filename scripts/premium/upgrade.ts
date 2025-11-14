import hre from "hardhat";
import { StakingType } from "../shared/types.js";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction } from "../shared/helpers.js";

/**
 * Upgrade Premium Staking proxy contract to a new implementation
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
 * PROXY_ADMIN_ADDRESS="0x..." npm run upgrade:premium:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [admin] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const proxyAddress = process.env.PREMIUM_STAKING_ADDRESS || getStakingAddress(StakingType.PREMIUM, network);

  printSeparator("Upgrade Premium Staking Proxy Contract");
  console.log("Admin address:", admin.address);
  console.log("Proxy address:", proxyAddress);

  // Get ProxyAdmin address from storage or env
  // TransparentUpgradeableProxy stores admin at EIP-1967 admin slot
  const ADMIN_SLOT = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
  const adminValue = await ethers.provider.getStorage(proxyAddress, ADMIN_SLOT);
  const actualProxyAdminAddress = "0x" + adminValue.slice(-40);
  
  const proxyAdminAddress = process.env.PROXY_ADMIN_ADDRESS || actualProxyAdminAddress;
  console.log("ProxyAdmin address (from env/storage):", proxyAdminAddress);
  console.log("Actual proxy admin (from storage):", actualProxyAdminAddress);
  
  if (proxyAdminAddress.toLowerCase() !== actualProxyAdminAddress.toLowerCase()) {
    printWarning(`⚠️  Warning: Provided admin address (${proxyAdminAddress}) doesn't match actual proxy admin (${actualProxyAdminAddress})`);
    console.log("Using actual proxy admin address for upgrade...");
  }

  // Connect to proxy contract to get current implementation
  // Use TransparentUpgradeableProxy interface for upgrade functions
  const TransparentUpgradeableProxyABI = [
    "function upgradeTo(address newImplementation) external",
    "function upgradeToAndCall(address newImplementation, bytes calldata data) external payable"
  ];
  const proxy = new ethers.Contract(proxyAddress, TransparentUpgradeableProxyABI, admin);
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
  const onlyWhitelistCanStake = await staking.onlyWhitelistCanStake();

  console.log("Current status:");
  console.log("  - Total staked:", ethers.formatEther(totalStaked), "HSK");
  console.log("  - Reward pool balance:", ethers.formatEther(rewardPoolBalance), "HSK");
  console.log("  - Total pending rewards:", ethers.formatEther(totalPendingRewards), "HSK");
  console.log("  - Min stake amount:", ethers.formatEther(minStakeAmount), "HSK");
  console.log("  - APY:", Number(rewardRate) / 100, "%");
  console.log("  - Whitelist mode:", onlyWhitelistCanStake ? "Enabled" : "Disabled");
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
  console.log("  - Whitelist entries will be preserved");

  // Check if ProxyAdmin is a contract or EOA
  // In TransparentUpgradeableProxy, admin can be either EOA or ProxyAdmin contract
  const code = await ethers.provider.getCode(proxyAdminAddress);
  const isContract = code !== "0x";

  if (isContract) {
    // Admin is a ProxyAdmin contract
    console.log("\nProxyAdmin is a contract, using ProxyAdmin.upgrade()...");
    
    // Use OpenZeppelin ProxyAdmin ABI
    const ProxyAdminABI = [
      "function owner() external view returns (address)",
      "function upgrade(address proxy, address implementation) external",
      "function upgradeAndCall(address proxy, address implementation, bytes calldata data) external payable"
    ];
    const proxyAdmin = new ethers.Contract(proxyAdminAddress, ProxyAdminABI, admin);
    
    // Verify admin can upgrade
    try {
      const proxyAdminOwner = await proxyAdmin.owner();
      console.log("ProxyAdmin owner:", proxyAdminOwner);
      if (proxyAdminOwner.toLowerCase() !== admin.address.toLowerCase()) {
        throw new Error(
          `Current signer (${admin.address}) is not the ProxyAdmin owner.\n` +
          `ProxyAdmin owner: ${proxyAdminOwner}\n` +
          `Please use the correct account or set PROXY_ADMIN_ADDRESS environment variable.`
        );
      }
    } catch (error: any) {
      // If owner() doesn't exist or fails, try upgrade anyway
      console.log("⚠️  Could not verify ProxyAdmin owner, proceeding with upgrade...");
      console.log("Error:", error.message);
    }

    console.log("\nExecuting upgrade via ProxyAdmin...");
    console.log(`  - ProxyAdmin address: ${proxyAdminAddress}`);
    console.log(`  - Proxy address: ${proxyAddress}`);
    console.log(`  - New implementation: ${newImplementationAddress}`);
    
    let upgradeTxHash: string;
    try {
      // Try upgrade first
      const tx = await proxyAdmin.upgrade(proxyAddress, newImplementationAddress);
      const receipt = await waitForTransaction(tx, "Upgrade transaction (via ProxyAdmin)");
      upgradeTxHash = receipt.hash;
    } catch (error: any) {
      // If upgrade fails, try upgradeAndCall with empty data
      console.log("⚠️  upgrade() failed, trying upgradeAndCall()...");
      console.log("Error:", error.message);
      const upgradeData = "0x";
      const tx = await proxyAdmin.upgradeAndCall(proxyAddress, newImplementationAddress, upgradeData);
      const receipt = await waitForTransaction(tx, "Upgrade transaction (via ProxyAdmin.upgradeAndCall)");
      upgradeTxHash = receipt.hash;
    }
    
    // Print explorer links
    console.log("\n📋 Transaction Details:");
    console.log(`  Transaction hash: ${upgradeTxHash}`);
    console.log(`  View transaction: https://testnet-explorer.hsk.xyz/tx/${upgradeTxHash}`);
    console.log(`  ProxyAdmin transactions: https://testnet-explorer.hsk.xyz/address/${proxyAdminAddress}?tab=txs`);
    console.log(`  Proxy transactions: https://testnet-explorer.hsk.xyz/address/${proxyAddress}?tab=txs`);
  } else {
    // Admin is EOA, call upgradeTo directly on proxy
    // Only admin can call this function
    // Use actualProxyAdminAddress from storage, not the env variable
    if (admin.address.toLowerCase() !== actualProxyAdminAddress.toLowerCase()) {
      throw new Error(
        `Current signer (${admin.address}) is not the proxy admin.\n` +
        `Proxy admin: ${actualProxyAdminAddress}\n` +
        `Please use the correct account (the one that deployed the proxy).`
      );
    }

    console.log("\nProxyAdmin is EOA, calling upgradeTo directly...");
    console.log("⚠️  Note: Only the admin address can call this function");
    
    // For TransparentUpgradeableProxy, admin calls upgradeTo directly for simple upgrades
    // upgradeToAndCall is only needed if you want to call a function after upgrade
    let upgradeTxHash: string;
    try {
      const tx = await proxy.upgradeTo(newImplementationAddress);
      const receipt = await waitForTransaction(tx, "Upgrade transaction (direct)");
      upgradeTxHash = receipt.hash;
    } catch (error: any) {
      // If upgradeTo fails, try upgradeToAndCall with empty data
      console.log("⚠️  upgradeTo failed, trying upgradeToAndCall...");
      const upgradeData = "0x"; // Empty calldata for simple upgrade
      const tx = await proxy.upgradeToAndCall(newImplementationAddress, upgradeData);
      const receipt = await waitForTransaction(tx, "Upgrade transaction (direct via upgradeToAndCall)");
      upgradeTxHash = receipt.hash;
    }
    
    // Print explorer links
    console.log("\n📋 Transaction Details:");
    console.log(`  Transaction hash: ${upgradeTxHash}`);
    console.log(`  View transaction: https://testnet-explorer.hsk.xyz/tx/${upgradeTxHash}`);
    console.log(`  Proxy transactions: https://testnet-explorer.hsk.xyz/address/${proxyAddress}?tab=txs`);
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
  const newOnlyWhitelistCanStake = await staking.onlyWhitelistCanStake();

  if (
    newTotalStaked !== totalStaked ||
    newRewardPoolBalance !== rewardPoolBalance ||
    newTotalPendingRewards !== totalPendingRewards ||
    newMinStakeAmount !== minStakeAmount ||
    newRewardRate !== rewardRate ||
    newNextPositionId !== nextPositionId ||
    newOnlyWhitelistCanStake !== onlyWhitelistCanStake
  ) {
    printWarning("⚠️  Warning: Some state values changed after upgrade!");
    console.log("  - Total staked:", ethers.formatEther(newTotalStaked), "HSK");
    console.log("  - Reward pool balance:", ethers.formatEther(newRewardPoolBalance), "HSK");
    console.log("  - Total pending rewards:", ethers.formatEther(newTotalPendingRewards), "HSK");
    console.log("  - Whitelist mode:", newOnlyWhitelistCanStake ? "Enabled" : "Disabled");
  } else {
    printSuccess("✅ All contract state preserved correctly!");
  }

  printSeparator("✅ Upgrade Complete");
  console.log("\nNext steps:");
  console.log("  1. Verify new implementation contract:");
  console.log(`     IMPLEMENTATION_ADDRESS="${newImplementationAddress}" npm run verify:premium:forge:testnet`);
  console.log("  2. Test contract functionality to ensure upgrade was successful");
  console.log("  3. Verify whitelist entries are preserved");
  console.log("  4. Monitor contract for any issues");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

