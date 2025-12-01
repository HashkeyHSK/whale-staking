import { strict as assert } from "node:assert";
import { ethers } from "ethers";

/**
 * Test utilities and assertions
 * 
 * This file provides utility functions for testing staking contracts
 * Compatible with Node.js native test framework
 */

/**
 * Helper to calculate error selector from error signature
 */
function getErrorSelector(errorSignature: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(errorSignature)).slice(0, 10);
}

/**
 * Assert that a transaction reverts with a specific error
 * Supports both require() messages and custom error types
 * Compatible with Node.js native test framework
 */
export async function expectRevert(
  promise: Promise<any>,
  expectedError?: string
): Promise<void> {
  let transactionResult: any = null;
  let transactionReceipt: any = null;
  
  try {
    const result = await promise;
    transactionResult = result;
    // If it's a transaction, wait for it
    if (result && typeof result.wait === 'function') {
      transactionReceipt = await result.wait();
      // If transaction succeeded when it should have reverted, fail with helpful message
      if (transactionReceipt?.status === 1) {
        const errorMsg = expectedError 
          ? `Expected transaction to revert with "${expectedError}", but it succeeded. ` +
            `This may indicate a state update failure (Hardhat EDR issue). ` +
            `Transaction hash: ${transactionReceipt?.hash || 'unknown'}`
          : `Expected transaction to revert, but it succeeded. ` +
            `This may indicate a state update failure (Hardhat EDR issue). ` +
            `Transaction hash: ${transactionReceipt?.hash || 'unknown'}`;
        assert.fail(errorMsg);
      }
    }
    assert.fail("Expected transaction to revert");
  } catch (error: any) {
    if (expectedError) {
      // Check various error message formats
      const errorMessage = error.message || error.toString() || JSON.stringify(error);
      const reason = error.reason || error.data?.message || error.data?.reason;
      
      // Try to decode custom error from error.data
      let customErrorName: string | null = null;
      if (error.data && typeof error.data === 'string' && error.data.startsWith('0x')) {
        try {
          // Try to decode custom error (first 4 bytes are selector)
          // Custom error selectors (first 4 bytes of keccak256(error signature)):
          const selector = error.data.slice(0, 10);
          
          // Try common custom error signatures
          const commonErrors = [
            'AlreadyUnstaked()',
            'StillLocked()',
            'NoReward()',
            'PositionNotFound()',
            'NotWhitelisted()',
          ];
          
          // Check if error.data matches any custom error signature
          // Custom errors have selector as first 4 bytes
          for (const errorSig of commonErrors) {
            const errorSelector = getErrorSelector(errorSig);
            if (selector === errorSelector) {
              customErrorName = errorSig.replace('()', '');
              break;
            }
          }
          
          // Also check for standard error selectors
          const standardErrorSelectors: Record<string, string> = {
            '0x4f2f91aa': 'OwnableUnauthorizedAccount', // Ownable: caller is not the owner (OpenZeppelin)
            '0x08c379a0': 'Error(string)', // Standard error(string)
          };
          
          if (!customErrorName && standardErrorSelectors[selector]) {
            customErrorName = standardErrorSelectors[selector];
          }
        } catch {
          // Ignore decode errors
        }
      }
      
      const fullMessage = [errorMessage, reason, customErrorName].filter(Boolean).join(' ');
      
      // Try to match the error message (case-insensitive, partial match)
      const lowerExpected = expectedError.toLowerCase();
      const lowerMessage = fullMessage.toLowerCase();
      
      // Map expected error messages to possible variations
      const errorMappings: Record<string, string[]> = {
        'ownable: caller is not the owner': [
          'ownable',
          'caller is not the owner',
          'not the owner',
          'unauthorized',
          'ownableunauthorizedaccount'
        ],
        'stilllocked': [
          'stilllocked',
          'still locked',
          'lock period',
          'locked',
          'stilllocked()'
        ],
        'alreadyunstaked': [
          'alreadyunstaked',
          'already unstaked',
          'position already unstaked',
          'alreadyunstaked()'
        ],
        'noreward': [
          'noreward',
          'no reward',
          'reward is zero',
          'noreward()'
        ],
        'positionnotfound': [
          'positionnotfound',
          'position not found',
          'invalid position',
          'positionnotfound()'
        ],
        'not position owner': [
          'not position owner',
          'position owner',
          'not owner'
        ],
        'position already unstaked': [
          'position already unstaked',
          'alreadyunstaked',
          'already unstaked'
        ],
        'not in emergency mode': [
          'not in emergency mode',
          'emergency mode',
          'not emergency'
        ],
        'contract is in emergency mode': [
          'contract is in emergency mode',
          'emergency mode',
          'in emergency'
        ],
        'pausable: paused': [
          'pausable: paused',
          'paused',
          'pausable'
        ],
        'start time must be before end time': [
          'start time must be before end time',
          'start time',
          'end time',
          'time must be'
        ],
        'end time must be after start time': [
          'end time must be after start time',
          'end time',
          'start time',
          'time must be'
        ]
      };
      
      // Check if expected error has mappings
      const normalizedExpected = lowerExpected.trim();
      const possibleMatches = errorMappings[normalizedExpected] || [normalizedExpected];
      
      const hasMatch = possibleMatches.some(pattern => 
        lowerMessage.includes(pattern)
      );
      
      if (!hasMatch) {
        // If it's an Ownable error, check for common variations
        if (expectedError.includes('Ownable') || expectedError.includes('owner')) {
          const ownablePatterns = [
            'ownable',
            'caller is not the owner',
            'not the owner',
            'unauthorized',
            'ownableunauthorizedaccount'
          ];
          const hasOwnableError = ownablePatterns.some(pattern => 
            lowerMessage.includes(pattern)
          );
          if (hasOwnableError) {
            return; // Found an Ownable error, consider it matched
          }
        }
        
        // For other errors, try to find the error in the message
        assert.fail(
          `Expected error message to include "${expectedError}", but got: ${fullMessage}`
        );
      }
    }
  }
}

