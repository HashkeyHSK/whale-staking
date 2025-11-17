import { execSync } from "child_process";
import { printSeparator, printSuccess, printError, printWarning } from "../shared/helpers.js";
import * as path from "path";

/**
 * Generate test coverage report using c8
 * 
 * This script runs tests with coverage analysis and generates a coverage report
 * for TypeScript/JavaScript code using c8.
 * 
 * Usage:
 * npm run dev:coverage
 * 
 * Note: 
 * - Uses c8 for TypeScript/JavaScript code coverage
 * - Solidity contract coverage is not available (solidity-coverage doesn't support Hardhat 3.x)
 * - Coverage report will be generated in ./coverage directory
 */
async function main() {
  printSeparator("Generate Test Coverage Report");
  console.log("Running tests with coverage analysis using c8...");
  console.log("⚠️  This may take several minutes...");
  console.log("");

  try {
    const coverageDir = path.join(process.cwd(), "coverage");
    
    console.log("Running coverage analysis...");
    console.log("  - Tool: c8 (TypeScript/JavaScript coverage)");
    console.log("  - Test framework: Node.js native test");
    console.log("");
    
    // Run tests with c8 coverage
    // c8 will instrument the code and generate coverage reports
    // Configuration is read from .c8rc.json
    const testCommand = "node --test --test-reporter spec 'test/**/*.test.ts'";
    const coverageCommand = `npx c8 -- ${testCommand}`;
    
    // Merge NODE_OPTIONS if it already exists
    const nodeOptions = process.env.NODE_OPTIONS 
      ? `${process.env.NODE_OPTIONS} --import tsx/esm`
      : "--import tsx/esm";
    
    execSync(coverageCommand, {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { 
        ...process.env,
        NODE_OPTIONS: nodeOptions
      }
    });

    printSuccess("✅ Coverage report generated!");
    
    console.log("\nCoverage report available at:");
    console.log(`  - ${path.join(coverageDir, "index.html")} (open in browser)`);
    console.log(`  - ${path.join(coverageDir, "lcov.info")} (for CI/CD)`);
    console.log(`  - ${path.join(coverageDir, "coverage-summary.json")} (summary)`);
    
    printWarning("\n⚠️  Note:");
    console.log("  - This coverage report covers TypeScript/JavaScript test code");
    console.log("  - Solidity contract coverage is not available (solidity-coverage doesn't support Hardhat 3.x)");
    console.log("  - For Solidity coverage, consider manual code review or wait for solidity-coverage update");
    console.log("  - Coverage analysis may not be 100% accurate for complex code");
    console.log("  - Review uncovered lines manually");
    
  } catch (error: any) {
    const errorMsg = error.message || error.toString();
    printError(`Coverage generation failed: ${errorMsg}`);
    
    console.log("\nCommon issues:");
    console.log("  1. Ensure tests can run successfully: npm run test");
    console.log("  2. Check that c8 is installed: npm install --save-dev c8");
    console.log("  3. Verify test files are accessible");
    console.log("  4. Check file permissions for coverage directory");
    
    console.log("\nTips:");
    console.log("  - Run tests without coverage: npm run test");
    console.log("  - Run specific test file: npm run test -- test/path/to/test.test.ts");
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

