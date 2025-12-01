import hre from "hardhat";
import { execSync } from "child_process";
import { printSeparator, printSuccess, printError } from "../shared/helpers.js";

/**
 * Verify PenaltyPool contract (using Foundry forge verify-contract)
 * 
 * Purpose: Use Foundry's forge verify-contract command to verify PenaltyPool contract
 * 
 * Environment variables:
 * - PENALTY_POOL_ADDRESS: PenaltyPool contract address (required)
 * - OWNER_ADDRESS: Owner address used in constructor (required)
 * - AUTHORIZED_DEPOSITOR_ADDRESS: Authorized depositor address used in constructor (required)
 * - RPC_URL: RPC URL (optional, defaults to testnet)
 * - VERIFIER_URL: Verifier API URL (optional, defaults to testnet explorer)
 */
async function main() {
  const penaltyPoolAddress = process.env.PENALTY_POOL_ADDRESS;
  const ownerAddress = process.env.OWNER_ADDRESS;
  const authorizedDepositorAddress = process.env.AUTHORIZED_DEPOSITOR_ADDRESS;
  const rpcUrl = process.env.RPC_URL || "https://testnet.hsk.xyz";
  const verifierUrl = process.env.VERIFIER_URL || "https://testnet-explorer.hsk.xyz/api/";
  const contractPath = "contracts/implementation/PenaltyPool.sol:PenaltyPool";

  if (!penaltyPoolAddress) {
    throw new Error(
      "Please provide PenaltyPool contract address:\n" +
      "Method 1: PENALTY_POOL_ADDRESS=0x... OWNER_ADDRESS=0x... AUTHORIZED_DEPOSITOR_ADDRESS=0x... npm run verify:penalty-pool:testnet\n" +
      "Method 2: Set PENALTY_POOL_ADDRESS=0x... OWNER_ADDRESS=0x... AUTHORIZED_DEPOSITOR_ADDRESS=0x... in .env file"
    );
  }

  if (!ownerAddress) {
    throw new Error(
      "Please provide owner address (constructor parameter):\n" +
      "OWNER_ADDRESS=0x... npm run verify:penalty-pool:testnet"
    );
  }

  if (!authorizedDepositorAddress) {
    throw new Error(
      "Please provide authorized depositor address (constructor parameter):\n" +
      "AUTHORIZED_DEPOSITOR_ADDRESS=0x... npm run verify:penalty-pool:testnet"
    );
  }

  // Check if forge is installed
  try {
    execSync("which forge", { stdio: "pipe" });
  } catch (error) {
    throw new Error(
      "forge is not installed. Please install Foundry:\n" +
      "curl -L https://foundry.paradigm.xyz | bash\n" +
      "foundryup"
    );
  }

  printSeparator("Verify PenaltyPool Contract Using Foundry forge verify-contract");
  console.log("Contract address:", penaltyPoolAddress);
  console.log("Contract path:", contractPath);
  console.log("Owner address (constructor arg):", ownerAddress);
  console.log("Authorized depositor address (constructor arg):", authorizedDepositorAddress);
  console.log("RPC URL:", rpcUrl);
  console.log("Verifier: blockscout");
  console.log("Verifier URL:", verifierUrl);
  console.log("Compiler version: 0.8.27");
  console.log("Optimization settings: runs=200, viaIR=true");
  console.log("");

  // Encode constructor arguments
  // PenaltyPool constructor: (address _owner, address _authorizedDepositor)
  const { ethers } = hre;
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const constructorArgs = abiCoder.encode(
    ["address", "address"],
    [ownerAddress, authorizedDepositorAddress]
  );

  // Build forge verify-contract command
  const command = [
    "forge verify-contract",
    `--rpc-url ${rpcUrl}`,
    "--verifier blockscout",
    `--verifier-url '${verifierUrl}'`,
    "--compiler-version 0.8.27",
    "--optimizer-runs 200",
    "--via-ir",
    `--constructor-args ${constructorArgs}`,
    penaltyPoolAddress,
    contractPath
  ].join(" \\\n  ");

  console.log("Executing command:");
  console.log(command);
  console.log("");

  try {
    // Execute verification command
    execSync(
      `forge verify-contract --rpc-url ${rpcUrl} --verifier blockscout --verifier-url '${verifierUrl}' --compiler-version 0.8.27 --optimizer-runs 200 --via-ir --constructor-args ${constructorArgs} ${penaltyPoolAddress} ${contractPath}`,
      { stdio: "inherit", cwd: process.cwd(), env: { ...process.env } }
    );

    printSuccess("Contract verification request submitted!");
    
    printSeparator("✅ Verification Complete");
    console.log("\nVerification information:");
    console.log(`  - Contract address: ${penaltyPoolAddress}`);
    console.log(`  - Contract path: ${contractPath}`);
    console.log(`  - Owner address: ${ownerAddress}`);
    console.log(`  - Authorized depositor address: ${authorizedDepositorAddress}`);
    console.log(`  - Compiler version: 0.8.27`);
    console.log(`  - Optimization settings: runs=200, viaIR=true`);
    console.log("\nView verification result:");
    console.log(`  - Browser: https://testnet-explorer.hsk.xyz/address/${penaltyPoolAddress}`);
    console.log("\nTips:");
    console.log("  - Verification may take a few minutes to process");
    console.log("  - After successful verification, you can view and read contract source code on blockchain explorer");
    
  } catch (error: any) {
    const errorMsg = error.message || error.toString();
    
    printError(`Verification failed: ${errorMsg}`);
    console.log("\nCommon troubleshooting:");
    console.log("  1. Confirm contract address is correct");
    console.log("  2. Confirm constructor arguments match deployment:");
    console.log(`     - Owner: ${ownerAddress}`);
    console.log(`     - Authorized depositor: ${authorizedDepositorAddress}`);
    console.log("  3. Confirm contract code matches deployed code on chain exactly");
    console.log("  4. Confirm compiler version and optimization settings match");
    console.log("     - Version: 0.8.27");
    console.log("     - Optimization: enabled=true, runs=200, viaIR=true");
    console.log("  5. Confirm RPC URL and verifier URL are correct");
    console.log("  6. Confirm forge is properly installed: forge --version");
    console.log("  7. Confirm contract is compiled: forge build");
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

