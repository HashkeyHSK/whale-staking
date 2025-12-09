import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, printWarning, waitForTransaction } from "../../shared/helpers.js";

/**
 * Accept ownership of all contracts (Step 2 of 2)
 * 
 * This script accepts ownership of:
 * - HSKStaking contract (implementation contract owner via proxy)
 * - PenaltyPool contract
 * - ProxyAdmin contract (if ProxyAdmin is a contract and has pending transfer)
 * 
 * Note: If ProxyAdmin is an EOA (External Owned Account), it cannot be transferred.
 * 
 * This is the second step of the two-step ownership transfer process.
 * The current owner must have called transfer-ownership.ts first.
 * 
 * Environment variables:
 * - STAKING_ADDRESS: Staking contract address (optional, will use from constants if not provided)
 * - PENALTY_POOL_ADDRESS: PenaltyPool contract address (optional, will be fetched from Staking contract if not provided)
 * - PROXY_ADMIN_ADDRESS: ProxyAdmin address (optional, will be fetched from proxy storage if not provided)
 * 
 * Example:
 * npm run config:accept-ownership:testnet
 * 
 * Note: The signer must be the address that was set as pending owner in Step 1
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [newOwner] = await ethers.getSigners();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  printSeparator("Accept Ownership - Step 2: Complete Transfer (All Contracts)");
  console.log("New owner address:", newOwner.address);
  console.log("Staking contract address:", stakingAddress);

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

  // ==================== ProxyAdmin Ownership Acceptance ====================
  let proxyAdmin: any = null;
  let proxyAdminPendingOwner: string | null = null;
  let canAcceptProxyAdmin = false;

  if (isProxyAdminContract) {
    printSeparator("ProxyAdmin Contract");
    console.log("ProxyAdmin is a contract, checking pending ownership...");
    
    try {
      // Use OpenZeppelin ProxyAdmin ABI
      const ProxyAdminABI = [
        "function owner() external view returns (address)",
        "function acceptOwnership() external",
        "function pendingOwner() external view returns (address)"
      ];
      proxyAdmin = new ethers.Contract(proxyAdminAddress, ProxyAdminABI, newOwner);
      
      const proxyAdminCurrentOwner = await proxyAdmin.owner();
      console.log("Current ProxyAdmin owner:", proxyAdminCurrentOwner);
      
      // Check pending owner
      try {
        proxyAdminPendingOwner = await proxyAdmin.pendingOwner();
        if (!proxyAdminPendingOwner || proxyAdminPendingOwner === ethers.ZeroAddress) {
          printWarning("No pending ownership transfer found for ProxyAdmin");
          console.log("Skipping ProxyAdmin ownership acceptance...");
        } else {
          console.log("Pending ProxyAdmin owner:", proxyAdminPendingOwner);
          
          if (proxyAdminPendingOwner.toLowerCase() !== newOwner.address.toLowerCase()) {
            printWarning(
              `Current signer (${newOwner.address}) is not the pending ProxyAdmin owner.\n` +
              `Pending ProxyAdmin owner: ${proxyAdminPendingOwner}\n` +
              `Skipping ProxyAdmin ownership acceptance.`
            );
          } else {
            canAcceptProxyAdmin = true;
          }
        }
      } catch (error) {
        // pendingOwner() might not exist in older versions
        console.log("Note: Could not check pending ProxyAdmin owner (function may not exist)");
      }
    } catch (error: any) {
      printWarning(`Could not check ProxyAdmin ownership: ${error.message}`);
      console.log("Skipping ProxyAdmin ownership acceptance.");
    }
  } else {
    printSeparator("ProxyAdmin (EOA)");
    console.log("ProxyAdmin is an EOA (External Owned Account):", proxyAdminAddress);
    console.log("Note: EOA ownership cannot be transferred, skipping ProxyAdmin.");
  }

  // ==================== HSKStaking Ownership Acceptance ====================
  printSeparator("HSKStaking Contract");

  // Check current owner
  const stakingCurrentOwner = await staking.owner();
  console.log("Current Staking owner:", stakingCurrentOwner);

  // Check pending owner
  let stakingPendingOwner: string | null = null;
  try {
    stakingPendingOwner = await staking.pendingOwner();
    if (!stakingPendingOwner || stakingPendingOwner === ethers.ZeroAddress) {
      printWarning("No pending ownership transfer found for HSKStaking");
      console.log("Skipping HSKStaking ownership acceptance...");
      stakingPendingOwner = null;
    } else {
      console.log("Pending Staking owner:", stakingPendingOwner);
      
      if (stakingPendingOwner.toLowerCase() !== newOwner.address.toLowerCase()) {
        throw new Error(
          `Current signer (${newOwner.address}) is not the pending Staking owner.\n` +
          `Pending Staking owner: ${stakingPendingOwner}\n` +
          `Please use the correct account.`
        );
      }
    }
  } catch (error: any) {
    // If pendingOwner() doesn't exist or fails, check if it's because function doesn't exist
    if (error.message.includes("pendingOwner") || error.message.includes("function")) {
      printWarning(`Could not check pending Staking owner: ${error.message}`);
      console.log("Skipping HSKStaking ownership acceptance...");
      stakingPendingOwner = null;
    } else {
      throw error;
    }
  }

  // ==================== PenaltyPool Ownership Acceptance ====================
  printSeparator("PenaltyPool Contract");

  // Check current owner
  const penaltyPoolCurrentOwner = await penaltyPool.owner();
  console.log("Current PenaltyPool owner:", penaltyPoolCurrentOwner);

  // Check pending owner
  let penaltyPoolPendingOwner: string | null = null;
  try {
    penaltyPoolPendingOwner = await penaltyPool.pendingOwner();
    if (!penaltyPoolPendingOwner || penaltyPoolPendingOwner === ethers.ZeroAddress) {
      printWarning("No pending ownership transfer found for PenaltyPool");
      console.log("Skipping PenaltyPool ownership acceptance...");
      penaltyPoolPendingOwner = null;
    } else {
      console.log("Pending PenaltyPool owner:", penaltyPoolPendingOwner);
      
      if (penaltyPoolPendingOwner.toLowerCase() !== newOwner.address.toLowerCase()) {
        throw new Error(
          `Current signer (${newOwner.address}) is not the pending PenaltyPool owner.\n` +
          `Pending PenaltyPool owner: ${penaltyPoolPendingOwner}\n` +
          `Please use the correct account.`
        );
      }
    }
  } catch (error: any) {
    // If pendingOwner() doesn't exist or fails, check if it's because function doesn't exist
    if (error.message.includes("pendingOwner") || error.message.includes("function")) {
      printWarning(`Could not check pending PenaltyPool owner: ${error.message}`);
      console.log("Skipping PenaltyPool ownership acceptance...");
      penaltyPoolPendingOwner = null;
    } else {
      throw error;
    }
  }

  // ==================== Execute Acceptances ====================
  printSeparator("Execute Ownership Acceptances");

  let stakingAccepted = false;
  let penaltyPoolAccepted = false;
  let proxyAdminAccepted = false;

  // Accept Staking ownership
  if (stakingPendingOwner) {
    console.log("\n1. Accepting HSKStaking ownership...");
    console.log("✅ Verified: Current signer matches pending Staking owner");
    const stakingTx = await staking.acceptOwnership();
    await waitForTransaction(stakingTx, "HSKStaking accept ownership transaction");
    printSuccess("HSKStaking ownership transfer completed!");
    stakingAccepted = true;
  }

  // Accept PenaltyPool ownership
  if (penaltyPoolPendingOwner) {
    console.log("\n2. Accepting PenaltyPool ownership...");
    console.log("✅ Verified: Current signer matches pending PenaltyPool owner");
    const penaltyPoolTx = await penaltyPool.acceptOwnership();
    await waitForTransaction(penaltyPoolTx, "PenaltyPool accept ownership transaction");
    printSuccess("PenaltyPool ownership transfer completed!");
    penaltyPoolAccepted = true;
  }

  // Accept ProxyAdmin ownership (if applicable)
  if (canAcceptProxyAdmin && proxyAdmin && proxyAdminPendingOwner) {
    console.log("\n3. Accepting ProxyAdmin ownership...");
    console.log("✅ Verified: Current signer matches pending ProxyAdmin owner");
    const proxyAdminTx = await proxyAdmin.acceptOwnership();
    await waitForTransaction(proxyAdminTx, "ProxyAdmin accept ownership transaction");
    printSuccess("ProxyAdmin ownership transfer completed!");
    proxyAdminAccepted = true;
  }

  if (!stakingAccepted && !penaltyPoolAccepted && !proxyAdminAccepted) {
    throw new Error("No pending ownership transfers found for any contract.");
  }

  // ==================== Verification ====================
  printSeparator("Verification");

  // Verify Staking ownership
  if (stakingAccepted) {
    const stakingFinalOwner = await staking.owner();
    if (stakingFinalOwner.toLowerCase() === newOwner.address.toLowerCase()) {
      console.log("✅ HSKStaking: Contract owner is now:", stakingFinalOwner);
    } else {
      printWarning(`HSKStaking: Ownership verification failed. Expected: ${newOwner.address}, Got: ${stakingFinalOwner}`);
    }
  }

  // Verify PenaltyPool ownership
  if (penaltyPoolAccepted) {
    const penaltyPoolFinalOwner = await penaltyPool.owner();
    if (penaltyPoolFinalOwner.toLowerCase() === newOwner.address.toLowerCase()) {
      console.log("✅ PenaltyPool: Contract owner is now:", penaltyPoolFinalOwner);
    } else {
      printWarning(`PenaltyPool: Ownership verification failed. Expected: ${newOwner.address}, Got: ${penaltyPoolFinalOwner}`);
    }
  }

  // Verify ProxyAdmin ownership
  if (proxyAdminAccepted && proxyAdmin) {
    const proxyAdminFinalOwner = await proxyAdmin.owner();
    if (proxyAdminFinalOwner.toLowerCase() === newOwner.address.toLowerCase()) {
      console.log("✅ ProxyAdmin: Contract owner is now:", proxyAdminFinalOwner);
    } else {
      printWarning(`ProxyAdmin: Ownership verification failed. Expected: ${newOwner.address}, Got: ${proxyAdminFinalOwner}`);
    }
  }

  printSuccess("\n✅ Ownership Transfer Complete!");
  
  console.log("\n📋 The new owner can now:");
  console.log("  - Pause/unpause contracts");
  console.log("  - Update configuration parameters");
  console.log("  - Manage whitelist (for Staking)");
  console.log("  - Enable emergency mode");
  console.log("  - Manage reward pool");
  console.log("  - Withdraw penalties from PenaltyPool");
  if (proxyAdminAccepted) {
    console.log("  - Upgrade proxy contract (via ProxyAdmin)");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

