import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatIgnition from "@nomicfoundation/hardhat-ignition";
import "@nomicfoundation/hardhat-verify";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

export default defineConfig({
  plugins: [hardhatEthers, hardhatIgnition],
  paths: {
    tests: "./test",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hashkeyTestnet: {
      type: "http" as const,
      url: "https://testnet.hsk.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 133,
      timeout: 1000000,
    },
    hashkeyMainnet: {
      type: "http" as const,
      url: "https://mainnet.hsk.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 177,
    },
    hardhat: {
      type: "edr-simulated" as const,
      chainId: 31337,
      allowUnlimitedContractSize: true,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 20,
        accountsBalance: "1000000000000000000000000000000000", // 1e33 wei for each account (1 billion ETH)
      },
    },
  },
  // @ts-ignore - mocha config
  mocha: {
    timeout: 100000
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v6'
  },
  etherscan: {
    apiKey: {
      hashkeyTestnet: "empty",
      hashkeyMainnet: process.env.HASHKEY_API_KEY || "empty"
    },
    customChains: [
      {
        network: "hashkeyTestnet",
        chainId: 133,
        urls: {
          apiURL: "https://testnet-explorer.hsk.xyz/api",
          browserURL: "https://testnet-explorer.hsk.xyz"
        }
      },
      {
        network: "hashkeyMainnet",
        chainId: 177,
        urls: {
          apiURL: process.env.HASHKEY_MAINNET_API_URL || "https://mainnet.hsk.xyz/api",
          browserURL: process.env.HASHKEY_MAINNET_BROWSER_URL || "https://mainnet.hsk.xyz"
        }
      }
    ]
  },
  sourcify: {
    enabled: false
  }
});