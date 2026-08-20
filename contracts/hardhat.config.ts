import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

// TESTNET ONLY — key funded via faucet, zero real-world value
const DEPLOYER_PRIVATE_KEY =
  process.env['DEPLOYER_PRIVATE_KEY'] ??
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat default account #0

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: 'paris',
    },
  },
  networks: {
    // Local development node
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    // Polygon Amoy testnet — free, faucet-funded
    // Faucet: https://faucets.chain.link/polygon-amoy
    amoy: {
      url: process.env['NEXT_PUBLIC_RPC_URL'] ?? 'https://rpc-amoy.polygon.technology/',
      chainId: 80002,
      accounts: [DEPLOYER_PRIVATE_KEY],
      gasPrice: 'auto',
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env['POLYGONSCAN_API_KEY'] ?? '',
    },
    customChains: [
      {
        network: 'polygonAmoy',
        chainId: 80002,
        urls: {
          apiURL: 'https://api-amoy.polygonscan.com/api',
          browserURL: 'https://amoy.polygonscan.com',
        },
      },
    ],
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
};

export default config;
