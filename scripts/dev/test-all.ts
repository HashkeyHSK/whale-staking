import { execSync } from "child_process";
import { printSeparator, printSuccess, printError } from "../shared/helpers.js";

/**
 * Run all tests using Hardhat
 * 
 * This script runs all test files in the test/ directory
 * 
 * Usage:
 * npm run dev:test
 * 
 * Environment variables:
 * - TEST_MATCH: Pattern to match test files (e.g., "staking.test.js")
 * - GAS_REPORT: Set to "true" to enable gas reporting
 */
async function main() {
  printSeparator("Run All Tests");
  
  const testMatch = process.env.TEST_MATCH || "";
  const gasReport = process.env.GAS_REPORT === "true";
  
  console.log("Running tests...");
  if (testMatch) {
    console.log(`  Test pattern: ${testMatch}`);
  }
  if (gasReport) {
    console.log("  Gas reporting: enabled");
  }
  console.log("");

  try {
    let command = "npx hardhat test";
    
    if (testMatch) {
      command += ` ${testMatch}`;
    }
    
    if (gasReport) {
      command += " --gas-reporter";
    }

    execSync(command, {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env }
    });

    printSuccess("✅ All tests passed!");
    
  } catch (error: any) {
    const errorMsg = error.message || error.toString();
    printError(`Tests failed: ${errorMsg}`);
    
    console.log("\nTips:");
    console.log("  - Check test files for errors");
    console.log("  - Verify contract deployment in tests");
    console.log("  - Ensure test network is properly configured");
    console.log("  - Run specific test: TEST_MATCH='staking.test.js' npm run dev:test");
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

