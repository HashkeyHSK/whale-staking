import hre from "hardhat";
import { STAKING_CONFIG } from "../shared/constants.js";
import { printSeparator, printSuccess, printWarning } from "../shared/helpers.js";
import { validateTimestamp, validateTimestampRange } from "../shared/validations.js";

/**
 * Deploy Staking product
 * - Min stake: 1 HSK
 * - APY: 5%
 * - For regular users
 * 
 * Environment variables:
 * - STAKE_START_TIME: Unix timestamp for stake start time (required, seconds)
 * - STAKE_END_TIME: Unix timestamp for stake end time (required, seconds)
 * 
 * Example:
 * STAKE_START_TIME="1735689600" STAKE_END_TIME="1767225600" npm run deploy:testnet
 */
async function main() {
  const { ethers } = await hre.network.connect();
  const [deployer] = await ethers.getSigners();

  printSeparator("Deploy Staking Product");
  console.log("Deployer address:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "HSK");

  // 1. Deploy PenaltyPool implementation contract
  console.log("\nDeploying PenaltyPool implementation contract...");
  const PenaltyPool = await ethers.getContractFactory("PenaltyPool");
  const penaltyPoolImpl = await PenaltyPool.deploy();
  await penaltyPoolImpl.waitForDeployment();
  const penaltyPoolImplAddress = await penaltyPoolImpl.getAddress();
  printSuccess(`PenaltyPool implementation deployed: ${penaltyPoolImplAddress}`);

  // 2. Deploy PenaltyPool proxy (we'll initialize it after Staking is deployed)
  console.log("\nDeploying PenaltyPoolProxy...");
  const PenaltyPoolProxy = await ethers.getContractFactory("PenaltyPoolProxy");
  // Deploy proxy without init data - we'll initialize it after Staking is deployed
  // Use empty bytes for init data
  const emptyInitData = "0x";
  const penaltyPoolProxy = await PenaltyPoolProxy.deploy(
    penaltyPoolImplAddress,
    deployer.address,
    emptyInitData
  );
  await penaltyPoolProxy.waitForDeployment();
  const penaltyPoolProxyAddress = await penaltyPoolProxy.getAddress();
  printSuccess(`PenaltyPoolProxy deployed: ${penaltyPoolProxyAddress}`);

  // 3. Deploy HSKStaking implementation contract
  console.log("\nDeploying HSKStaking implementation contract...");
  const HSKStaking = await ethers.getContractFactory("HSKStaking");
  const implementation = await HSKStaking.deploy();
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();
  printSuccess(`HSKStaking implementation deployed: ${implementationAddress}`);

  // 4. Prepare initialization parameters
  const minStakeAmount = ethers.parseEther(STAKING_CONFIG.minStakeAmount);
  const rewardRate = STAKING_CONFIG.rewardRate;
  const whitelistMode = STAKING_CONFIG.whitelistMode;
  const maxTotalStaked = ethers.parseEther(STAKING_CONFIG.maxTotalStaked);
  
  // Read Unix timestamps from environment variables
  const stakeStartTimeStr = process.env.STAKE_START_TIME;
  const stakeEndTimeStr = process.env.STAKE_END_TIME;
  
  if (!stakeStartTimeStr) {
    throw new Error(
      "Please provide stake start time (Unix timestamp):\n" +
      "Method 1: STAKE_START_TIME=\"1735689600\" npm run deploy:testnet\n" +
      "Method 2: Set STAKE_START_TIME=1735689600 in .env file\n\n" +
      "Tip: You can use online tools to convert date to Unix timestamp, e.g.:\n" +
      "  - https://www.epochconverter.com/\n" +
      "  - Or use command: date +%s"
    );
  }
  
  if (!stakeEndTimeStr) {
    throw new Error(
      "Please provide stake end time (Unix timestamp):\n" +
      "Method 1: STAKE_END_TIME=\"1735689600\" npm run deploy:testnet\n" +
      "Method 2: Set STAKE_END_TIME=1735689600 in .env file\n\n" +
      "Tip: You can use online tools to convert date to Unix timestamp, e.g.:\n" +
      "  - https://www.epochconverter.com/\n" +
      "  - Or use command: date +%s"
    );
  }
  
  // Validate timestamps using shared validation functions
  const stakeStartTime = validateTimestamp(stakeStartTimeStr, "start");
  const stakeEndTime = validateTimestamp(stakeEndTimeStr, "end");
  validateTimestampRange(stakeStartTime, stakeEndTime);

  console.log("\nInitialization parameters:");
  console.log(`  - Min stake amount: ${ethers.formatEther(minStakeAmount)} HSK`);
  console.log(`  - APY: ${rewardRate / 100}%`);
  console.log(`  - Max total staked: ${ethers.formatEther(maxTotalStaked)} HSK`);
  console.log(`  - Stake start time: ${new Date(stakeStartTime * 1000).toISOString()}`);
  console.log(`  - Stake end time: ${new Date(stakeEndTime * 1000).toISOString()}`);
  console.log(`  - Lock period: 365 days (fixed)`);
  console.log(`  - Whitelist mode: ${whitelistMode ? "Enabled" : "Disabled"}`);

  // 5. Encode initialization data for HSKStaking
  const initData = implementation.interface.encodeFunctionData("initialize", [
    minStakeAmount,
    rewardRate,
    stakeStartTime,
    stakeEndTime,
    whitelistMode,  // false - whitelist disabled, everyone can stake
    maxTotalStaked, // Maximum total staked amount (30 million HSK)
    penaltyPoolProxyAddress, // Penalty pool contract address
  ]);

  // 6. Deploy Transparent Proxy contract
  console.log("\nDeploying StakingProxy (Transparent Proxy)...");
  const StakingProxy = await ethers.getContractFactory("StakingProxy");
  
  const proxy = await StakingProxy.deploy(
    implementationAddress,  // Implementation contract address
    deployer.address,       // ProxyAdmin address
    initData                // Initialization data
  );
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  
  printSuccess(`StakingProxy deployed: ${proxyAddress}`);

  // 7. Initialize PenaltyPool with Staking contract address as authorized depositor
  console.log("\nInitializing PenaltyPool...");
  const penaltyPool = PenaltyPool.attach(penaltyPoolProxyAddress);
  const initTx = await penaltyPool.initialize(
    deployer.address,      // Owner
    proxyAddress            // Authorized depositor (Staking contract)
  );
  await initTx.wait();
  printSuccess(`PenaltyPool initialized with Staking contract as authorized depositor`);
  
  // 8. Connect to HSKStaking contract through proxy for verification
  const staking = HSKStaking.attach(proxyAddress);

  // 9. Verify configuration
  printSeparator("Configuration Verification");
  const minStake = await staking.minStakeAmount();
  const startTime = await staking.stakeStartTime();
  const endTime = await staking.stakeEndTime();
  const whitelistModeCheck = await staking.onlyWhitelistCanStake();
  const rewardRateValue = await staking.rewardRate();
  const penaltyPoolAddress = await staking.penaltyPoolContract();

  console.log("Staking contract address:", proxyAddress);
  console.log("Staking implementation address:", implementationAddress);
  console.log("PenaltyPool proxy address:", penaltyPoolProxyAddress);
  console.log("PenaltyPool implementation address:", penaltyPoolImplAddress);
  console.log("Admin address:", deployer.address);
  console.log("Min stake amount:", ethers.formatEther(minStake), "HSK");
  console.log("APY:", Number(rewardRateValue) / 100, "%");
  console.log("Stake start time:", new Date(Number(startTime) * 1000).toISOString());
  console.log("Stake end time:", new Date(Number(endTime) * 1000).toISOString());
  console.log("Whitelist mode:", whitelistModeCheck ? "Enabled" : "Disabled");
  console.log("Penalty pool contract:", penaltyPoolAddress);
  
  printSeparator("✅ Staking Product Deployment Complete");
  console.log("\nProduct configuration:");
  console.log(`  - Product type: ${STAKING_CONFIG.productName}`);
  console.log(`  - Target users: ${STAKING_CONFIG.targetUsers}`);
  console.log(`  - Min stake: ${STAKING_CONFIG.minStakeAmount} HSK`);
  console.log(`  - APY: ${STAKING_CONFIG.rewardRate / 100}%`);
  console.log(`  - Max total staked: ${STAKING_CONFIG.maxTotalStaked} HSK`);
  console.log(`  - Lock period: 365 days (fixed)`);
  console.log(`  - Whitelist mode: ${STAKING_CONFIG.whitelistMode ? "Enabled" : "Disabled"}`);

  printWarning("Next steps:");
  console.log("  1. Use scripts/staking/add-rewards.ts to fund the reward pool");
  console.log("  2. Use scripts/staking/query/check-status.ts to check contract status");
  console.log("  3. Users can start staking after stake start time (no whitelist required)");
  
  // Check ownership and provide transfer instructions
  const contractOwner = await staking.owner();
  console.log("\n📋 Ownership Information:");
  console.log(`  Current contract owner: ${contractOwner}`);
  console.log(`  Proxy admin: ${deployer.address}`);
  
  if (contractOwner.toLowerCase() === proxyAddress.toLowerCase()) {
    printWarning("Note: Contract owner is set to proxy address");
    console.log("  To transfer ownership to deployer, use two-step process:");
    console.log("  Step 1: npm run config:transfer-ownership:testnet NEW_OWNER_ADDRESS=...");
    console.log("  Step 2: npm run config:accept-ownership:testnet");
  } else if (contractOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    printWarning("Note: Contract owner differs from deployer");
    console.log("  To transfer ownership to deployer, use two-step process:");
    console.log("  Step 1: npm run config:transfer-ownership:testnet NEW_OWNER_ADDRESS=...");
    console.log("  Step 2: npm run config:accept-ownership:testnet");
  } else {
    console.log("  ✅ Contract owner is already set to deployer");
  }
  
  // Save deployment information
  console.log("\nPlease save the following addresses to scripts/shared/constants.ts:");
  console.log(`staking: "${proxyAddress}",`);
  console.log(`penaltyPool: "${penaltyPoolProxyAddress}",`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
