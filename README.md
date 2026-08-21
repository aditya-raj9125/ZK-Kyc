# ZK-KYC — Zero-Knowledge Identity Wallet & Verifier SDK

**A privacy-preserving digital credential wallet with selective-disclosure proofs**
*Prove what you know without revealing what you hold.*

![Ethereum Sepolia](https://img.shields.io/badge/Network-Ethereum%20Sepolia-6366f1?style=flat-square&logo=ethereum)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue?style=flat-square&logo=solidity)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?style=flat-square&logo=typescript)
![pnpm](https://img.shields.io/badge/pnpm-monorepo-f69220?style=flat-square&logo=pnpm)
![Tests](https://img.shields.io/badge/Tests-87%20passing-22c55e?style=flat-square)

---

## What Is This?

ZK-KYC is a **user-controlled digital credential wallet** with a **zero-knowledge selective-disclosure layer** — built as a proposed extension to DigiLocker/NAD-style government infrastructure.

Instead of uploading raw documents to third-party apps, you:
1. **Store only cryptographic hashes** of your credentials in your wallet (no raw data leaves your device)
2. **Prove specific facts** — *"my income is >= Rs 8 LPA"* or *"my CGPA is >= 8.0"* — without revealing the underlying documents
3. **Let verifier apps verify** those proofs client-side via an installable SDK, anchored by live on-chain trust registries

> **Explicit assumption**: This project assumes a future DigiLocker/NAD-style issuer already extracts structured fields from documents and signs them. The mock issuer in this repo simulates that shape. No real DigiLocker API is used. See [`docs/assumptions.md`](docs/assumptions.md).

---

## System Architecture

```
╔══════════════════════════════════════════════════════════════════════╗
║                    ZK-KYC SYSTEM OVERVIEW                            ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ┌─────────────────────────────────────────────────────────────┐    ║
║  │  LAYER 4 — Verifier SDK  (packages/verifier-sdk)            │    ║
║  │                                                             │    ║
║  │   requestProof()  ──►  QR / deep-link  ──►  verifyProof()  │    ║
║  │                                                             │    ║
║  │  Client-side only · No backend required · npm installable   │    ║
║  └─────────────────────────────────────────────────────────────┘    ║
║                          ▲           │                               ║
║                  proof payload       │ proof request (base64url)    ║
║                          │           ▼                               ║
║  ┌─────────────────────────────────────────────────────────────┐    ║
║  │  LAYER 3 — ZK Core  (packages/zk-core)                      │    ║
║  │                                                             │    ║
║  │  SHA-256 Merkle tree · Leaf inclusion proofs                │    ║
║  │  Predicate witnesses (poseidon-commitment-v1)               │    ║
║  │  Upgrade path: Groth16 range circuits (circom + snarkjs)    │    ║
║  └─────────────────────────────────────────────────────────────┘    ║
║                                                                      ║
║  ┌─────────────────────────────────────────────────────────────┐    ║
║  │  LAYER 2 — Wallet App  (apps/wallet)  · port 3000           │    ║
║  │                                                             │    ║
║  │  Next.js 14 + wagmi + RainbowKit                            │    ║
║  │  Credential dashboard · Merkle visualizer · QR approver     │    ║
║  │  No verifier UI — strict separation by design               │    ║
║  └─────────────────────────────────────────────────────────────┘    ║
║                                                                      ║
║  ┌──────────────────────────┐  ┌──────────────────────────────┐    ║
║  │  LAYER 1a — Mock Issuer  │  │  LAYER 1b — Smart Contracts  │    ║
║  │  (apps/mock-issuer)      │  │  (contracts/)                │    ║
║  │  port 3001               │  │  Ethereum Sepolia 11155111   │    ║
║  │                          │  │                              │    ║
║  │  Express REST API        │  │  IssuerRegistry.sol          │    ║
║  │  /issue  /revoke         │  │  CredentialStatus.sol        │    ║
║  │  /documents  /info       │  │                              │    ║
║  │  Builds Merkle tree      │  │  Live on Sepolia testnet     │    ║
║  │  Signs root (ECDSA)      │  │  Anchors trust + revocation  │    ║
║  └──────────────────────────┘  └──────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## End-to-End Flow Diagrams

### Flow 1 — Credential Issuance

```
  Wallet User                Mock Issuer (port 3001)           Blockchain (Sepolia)
      │                              │                                 │
      │── POST /issue ──────────────►│                                 │
      │   {holderAddress, docType}   │                                 │
      │                              │── select template fields        │
      │                              │── SHA-256 hash each field       │
      │                              │── build Merkle tree             │
      │                              │── sign keccak256(root, addr)    │
      │                              │── [optional] anchorCredential──►│
      │◄── SignedCredential ─────────│                                 │
      │   {leaves[], root, sig}      │                    stores root→ACTIVE
      │                              │                                 │
      │ stores in localStorage       │                                 │
      │ (hashes only, no raw values) │                                 │
```

### Flow 2 — Proof Request & Generation

```
  Verifier App (port 5174)       Wallet (port 3000)          Relay Endpoint
         │                              │                          │
         │── requestProof() ────────────┤                          │
         │   {field, operator, value}   │                          │
         │                              │                          │
         │◄── QR Code + deep-link ──────┤                          │
         │    localhost:3000/proof-req  │                          │
         │    ?proofRequest=<base64url> │                          │
         │                              │                          │
         │ starts polling relay ────────┼──────────────────────────►
         │                              │                          │
         │         User clicks link ───►│                          │
         │                              │── decode ProofRequest    │
         │                              │── show disclosure UI     │
         │                              │                          │
         │                   User clicks Approve                    │
         │                              │                          │
         │                              │── rebuild Merkle tree    │
         │                              │── verify root matches    │
         │                              │── generateProof()        │
         │                              │── BroadcastChannel──────►│
         │                              │── POST relayUrl ─────────►
         │◄── proof received ───────────┼──────────────────────────│
```

### Flow 3 — Proof Verification

```
  Verifier App                   ZK Core / SDK                 Sepolia RPC
       │                              │                              │
       │── verifyProof(payload) ──────►│                              │
       │                              │── for each FieldProof:       │
       │                              │   verifyMerkleProof()        │
       │                              │   verifyFieldHash()          │
       │                              │   verifyPredicateWitness()   │
       │                              │                              │
       │                              │── recover signer (ECDSA)     │
       │                              │── IssuerRegistry.isTrusted()►│
       │                              │── CredentialStatus.isActive()►│
       │                              │◄─ on-chain responses ────────│
       │                              │                              │
       │◄── VerificationResult ───────│                              │
       │   {valid, checks[], issuer}  │                              │
```

---

## Repository Structure

```
zk-kyc/
├── apps/
│   ├── wallet/                      # Main wallet web app (Next.js 14)
│   │   ├── src/app/
│   │   │   ├── page.tsx             # Landing / onboarding
│   │   │   ├── dashboard/           # Credential dashboard
│   │   │   ├── proof-request/       # QR proof approval UI
│   │   │   └── docs/                # Live API docs page
│   │   └── src/lib/
│   │       ├── proof-generation.ts  # ZK proof + Merkle logic (browser-safe)
│   │       ├── credential-store.ts  # localStorage abstraction
│   │       └── wallet-connect.tsx   # wagmi + RainbowKit (Sepolia)
│   │
│   └── mock-issuer/                 # Simulated DigiLocker issuer (Express)
│       └── src/
│           ├── index.ts             # REST API entry point
│           └── documents/templates.ts  # Mock credential templates
│
├── packages/
│   ├── shared-types/                # Canonical TypeScript schemas
│   │   └── src/index.ts            # ProofRequest, SignedCredential, ProofPayload
│   │
│   ├── zk-core/                     # ZK math engine (framework-agnostic)
│   │   ├── src/
│   │   │   ├── merkle.ts            # SHA-256 Merkle tree
│   │   │   └── predicates.ts        # Predicate proof generation/verification
│   │   └── tests/                   # 53 unit tests
│   │
│   └── verifier-sdk/                # Installable third-party verifier SDK
│       ├── src/
│       │   ├── index.ts             # Public API surface
│       │   ├── requestProof.ts      # QR / deep-link proof request (browser-safe)
│       │   ├── verifyProof.ts       # Full proof verification pipeline
│       │   └── contractReader.ts    # On-chain issuer/status reads (Sepolia)
│       └── examples/
│           └── mock-verifier-app/   # Standalone demo verifier (port 5174)
│               └── vite.config.ts   # Includes relay middleware plugin
│
├── contracts/                       # Hardhat + Solidity
│   ├── contracts/
│   │   ├── IssuerRegistry.sol       # Trusted issuer whitelist
│   │   └── CredentialStatus.sol     # Credential root revocation status
│   ├── hardhat.config.ts            # Sepolia network configuration
│   ├── scripts/deploy.ts            # Deployment script
│   └── test/                        # 34 contract unit tests
│
├── docs/
│   ├── architecture.md              # Deep-dive system design + circom upgrade path
│   ├── sdk-integration-guide.md     # Third-party developer API reference
│   └── assumptions.md               # What is simulated vs. real
│
├── .env.example                     # Environment variable template
├── package.json                     # pnpm workspace root + scripts
└── pnpm-workspace.yaml              # Monorepo workspace config
```

---

## Deployed Contracts (Ethereum Sepolia)

| Contract | Address | Explorer |
|----------|---------|---------|
| **IssuerRegistry** | `0x4059CDA0a6b67e5FA70e3689767a53E95DE022e2` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x4059CDA0a6b67e5FA70e3689767a53E95DE022e2) |
| **CredentialStatus** | `0xDDD18e10FC082911e30428B5EDAbd21AaF098822` | [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xDDD18e10FC082911e30428B5EDAbd21AaF098822) |

**Network**: Ethereum Sepolia — Chain ID `11155111`
**RPC**: `https://ethereum-sepolia-rpc.publicnode.com` (free, no API key)
**Faucet**: [Google Sepolia ETH Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **pnpm** 8+ — `npm install -g pnpm`
- **MetaMask** or any EVM wallet, configured for **Ethereum Sepolia**

### 1. Install

```bash
git clone <repo-url>
cd zk-kyc
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Key variables to set in `.env`:

```env
# Free project ID — https://cloud.walletconnect.com
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id

# Testnet deployer key (fund via faucet — testnet only)
DEPLOYER_PRIVATE_KEY=0x...

# Issuer signing key (any throwaway testnet key)
ISSUER_PRIVATE_KEY=0x...

# Pre-deployed — usable as-is:
NEXT_PUBLIC_ISSUER_REGISTRY_ADDRESS=0x4059CDA0a6b67e5FA70e3689767a53E95DE022e2
NEXT_PUBLIC_CREDENTIAL_STATUS_ADDRESS=0xDDD18e10FC082911e30428B5EDAbd21AaF098822
```

Also copy contract addresses to `apps/wallet/.env.local` and `packages/verifier-sdk/examples/mock-verifier-app/.env.local`.

### 3. Run All Services

Open **three terminals**:

```bash
# Terminal 1 — Wallet App
pnpm dev:wallet          # http://localhost:3000

# Terminal 2 — Mock Issuer API
pnpm dev:issuer          # http://localhost:3001

# Terminal 3 — Mock Verifier App
pnpm dev:verifier        # http://localhost:5174
```

---

## End-to-End Demo Walkthrough

| Step | Action | URL |
|------|--------|-----|
| **1** | Connect MetaMask wallet (Sepolia network) | http://localhost:3000 |
| **2** | Click "Issue Credential" → select document type → confirm | http://localhost:3000/dashboard |
| **3** | Open Verifier App → set predicate → click "Generate QR Code" | http://localhost:5174 |
| **4** | Click the deep-link → review disclosure → click "Approve & Generate Proof" | http://localhost:3000/proof-request |
| **5** | Switch back to Verifier App → see full verification result | http://localhost:5174 |

---

## Testing

```bash
# ZK core unit tests — Merkle tree + predicate proof logic
pnpm --filter @zk-kyc/zk-core test        # 53 tests

# Smart contract tests — IssuerRegistry + CredentialStatus
pnpm contracts:test                        # 34 tests

# Full monorepo build (TypeScript compilation)
pnpm build
```

**87 tests passing** across cryptographic core and smart contracts.

---

## Contract Deployment (Fresh Deploy)

```bash
# 1. Fund your deployer address via the faucet
#    https://cloud.google.com/application/web3/faucet/ethereum/sepolia

# 2. Set DEPLOYER_PRIVATE_KEY in .env

# 3. Deploy IssuerRegistry + CredentialStatus to Sepolia
pnpm contracts:deploy

# 4. Update contract addresses in:
#    .env
#    apps/wallet/.env.local
#    packages/verifier-sdk/examples/mock-verifier-app/.env.local
```

---

## Verifier SDK — Quick Integration

```bash
npm install @zk-kyc/verifier-sdk
```

**Request a proof (generates QR + deep-link):**

```typescript
import { requestProof } from '@zk-kyc/verifier-sdk';

const { qrDataUrl, walletUrl, requestId } = await requestProof({
  verifierName: 'My Loan App',
  issuerAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  documentType: 'INCOME_CERTIFICATE',
  predicates: [{ field: 'annualIncome', operator: 'gte', value: 800000 }],
  relayUrl: 'https://your-app.com/api/relay',
});
```

**Verify a received proof:**

```typescript
import { verifyProof } from '@zk-kyc/verifier-sdk';

const result = await verifyProof(proofPayload, {
  issuerRegistryAddress: '0x4059CDA0a6b67e5FA70e3689767a53E95DE022e2',
  credentialStatusAddress: '0xDDD18e10FC082911e30428B5EDAbd21AaF098822',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
});

if (result.valid) {
  // Proof is valid — grant access
}
```

Full SDK reference: [`docs/sdk-integration-guide.md`](docs/sdk-integration-guide.md)

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Smart Contracts | Solidity 0.8.24, Hardhat | On-chain trust anchoring |
| ZK Math | TypeScript (SHA-256 Merkle) | Selective disclosure proofs |
| Wallet App | Next.js 14, wagmi, RainbowKit | User credential management |
| Mock Issuer | Express, ethers.js | Simulated DigiLocker issuer |
| Verifier SDK | TypeScript, ethers.js (browser-safe) | Third-party proof verification |
| Monorepo | pnpm workspaces | Package orchestration |
| Network | Ethereum Sepolia (11155111) | Free testnet with Etherscan |

---

## Design Decisions

### Why Merkle trees instead of Groth16 circuits?
Scope pragmatism. A full ZK circuit (circom + snarkjs + trusted setup) requires weeks. The Merkle tree approach delivers the same *privacy* property — field values are never transmitted — while the upgrade path to Groth16 is documented in [`docs/architecture.md`](docs/architecture.md).

### Why strict wallet / verifier separation?
Security architecture. The wallet holds private credential data; the verifier reads only public proofs. Coupling them would allow a compromised verifier to exfiltrate wallet data. This mirrors the Polygon ID wallet ≠ issuer ≠ verifier separation.

### Why Ethereum Sepolia?
Sepolia is the canonical permanent Ethereum testnet (post-merge), has a robust faucet without mainnet balance requirements, and has full Etherscan support. Polygon Amoy was the original target but Sepolia is more accessible.

### Why browser-safe base64url encoding?
Vite and Next.js client bundles do not include Node's `Buffer` global. All encoding/decoding uses `TextEncoder`, `TextDecoder`, `btoa`, and `atob` — standard Web APIs available in all modern browsers.

---

## What's Simulated vs. Real

| Component | Status | Notes |
|-----------|--------|-------|
| Mock Issuer REST API | Real (mock data) | Simulates DigiLocker field extraction shape |
| Merkle tree + SHA-256 | Real cryptography | Production would use Poseidon for circom compat |
| ECDSA issuer signature | Real cryptography | Signs Merkle root + holder address |
| On-chain IssuerRegistry | Live on Sepolia | Real contract, real Sepolia transactions |
| On-chain CredentialStatus | Live on Sepolia | Real contract, real Sepolia transactions |
| ZK predicate proof | Commitment-based | Not full ZK — see architecture.md for details |
| DigiLocker OAuth | Not built | Simulated with hardcoded mock templates |
| circom Groth16 circuits | Not built | Full upgrade path documented |
| BBS+ signatures | Not built | Would enable formal ZK selective disclosure |

---

## Phase Tracker

| Phase | Milestone | Status |
|-------|-----------|--------|
| Phase 1 | Mock issuer · Merkle tree · Smart contracts · Wallet dashboard | Complete |
| Phase 2 | Predicate proof generation · QR proof-request flow · Approval UI | Complete |
| Phase 3 | Verifier SDK · Standalone verifier app · Revocation demo · Docs | Complete |
| Phase 4 | Sepolia deployment · Browser-safe encoding · Relay middleware | Complete |
| Future | Groth16 circuits · BBS+ sigs · Mainnet · Production key mgmt | Documented |

---

## References

| Project | Pattern Borrowed |
|---------|----------------|
| [Polygon ID / Privado ID](https://docs.privado.id) | Wallet / SDK / on-chain registry separation |
| [Ethereum Attestation Service](https://attest.org) | Minimal on-chain attestation footprint |
| [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/) | Credential schema and proof request structure |
| [OID4VP](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) | Proof request/response channel design |
| [circom + snarkjs](https://docs.circom.io) | Merkle inclusion proof circuit structure |

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [`docs/architecture.md`](docs/architecture.md) | Deep-dive: system design, data flows, predicate proof design, upgrade paths |
| [`docs/sdk-integration-guide.md`](docs/sdk-integration-guide.md) | SDK API reference for third-party developers |
| [`docs/assumptions.md`](docs/assumptions.md) | Complete list of what is simulated vs. real |
| [`contracts/README.md`](contracts/README.md) | Smart contract ABI, constructor args, verification commands |
| [`packages/verifier-sdk/README.md`](packages/verifier-sdk/README.md) | SDK installation and usage docs |

---

*Built on Ethereum Sepolia. Testnet only. Not for production use.*
