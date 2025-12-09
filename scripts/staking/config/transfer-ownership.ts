import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction } from "../../shared/helpers.js";

/**
 * Transfer ownership of all contracts (Step 1 of 2)
 * 
 * This script transfers ownership of:
 * - HSKStaking contract (implementation contract owner via proxy)
 * - PenaltyPool contract
 * - ProxyAdmin contract (if ProxyAdmin is a contract, not EOA)
 * 
 * Note: If ProxyAdmin is an EOA (External Owned Account), it cannot be transferred.
 *       The proxy admin address itself cannot be changed for TransparentUpgradeableProxy.
 * 
 * This is the first step of the two-step ownership transfer process.
 * After calling this script, the new owner must call accept-ownership.ts to complete the transfer.
 * 
 * Environment variables:
 * - STAKING_ADDRESS: Staking contract address (optional, will use from constants if not provided)
 * - PENALTY_POOL_ADDRESS: PenaltyPool contract address (optional, will be fetched from Staking contract if not provided)
 * - PROXY_ADMIN_ADDRESS: ProxyAdmin address (optional, will be fetched from proxy storage if not provided)
 * - NEW_OWNER_ADDRESS: Address of the new owner (required)
 * 
 * Example:
 * NEW_OWNER_ADDRESS="0x..." npm run config:transfer-ownership:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [currentOwner] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  printSeparator("Transfer Ownership - Step 1: Initiate Transfer (All Contracts)");
  console.log("Current owner address:", currentOwner.address);
  console.log("Staking contract address:", stakingAddress);

  // Get new owner address from environment variable
  const newOwnerAddress = process.env.NEW_OWNER_ADDRESS;
  if (!newOwnerAddress) {
    throw new Error(
      "Please provide new owner address:\n" +
      "Method 1: NEW_OWNER_ADDRESS=\"0x...\" npm run config:transfer-ownership:testnet\n" +
      "Method 2: Set NEW_OWNER_ADDRESS=0x... in .env file"
    );
  }

  // Validate address format
  if (!ethers.isAddress(newOwnerAddress)) {
    throw new Error(`Invalid address format: ${newOwnerAddress}`);
  }

  console.log("New owner address:", newOwnerAddress);

  // Connect to Staking contract
  const staking = await ethers.getContractAt("HSKStaking", stakingAddress);

  // Get PenaltyPool address
  let penaltyPoolAddress: string;
  if (process.env.PENALTY_POOL_ADDRESS) {
    penaltyPoolAddress = process.env.PENALTY_POOL_ADDRESS;
    console.log("PenaltyPool address (from env):", penaltyPoolAddress);
  } else {
    try {
      penaltyPoolAddress = await staking.penaltyPoolContract();
      console.log("PenaltyPool address (from Staking contract):", penaltyPoolAddress);
    } catch (error: any) {
      throw new Error(
        `Could not get PenaltyPool address from Staking contract: ${error.message}\n` +
        `Please provide PENALTY_POOL_ADDRESS environment variable.`
      );
    }
  }

  if (!penaltyPoolAddress || penaltyPoolAddress === ethers.ZeroAddress) {
    throw new Error("Invalid PenaltyPool address");
  }

  // Connect to PenaltyPool contract
  const penaltyPool = await ethers.getContractAt("PenaltyPool", penaltyPoolAddress);

  // Get ProxyAdmin address
  const ADMIN_SLOT = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
  const adminValue = await ethers.provider.getStorage(stakingAddress, ADMIN_SLOT);
  const actualProxyAdminAddress = "0x" + adminValue.slice(-40);
  const proxyAdminAddress = process.env.PROXY_ADMIN_ADDRESS || actualProxyAdminAddress;
  console.log("ProxyAdmin address:", proxyAdminAddress);

  // Check if ProxyAdmin is a contract or EOA
  const proxyAdminCode = await ethers.provider.getCode(proxyAdminAddress);
  const isProxyAdminContract = proxyAdminCode !== "0x";

  // ==================== ProxyAdmin Ownership Transfer ====================
  let proxyAdmin: any = null;
  let proxyAdminCurrentOwner: string | null = null;
  let canTransferProxyAdmin = false;

  if (isProxyAdminContract) {
    printSeparator("ProxyAdmin Contract");
    console.log("ProxyAdmin is a contract, checking ownership...");
    
    try {
      // Use OpenZeppelin ProxyAdmin ABI
      const ProxyAdminABI = [
        "function owner() external view returns (address)",
        "function transferOwnership(address newOwner) external",
        "function pendingOwner() external view returns (address)"
      ];
      proxyAdmin = new ethers.Contract(proxyAdminAddress, ProxyAdminABI, currentOwner);
      
      proxyAdminCurrentOwner = await proxyAdmin.owner();
      console.log("Current ProxyAdmin owner:", proxyAdminCurrentOwner);
      
      if (proxyAdminCurrentOwner && proxyAdminCurrentOwner.toLowerCase() !== currentOwner.address.toLowerCase()) {
        printWarning(
          `Current signer (${currentOwner.address}) is not the ProxyAdmin contract owner.\n` +
          `ProxyAdmin contract owner: ${proxyAdminCurrentOwner}\n` +
          `Skipping ProxyAdmin ownership transfer.`
        );
      } else if (proxyAdminCurrentOwner) {
        canTransferProxyAdmin = true;
        
        // Check pending owner (if any)
        try {
          const proxyAdminPendingOwner = await proxyAdmin.pendingOwner();
          if (proxyAdminPendingOwner && proxyAdminPendingOwner !== ethers.ZeroAddress) {
            printWarning(`There is already a pending ownership transfer to: ${proxyAdminPendingOwner}`);
            console.log("This transfer will replace the pending transfer.");
          }
        } catch (error) {
          // pendingOwner() might not exist in older versions, continue anyway
          console.log("Note: Could not check pending owner (function may not exist)");
        }
        
        if (newOwnerAddress.toLowerCase() === proxyAdminCurrentOwner.toLowerCase()) {
          printWarning("New owner address is the same as current ProxyAdmin owner address, skipping ProxyAdmin transfer.");
          canTransferProxyAdmin = false;
        }
      }
    } catch (error: any) {
      printWarning(`Could not check ProxyAdmin ownership: ${error.message}`);
      console.log("Skipping ProxyAdmin ownership transfer.");
    }
  } else {
    printSeparator("ProxyAdmin (EOA)");
    console.log("ProxyAdmin is an EOA (External Owned Account):", proxyAdminAddress);
    printWarning("⚠️  Cannot transfer EOA ownership.");
    console.log("Note: ProxyAdmin EOA address cannot be changed for TransparentUpgradeableProxy.");
    console.log("      The proxy admin will remain as:", proxyAdminAddress);
    console.log("      If you need to change proxy admin, consider deploying a new proxy.");
  }

  // ==================== HSKStaking Ownership Transfer ====================
  printSeparator("HSKStaking Contract");
  
  // Check current owner
  const stakingCurrentOwner = await staking.owner();
  console.log("Current Staking owner:", stakingCurrentOwner);

  if (stakingCurrentOwner.toLowerCase() !== currentOwner.address.toLowerCase()) {
    throw new Error(
      `Current signer (${currentOwner.address}) is not the Staking contract owner.\n` +
      `Staking contract owner: ${stakingCurrentOwner}\n` +
      `Please use the correct account.`
    );
  }

  // Check pending owner (if any)
  try {
    const stakingPendingOwner = await staking.pendingOwner();
    if (stakingPendingOwner && stakingPendingOwner !== ethers.ZeroAddress) {
      printWarning(`There is already a pending ownership transfer to: ${stakingPendingOwner}`);
      console.log("This transfer will replace the pending transfer.");
    }
  } catch (error) {
    // pendingOwner() might not exist in older versions, continue anyway
    console.log("Note: Could not check pending owner (function may not exist)");
  }

  if (newOwnerAddress.toLowerCase() === stakingCurrentOwner.toLowerCase()) {
    throw new Error("New owner address is the same as current Staking owner address");
  }

  // ==================== PenaltyPool Ownership Transfer ====================
  printSeparator("PenaltyPool Contract");
  
  // Check current owner
  const penaltyPoolCurrentOwner = await penaltyPool.owner();
  console.log("Current PenaltyPool owner:", penaltyPoolCurrentOwner);

  if (penaltyPoolCurrentOwner.toLowerCase() !== currentOwner.address.toLowerCase()) {
    throw new Error(
      `Current signer (${currentOwner.address}) is not the PenaltyPool contract owner.\n` +
      `PenaltyPool contract owner: ${penaltyPoolCurrentOwner}\n` +
      `Please use the correct account.`
    );
  }

  // Check pending owner (if any)
  try {
    const penaltyPoolPendingOwner = await penaltyPool.pendingOwner();
    if (penaltyPoolPendingOwner && penaltyPoolPendingOwner !== ethers.ZeroAddress) {
      printWarning(`There is already a pending ownership transfer to: ${penaltyPoolPendingOwner}`);
      console.log("This transfer will replace the pending transfer.");
    }
  } catch (error) {
    // pendingOwner() might not exist in older versions, continue anyway
    console.log("Note: Could not check pending owner (function may not exist)");
  }

  if (newOwnerAddress.toLowerCase() === penaltyPoolCurrentOwner.toLowerCase()) {
    throw new Error("New owner address is the same as current PenaltyPool owner address");
  }

  // ==================== Execute Transfers ====================
  printSeparator("Execute Ownership Transfers");
  
  console.log("\n⚠️  Important: This is Step 1 of a two-step process");
  console.log("After these transactions:");
  console.log("  1. Ownership will NOT be transferred immediately");
  console.log("  2. The new owner must call accept-ownership.ts to complete the transfer");
  console.log("  3. The current owner can cancel the transfer before acceptance");

  // Transfer Staking ownership
  console.log("\n1. Transferring HSKStaking ownership...");
  const stakingTx = await staking.transferOwnership(newOwnerAddress);
  await waitForTransaction(stakingTx, "HSKStaking transfer ownership transaction");
  printSuccess("HSKStaking ownership transfer initiated!");

  // Transfer PenaltyPool ownership
  console.log("\n2. Transferring PenaltyPool ownership...");
  const penaltyPoolTx = await penaltyPool.transferOwnership(newOwnerAddress);
  await waitForTransaction(penaltyPoolTx, "PenaltyPool transfer ownership transaction");
  printSuccess("PenaltyPool ownership transfer initiated!");

  // Transfer ProxyAdmin ownership (if applicable)
  if (canTransferProxyAdmin && proxyAdmin) {
    console.log("\n3. Transferring ProxyAdmin ownership...");
    const proxyAdminTx = await proxyAdmin.transferOwnership(newOwnerAddress);
    await waitForTransaction(proxyAdminTx, "ProxyAdmin transfer ownership transaction");
    printSuccess("ProxyAdmin ownership transfer initiated!");
  }

  printSuccess("\n✅ All ownership transfers initiated!");
  
  console.log("\n📋 Next Steps:");
  console.log("  1. The new owner must call: npm run config:accept-ownership:testnet");
  console.log("  2. Or use the script: scripts/staking/config/accept-ownership.ts");
  console.log("  3. The new owner must use the account:", newOwnerAddress);
  if (canTransferProxyAdmin) {
    console.log("  4. The accept-ownership script will accept ownership for all contracts (HSKStaking, PenaltyPool, ProxyAdmin)");
  } else {
    console.log("  4. The accept-ownership script will accept ownership for HSKStaking and PenaltyPool contracts");
  }
  
  // Verify pending owners
  printSeparator("Verification");
  try {
    const stakingPendingOwner = await staking.pendingOwner();
    if (stakingPendingOwner && stakingPendingOwner.toLowerCase() === newOwnerAddress.toLowerCase()) {
      console.log("✅ HSKStaking: Pending owner is set correctly");
    } else {
      printWarning(`HSKStaking: Pending owner verification failed. Expected: ${newOwnerAddress}, Got: ${stakingPendingOwner}`);
    }
  } catch (error) {
    console.log("⚠️  HSKStaking: Could not verify pending owner (function may not exist)");
  }

  try {
    const penaltyPoolPendingOwner = await penaltyPool.pendingOwner();
    if (penaltyPoolPendingOwner && penaltyPoolPendingOwner.toLowerCase() === newOwnerAddress.toLowerCase()) {
      console.log("✅ PenaltyPool: Pending owner is set correctly");
    } else {
      printWarning(`PenaltyPool: Pending owner verification failed. Expected: ${newOwnerAddress}, Got: ${penaltyPoolPendingOwner}`);
    }
  } catch (error) {
    console.log("⚠️  PenaltyPool: Could not verify pending owner (function may not exist)");
  }

  if (canTransferProxyAdmin && proxyAdmin) {
    try {
      const proxyAdminPendingOwner = await proxyAdmin.pendingOwner();
      if (proxyAdminPendingOwner && proxyAdminPendingOwner.toLowerCase() === newOwnerAddress.toLowerCase()) {
        console.log("✅ ProxyAdmin: Pending owner is set correctly");
      } else {
        printWarning(`ProxyAdmin: Pending owner verification failed. Expected: ${newOwnerAddress}, Got: ${proxyAdminPendingOwner}`);
      }
    } catch (error) {
      console.log("⚠️  ProxyAdmin: Could not verify pending owner (function may not exist)");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

