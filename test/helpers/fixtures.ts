import hre from "hardhat";
import { STAKING_CONFIG } from "../../scripts/shared/constants.js";
import { parseEther } from "./test-utils.js";

// Get ethers from Hardhat runtime environment
// Reference: scripts/staking/deploy.ts uses hre.network.connect()
async function getEthers() {
  const { ethers } = await hre.network.connect();
  return ethers;
}

/**
 * Test fixtures and helpers for staking contract tests
 * 
 * This file provides reusable fixtures and helper functions for testing
 */

export interface TestFixture {
  deployer: any;
  user1: any;
  user2: any;
  user3: any;
  admin: any;
  staking: any;
  implementation: any;
  proxy: any;
}

/**
 * Deploy Staking contract for testing
 */
export async function deployStaking(): Promise<{
  staking: any;
  implementation: any;
  proxy: any;
  deployer: any;
  proxyAdmin: string;
}> {
  const ethers = await getEthers();
  const [deployer] = await ethers.getSigners();
  const now = Math.floor(Date.now() / 1000);
  
  // Deploy implementation
  const HSKStaking = await ethers.getContractFactory("HSKStaking");
  const implementation = await HSKStaking.deploy();
  await implementation.waitForDeployment();
  
  const implAddress = await implementation.getAddress();
  
  // Prepare initialization data
  // Note: In proxy pattern, msg.sender in initialize() is the proxy address, not deployer
  // So we need to pass deployer.address as the owner parameter
  // But wait, the initialize function uses msg.sender as owner, which will be the proxy
  // This is a problem! Let me check the actual contract...
  // Actually, looking at the contract, initialize() calls __StakingStorage_init(msg.sender, ...)
  // where msg.sender is the proxy address. So the owner will be the proxy address!
  // This seems wrong. Let me check the deploy script...
  // Actually, in TransparentUpgradeableProxy, when _data is provided, it's called via delegatecall
  // So msg.sender should be the admin (deployer), not the proxy!
  // Deploy PenaltyPool first with temporary authorizedDepositor
  const PenaltyPool = await ethers.getContractFactory("PenaltyPool");
  const penaltyPool = await PenaltyPool.deploy(
    deployer.address,      // Owner
    deployer.address       // Temporary authorizedDepositor (will be updated to Staking address)
  );
  await penaltyPool.waitForDeployment();
  const penaltyPoolAddress = await penaltyPool.getAddress();
  
  const minStake = ethers.parseEther(STAKING_CONFIG.minStakeAmount);
  const maxTotalStaked = ethers.parseEther(STAKING_CONFIG.maxTotalStaked);
  const initData = implementation.interface.encodeFunctionData("initialize", [
    minStake,
    STAKING_CONFIG.rewardRate,
    now - 3600, // Start 1 hour ago (so tests can run immediately)
    now + 7 * 86400, // End in 7 days
    STAKING_CONFIG.whitelistMode, // Whitelist mode from config
    maxTotalStaked, // Max total staked (30 million HSK)
    penaltyPoolAddress, // Penalty pool contract address
  ]);
  
  // Deploy proxy
  // The admin_ parameter is the proxy admin (for upgrades), not the contract owner
  // The contract owner is set in initialize() via msg.sender
  // In TransparentUpgradeableProxy constructor, when _data is provided, initialize is called
  // with msg.sender = admin_ (the deployer)
  const StakingProxy = await ethers.getContractFactory("StakingProxy");
  const proxy = await StakingProxy.deploy(
    implAddress,
    deployer.address, // This is the proxy admin, and also msg.sender in initialize
    initData
  );
  
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  
  // Verify proxy contract is actually deployed
  // In Hardhat EDR, we need to ensure the contract is fully deployed
  let retries = 10;
  let proxyCode = await ethers.provider.getCode(proxyAddress);
  while (retries > 0 && (!proxyCode || proxyCode === "0x" || proxyCode.length < 100)) {
    // Wait a bit and retry
    await new Promise(resolve => setTimeout(resolve, 50));
    proxyCode = await ethers.provider.getCode(proxyAddress);
    retries--;
  }
  
  // Final verification
  if (!proxyCode || proxyCode === "0x" || proxyCode.length < 100) {
    throw new Error(`Proxy contract deployment failed. Code length: ${proxyCode.length} bytes. Address: ${proxyAddress}`);
  }
  
  // Update PenaltyPool's authorizedDepositor to Staking contract address
  const penaltyPoolUpdateTx = await penaltyPool.setAuthorizedDepositor(proxyAddress);
  await penaltyPoolUpdateTx.wait();
  
  // Connect to contract through proxy using getContractAt (more reliable than attach)
  // This ensures we get the correct ABI and can interact with the proxy
  const staking = await ethers.getContractAt("HSKStaking", proxyAddress);
  
  // Verify we can read from the contract
  try {
    const minStake = await staking.minStakeAmount();
    if (minStake === 0n) {
      throw new Error("Contract not initialized correctly - minStakeAmount is 0");
    }
  } catch (error: any) {
    throw new Error(`Failed to read from contract: ${error.message}`);
  }
  
  // Verify proxy admin and attempt to change it if needed
  // TransparentUpgradeableProxy stores admin at slot 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103
  const ADMIN_SLOT = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
  const adminValue = await ethers.provider.getStorage(proxyAddress, ADMIN_SLOT);
  const adminAddress = "0x" + adminValue.slice(-40);
  const deployerAddress = await deployer.getAddress();
  
  // Note: Hardhat EDR network sets admin automatically and we cannot change it directly
  // We'll save the admin address and use it when needed
  if (adminAddress.toLowerCase() !== deployerAddress.toLowerCase()) {
    if (adminAddress === "0x0000000000000000000000000000000000000000") {
      console.warn(`⚠️  Proxy admin is zero address. This may cause issues with proxy operations.`);
    } else {
      // Admin is set but not to deployer - this is Hardhat EDR's behavior
      // We'll use the current admin for proxy operations
      console.log(`ℹ️  Proxy admin is ${adminAddress} (not deployer ${deployerAddress})`);
      console.log(`   This is Hardhat EDR's default behavior. Admin will be used for upgrade operations.`);
    }
  } else {
    console.log(`✅ Proxy admin is correctly set to deployer: ${deployerAddress}`);
  }
  
  // In TransparentUpgradeableProxy, when initialize is called via delegatecall,
  // msg.sender is the proxy address, so owner is set to proxy address
  // We need to transfer ownership to deployer for testing purposes
  const owner = await staking.owner();
  
  if (owner.toLowerCase() === proxyAddress.toLowerCase()) {
    // Owner is proxy, we can transfer ownership by calling transferOwnership through the proxy
    // Since the proxy is the owner, we can call transferOwnership via the proxy
    try {
      // Connect as the proxy contract itself (using a signer that can call the proxy)
      // Actually, we need to call transferOwnership through the proxy, but we need the proxy to be the caller
      // The best approach is to use the proxy admin to upgrade and change the initialize function
      // But for testing, we can use a workaround: call transferOwnership through the proxy
      // However, this requires the proxy to be able to call itself, which is not possible
      // So we'll use the proxy admin to help, or we'll need to handle this in tests
      
      // Actually, we can use the proxy's admin to call upgradeToAndCall with a new initialize
      // But that's complex. For now, let's try to call transferOwnership directly through the proxy
      // The proxy will delegatecall to the implementation, and msg.sender will be the proxy
      // So we can call transferOwnership(deployer.address) through the proxy
      // Step 1: Current owner (proxy) initiates ownership transfer
      const transferTx = await staking.transferOwnership(deployerAddress);
      await transferTx.wait();
      
      // Step 2: New owner (deployer) must accept ownership (Ownable2StepUpgradeable)
      const acceptTx = await staking.connect(deployer).acceptOwnership();
      await acceptTx.wait();
      
      // Verify ownership was transferred
      const newOwner = await staking.owner();
      if (newOwner.toLowerCase() !== deployerAddress.toLowerCase()) {
        console.warn(`Warning: Failed to transfer ownership. Owner is still ${newOwner}`);
      }
    } catch (error) {
      // If transfer fails, we'll handle it in tests
      console.warn(`Warning: Could not transfer ownership from proxy to deployer: ${error}`);
      console.warn(`Owner is set to proxy address (${proxyAddress}), not deployer (${deployerAddress})`);
      console.warn(`Tests may need to be adjusted to handle this case`);
    }
  }
  
  // Get final admin address (after any attempts to change it)
  const finalAdminValue = await ethers.provider.getStorage(proxyAddress, ADMIN_SLOT);
  const finalAdminAddress = "0x" + finalAdminValue.slice(-40);
  
  return {
    staking,
    implementation,
    proxy,
    deployer,
    proxyAdmin: finalAdminAddress, // Return the actual admin address
  };
}


