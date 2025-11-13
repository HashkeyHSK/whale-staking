import hre from "hardhat";
import { NORMAL_STAKING_CONFIG } from "../shared/constants.js";
import { printSeparator, printSuccess, printWarning } from "../shared/helpers.js";

/**
 * Deploy Normal Staking product
 * - Min stake: 1 HSK
 * - APY: 8%
 * - For regular users
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [deployer] = await ethers.getSigners();

  printSeparator("Deploy Normal Staking Product");
  console.log("Deployer address:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "HSK");

  // 1. Deploy HSKStaking implementation contract
  console.log("\nDeploying HSKStaking implementation contract...");
  const HSKStaking = await ethers.getContractFactory("HSKStaking");
  const implementation = await HSKStaking.deploy();
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();
  printSuccess(`HSKStaking implementation deployed: ${implementationAddress}`);

  // 2. Prepare initialization parameters
  const minStakeAmount = ethers.parseEther(NORMAL_STAKING_CONFIG.minStakeAmount);
  const rewardRate = NORMAL_STAKING_CONFIG.rewardRate;
  const whitelistMode = NORMAL_STAKING_CONFIG.whitelistMode;  // false for Normal Staking
  const stakeStartTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days later
  const stakeEndTime = stakeStartTime + (365 * 24 * 60 * 60); // 1 year later

  console.log("\nInitialization parameters:");
  console.log(`  - Min stake amount: ${ethers.formatEther(minStakeAmount)} HSK`);
  console.log(`  - APY: ${rewardRate / 100}%`);
  console.log(`  - Stake start time: ${new Date(stakeStartTime * 1000).toISOString()}`);
  console.log(`  - Stake end time: ${new Date(stakeEndTime * 1000).toISOString()}`);
  console.log(`  - Lock period: 365 days (fixed)`);
  console.log(`  - Whitelist mode: ${whitelistMode ? "Enabled" : "Disabled"}`);

  // 3. Encode initialization data
  const initData = implementation.interface.encodeFunctionData("initialize", [
    minStakeAmount,
    rewardRate,
    stakeStartTime,
    stakeEndTime,
    whitelistMode,  // false - whitelist disabled, everyone can stake
  ]);

  // 4. Deploy Transparent Proxy contract
  console.log("\nDeploying NormalStakingProxy (Transparent Proxy)...");
  const NormalStakingProxy = await ethers.getContractFactory("NormalStakingProxy");
  
  const proxy = await NormalStakingProxy.deploy(
    implementationAddress,  // Implementation contract address
    deployer.address,       // ProxyAdmin address
    initData                // Initialization data
  );
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  
  printSuccess(`NormalStakingProxy deployed: ${proxyAddress}`);

  // 5. Connect to HSKStaking contract through proxy for verification
  const staking = HSKStaking.attach(proxyAddress);

  // 6. Verify configuration
  printSeparator("Configuration Verification");
  const minStake = await staking.minStakeAmount();
  const startTime = await staking.stakeStartTime();
  const endTime = await staking.stakeEndTime();
  const whitelistModeCheck = await staking.onlyWhitelistCanStake();
  const rewardRateValue = await staking.rewardRate();

  console.log("Contract address:", proxyAddress);
  console.log("Implementation address:", implementationAddress);
  console.log("Admin address:", deployer.address);
  console.log("Min stake amount:", ethers.formatEther(minStake), "HSK");
  console.log("APY:", Number(rewardRateValue) / 100, "%");
  console.log("Stake start time:", new Date(Number(startTime) * 1000).toISOString());
  console.log("Stake end time:", new Date(Number(endTime) * 1000).toISOString());
  console.log("Whitelist mode:", whitelistModeCheck ? "Enabled" : "Disabled");
  
  printSeparator("✅ Normal Staking Product Deployment Complete");
  console.log("\nProduct configuration:");
  console.log(`  - Product type: ${NORMAL_STAKING_CONFIG.productName}`);
  console.log(`  - Target users: ${NORMAL_STAKING_CONFIG.targetUsers}`);
  console.log(`  - Min stake: ${NORMAL_STAKING_CONFIG.minStakeAmount} HSK`);
  console.log(`  - APY: ${NORMAL_STAKING_CONFIG.rewardRate / 100}%`);
  console.log(`  - Lock period: 365 days (fixed)`);
  console.log(`  - Whitelist mode: ${NORMAL_STAKING_CONFIG.whitelistMode ? "Enabled" : "Disabled"}`);

  printWarning("Next steps:");
  console.log("  1. Use scripts/normal/add-rewards.ts to fund the reward pool");
  console.log("  2. Use scripts/normal/query/check-status.ts to check contract status");
  console.log("  3. Users can start staking after stake start time (no whitelist required)");
  
  // Save deployment information
  console.log("\nPlease save the following address to scripts/shared/constants.ts:");
  console.log(`normalStaking: "${proxyAddress}",`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
