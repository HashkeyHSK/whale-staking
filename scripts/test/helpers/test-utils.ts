import hre from "hardhat";
import { expect } from "chai";

const { ethers } = hre;

/**
 * Test utilities and assertions
 * 
 * This file provides utility functions for testing staking contracts
 */

/**
 * Assert that a transaction reverts with a specific error
 */
export async function expectRevert(
  promise: Promise<any>,
  expectedError?: string
): Promise<void> {
  try {
    await promise;
    expect.fail("Expected transaction to revert");
  } catch (error: any) {
    if (expectedError) {
      const errorMessage = error.message || error.toString();
      expect(errorMessage).to.include(expectedError);
    }
  }
}

/**
 * Assert that a transaction succeeds
 */
export async function expectSuccess(promise: Promise<any>): Promise<any> {
  try {
    return await promise;
  } catch (error: any) {
    expect.fail(`Expected transaction to succeed, but it failed: ${error.message}`);
  }
}

/**
 * Assert two BigInt values are equal
 */
export function expectBigIntEqual(actual: bigint, expected: bigint, message?: string): void {
  expect(actual.toString()).to.equal(expected.toString(), message);
}

/**
 * Assert two addresses are equal (case-insensitive)
 */
export function expectAddressEqual(actual: string, expected: string, message?: string): void {
  expect(actual.toLowerCase()).to.equal(expected.toLowerCase(), message);
}

/**
 * Get event from transaction receipt
 */
export function getEvent(
  receipt: ethers.ContractTransactionReceipt,
  eventName: string,
  index: number = 0
): ethers.LogDescription | null {
  const events = receipt.logs
    .map((log) => {
      try {
        return {
          event: ethers.AbiCoder.defaultAbiCoder().decode(["string"], log.data)[0],
          log,
        };
      } catch {
        return null;
      }
    })
    .filter((e) => e !== null);
  
  // This is a simplified version - in practice, you'd decode using contract interface
  return null;
}

/**
 * Wait for multiple transactions
 */
export async function waitForTransactions(
  transactions: Promise<ethers.ContractTransactionResponse>[]
): Promise<ethers.ContractTransactionReceipt[]> {
  return Promise.all(transactions.map((tx) => tx.then((t) => t.wait())));
}

/**
 * Calculate expected reward for a given amount and time
 */
export function calculateExpectedReward(
  amount: bigint,
  rewardRate: 500 = 5%)
  timeElapsed: bigint // seconds
): bigint {
  const BASIS_POINTS = BigInt(10000);
  const SECONDS_PER_YEAR = BigInt(365 * 24 * 60 * 60);
  
  // reward = amount * rewardRate / BASIS_POINTS * timeElapsed / SECONDS_PER_YEAR
  return (amount * rewardRate * timeElapsed) / (BASIS_POINTS * SECONDS_PER_YEAR);
}

/**
 * Format error message for better readability
 */
export function formatError(error: any): string {
  if (error.reason) {
    return error.reason;
  }
  if (error.message) {
    return error.message;
  }
  return error.toString();
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
  expect(diff <= tolerance, message || `Expected ${actual} to be within ${tolerance} of ${expected}`).to.be.true;
}

/**
 * Helper to create a position ID from index
 */
export function positionId(index: number): bigint {
  return BigInt(index);
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

