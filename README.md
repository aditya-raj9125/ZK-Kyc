# ZK-KYC Wallet & Verifier SDK

A **user-controlled digital credential wallet** with a **zero-knowledge selective-disclosure layer** — built as a proposed extension to DigiLocker/NAD-style government infrastructure. Store only cryptographic hashes of your credentials, prove specific facts (CGPA ≥ 8, income < ₹5L) without revealing underlying documents, and let third-party apps verify proofs client-side via an installable SDK.

> **Explicit assumption**: This project assumes a future DigiLocker/NAD-style issuer already extracts structured fields from documents and signs them. The mock issuer in this repo simulates that interaction shape. No real DigiLocker API is used. See [`docs/assumptions.md`](docs/assumptions.md) for the complete list of what's real vs. simulated.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Verifier SDK  (packages/verifier-sdk)                 │
│  requestProof() + verifyProof() + QR + on-chain reads           │
│  Installable by any third-party developer. No backend required. │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: ZK Core  (packages/zk-core)                           │
│  SHA-256 Merkle tree, leaf inclusion proofs, predicate proofs   │
│  Upgrade path: Groth16 range circuits (circom + snarkjs)        │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Wallet App  (apps/wallet) — port 3000                 │
│  Next.js 14 + wagmi + RainbowKit. Credential dashboard.         │
│  QR proof approval. NO verifier UI (by design).                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1a: Mock Issuer  (apps/mock-issuer) — port 3001          │
│  Express REST: /issue /revoke /documents /issuer-info           │
│                                                                 │
│  Layer 1b: Contracts  (contracts/) — Polygon Amoy (80002)       │
│  IssuerRegistry.sol + CredentialStatus.sol                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

| Path | Description |
|------|-------------|
| `apps/wallet/` | Main wallet web app (Next.js 14 + TypeScript) |
| `apps/mock-issuer/` | Mock DigiLocker/university issuer (Express) |
| `packages/shared-types/` | Single source of truth for all credential and proof schemas |
| `packages/zk-core/` | Merkle tree + predicate proof logic (framework-agnostic) |
| `packages/verifier-sdk/` | Installable third-party verifier SDK |
| `packages/verifier-sdk/examples/mock-verifier-app/` | Standalone example verifier app (port 5174) |
| `contracts/` | Hardhat + Solidity: IssuerRegistry + CredentialStatus |
| `docs/` | Architecture, SDK guide, assumptions |

---

## Local Setup

### Prerequisites

- Node.js 18+
- pnpm 8+ (`npm install -g pnpm`)
- Git

### Install

```bash
git clone <repo-url>
cd zk-kyc
pnpm install
```

### Environment

```bash
cp .env.example .env
# Edit .env with your values (all free, testnet only):
# - NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID (free at cloud.walletconnect.com)
# - DEPLOYER_PRIVATE_KEY (testnet only, faucet: https://faucets.chain.link/polygon-amoy)
# - ISSUER_PRIVATE_KEY (testnet only, any throwaway key)
# After deploying contracts, update:
# - NEXT_PUBLIC_ISSUER_REGISTRY_ADDRESS
# - NEXT_PUBLIC_CREDENTIAL_STATUS_ADDRESS
```

### Run Apps

```bash
# Run wallet app (port 3000)
pnpm dev:wallet

# Run mock issuer (port 3001) — in a separate terminal
pnpm dev:issuer

# Run example verifier app (port 5174) — in a separate terminal
pnpm dev:verifier
```

### Run Tests

```bash
# ZK core unit tests (Merkle + predicate proofs)
pnpm --filter @zk-kyc/zk-core test

# Contract tests (local Hardhat network)
pnpm contracts:test
```

---

## Testnet Deployment

**Network**: Polygon Amoy (Chain ID: 80002)  
**Faucet**: https://faucets.chain.link/polygon-amoy (free POL for testnet)  
**Block Explorer**: https://amoy.polygonscan.com

### Deploy Contracts

```bash
# 1. Fund DEPLOYER_PRIVATE_KEY via faucet
# 2. Set DEPLOYER_PRIVATE_KEY and ISSUER_PRIVATE_KEY in .env
pnpm contracts:deploy

# 3. Copy deployed addresses to .env:
# NEXT_PUBLIC_ISSUER_REGISTRY_ADDRESS=0x...
# NEXT_PUBLIC_CREDENTIAL_STATUS_ADDRESS=0x...
```

### Deployed Addresses

| Contract | Address | Explorer |
|----------|---------|---------|
| IssuerRegistry | *(deploy and update)* | [amoy.polygonscan.com](https://amoy.polygonscan.com) |
| CredentialStatus | *(deploy and update)* | [amoy.polygonscan.com](https://amoy.polygonscan.com) |

*See `contracts/README.md` for constructor args and verification commands.*

---

## Phase-by-Phase Status

| Phase | What's Built | Status |
|-------|-------------|--------|
| **Phase 1** | Mock issuer REST API, Merkle tree + unit tests, IssuerRegistry + CredentialStatus contracts, wallet dashboard, credential import flow | ✅ Complete |
| **Phase 2** | Predicate proof generation (eq + threshold), QR proof-request flow in wallet, proof approval UI | ✅ Complete |
| **Phase 3** | Verifier SDK (`requestProof` + `verifyProof` + QR), standalone example verifier app, revocation demo, docs | ✅ Complete |
| **Out of scope** | Real DigiLocker API, circom Groth16 circuits, BBS+ signatures, mainnet deployment, production key management | ❌ Not built (see assumptions.md) |

---

## Links

- [`docs/sdk-integration-guide.md`](docs/sdk-integration-guide.md) — SDK API reference for third-party developers
- [`docs/assumptions.md`](docs/assumptions.md) — What's simulated vs. real
- [`docs/architecture.md`](docs/architecture.md) — System design, data flow, predicate proof design
- [`packages/verifier-sdk/README.md`](packages/verifier-sdk/README.md) — SDK documentation (doubles as public docs)
- [`packages/verifier-sdk/examples/mock-verifier-app/`](packages/verifier-sdk/examples/mock-verifier-app/) — Example third-party verifier app

---

## Track Alignment

**Hackathon track**: Privacy & Identity / ZK Infrastructure

**Why this project fits**:
- Zero-knowledge selective disclosure for government credential verification
- Demonstrates that ZK proofs can extend (not replace) existing government infrastructure like DigiLocker
- On-chain trust anchoring with minimal footprint (inspired by EAS)
- Separation-of-concerns architecture: wallet ≠ verifier (SDK pattern)
- Testnet-only, zero monetary cost, as required

**Reference projects studied**: Polygon ID/Privado ID (wallet+SDK pattern), EAS (minimal on-chain footprint), W3C VC Data Model (credential schema), OID4VP (proof request channel), circom + snarkjs (ZK circuit approach)

---

*Built for hackathon demonstration. Testnet only. Not for production use.*
