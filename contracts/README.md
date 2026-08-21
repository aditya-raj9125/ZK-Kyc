# contracts — ZK-KYC Smart Contracts

Hardhat project deploying two minimal Solidity contracts to Ethereum Sepolia testnet.

## Contracts

### IssuerRegistry.sol
Owner-controlled registry of trusted credential issuers.
- `registerIssuer(address)` — owner only
- `revokeIssuer(address)` — owner only
- `isTrustedIssuer(address) → bool` — public view

### CredentialStatus.sol
Credential revocation registry (EAS-inspired minimal footprint).
- `anchorCredential(bytes32)` — trusted issuers only
- `updateStatus(bytes32, Status)` — original issuer only
- `isActive(bytes32) → bool` — public view
- `getStatus(bytes32) → Status` — public view

## Deployed Addresses (Ethereum Sepolia)

| Contract | Address | Explorer |
|----------|---------|---------|
| IssuerRegistry | `0x4059CDA0a6b67e5FA70e3689767a53E95DE022e2` | [sepolia.etherscan.io](https://sepolia.etherscan.io/address/0x4059CDA0a6b67e5FA70e3689767a53E95DE022e2) |
| CredentialStatus | `0xDDD18e10FC082911e30428B5EDAbd21AaF098822` | [sepolia.etherscan.io](https://sepolia.etherscan.io/address/0xDDD18e10FC082911e30428B5EDAbd21AaF098822) |

*Update this table after deployment.*

## Commands

```bash
# Run tests (local Hardhat node)
pnpm contracts:test

# Deploy to Ethereum Sepolia
pnpm contracts:deploy

# Verify on Etherscan
npx hardhat verify --network sepolia <ISSUER_REGISTRY_ADDRESS>
npx hardhat verify --network sepolia <CREDENTIAL_STATUS_ADDRESS> <ISSUER_REGISTRY_ADDRESS>
```

## Constructor Arguments

- `IssuerRegistry`: No constructor arguments.
- `CredentialStatus`: `(address _issuerRegistry)` — address of deployed IssuerRegistry.

## Faucet

Get testnet Sepolia ETH:
- Google Cloud Web3 Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- Sepolia Faucet: https://sepoliafaucet.com/
- Chainlink Faucet: https://faucets.chain.link/sepolia

