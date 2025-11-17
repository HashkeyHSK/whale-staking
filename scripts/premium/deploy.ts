import hre from "hardhat";
import { PREMIUM_STAKING_CONFIG } from "../shared/constants.js";
import { printSeparator, printSuccess, printWarning } from "../shared/helpers.js";

/**
 * Deploy Premium Staking product
 * - Min stake: 500,000 HSK
 * - APY: 16%
 * - For whales/institutions
 * - Whitelist mode enabled
 * 
 * Environment variables:
 * - STAKE_START_TIME: Unix timestamp for stake start time (required, seconds)
 * - STAKE_END_TIME: Unix timestamp for stake end time (required, seconds)
 * 
 * Example:
 * STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:premium:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [deployer] = await ethers.getSigners();

  printSeparator("Deploy Premium Staking Product");
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
  const minStakeAmount = ethers.parseEther(PREMIUM_STAKING_CONFIG.minStakeAmount);
  const rewardRate = PREMIUM_STAKING_CONFIG.rewardRate;
  const whitelistMode = PREMIUM_STAKING_CONFIG.whitelistMode;  // true for Premium Staking
  const maxTotalStaked = ethers.parseEther(PREMIUM_STAKING_CONFIG.maxTotalStaked);
  
  // Read Unix timestamps from environment variables
  const stakeStartTimeStr = process.env.STAKE_START_TIME;
  const stakeEndTimeStr = process.env.STAKE_END_TIME;
  
  if (!stakeStartTimeStr) {
    throw new Error(
      "Please provide stake start time (Unix timestamp):\n" +
      "Method 1: STAKE_START_TIME=\"1735689600\" npm run deploy:premium:testnet\n" +
      "Method 2: Set STAKE_START_TIME=1735689600 in .env file\n\n" +
      "Tip: You can use online tools to convert date to Unix timestamp, e.g.:\n" +
      "  - https://www.epochconverter.com/\n" +
      "  - Or use command: date +%s"
    );
  }
  
  if (!stakeEndTimeStr) {
    throw new Error(
      "Please provide stake end time (Unix timestamp):\n" +
      "Method 1: STAKE_END_TIME=\"1735689600\" npm run deploy:premium:testnet\n" +
      "Method 2: Set STAKE_END_TIME=1735689600 in .env file\n\n" +
      "Tip: You can use online tools to convert date to Unix timestamp, e.g.:\n" +
      "  - https://www.epochconverter.com/\n" +
      "  - Or use command: date +%s"
    );
  }
  
  const stakeStartTime = parseInt(stakeStartTimeStr);
  const stakeEndTime = parseInt(stakeEndTimeStr);
  
  if (isNaN(stakeStartTime) || stakeStartTime <= 0) {
    throw new Error(`Invalid start timestamp: ${stakeStartTimeStr}, please provide a valid Unix timestamp (seconds)`);
  }
  
  if (isNaN(stakeEndTime) || stakeEndTime <= 0) {
    throw new Error(`Invalid end timestamp: ${stakeEndTimeStr}, please provide a valid Unix timestamp (seconds)`);
  }
  
  if (stakeEndTime <= stakeStartTime) {
    throw new Error("End time must be later than start time");
  }

  console.log("\nInitialization parameters:");
  console.log(`  - Min stake amount: ${ethers.formatEther(minStakeAmount)} HSK`);
  console.log(`  - APY: ${rewardRate / 100}%`);
  console.log(`  - Max total staked: ${ethers.formatEther(maxTotalStaked)} HSK`);
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
    whitelistMode,  // true - whitelist enabled, only whitelisted users can stake
    maxTotalStaked, // Maximum total staked amount (20 million HSK)
  ]);

  // 4. Deploy Transparent Proxy contract
  console.log("\nDeploying PremiumStakingProxy (Transparent Proxy)...");
  const PremiumStakingProxy = await ethers.getContractFactory("PremiumStakingProxy");
  
  const proxy = await PremiumStakingProxy.deploy(
    implementationAddress,  // Implementation contract address
    deployer.address,       // ProxyAdmin address
    initData                // Initialization data
  );
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  
  printSuccess(`PremiumStakingProxy deployed: ${proxyAddress}`);

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
  
  printSeparator("✅ Premium Staking Product Deployment Complete");
  console.log("\nProduct configuration:");
  console.log(`  - Product type: ${PREMIUM_STAKING_CONFIG.productName}`);
  console.log(`  - Target users: ${PREMIUM_STAKING_CONFIG.targetUsers}`);
  console.log(`  - Min stake: ${PREMIUM_STAKING_CONFIG.minStakeAmount} HSK`);
  console.log(`  - APY: ${PREMIUM_STAKING_CONFIG.rewardRate / 100}%`);
  console.log(`  - Lock period: 365 days (fixed)`);
  console.log(`  - Whitelist mode: ${PREMIUM_STAKING_CONFIG.whitelistMode ? "Enabled" : "Disabled"}`);

  printWarning("Next steps:");
  console.log("  1. Use scripts/premium/whitelist/add-batch.ts to add users to whitelist");
  console.log("  2. Use scripts/premium/add-rewards.ts to fund the reward pool");
  console.log("  3. Use scripts/premium/query/check-status.ts to check contract status");
  console.log("  4. Whitelisted users can start staking after stake start time");
  
  // Save deployment information
  console.log("\nPlease save the following address to scripts/shared/constants.ts:");
  console.log(`premiumStaking: "${proxyAddress}",`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

