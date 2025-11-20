import { ethers } from "ethers";

/**
 * Staking product type
 */
export enum StakingType {
  NORMAL = "normal",
  PREMIUM = "premium",
}

/**
 * Staking position information (corresponds to contract Position struct)
 * Note:
 * - Lock period is fixed at 365 days (LOCK_PERIOD constant), not stored in Position
 * - Reward rate is configured at contract level (rewardRate state variable), shared by all positions
 */
export interface StakingPosition {
  positionId: bigint;
  owner: string;
  amount: bigint;
  stakedAt: bigint;
  lastRewardAt: bigint;  // Last reward claim time
  isUnstaked: boolean;
}

/**
 * Contract status information
 */
export interface ContractStatus {
  isPaused: boolean;
  emergencyMode: boolean;
  onlyWhitelistCanStake: boolean;  // Whitelist mode
  totalStaked: bigint;
  totalPendingRewards: bigint;
  rewardPoolBalance: bigint;
  minStakeAmount: bigint;
  rewardRate: bigint;               // basis points (800 = 8%, 1600 = 16%)
  stakeStartTime: bigint;
  stakeEndTime: bigint;
  nextPositionId: bigint;
}

/**
 * Deployment configuration
 */
export interface DeployConfig {
  minStakeAmount: string;       // HSK amount (string format, e.g. "1" or "500000")
  rewardRate: number;            // APY (basis points, e.g. 800 = 8%)
  stakingType: StakingType;
  stakeStartOffset?: number;     // Stake start time offset (seconds, default 7 days)
  stakeEndOffset?: number;       // Stake end time offset (seconds, default 1 year)
}

/**
 * Script execution result
 */
export interface ScriptResult {
  success: boolean;
  message: string;
  data?: any;
  error?: Error;
  txHash?: string;              // Transaction hash
}

/**
 * Query user staking information result
 */
export interface UserStakeInfo {
  userAddress: string;
  totalPositions: number;
  activePositions: number;
  totalStakedAmount: bigint;
  totalPendingRewards: bigint;
  positions: StakingPosition[];
}

/**
 * Reward pool information
 */
export interface RewardPoolInfo {
  balance: bigint;
  totalPendingRewards: bigint;
  availableRewards: bigint;      // balance - totalPendingRewards
  utilizationRate: number;       // totalPendingRewards / balance * 100
}
