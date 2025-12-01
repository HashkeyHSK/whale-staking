/**
 * Shared validation functions for staking scripts
 * Provides consistent validation logic across all scripts
 */

import { parsePosition } from "./helpers.js";

export interface PositionInfo {
  owner: string;
  amount: bigint;
  stakedAt: bigint;
  lastRewardAt: bigint;
  isUnstaked: boolean;
  isCompletedStake: boolean;
}

export interface EarlyUnstakeInfo {
  requestTime: bigint;
  canComplete: boolean;
  completeTime: number;
  remainingSeconds: number;
}

/**
 * Validate that a position exists and belongs to the user
 */
export async function validatePosition(
  staking: any,
  positionId: string | bigint,
  userAddress: string
): Promise<PositionInfo> {
  const positionRaw = await staking.positions(positionId);
  const position = parsePosition(positionRaw);
  
  if (position.owner === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Position ${positionId} does not exist`);
  }
  
  if (position.owner.toLowerCase() !== userAddress.toLowerCase()) {
    throw new Error("This position does not belong to the current user");
  }
  
  if (position.isUnstaked) {
    throw new Error("This position has already been unstaked");
  }
  
  return position;
}

/**
 * Validate early unstake request status
 */
export async function validateEarlyUnstakeRequest(
  staking: any,
  positionId: string | bigint
): Promise<EarlyUnstakeInfo> {
  const requestTime = await staking.earlyUnstakeRequestTime(positionId);
  
  if (requestTime === BigInt(0)) {
    throw new Error(
      "Early unstake not requested for this position.\n" +
      "Please request first using: npm run request-early-unstake:testnet"
    );
  }
  
  const EARLY_UNLOCK_PERIOD = 7 * 24 * 60 * 60; // 7 days
  const completeTime = Number(requestTime) + EARLY_UNLOCK_PERIOD;
  const now = Math.floor(Date.now() / 1000);
  const remainingSeconds = Math.max(0, completeTime - now);
  const canComplete = now >= completeTime;
  
  return {
    requestTime,
    canComplete,
    completeTime,
    remainingSeconds,
  };
}

/**
 * Validate lock period has not ended
 */
export async function validateLockPeriodNotEnded(
  position: PositionInfo
): Promise<void> {
  const LOCK_PERIOD = 365 * 24 * 60 * 60; // 365 days
  const lockEndTime = Number(position.stakedAt) + LOCK_PERIOD;
  const now = Math.floor(Date.now() / 1000);
  
  if (now >= lockEndTime) {
    throw new Error(
      `Lock period has ended. Use normal unstake instead:\n` +
      `npm run unstake:testnet`
    );
  }
}

/**
 * Validate timestamp format and value
 */
export function validateTimestamp(
  timestamp: string,
  name: string
): number {
  const parsed = parseInt(timestamp);
  
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid ${name} timestamp: ${timestamp}\n` +
      `Please provide a valid Unix timestamp in seconds.\n` +
      `You can use: date +%s (for current time)`
    );
  }
  
  return parsed;
}

/**
 * Validate timestamp range
 */
export function validateTimestampRange(
  startTime: number,
  endTime: number
): void {
  if (endTime <= startTime) {
    throw new Error(
      `End time must be later than start time.\n` +
      `Start: ${new Date(startTime * 1000).toISOString()}\n` +
      `End: ${new Date(endTime * 1000).toISOString()}`
    );
  }
}

/**
 * Validate position IDs format
 */
export function parsePositionIds(positionIdsStr: string): bigint[] {
  const positionIds = positionIdsStr
    .split(",")
    .map(id => id.trim())
    .filter(id => id.length > 0);
  
  if (positionIds.length === 0) {
    throw new Error("No valid position IDs provided");
  }
  
  return positionIds.map(id => {
    const parsed = BigInt(id);
    if (parsed <= BigInt(0)) {
      throw new Error(`Invalid position ID: ${id}`);
    }
    return parsed;
  });
}

/**
 * Validate admin is contract owner
 */
export async function validateAdminIsOwner(
  staking: any,
  adminAddress: string
): Promise<void> {
  const owner = await staking.owner();
  if (owner.toLowerCase() !== adminAddress.toLowerCase()) {
    throw new Error("Only contract owner can perform this operation");
  }
}

/**
 * Validate staking period has ended
 */
export async function validateStakingPeriodEnded(
  staking: any
): Promise<void> {
  const stakeEndTime = await staking.stakeEndTime();
  const now = Math.floor(Date.now() / 1000);
  
  if (now < Number(stakeEndTime)) {
    throw new Error(
      `Staking period not ended yet.\n` +
      `End time: ${new Date(Number(stakeEndTime) * 1000).toLocaleString()}\n` +
      `Current time: ${new Date(now * 1000).toLocaleString()}`
    );
  }
}

/**
 * Validate penalty pool has balance
 */
export async function validatePenaltyPoolHasBalance(
  staking: any
): Promise<bigint> {
  const penaltyPoolBalance = await staking.penaltyPoolBalance();
  
  if (penaltyPoolBalance === BigInt(0)) {
    throw new Error("Penalty pool is empty, nothing to distribute");
  }
  
  return penaltyPoolBalance;
}


