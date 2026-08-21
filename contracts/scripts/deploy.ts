import { ethers } from 'hardhat';

/**
 * Deployment script for ZK-KYC smart contracts.
 *
 * Deployment order:
 *   1. IssuerRegistry (no dependencies)
 *   2. CredentialStatus (depends on IssuerRegistry address)
 *   3. Register the mock issuer address in IssuerRegistry
 *
 * Usage:
 *   pnpm contracts:deploy          → Ethereum Sepolia testnet
 *   pnpm --filter @zk-kyc/contracts deploy:local → local Hardhat node
 *
 * After deployment: record addresses in contracts/README.md and .env
 *
 * Faucet for Ethereum Sepolia: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error('No deployer account found. Check DEPLOYER_PRIVATE_KEY in .env');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('ZK-KYC Contract Deployment');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Network:   ${(await ethers.provider.getNetwork()).name}`);
  console.log(`Chain ID:  ${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(
    `Balance:   ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`,
  );
  console.log('───────────────────────────────────────────────────');

  // ── 1. Deploy IssuerRegistry ────────────────────────────────────────────────
  console.log('\n[1/3] Deploying IssuerRegistry...');
  const IssuerRegistry = await ethers.getContractFactory('IssuerRegistry');
  const issuerRegistry = await IssuerRegistry.deploy();
  await issuerRegistry.waitForDeployment();
  const issuerRegistryAddress = await issuerRegistry.getAddress();
  console.log(`      ✓ IssuerRegistry deployed at: ${issuerRegistryAddress}`);

  // ── 2. Deploy CredentialStatus ─────────────────────────────────────────────
  console.log('\n[2/3] Deploying CredentialStatus...');
  const CredentialStatus = await ethers.getContractFactory('CredentialStatus');
  const credentialStatus = await CredentialStatus.deploy(issuerRegistryAddress);
  await credentialStatus.waitForDeployment();
  const credentialStatusAddress = await credentialStatus.getAddress();
  console.log(`      ✓ CredentialStatus deployed at: ${credentialStatusAddress}`);

  // ── 3. Register mock issuer ────────────────────────────────────────────────
  // The mock issuer's address is derived from ISSUER_PRIVATE_KEY in .env
  // If ISSUER_PRIVATE_KEY is not set, we use the deployer as the mock issuer
  // (convenient for local development).
  const issuerPrivateKey = process.env['ISSUER_PRIVATE_KEY'];
  const mockIssuerAddress = issuerPrivateKey
    ? new ethers.Wallet(issuerPrivateKey).address
    : deployer.address;

  console.log(`\n[3/3] Registering mock issuer: ${mockIssuerAddress}...`);
  const registerTx = await issuerRegistry.registerIssuer(mockIssuerAddress);
  await registerTx.wait();
  console.log(`      ✓ Mock issuer registered as trusted`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log('Deployment complete. Update your .env with:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`NEXT_PUBLIC_ISSUER_REGISTRY_ADDRESS=${issuerRegistryAddress}`);
  console.log(`NEXT_PUBLIC_CREDENTIAL_STATUS_ADDRESS=${credentialStatusAddress}`);
  console.log('───────────────────────────────────────────────────');
  console.log('\nBlock explorer links:');
  console.log(
    `IssuerRegistry:   https://sepolia.etherscan.io/address/${issuerRegistryAddress}`,
  );
  console.log(
    `CredentialStatus: https://sepolia.etherscan.io/address/${credentialStatusAddress}`,
  );
  console.log('\nVerify with:');
  console.log(`  npx hardhat verify --network sepolia ${issuerRegistryAddress}`);
  console.log(
    `  npx hardhat verify --network sepolia ${credentialStatusAddress} ${issuerRegistryAddress}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
