import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import 'hardhat-gas-reporter';
import 'hardhat-contract-sizer';
import 'solidity-coverage';
import * as dotenv from "dotenv";

dotenv.config();

// PrivateKey for deployment
const mnemonic = process.env.DEPLOYMENT_KEY || '';

const config: HardhatUserConfig = {

  networks: {

    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      },
      blockGasLimit: 30_000_000
    },

    sepolia: {
      chainId: 11155111,
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: [mnemonic],
      blockGasLimit: 30_000_000, // Network block gasLimit
    },

  },

  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 3000, // (2**32-1) Optimized for SmartContract usage, not deployment cost.
      },
    },
  },

  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    // only: [':ERC20$'],
  },

  mocha: {
    timeout: 100000,
  },

  gasReporter: {
    currency: 'USD',
    gasPrice: 21,
    enabled: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },

};

export default config;
