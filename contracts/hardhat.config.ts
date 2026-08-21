import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

// TESTNET ONLY — key funded via faucet, zero real-world value
const rawKey =
  process.env['DEPLOYER_PRIVATE_KEY'] ??
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat default account #0
const DEPLOYER_PRIVATE_KEY = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;

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
    // Ethereum Sepolia testnet — free, faucet-funded
    // Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
    sepolia: {
      url: process.env['NEXT_PUBLIC_RPC_URL'] ?? 'https://ethereum-sepolia-rpc.publicnode.com',
      chainId: 11155111,
      accounts: [DEPLOYER_PRIVATE_KEY],
      gasPrice: 'auto',
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env['ETHERSCAN_API_KEY'] ?? '',
    },
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
