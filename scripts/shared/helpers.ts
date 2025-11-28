import { getAddresses } from "./constants.js";

/**
 * Get staking contract address
 * @param network - Network name
 */
export function getStakingAddress(network: string): string {
  const addresses = getAddresses(network);
  const address = addresses.staking;
  
  if (!address || address === "") {
    throw new Error(
      `Staking address not configured for network: ${network}.\n\n` +
      `Solutions (choose one):\n` +
      `1. Set environment variable: STAKING_ADDRESS=0x... npm run rewards:add:testnet\n` +
      `2. Add to .env file: STAKING_ADDRESS=0x...\n` +
      `3. Update ${network.toUpperCase()}_ADDRESSES in scripts/shared/constants.ts\n\n` +
      `Example:\n` +
      `  STAKING_ADDRESS="0x123..." npm run rewards:add:testnet`
    );
  }
  
  return address;
}

/**
 * Format staking position information
 * Note: Lock period and reward rate are configured at contract level, not in individual positions
 */
export function formatStakingPosition(position: any, ethers: any) {
  return {
    positionId: position.positionId.toString(),
    amount: ethers.formatEther(position.amount),
    stakedAt: new Date(Number(position.stakedAt) * 1000).toLocaleString(),
    lastRewardAt: new Date(Number(position.lastRewardAt) * 1000).toLocaleString(),
    isUnstaked: position.isUnstaked,
  };
}

/**
 * Format contract status
 */
export function formatContractStatus(status: any, ethers: any) {
  return {
    isPaused: status.isPaused,
    emergencyMode: status.emergencyMode,
    onlyWhitelistCanStake: status.onlyWhitelistCanStake,
    totalStaked: ethers.formatEther(status.totalStaked),
    totalPendingRewards: ethers.formatEther(status.totalPendingRewards),
    rewardPoolBalance: ethers.formatEther(status.rewardPoolBalance),
    minStakeAmount: ethers.formatEther(status.minStakeAmount),
    rewardRate: `${Number(status.rewardRate) / 100}%`,  // basis points to percentage
    stakeStartTime: new Date(Number(status.stakeStartTime) * 1000).toLocaleString(),
    stakeEndTime: new Date(Number(status.stakeEndTime) * 1000).toLocaleString(),
    nextPositionId: status.nextPositionId.toString(),
  };
}

/**
 * Print separator line
 */
export function printSeparator(title?: string) {
  console.log("\n" + "=".repeat(50));
  if (title) {
    console.log(title);
    console.log("=".repeat(50));
  }
}

/**
 * Print success message
 */
export function printSuccess(message: string) {
  console.log(`✅ ${message}`);
}

/**
 * Print warning message
 */
export function printWarning(message: string) {
  console.log(`⚠️  ${message}`);
}

/**
 * Print error message
 */
export function printError(message: string) {
  console.error(`❌ ${message}`);
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(tx: any, description: string = "Transaction") {
  console.log(`${description} hash:`, tx.hash);
  console.log("Waiting for transaction confirmation...");
  const receipt = await tx.wait();
  console.log("Transaction confirmed, block number:", receipt?.blockNumber);
  return receipt;
}

/**
 * Parse Position struct from contract
 * Handles cases where the returned struct may be an array or object
 * 
 * @param position - Position read from contract (may be array or object)
 * @returns Standardized Position object
 */
export function parsePosition(position: any): {
  positionId: bigint;
  owner: string;
  amount: bigint;
  stakedAt: bigint;
  lastRewardAt: bigint;
  isUnstaked: boolean;
  isCompletedStake?: boolean;
} {
  // Position struct: [positionId, owner, amount, stakedAt, lastRewardAt, isUnstaked, isCompletedStake]
  let positionId: bigint;
  let owner: string;
  let amount: bigint;
  let stakedAt: bigint;
  let lastRewardAt: bigint;
  let isUnstaked: boolean;
  let isCompletedStake: boolean | undefined;
  
  if (Array.isArray(position)) {
    // If array, destructure in order
    [positionId, owner, amount, stakedAt, lastRewardAt, isUnstaked, isCompletedStake] = position;
  } else {
    // If object, use directly
    positionId = position.positionId;
    owner = position.owner;
    amount = position.amount;
    stakedAt = position.stakedAt;
    lastRewardAt = position.lastRewardAt;
    isUnstaked = position.isUnstaked;
    isCompletedStake = position.isCompletedStake;
  }
  
  // Validate required fields
  if (!owner || amount === null || amount === undefined) {
    throw new Error("Invalid Position: missing required fields");
  }
  
  return {
    positionId: positionId || BigInt(0),
    owner,
    amount,
    stakedAt,
    lastRewardAt,
    isUnstaked,
    isCompletedStake
  };
}
