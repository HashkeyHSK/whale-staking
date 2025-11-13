import { execSync } from "child_process";
import { printSeparator, printSuccess, printError } from "../shared/helpers.js";

/**
 * Verify HSKStaking implementation contract (using Foundry forge verify-contract)
 * 
 * Purpose: Use Foundry's forge verify-contract command to verify contract
 * 
 * Environment variables:
 * - IMPLEMENTATION_ADDRESS: Implementation contract address (required)
 * - RPC_URL: RPC URL (optional, defaults to testnet)
 * - VERIFIER_URL: Verifier API URL (optional, defaults to testnet explorer)
 */
async function main() {
  const implementationAddress = process.env.IMPLEMENTATION_ADDRESS;
  const rpcUrl = process.env.RPC_URL || "https://testnet.hsk.xyz";
  const verifierUrl = process.env.VERIFIER_URL || "https://testnet-explorer.hsk.xyz/api/";
  const contractPath = "contracts/implementation/HSKStaking.sol:HSKStaking";

  if (!implementationAddress) {
    throw new Error(
      "Please provide implementation contract address:\n" +
      "Method 1: IMPLEMENTATION_ADDRESS=0x... npm run verify:premium:forge:testnet\n" +
      "Method 2: Set IMPLEMENTATION_ADDRESS=0x... in .env file"
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

  printSeparator("Verify Contract Using Foundry forge verify-contract");
  console.log("Contract address:", implementationAddress);
  console.log("Contract path:", contractPath);
  console.log("RPC URL:", rpcUrl);
  console.log("Verifier: blockscout");
  console.log("Verifier URL:", verifierUrl);
  console.log("Compiler version: 0.8.27");
  console.log("Optimization settings: runs=200, viaIR=true");
  console.log("");

  // Build forge verify-contract command
  // Note: Implementation contract has no constructor arguments, so --constructor-args is not needed
  const command = [
    "forge verify-contract",
    `--rpc-url ${rpcUrl}`,
    "--verifier blockscout",
    `--verifier-url '${verifierUrl}'`,
    "--compiler-version 0.8.27",
    "--optimizer-runs 200",
    "--via-ir",
    implementationAddress,
    contractPath
  ].join(" \\\n  ");

  console.log("Executing command:");
  console.log(command);
  console.log("");

  try {
    // Execute verification command
    // Note: forge verify-contract will output verification status, including GUID and URL
    execSync(
      `forge verify-contract --rpc-url ${rpcUrl} --verifier blockscout --verifier-url '${verifierUrl}' --compiler-version 0.8.27 --optimizer-runs 200 --via-ir ${implementationAddress} ${contractPath}`,
      { stdio: "inherit", cwd: process.cwd(), env: { ...process.env } }
    );

    printSuccess("Contract verification request submitted!");
    
    printSeparator("✅ Verification Complete");
    console.log("\nVerification information:");
    console.log(`  - Contract address: ${implementationAddress}`);
    console.log(`  - Contract path: ${contractPath}`);
    console.log(`  - Compiler version: 0.8.27`);
    console.log(`  - Optimization settings: runs=200, viaIR=true`);
    console.log("\nView verification result:");
    console.log(`  - Browser: https://testnet-explorer.hsk.xyz/address/${implementationAddress}`);
    console.log("\nTips:");
    console.log("  - Verification may take a few minutes to process");
    console.log("  - After successful verification, you can view and read contract source code on blockchain explorer");
    console.log("  - Note: Users should interact with proxy contract, not directly with implementation contract");
    
  } catch (error: any) {
    const errorMsg = error.message || error.toString();
    
    printError(`Verification failed: ${errorMsg}`);
    console.log("\nCommon troubleshooting:");
    console.log("  1. Confirm contract address is correct");
    console.log("  2. Confirm contract code matches deployed code on chain exactly");
    console.log("  3. Confirm compiler version and optimization settings match");
    console.log("     - Version: 0.8.27");
    console.log("     - Optimization: enabled=true, runs=200, viaIR=true");
    console.log("  4. Confirm RPC URL and verifier URL are correct");
    console.log("  5. If contract has constructor arguments, need to add --constructor-args parameter");
    console.log("  6. Confirm forge is properly installed: forge --version");
    console.log("  7. Confirm contract is compiled: forge build");
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

