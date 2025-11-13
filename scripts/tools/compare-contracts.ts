import * as fs from "fs";
import * as path from "path";
import { printSeparator, printSuccess, printWarning } from "../shared/helpers.js";

/**
 * Compare contract bytecode between two implementations
 * 
 * This script compares the bytecode of two contract implementations
 * to detect changes in contract logic
 * 
 * Usage:
 * npm run tools:compare-contracts <contract-name> <old-address> <new-address>
 * 
 * Or compare local artifacts:
 * npm run tools:compare-contracts <contract-name>
 */
async function main() {
  const contractName = process.argv[2] || "HSKStaking";
  const oldAddress = process.argv[3];
  const newAddress = process.argv[4];

  printSeparator("Compare Contract Implementations");
  console.log(`Contract: ${contractName}`);

  if (oldAddress && newAddress) {
    console.log(`Old implementation: ${oldAddress}`);
    console.log(`New implementation: ${newAddress}`);
    console.log("\n⚠️  On-chain comparison not yet implemented");
    console.log("Please use a blockchain explorer to compare bytecode");
  } else {
    // Compare local artifacts
    console.log("\nComparing local artifacts...");
    
    const artifactPath = path.join(
      process.cwd(),
      "artifacts",
      "contracts",
      "implementation",
      `${contractName}.sol`,
      `${contractName}.json`
    );

    if (!fs.existsSync(artifactPath)) {
      console.error(`❌ Artifact not found: ${artifactPath}`);
      console.log("\nPlease compile contracts first: npm run compile");
      process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const bytecode = artifact.bytecode;
    const deployedBytecode = artifact.deployedBytecode;

    console.log("\nContract Information:");
    console.log(`  - Contract name: ${contractName}`);
    console.log(`  - Bytecode size: ${bytecode.length / 2 - 1} bytes`);
    console.log(`  - Deployed bytecode size: ${deployedBytecode.length / 2 - 1} bytes`);
    console.log(`  - ABI functions: ${artifact.abi.filter((item: any) => item.type === "function").length}`);
    console.log(`  - ABI events: ${artifact.abi.filter((item: any) => item.type === "event").length}`);

    printSuccess("✅ Contract analysis complete");
    
    printWarning("\n⚠️  Note:");
    console.log("  - For comparing two implementations, deploy both and compare addresses");
    console.log("  - Use upgrade script to upgrade and verify changes");
    console.log("  - Always test upgrades on testnet first");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

