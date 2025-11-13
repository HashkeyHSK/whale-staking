// Common utility functions

/**
 * Sleep/delay execution
 */
export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Format timestamp to readable string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Calculate time offset (for setting start/end time)
 */
export function calculateTimeOffset(offsetDays: number): number {
  return Math.floor(Date.now() / 1000) + (offsetDays * 24 * 60 * 60);
}

/**
 * Validate address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate address array
 */
export function validateAddresses(addresses: string[]): boolean {
  return addresses.every(addr => isValidAddress(addr));
}