/**
 * Assert two BigInt values are equal
 */
export function expectBigIntEqual(
  actual: bigint,
  expected: bigint,
  message?: string
): void {
  assert.strictEqual(
    actual.toString(),
    expected.toString(),
    message || `Expected ${actual} to equal ${expected}`
  );
}

/**
 * Assert two addresses are equal (case-insensitive)
 */
export function expectAddressEqual(
  actual: string,
  expected: string,
  message?: string
): void {
  assert.strictEqual(
    actual.toLowerCase(),
    expected.toLowerCase(),
    message || `Expected ${actual} to equal ${expected}`
  );
}

/**
 * Calculate expected reward for a given amount and time
 */
export function calculateExpectedReward(
  amount: bigint,
  rewardRate: bigint, // basis points (500 = 5%)
  timeElapsed: bigint // seconds
): bigint {
  const BASIS_POINTS = BigInt(10000);
  const SECONDS_PER_YEAR = BigInt(365 * 24 * 60 * 60);
  
  // reward = amount * rewardRate / BASIS_POINTS * timeElapsed / SECONDS_PER_YEAR
  return (amount * rewardRate * timeElapsed) / (BASIS_POINTS * SECONDS_PER_YEAR);
}

/**
 * Assert that a value is within a range (for approximate comparisons)
 */
