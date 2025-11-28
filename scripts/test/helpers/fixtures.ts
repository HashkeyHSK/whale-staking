import hre from "hardhat";
import { STAKING_CONFIG } from "../../shared/constants.js";

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
  staking: ethers.Contract;
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
  staking: ethers.Contract;
  implementation: ethers.Contract;
}> {
  const [deployer] = await ethers.getSigners();
  const now = Math.floor(Date.now() / 1000);
  
  // Deploy PenaltyPool first
  const PenaltyPool = await ethers.getContractFactory("PenaltyPool");
  const penaltyPool = await PenaltyPool.deploy();
  await penaltyPool.waitForDeployment();
  const penaltyPoolAddress = await penaltyPool.getAddress();
  
  // Deploy implementation
  const HSKStaking = await ethers.getContractFactory("HSKStaking");
  const impl = await HSKStaking.deploy();
  
  await impl.waitForDeployment();
  
  const implAddress = await impl.getAddress();
  
  // Prepare initialization data
  const minStake = ethers.parseEther(STAKING_CONFIG.minStakeAmount);
  const maxTotalStaked = ethers.parseEther(STAKING_CONFIG.maxTotalStaked);
  
  const initData = impl.interface.encodeFunctionData("initialize", [
    minStake,
    STAKING_CONFIG.rewardRate,
    now + 86400, // Start in 1 day
    now + 365 * 86400, // End in 1 year
    STAKING_CONFIG.whitelistMode, // Whitelist mode from config
    maxTotalStaked, // Max total staked (30 million HSK)
    penaltyPoolAddress, // Penalty pool contract address
  ]);
  
  // Deploy proxy
  const StakingProxy = await ethers.getContractFactory("StakingProxy");
  
  const proxy = await StakingProxy.deploy(
    implAddress,
    deployer.address,
    initData
  );
  
  await proxy.waitForDeployment();
  
  const proxyAddress = await proxy.getAddress();
  
  // Initialize PenaltyPool with Staking contract address
  const penaltyPoolInitTx = await penaltyPool.initialize(
    deployer.address,      // Owner
    proxyAddress          // Authorized depositor (Staking contract)
  );
  await penaltyPoolInitTx.wait();
  
  // Connect to contract through proxy
  const staking = HSKStaking.attach(proxyAddress);
  
  return {
    staking,
    implementation: impl,
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
    staking: contracts.staking,
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