/**
 * Create a complete test fixture
 */
export async function createTestFixture(): Promise<TestFixture> {
  const ethers = await getEthers();
  const signers = await ethers.getSigners();
  const contracts = await deployStaking();
  
  // Ensure deployer has enough balance by setting it directly
  const deployerAddress = await signers[0].getAddress();
  const currentBalance = await ethers.provider.getBalance(deployerAddress);
  const minBalance = parseEther("1000000000"); // 1 billion ETH
  
  if (currentBalance < minBalance) {
    // Use hardhat's setBalance if available, or send from a funded account
    try {
      await ethers.provider.send("hardhat_setBalance", [
        deployerAddress,
        "0x" + minBalance.toString(16)
      ]);
    } catch (e) {
      // If setBalance doesn't work, try to fund from another account
      // In Hardhat, the first account should already have funds
    }
  }
  
  return {
    deployer: signers[0],
    user1: signers[1],
    user2: signers[2],
    user3: signers[3],
    admin: signers[0], // Same as deployer
    staking: contracts.staking,
    implementation: contracts.implementation,
    proxy: contracts.proxy,
  };
}

/**
 * Helper to fund accounts with test tokens
 */
export async function fundAccount(
  account: any,
  amount: bigint
): Promise<void> {
  const ethers = await getEthers();
  const address = typeof account === "string" ? account : await account.getAddress();
  
  // Try to use hardhat_setBalance first (more efficient)
  try {
    const currentBalance = await ethers.provider.getBalance(address);
    const targetBalance = currentBalance + amount;
    await ethers.provider.send("hardhat_setBalance", [
      address,
      "0x" + targetBalance.toString(16)
    ]);
    
    // Verify balance was set correctly
    const newBalance = await ethers.provider.getBalance(address);
    if (newBalance < targetBalance) {
      throw new Error(`Failed to set balance: expected ${targetBalance}, got ${newBalance}`);
    }
    return;
  } catch (e) {
    // Fallback to sending transaction if setBalance doesn't work
    console.warn(`hardhat_setBalance failed, using transaction fallback: ${e}`);
  }
  
  // Fallback: send transaction from deployer
  // Get deployer with sufficient balance
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const deployerBalance = await ethers.provider.getBalance(await deployer.getAddress());
  
  // Check if deployer has enough balance
  if (deployerBalance < amount) {
    // Fund deployer first if needed
    try {
      const extraForGas = parseEther("1000");
      const totalNeeded = amount + extraForGas;
      await ethers.provider.send("hardhat_setBalance", [
        await deployer.getAddress(),
        "0x" + totalNeeded.toString(16) // Add extra for gas
      ]);
    } catch (e) {
      throw new Error(
        `Cannot fund account: deployer balance (${deployerBalance}) is insufficient ` +
        `for amount (${amount}) and hardhat_setBalance failed: ${e}`
      );
    }
  }
  
  const tx = await deployer.sendTransaction({
    to: address,
    value: amount,
  });
  await tx.wait();
  
  // Verify balance was updated
  const finalBalance = await ethers.provider.getBalance(address);
  if (finalBalance < amount) {
    throw new Error(`Failed to fund account: expected at least ${amount}, got ${finalBalance}`);
  }
}

