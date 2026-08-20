# contracts — ZK-KYC Smart Contracts

Hardhat project deploying two minimal Solidity contracts to Polygon Amoy testnet.

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

## Deployed Addresses (Polygon Amoy)

| Contract | Address | Explorer |
|----------|---------|---------|
| IssuerRegistry | TBD — run `pnpm contracts:deploy` | [amoy.polygonscan.com](https://amoy.polygonscan.com) |
| CredentialStatus | TBD — run `pnpm contracts:deploy` | [amoy.polygonscan.com](https://amoy.polygonscan.com) |

*Update this table after deployment.*

## Commands

```bash
# Run tests (local Hardhat node)
pnpm contracts:test

# Deploy to Polygon Amoy
pnpm contracts:deploy

# Verify on Polygonscan
npx hardhat verify --network amoy <ISSUER_REGISTRY_ADDRESS>
npx hardhat verify --network amoy <CREDENTIAL_STATUS_ADDRESS> <ISSUER_REGISTRY_ADDRESS>
```

## Constructor Arguments

- `IssuerRegistry`: No constructor arguments.
- `CredentialStatus`: `(address _issuerRegistry)` — address of deployed IssuerRegistry.

## Faucet

Get testnet POL: https://faucets.chain.link/polygon-amoy
