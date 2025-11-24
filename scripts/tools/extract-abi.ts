#!/usr/bin/env node

/**
 * Extract ABI from compiled contracts
 * 
 * This script extracts ABI files from Hardhat artifacts and saves them
 * 
 * Usage:
 * npm run tools:extract-abi [contract-name]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACTS_DIR = path.join(__dirname, "../../artifacts");
const OUTPUT_DIR = path.join(__dirname, "../../abi");

// Contract names to extract (if not specified)
const DEFAULT_CONTRACTS = [
  "HSKStaking",
  "StakingStorage",
  "StakingConstants",
  "StakingProxy",
];

interface Artifact {
  abi: any[];
  [key: string]: any;
}

function extractABI(contractName: string): boolean {
  const artifactPath = path.join(
    ARTIFACTS_DIR,
    "contracts",
    "implementation",
    `${contractName}.sol`,
    `${contractName}.json`
  );

  // Try alternative paths
  const alternativePaths = [
    path.join(ARTIFACTS_DIR, "contracts", `${contractName}.sol`, `${contractName}.json`),
    path.join(ARTIFACTS_DIR, "contracts", "constants", `${contractName}.sol`, `${contractName}.json`),
    path.join(ARTIFACTS_DIR, "contracts", "interfaces", `${contractName}.sol`, `IStaking.json`),
  ];

  let artifact: Artifact | null = null;
  let foundPath: string | null = null;

  for (const altPath of [artifactPath, ...alternativePaths]) {
    if (fs.existsSync(altPath)) {
      const fileContent = fs.readFileSync(altPath, "utf8");
      artifact = JSON.parse(fileContent) as Artifact;
      foundPath = altPath;
      break;
    }
  }

  if (!artifact) {
    console.error(`❌ Contract artifact not found: ${contractName}`);
    return false;
  }

  if (!artifact.abi || !Array.isArray(artifact.abi)) {
    console.error(`❌ ABI not found in artifact: ${contractName}`);
    return false;
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Save ABI
  const abiPath = path.join(OUTPUT_DIR, `${contractName}.json`);
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  console.log(`✅ Extracted ABI: ${contractName} -> ${abiPath}`);

  return true;
}

function main(): void {
  // hardhat run passes additional arguments, filter them out
  const args = process.argv.slice(2).filter(arg => !arg.startsWith("--"));
  const contractName = args[0] && args[0] !== "run" ? args[0] : undefined;
  const contracts = contractName ? [contractName] : DEFAULT_CONTRACTS;

  console.log("Extracting ABIs...\n");

  let successCount = 0;
  for (const contract of contracts) {
    if (extractABI(contract)) {
      successCount++;
    }
  }

  console.log(`\n✅ Extracted ${successCount}/${contracts.length} ABIs`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main();

