import { execSync } from "child_process";
import { printSeparator, printSuccess, printError } from "../shared/helpers.js";

/**
 * Generate TypeScript types from compiled contracts
 * 
 * This script runs Hardhat's typechain plugin to generate TypeScript types
 * 
 * Usage:
 * npm run tools:generate-types
 */
async function main() {
  printSeparator("Generate TypeScript Types");
  console.log("Generating TypeScript types from compiled contracts...");
  console.log("");

  try {
    // Typechain types are generated automatically during compilation
    // But we can trigger a rebuild to ensure types are up to date
    console.log("Running Hardhat compile to generate types...");
    
    execSync("npx hardhat compile", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env }
    });

    printSuccess("✅ TypeScript types generated!");
    
    console.log("\nGenerated types are available in:");
    console.log("  - typechain/");
    console.log("  - typechain/factories/");
    console.log("  - typechain/common.ts");
    
    console.log("\nUsage example:");
    console.log("  import { HSKStaking } from './typechain/contracts/...';");
    console.log("  import { HSKStaking__factory } from './typechain/factories/...';");
    
  } catch (error: any) {
    const errorMsg = error.message || error.toString();
    printError(`Type generation failed: ${errorMsg}`);
    
    console.log("\nCommon issues:");
    console.log("  1. Ensure contracts are compiled first: npm run compile");
    console.log("  2. Check that typechain plugin is configured in hardhat.config.ts");
    console.log("  3. Verify all dependencies are installed: npm install");
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

