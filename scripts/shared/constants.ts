/**
 * Contract address configuration
 * Configure different contract addresses for different network environments
 * 
 * Note: HSK is the native token of the chain, similar to ETH, no token contract address needed
 */

export interface ContractAddresses {
  normalStaking: string;
  premiumStaking: string;
}

// Mainnet addresses
export const MAINNET_ADDRESSES: ContractAddresses = {
  normalStaking: "",  // TODO: Normal Staking proxy contract address
  premiumStaking: "", // TODO: Premium Staking proxy contract address
};

// Testnet addresses
export const TESTNET_ADDRESSES: ContractAddresses = {
  normalStaking: "",  // TODO: Normal Staking proxy contract address
  premiumStaking: "", // TODO: Premium Staking proxy contract address
};

// Get addresses for current network
export function getAddresses(network: string): ContractAddresses {
  // Support multiple network name formats
  const normalizedNetwork = network.toLowerCase();
  
  // Read from environment variables first, otherwise use addresses from config file
  const normalStaking = process.env.NORMAL_STAKING_ADDRESS || "";
  const premiumStaking = process.env.PREMIUM_STAKING_ADDRESS || "";
  
  if (normalizedNetwork.includes("mainnet") || normalizedNetwork === "177") {
    return {
      normalStaking: normalStaking || MAINNET_ADDRESSES.normalStaking,
      premiumStaking: premiumStaking || MAINNET_ADDRESSES.premiumStaking,
    };
  }
  
  if (normalizedNetwork.includes("testnet") || normalizedNetwork === "133") {
    return {
      normalStaking: normalStaking || TESTNET_ADDRESSES.normalStaking,
      premiumStaking: premiumStaking || TESTNET_ADDRESSES.premiumStaking,
    };
  }
  
  if (normalizedNetwork.includes("localhost") || normalizedNetwork.includes("hardhat") || normalizedNetwork === "31337") {
    // Local test network addresses read from environment variables
    return {
      normalStaking: normalStaking,
      premiumStaking: premiumStaking,
    };
  }
  
  throw new Error(`Unknown network: ${network}. Please set NORMAL_STAKING_ADDRESS environment variable.`);
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
export const NORMAL_STAKING_CONFIG = {
  minStakeAmount: "1",           // 1 HSK
  rewardRate: 800,               // 8% APY (basis points: 800/10000 = 0.08 = 8%)
  whitelistMode: false,          // Whitelist mode disabled
  maxTotalStaked: "10000000",    // 10,000,000 HSK (10 million HSK pool cap)
  productName: "Normal Staking",
  targetUsers: "Regular Users",
  description: "Staking product for regular users, low threshold, stable returns",
};

export const PREMIUM_STAKING_CONFIG = {
  minStakeAmount: "500000",      // 500,000 HSK
  rewardRate: 1600,              // 16% APY (basis points: 1600/10000 = 0.16 = 16%)
  whitelistMode: true,           // Whitelist mode enabled
  maxTotalStaked: "20000000",    // 20,000,000 HSK (20 million HSK pool cap)
  productName: "Premium Staking",
  targetUsers: "Whales/Institutions",
  description: "Premium staking product for whales and institutions, high threshold, high returns",
};
