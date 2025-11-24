/**
 * Contract address configuration
 * Configure different contract addresses for different network environments
 * 
 * Note: HSK is the native token of the chain, similar to ETH, no token contract address needed
 */

export interface ContractAddresses {
  staking: string;
}

// Mainnet addresses
export const MAINNET_ADDRESSES: ContractAddresses = {
  staking: "",  // TODO: Staking proxy contract address
};

// Testnet addresses
export const TESTNET_ADDRESSES: ContractAddresses = {
  staking: "",  // TODO: Staking proxy contract address
};

// Get addresses for current network
export function getAddresses(network: string): ContractAddresses {
  // Support multiple network name formats
  const normalizedNetwork = network.toLowerCase();
  
  // Read from environment variables first, otherwise use addresses from config file
  const staking = process.env.STAKING_ADDRESS || "";
  
  if (normalizedNetwork.includes("mainnet") || normalizedNetwork === "177") {
    return {
      staking: staking || MAINNET_ADDRESSES.staking,
    };
  }
  
  if (normalizedNetwork.includes("testnet") || normalizedNetwork === "133") {
    return {
      staking: staking || TESTNET_ADDRESSES.staking,
    };
  }
  
  if (normalizedNetwork.includes("localhost") || normalizedNetwork.includes("hardhat") || normalizedNetwork === "31337") {
    // Local test network addresses read from environment variables
    return {
      staking: staking,
    };
  }
  
  throw new Error(`Unknown network: ${network}. Please set STAKING_ADDRESS environment variable.`);
}

// Contract constants (consistent with StakingConstants.sol)
export const STAKING_CONSTANTS = {
  LOCK_PERIOD: 365 * 24 * 60 * 60,      // 365 days (seconds)
  BASIS_POINTS: 10000,                   // 100% = 10000
  PRECISION: BigInt("1000000000000000000"), // 1e18 for precision calculation
  SECONDS_PER_YEAR: 365 * 24 * 60 * 60, // 365 days
  HSK_DECIMALS: 18,                      // HSK native token decimals
};

// Staking product configuration
// Note: Lock period is fixed at 365 days, defined in contract constant LOCK_PERIOD
export const STAKING_CONFIG = {
  minStakeAmount: "1000",        // 1000 HSK
  rewardRate: 500,               // 5% APY (basis points: 500/10000 = 0.05 = 5%)
  whitelistMode: false,          // Whitelist mode disabled
  maxTotalStaked: "30000000",    // 30,000,000 HSK (30 million HSK pool cap)
  productName: "HSK Staking",
  targetUsers: "All Users",
  description: "Staking product for all users, low threshold, stable returns",
};