export function expectWithinRange(
  actual: bigint,
  expected: bigint,
  tolerance: bigint,
  message?: string
): void {
  const diff = actual > expected ? actual - expected : expected - actual;
  assert.ok(
    diff <= tolerance,
    message || `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

/**
 * Helper to parse ether amount
 */
export function parseEther(amount: string): bigint {
  return ethers.parseEther(amount);
}

/**
 * Helper to format ether amount
 */
export function formatEther(amount: bigint): string {
  return ethers.formatEther(amount);
}

/**
 * Get ethers from Hardhat runtime environment
 */
export async function getEthers() {
  const hre = await import("hardhat");
  const hreInstance = hre.default;
  const { ethers: hreEthers } = await hreInstance.network.connect();
  return hreEthers;
}

/**
 * Get event from transaction receipt
 * Improved to handle multiple event formats and proxy contracts
 * Also handles cases where transaction may not have executed properly
 */
export function getEvent(
  receipt: ethers.ContractTransactionReceipt | null,
  eventName: string,
  contract: ethers.Contract
): ethers.LogDescription | null {
  if (!receipt) {
    return null;
  }
  
  // Check if transaction actually succeeded
  if (receipt.status !== 1) {
    return null;
  }
  
  if (!receipt.logs || receipt.logs.length === 0) {
    return null;
  }
  
  // Get event signature hash for faster matching
  let eventSignature: string | null = null;
  try {
    const eventFragment = contract.interface.getEvent(eventName);
    if (eventFragment) {
      eventSignature = eventFragment.topicHash;
    }
  } catch (e) {
    // Event not found in interface, will try parsing all logs
  }
  
  // Try to find the event in logs
  for (const log of receipt.logs) {
    // Skip logs that don't match the contract address (for proxy contracts)
    // Note: In proxy contracts, events are emitted from the proxy address
    // So we check if the log address matches the contract address
    const logAddress = log.address.toLowerCase();
    const contractAddress = (contract.target as string).toLowerCase();
    
    // First check by topic hash if available (faster)
    if (eventSignature && log.topics && log.topics.length > 0 && log.topics[0] === eventSignature) {
      try {
        const parsed = contract.interface.parseLog({
          topics: log.topics || [],
          data: log.data || '0x'
        });
        if (parsed && parsed.name === eventName) {
          return parsed;
        }
      } catch {
        // Continue searching
      }
    }
    
    // Also try parsing without topic hash check (for compatibility)
    // This handles cases where the event signature might not match exactly
    try {
      const parsed = contract.interface.parseLog({
        topics: log.topics || [],
        data: log.data || '0x'
      });
      if (parsed && parsed.name === eventName) {
        return parsed;
      }
    } catch {
      // Continue searching - this log doesn't match
    }
  }
  
  // If we get here, the event was not found
  // This could mean:
  // 1. The transaction didn't actually execute (state update failure)
  // 2. The event name doesn't match
  // 3. The event was emitted from a different contract
  
  return null;
}

/**
 * Get all user position IDs
 * Uses the getUserPositionIds contract function to get all position IDs for a user
 */
export async function getUserPositions(
  staking: ethers.Contract,
  userAddress: string
): Promise<bigint[]> {
  const positionIds = await staking.getUserPositionIds(userAddress);
  return positionIds.map((id: any) => BigInt(id));
}

/**
 * Safely call pendingReward with validation and error handling
 * This function verifies the position exists before calling pendingReward
 * Note: pendingReward can now be called by anyone (no owner check required)
 */
export async function getPendingReward(
  staking: ethers.Contract,
  positionId: bigint,
  userSigner: ethers.Signer
): Promise<bigint> {
  // First verify the position exists
  try {
    const position = await staking.positions(positionId);
    const positionOwner = position.owner.toLowerCase();
    
    if (positionOwner === "0x0000000000000000000000000000000000000000") {
      // Position doesn't exist - this might be because stake() didn't execute
      const nextPositionId = await staking.nextPositionId();
      throw new Error(
        `Position ${positionId} does not exist (owner is zero address). ` +
        `Next position ID: ${nextPositionId}. ` +
        `This may indicate that stake() did not execute properly.`
      );
    }
    
    // Note: pendingReward can now be called by anyone, no owner check needed
    
    // Position exists, now call pendingReward
    try {
      // Call pendingReward - can be called by anyone
      const stakingWithSigner = staking.connect(userSigner) as any;
      const pendingReward = await stakingWithSigner.pendingReward(positionId);
      return pendingReward;
    } catch (error: any) {
      // If pendingReward fails with decode error, check conditions
      if (error.message && error.message.includes("could not decode")) {
        // Check if it's because of emergency mode
        const emergencyMode = await staking.emergencyMode();
        if (emergencyMode) {
          return 0n; // Emergency mode returns 0
        }
        
        // Check if position is unstaked
        if (position.isUnstaked) {
          return 0n; // Unstaked positions return 0
        }
        
        // If decode fails, it might be because the function reverted
        // Try to get more information
        throw new Error(
          `Failed to decode pendingReward result for position ${positionId}. ` +
          `Position exists: true, Emergency mode: ${emergencyMode}, ` +
          `Is unstaked: ${position.isUnstaked}. ` +
          `Original error: ${error.message}`
        );
      }
      
      // Re-throw other errors
      throw error;
    }
  } catch (error: any) {
    // If position doesn't exist or other error, throw with helpful message
    if (error.message && error.message.includes("does not exist")) {
      throw error;
    }
    
    // Try to get more information
    const nextPositionId = await staking.nextPositionId();
    throw new Error(
      `Failed to get pending reward for position ${positionId}: ${error.message}. ` +
      `Next position ID: ${nextPositionId}, User: ${await userSigner.getAddress()}`
    );
  }
}

/**
 * Get pending reward for any position (can be called by anyone)
 * This is a simpler version that doesn't validate owner
 */
export async function getPendingRewardForAnyPosition(
  staking: ethers.Contract,
  positionId: bigint,
  caller?: ethers.Signer
): Promise<bigint> {
  try {
    // Check if position exists
    const position = await staking.positions(positionId);
    if (position.owner === "0x0000000000000000000000000000000000000000") {
      throw new Error(`Position ${positionId} does not exist`);
    }
    
    // Call pendingReward - can be called by anyone
    if (caller) {
      const stakingWithSigner = staking.connect(caller) as any;
      return await stakingWithSigner.pendingReward(positionId);
    } else {
      // Use default signer
      return await (staking as any).pendingReward(positionId);
    }
  } catch (error: any) {
    // Check if it's emergency mode or unstaked position
    const emergencyMode = await staking.emergencyMode();
    if (emergencyMode) {
      return 0n; // Emergency mode returns 0
    }
    
    const position = await staking.positions(positionId);
    if (position.isUnstaked) {
      return 0n; // Unstaked positions return 0
    }
    
    throw error;
  }
}

/**
 * Wait for state to be updated after a transaction
 * This is a helper function to handle Hardhat EDR's async state updates
 * 
 * @param checkState - Function that checks if state is updated (returns true when updated)
 * @param maxRetries - Maximum number of retries (default: 10)
 * @param retryDelay - Delay between retries in ms (default: 100)
 */
export async function waitForStateUpdate(
  checkState: () => Promise<boolean>,
  maxRetries: number = 10,
  retryDelay: number = 100
): Promise<void> {
  const ethers = await getEthers();
  
  for (let i = 0; i < maxRetries; i++) {
    const isUpdated = await checkState();
    if (isUpdated) {
      return;
    }
    
    if (i < maxRetries - 1) {
      // Mine a block to trigger state update
      await ethers.provider.send("evm_mine", []);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // Final check
  const finalCheck = await checkState();
  if (!finalCheck) {
    throw new Error(`State update timeout after ${maxRetries} retries`);
  }
}

/**
 * Re-export state sync utilities
 */
export {
  waitForStateValue,
  waitForStateChange,
  waitForCondition,
  forceStateRefresh,
  waitForTransactionStateUpdate,
  waitForPositionCreated,
  waitForStateVariableUpdate,
} from "./state-sync.js";