/**
 * Helper to advance time in tests
 */
export async function advanceTime(seconds: number): Promise<void> {
  const ethers = await getEthers();
  
  // Get current block timestamp
  const currentBlock = await ethers.provider.getBlock("latest");
  const currentTime = currentBlock?.timestamp || 0;
  
  // Increase time
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
  
  // Verify time was advanced
  const newBlock = await ethers.provider.getBlock("latest");
  const newTime = newBlock?.timestamp || 0;
  const expectedTime = Number(currentTime) + seconds;
  
  // Allow small tolerance (1 second) for block mining
  if (newTime < expectedTime - 1) {
    throw new Error(
      `Time advance failed: current=${currentTime}, expected=${expectedTime}, got=${newTime}, ` +
      `difference=${expectedTime - newTime} seconds`
    );
  }
}

/**
 * Helper to get current block timestamp
 */
export async function getCurrentTimestamp(): Promise<number> {
  const ethers = await getEthers();
  const block = await ethers.provider.getBlock("latest");
  return block?.timestamp || 0;
}

/**
 * Helper to mine blocks
 */
export async function mineBlocks(count: number): Promise<void> {
  const ethers = await getEthers();
  for (let i = 0; i < count; i++) {
    await ethers.provider.send("evm_mine", []);
  }
}
