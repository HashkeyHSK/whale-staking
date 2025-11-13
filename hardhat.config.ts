import { HardhatUserConfig } from "hardhat/config.js";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ignition";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const config: HardhatUserConfig = {
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
    },
  },
  etherscan: {
    apiKey: {
      hashkeyTestnet: "empty",
      hashkeyMainnet: 'your API key'
    },
    customChains: [
      {
        network: "hashkeyMainnet",
        chainId: 177,
        urls: {
          apiURL: "https://explorer.hsk.xyz/api",
          browserURL: "https://explorer.hsk.xyz"
        }
      }
    ]
  },
  mocha: {
    timeout: 100000
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v6'
  }
};

export default config;