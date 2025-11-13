import { execSync } from "child_process";
import { printSeparator, printSuccess, printWarning } from "../shared/helpers.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Clean build artifacts
 * 
 * This script removes compiled artifacts and cache files
 * 
 * Usage:
 * npm run dev:clean
 */
async function main() {
  printSeparator("Clean Build Artifacts");
  console.log("Removing compiled artifacts and cache...");
  console.log("");

  const dirsToClean = [
    "artifacts",
    "cache",
    "typechain",
  ];

  let cleanedCount = 0;

  for (const dir of dirsToClean) {
    const dirPath = path.join(process.cwd(), dir);
    
    if (fs.existsSync(dirPath)) {
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`  ✅ Removed: ${dir}/`);
        cleanedCount++;
      } catch (error: any) {
        console.log(`  ⚠️  Failed to remove: ${dir}/ - ${error.message}`);
      }
    } else {
      console.log(`  ℹ️  Not found: ${dir}/ (already clean)`);
    }
  }

  // Also run hardhat clean for additional cleanup
  try {
    execSync("npx hardhat clean", {
      stdio: "pipe",
      cwd: process.cwd(),
      env: { ...process.env }
    });
    console.log("  ✅ Hardhat clean completed");
  } catch (error: any) {
    // Ignore errors, hardhat clean might not be critical
    console.log("  ⚠️  Hardhat clean skipped");
  }

  if (cleanedCount > 0) {
    printSuccess(`✅ Cleaned ${cleanedCount} directory/directories`);
  } else {
    printWarning("No artifacts found to clean");
  }

  console.log("\nBuild artifacts cleaned. Run 'npm run compile' to rebuild.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

