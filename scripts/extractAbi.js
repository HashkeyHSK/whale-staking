const fs = require('fs');
const path = require('path');

const contractName = 'Layer2Staking'; // 需要提取ABI的合约名称
const artifactPath = path.join(__dirname, `../artifacts/contracts/staking.sol/${contractName}.json`);

if (!fs.existsSync(artifactPath)) {
  console.error(`Artifact for ${contractName} not found at ${artifactPath}`);
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const abi = artifact.abi;

const abiPath = path.join(__dirname, `../abis/${contractName}.abi.json`);
fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));

console.log(`ABI for ${contractName} saved to ${abiPath}`);