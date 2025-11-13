import { execSync } from "child_process";
import { printSeparator, printSuccess, printError } from "../shared/helpers.js";

/**
 * Compile contracts using Hardhat
 * 
 * This script compiles all Solidity contracts in the contracts/ directory
 * 
 * Usage:
 * npm run dev:compile
 */
async function main() {
  printSeparator("Compile Contracts");
  console.log("Compiling Solidity contracts...");
  console.log("");

  try {
    // Run hardhat compile
    execSync("npx hardhat compile", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env }
    });

    printSuccess("✅ Contracts compiled successfully!");
    
    console.log("\nCompiled artifacts are available in:");
    console.log("  - artifacts/");
    console.log("  - typechain/");
    
  } catch (error: any) {
    const errorMsg = error.message || error.toString();
    printError(`Compilation failed: ${errorMsg}`);
    
    console.log("\nCommon issues:");
    console.log("  1. Check Solidity version compatibility");
    console.log("  2. Verify all imports are correct");
    console.log("  3. Check for syntax errors in contract files");
    console.log("  4. Ensure all dependencies are installed: npm install");
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

