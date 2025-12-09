import hre from "hardhat";
import { getStakingAddress, printSeparator, printSuccess, printWarning } from "../../shared/helpers.js";

/**
 * Generate transaction calldata for multisig wallet to accept ownership
 * 
 * This script generates the calldata needed for a multisig wallet (e.g., Gnosis Safe)
 * to accept ownership of contracts. The multisig wallet needs to execute these transactions
 * using the generated calldata.
 * 
 * Environment variables:
 * - STAKING_ADDRESS: Staking contract address (optional, will use from constants if not provided)
 * - PENALTY_POOL_ADDRESS: PenaltyPool contract address (optional, will be fetched from Staking contract if not provided)
 * - PROXY_ADMIN_ADDRESS: ProxyAdmin address (optional, will be fetched from proxy storage if not provided)
 * - MULTISIG_ADDRESS: Multisig wallet address (optional, will check pending owner if not provided)
 * 
 * Example:
 * MULTISIG_ADDRESS="0x..." npm run config:generate-multisig-calldata:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = process.env.STAKING_ADDRESS || getStakingAddress(network);

  printSeparator("Generate Multisig Calldata for Accept Ownership");
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

  // Get multisig address (from env or from pending owner)
  let multisigAddress: string | null = null;
  if (process.env.MULTISIG_ADDRESS) {
    multisigAddress = process.env.MULTISIG_ADDRESS;
    console.log("Multisig address (from env):", multisigAddress);
  } else {
    // Try to get from pending owner
    try {
      const stakingPendingOwner = await staking.pendingOwner();
      if (stakingPendingOwner && stakingPendingOwner !== ethers.ZeroAddress) {
        multisigAddress = stakingPendingOwner;
        console.log("Multisig address (from pending owner):", multisigAddress);
      }
    } catch (error) {
      console.log("Could not get pending owner");
    }
  }

  if (!multisigAddress) {
    throw new Error(
      "Please provide multisig address:\n" +
      "Method 1: MULTISIG_ADDRESS=\"0x...\" npm run config:generate-multisig-calldata:testnet\n" +
      "Method 2: Set MULTISIG_ADDRESS=0x... in .env file"
    );
  }

  // Validate address format
  if (!ethers.isAddress(multisigAddress)) {
    throw new Error(`Invalid address format: ${multisigAddress}`);
  }

  printSeparator("Checking Pending Ownership Transfers");

  // Check HSKStaking pending owner
  let stakingPendingOwner: string | null = null;
  let stakingCalldata: string | null = null;
  try {
    stakingPendingOwner = await staking.pendingOwner();
    if (stakingPendingOwner && stakingPendingOwner !== ethers.ZeroAddress) {
      console.log("HSKStaking pending owner:", stakingPendingOwner);
      if (stakingPendingOwner.toLowerCase() === multisigAddress.toLowerCase()) {
        // Generate calldata for acceptOwnership()
        const stakingInterface = staking.interface;
        stakingCalldata = stakingInterface.encodeFunctionData("acceptOwnership", []);
        console.log("✅ HSKStaking: Pending transfer found, calldata generated");
      } else {
        printWarning(
          `HSKStaking pending owner (${stakingPendingOwner}) does not match multisig address (${multisigAddress})`
        );
      }
    } else {
      printWarning("No pending ownership transfer found for HSKStaking");
    }
  } catch (error: any) {
    printWarning(`Could not check HSKStaking pending owner: ${error.message}`);
  }

  // Check PenaltyPool pending owner
  let penaltyPoolPendingOwner: string | null = null;
  let penaltyPoolCalldata: string | null = null;
  try {
    penaltyPoolPendingOwner = await penaltyPool.pendingOwner();
    if (penaltyPoolPendingOwner && penaltyPoolPendingOwner !== ethers.ZeroAddress) {
      console.log("PenaltyPool pending owner:", penaltyPoolPendingOwner);
      if (penaltyPoolPendingOwner.toLowerCase() === multisigAddress.toLowerCase()) {
        // Generate calldata for acceptOwnership()
        const penaltyPoolInterface = penaltyPool.interface;
        penaltyPoolCalldata = penaltyPoolInterface.encodeFunctionData("acceptOwnership", []);
        console.log("✅ PenaltyPool: Pending transfer found, calldata generated");
      } else {
        printWarning(
          `PenaltyPool pending owner (${penaltyPoolPendingOwner}) does not match multisig address (${multisigAddress})`
        );
      }
    } else {
      printWarning("No pending ownership transfer found for PenaltyPool");
    }
  } catch (error: any) {
    printWarning(`Could not check PenaltyPool pending owner: ${error.message}`);
  }

  // Check ProxyAdmin pending owner
  let proxyAdminCalldata: string | null = null;
  if (isProxyAdminContract) {
    try {
      const ProxyAdminABI = [
        "function owner() external view returns (address)",
        "function acceptOwnership() external",
        "function pendingOwner() external view returns (address)"
      ];
      const [signer] = await ethers.getSigners();
      const proxyAdmin = new ethers.Contract(proxyAdminAddress, ProxyAdminABI, signer);
      
      const proxyAdminPendingOwner = await proxyAdmin.pendingOwner();
      if (proxyAdminPendingOwner && proxyAdminPendingOwner !== ethers.ZeroAddress) {
        console.log("ProxyAdmin pending owner:", proxyAdminPendingOwner);
        if (proxyAdminPendingOwner.toLowerCase() === multisigAddress.toLowerCase()) {
          // Generate calldata for acceptOwnership()
          const proxyAdminInterface = new ethers.Interface(ProxyAdminABI);
          proxyAdminCalldata = proxyAdminInterface.encodeFunctionData("acceptOwnership", []);
          console.log("✅ ProxyAdmin: Pending transfer found, calldata generated");
        } else {
          printWarning(
            `ProxyAdmin pending owner (${proxyAdminPendingOwner}) does not match multisig address (${multisigAddress})`
          );
        }
      } else {
        printWarning("No pending ownership transfer found for ProxyAdmin");
      }
    } catch (error: any) {
      printWarning(`Could not check ProxyAdmin pending owner: ${error.message}`);
    }
  } else {
    console.log("ProxyAdmin is EOA, skipping...");
  }

  // Generate output
  printSeparator("Multisig Transaction Calldata");
  
  if (!stakingCalldata && !penaltyPoolCalldata && !proxyAdminCalldata) {
    throw new Error("No pending ownership transfers found for the multisig address");
  }

  console.log("\n📋 Instructions for Multisig Wallet:");
  console.log("1. Connect your multisig wallet (e.g., Gnosis Safe)");
  console.log("2. Create a new transaction for each contract");
  console.log("3. Use the calldata provided below");
  console.log("4. Execute the transactions in order");
  console.log("\n⚠️  Important: Execute these transactions from the multisig wallet address:", multisigAddress);

  if (stakingCalldata) {
    printSeparator("HSKStaking Contract");
    console.log("Contract Address:", stakingAddress);
    console.log("Function: acceptOwnership()");
    console.log("Calldata:", stakingCalldata);
    console.log("\nFor Gnosis Safe:");
    console.log(`  - To: ${stakingAddress}`);
    console.log(`  - Data: ${stakingCalldata}`);
    console.log(`  - Value: 0`);
  }

  if (penaltyPoolCalldata) {
    printSeparator("PenaltyPool Contract");
    console.log("Contract Address:", penaltyPoolAddress);
    console.log("Function: acceptOwnership()");
    console.log("Calldata:", penaltyPoolCalldata);
    console.log("\nFor Gnosis Safe:");
    console.log(`  - To: ${penaltyPoolAddress}`);
    console.log(`  - Data: ${penaltyPoolCalldata}`);
    console.log(`  - Value: 0`);
  }

  if (proxyAdminCalldata) {
    printSeparator("ProxyAdmin Contract");
    console.log("Contract Address:", proxyAdminAddress);
    console.log("Function: acceptOwnership()");
    console.log("Calldata:", proxyAdminCalldata);
    console.log("\nFor Gnosis Safe:");
    console.log(`  - To: ${proxyAdminAddress}`);
    console.log(`  - Data: ${proxyAdminCalldata}`);
    console.log(`  - Value: 0`);
  }

  printSeparator("JSON Format (for programmatic use)");
  const transactions = [];
  if (stakingCalldata) {
    transactions.push({
      to: stakingAddress,
      data: stakingCalldata,
      value: "0",
      description: "Accept HSKStaking ownership"
    });
  }
  if (penaltyPoolCalldata) {
    transactions.push({
      to: penaltyPoolAddress,
      data: penaltyPoolCalldata,
      value: "0",
      description: "Accept PenaltyPool ownership"
    });
  }
  if (proxyAdminCalldata) {
    transactions.push({
      to: proxyAdminAddress,
      data: proxyAdminCalldata,
      value: "0",
      description: "Accept ProxyAdmin ownership"
    });
  }
  console.log(JSON.stringify(transactions, null, 2));

  printSuccess("\n✅ Calldata generation complete!");
  console.log("\n📝 Next Steps:");
  console.log("1. Use the calldata above in your multisig wallet");
  console.log("2. Execute the transactions from the multisig wallet");
  console.log("3. Verify ownership after execution");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

