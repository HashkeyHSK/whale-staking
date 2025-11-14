/**
 * State Synchronization Utilities for Hardhat EDR
 * 
 * This module provides utilities to handle state update delays in Hardhat EDR network.
 * Hardhat EDR may have async state updates, so we need to wait and retry.
 */

import { getEthers } from "./test-utils.js";

/**
 * Options for waiting for state updates
 */
export interface WaitForStateOptions {
  /** Maximum number of retries */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Whether to mine blocks between retries */
  mineBlocks?: boolean;
  /** Custom error message */
  errorMessage?: string;
}

const DEFAULT_OPTIONS: Required<WaitForStateOptions> = {
  maxRetries: 5, // Keep retries low
  retryDelay: 50, // Keep delay low
  mineBlocks: true,
  errorMessage: "State update timeout",
};

/**
 * Wait for a state value to match expected value
 */
export async function waitForStateValue<T>(
  getValue: () => Promise<T>,
  expectedValue: T,
  options: WaitForStateOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ethers = await getEthers();
  
  // First, try immediate check
  let currentValue = await getValue();
  if (compareValues(currentValue, expectedValue)) {
    return currentValue;
  }
  
  // Force initial state refresh with multiple blocks
  if (opts.mineBlocks) {
    for (let j = 0; j < 3; j++) {
      await ethers.provider.send("evm_mine", []);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  for (let i = 0; i < opts.maxRetries; i++) {
    currentValue = await getValue();
    
    if (compareValues(currentValue, expectedValue)) {
      return currentValue;
    }
    
    if (i < opts.maxRetries - 1) {
      if (opts.mineBlocks) {
        // Mine multiple blocks to force state update
        for (let j = 0; j < 2; j++) {
          await ethers.provider.send("evm_mine", []);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
    }
  }
  
  const finalValue = await getValue();
  if (!compareValues(finalValue, expectedValue)) {
    throw new Error(
      `${opts.errorMessage}: Expected ${expectedValue}, but got ${finalValue} after ${opts.maxRetries} retries`
    );
  }
  
  return finalValue;
}

/**
 * Wait for a state value to change from initial value
 */
export async function waitForStateChange<T>(
  getValue: () => Promise<T>,
  initialValue: T,
  options: WaitForStateOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ethers = await getEthers();
  
  for (let i = 0; i < opts.maxRetries; i++) {
    const currentValue = await getValue();
    
    if (!compareValues(currentValue, initialValue)) {
      return currentValue;
    }
    
    if (i < opts.maxRetries - 1) {
      if (opts.mineBlocks) {
        await ethers.provider.send("evm_mine", []);
      }
      await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
    }
  }
  
  const finalValue = await getValue();
  if (compareValues(finalValue, initialValue)) {
    throw new Error(
      `${opts.errorMessage}: State did not change from ${initialValue} after ${opts.maxRetries} retries`
    );
  }
  
  return finalValue;
}

/**
 * Wait for a condition to become true
 */
export async function waitForCondition(
  checkCondition: () => Promise<boolean>,
  options: WaitForStateOptions = {}
): Promise<boolean> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ethers = await getEthers();
  
  // First, try immediate check
  let result = await checkCondition();
  if (result) {
    return true;
  }
  
  // Force initial state refresh with multiple blocks
  if (opts.mineBlocks) {
    for (let j = 0; j < 3; j++) {
      await ethers.provider.send("evm_mine", []);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  for (let i = 0; i < opts.maxRetries; i++) {
    result = await checkCondition();
    
    if (result) {
      return true;
    }
    
    if (i < opts.maxRetries - 1) {
      if (opts.mineBlocks) {
        // Mine multiple blocks to force state update
        for (let j = 0; j < 2; j++) {
          await ethers.provider.send("evm_mine", []);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
    }
  }
  
  const finalResult = await checkCondition();
  if (!finalResult) {
    throw new Error(
      `${opts.errorMessage}: Condition not met after ${opts.maxRetries} retries`
    );
  }
  
  return finalResult;
}

/**
 * Force state refresh by mining blocks
 */
export async function forceStateRefresh(blocks: number = 3): Promise<void> {
  const ethers = await getEthers();
  for (let i = 0; i < blocks; i++) {
    await ethers.provider.send("evm_mine", []);
    await new Promise(resolve => setTimeout(resolve, 100)); // Delay between blocks
  }
  await new Promise(resolve => setTimeout(resolve, 200)); // Final delay
}

/**
 * Wait for transaction to be fully processed and state updated
 * This is a comprehensive function that ensures state is synchronized after a transaction
 */
export async function waitForTransactionStateUpdate(
  txPromise: Promise<any>,
  options: WaitForStateOptions = {}
): Promise<any> {
  const tx = await txPromise;
  const receipt = await tx.wait();
  
  // Force state refresh after transaction
  await forceStateRefresh(3);
  
  return receipt;
}

/**
 * Wait for position to be created after stake transaction
 * Specifically handles the common case where stake() succeeds but position is not immediately available
 */
export async function waitForPositionCreated(
  staking: any,
  expectedPositionId: bigint,
  options: WaitForStateOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  await waitForCondition(
    async () => {
      try {
        const position = await staking.positions(expectedPositionId);
        return position.owner !== "0x0000000000000000000000000000000000000000";
      } catch {
        return false;
      }
    },
    { ...opts, errorMessage: `Position ${expectedPositionId} was not created after ${opts.maxRetries} retries` }
  );
}

/**
 * Wait for state variable to update after a transaction
 * Specifically handles configuration functions (pause, setMinStakeAmount, etc.)
 */
export async function waitForStateVariableUpdate<T>(
  getValue: () => Promise<T>,
  expectedValue: T,
  options: WaitForStateOptions = {}
): Promise<T> {
  return waitForStateValue(getValue, expectedValue, options);
}

/**
 * Compare two values (handles BigInt, string, number, boolean)
 */
function compareValues<T>(a: T, b: T): boolean {
  if (typeof a === "bigint" && typeof b === "bigint") {
    return a === b;
  }
  if (typeof a === "string" && typeof b === "string") {
    return a.toLowerCase() === b.toLowerCase();
  }
  return a === b;
}

