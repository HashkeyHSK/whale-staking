import { execSync } from "child_process";
import { printSeparator, printSuccess, printError, printWarning } from "../shared/helpers.js";
import * as fs from "path";

/**
 * Generate test coverage report
 * 
 * This script runs tests with coverage analysis and generates a coverage report
 * 
 * Usage:
 * npm run dev:coverage
 * 
 * Note: Requires solidity-coverage plugin in hardhat.config.ts
 */
async function main() {
  printSeparator("Generate Test Coverage Report");
  console.log("Running tests with coverage analysis...");
  console.log("⚠️  This may take several minutes...");
  console.log("");

  try {
    // Check if coverage directory exists
    const coverageDir = fs.join(process.cwd(), "coverage");
    
    console.log("Running coverage analysis...");
    
    // Run hardhat coverage
    execSync("npx hardhat coverage", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env }
    });

    printSuccess("✅ Coverage report generated!");
    
    console.log("\nCoverage report available at:");
    console.log("  - coverage/index.html (open in browser)");
    console.log("  - coverage/lcov.info (for CI/CD)");
    console.log("  - coverage/coverage.json (raw data)");
    
    printWarning("\n⚠️  Note:");
    console.log("  - Coverage analysis may not be 100% accurate for complex contracts");
    console.log("  - Some code paths may be difficult to test");
    console.log("  - Review uncovered lines manually");
    
  } catch (error: any) {
    const errorMsg = error.message || error.toString();
    
    // Check if it's a missing plugin error
    if (errorMsg.includes("coverage") || errorMsg.includes("plugin")) {
      printError("Coverage plugin not configured!");
      console.log("\nTo enable coverage:");
      console.log("  1. Install solidity-coverage:");
      console.log("     npm install --save-dev solidity-coverage");
      console.log("  2. Add to hardhat.config.ts:");
      console.log("     import 'solidity-coverage';");
      console.log("  3. Run again: npm run dev:coverage");
    } else {
      printError(`Coverage generation failed: ${errorMsg}`);
      console.log("\nCommon issues:");
      console.log("  1. Ensure solidity-coverage plugin is installed and configured");
      console.log("  2. Check that tests can run successfully");
      console.log("  3. Verify hardhat.config.ts includes coverage plugin");
    }
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

