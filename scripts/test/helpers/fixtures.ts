import hre from "hardhat";
import { NORMAL_STAKING_CONFIG, PREMIUM_STAKING_CONFIG } from "../../shared/constants.js";

const { ethers } = hre;

/**
 * Test fixtures and helpers for staking contract tests
 * 
 * This file provides reusable fixtures and helper functions for testing
 */

export interface TestFixture {
  deployer: ethers.Signer;
  user1: ethers.Signer;
  user2: ethers.Signer;
  admin: ethers.Signer;
  normalStaking: ethers.Contract;
  premiumStaking: ethers.Contract;
}

/**
 * Get signers for testing
 */
export async function getTestSigners(): Promise<{
  deployer: ethers.Signer;
  user1: ethers.Signer;
  user2: ethers.Signer;
  admin: ethers.Signer;
}> {
  const provider = ethers.provider;
  const signers = await provider.listAccounts();
  
  return {
    deployer: await ethers.getSigner(signers[0]),
    user1: await ethers.getSigner(signers[1]),
    user2: await ethers.getSigner(signers[2]),
    admin: await ethers.getSigner(signers[0]), // Same as deployer
  };
}

/**
 * Deploy test contracts
 */
export async function deployTestContracts(): Promise<{
  normalStaking: ethers.Contract;
  premiumStaking: ethers.Contract;
  normalImplementation: ethers.Contract;
  premiumImplementation: ethers.Contract;
}> {
  const [deployer] = await ethers.getSigners();
  const now = Math.floor(Date.now() / 1000);
  
  // Deploy implementations
  const HSKStaking = await ethers.getContractFactory("HSKStaking");
  const normalImpl = await HSKStaking.deploy();
  const premiumImpl = await HSKStaking.deploy();
  
  await normalImpl.waitForDeployment();
  await premiumImpl.waitForDeployment();
  
  const normalImplAddress = await normalImpl.getAddress();
  const premiumImplAddress = await premiumImpl.getAddress();
  
  // Prepare initialization data
  const normalMinStake = ethers.parseEther(NORMAL_STAKING_CONFIG.minStakeAmount);
  const premiumMinStake = ethers.parseEther(PREMIUM_STAKING_CONFIG.minStakeAmount);
  
  const normalInitData = normalImpl.interface.encodeFunctionData("initialize", [
    normalMinStake,
    NORMAL_STAKING_CONFIG.rewardRate,
    now + 86400, // Start in 1 day
    now + 365 * 86400, // End in 1 year
    false, // Whitelist disabled
  ]);
  
  const premiumInitData = premiumImpl.interface.encodeFunctionData("initialize", [
    premiumMinStake,
    PREMIUM_STAKING_CONFIG.rewardRate,
    now + 86400, // Start in 1 day
    now + 365 * 86400, // End in 1 year
    true, // Whitelist enabled
  ]);
  
  // Deploy proxies
  const NormalProxy = await ethers.getContractFactory("NormalStakingProxy");
  const PremiumProxy = await ethers.getContractFactory("PremiumStakingProxy");
  
  const normalProxy = await NormalProxy.deploy(
    normalImplAddress,
    deployer.address,
    normalInitData
  );
  
  const premiumProxy = await PremiumProxy.deploy(
    premiumImplAddress,
    deployer.address,
    premiumInitData
  );
  
  await normalProxy.waitForDeployment();
  await premiumProxy.waitForDeployment();
  
  const normalProxyAddress = await normalProxy.getAddress();
  const premiumProxyAddress = await premiumProxy.getAddress();
  
  // Connect to contracts through proxy
  const normalStaking = HSKStaking.attach(normalProxyAddress);
  const premiumStaking = HSKStaking.attach(premiumProxyAddress);
  
  return {
    normalStaking,
    premiumStaking,
    normalImplementation: normalImpl,
    premiumImplementation: premiumImpl,
  };
}

/**
 * Create a complete test fixture
 */
export async function createTestFixture(): Promise<TestFixture> {
  const signers = await getTestSigners();
  const contracts = await deployTestContracts();
  
  return {
    ...signers,
    normalStaking: contracts.normalStaking,
    premiumStaking: contracts.premiumStaking,
  };
}

/**
 * Helper to fund accounts with test tokens
 */
export async function fundAccount(
  account: ethers.Signer,
  amount: bigint
): Promise<void> {
  const [deployer] = await ethers.getSigners();
  await deployer.sendTransaction({
    to: await account.getAddress(),
    value: amount,
  });
}

/**
 * Helper to advance time in tests
 */
export async function advanceTime(seconds: number): Promise<void> {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

/**
 * Helper to get current block timestamp
 */
export async function getCurrentTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block?.timestamp || 0;
}

/**
 * Helper to mine blocks
 */
export async function mineBlocks(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await ethers.provider.send("evm_mine", []);
  }
}

