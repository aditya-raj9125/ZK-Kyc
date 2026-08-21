# ZK-KYC — Zero-Knowledge Identity Wallet & Verifier SDK

<div align="center">

**A privacy-preserving digital credential wallet with selective-disclosure proofs**  
*Prove what you know without revealing what you hold.*

[![Network](https://img.shields.io/badge/Network-Ethereum%20Sepolia%20(11155111)-6366f1?style=for-the-badge&logo=ethereum&logoColor=white)](https://sepolia.etherscan.io)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity&logoColor=white)](https://soliditylang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14%20(App%20Router)-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![pnpm](https://img.shields.io/badge/pnpm-Monorepo-f69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io)
[![Tests](https://img.shields.io/badge/Tests-87%20Passing-22c55e?style=for-the-badge&logo=vitest&logoColor=white)](https://github.com)

</div>

---

## 🌟 Executive Overview

ZK-KYC is a **user-controlled digital credential wallet** and **client-side verification SDK** featuring a **zero-knowledge selective-disclosure layer**. It is engineered as a privacy-first extension to national identity infrastructures like **DigiLocker** and **NAD** (National Academic Depository).

### The Privacy Problem
Traditional KYC requires users to upload full PDFs or scans of government IDs. This leaks sensitive personal identifiable information (PII) such as full names, Aadhaar/ID numbers, home addresses, dates of birth, and exact financial figures to third parties that only need to confirm a single eligibility rule.

### The ZK-KYC Solution
With ZK-KYC:
1. **Self-Sovereign Storage**: Only cryptographic leaf hashes and the signed Merkle root are stored on the user's device. No raw documents are ever uploaded to a central server.
2. **Selective Disclosure & Predicate Proofs**: Users can cryptographically prove specific conditions (*"annualIncome ≥ 8 LPA"* or *"CGPA ≥ 8.0"*) without revealing exact numbers or any other credential fields.
3. **Standalone Verifier SDK**: Any third-party application can integrate verification with 3 lines of code. Verification runs client-side with zero backend dependencies, anchored by live smart contracts on **Ethereum Sepolia**.

> 💡 **Core Architecture Principle**: Strict separation of concerns — **Wallet ≠ Verifier**. The wallet manages identity and approves disclosures; verifier applications only consume proofs via the installable SDK.

---

## 🏛️ Interactive System Architecture

```mermaid
flowchart TD
    %% Styling Classes
    classDef l4 fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff;
    classDef l3 fill:#14532d,stroke:#4ade80,stroke-width:2px,color:#dcfce7;
    classDef l2 fill:#3b0764,stroke:#c084fc,stroke-width:2px,color:#fae8ff;
    classDef l1a fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#fdf2f8;
    classDef l1b fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#e0f2fe;
    classDef bridge fill:#111827,stroke:#64748b,stroke-width:1px,stroke-dasharray: 4 4,color:#94a3b8;

    subgraph L4 ["📱 LAYER 4: Verifier SDK & Third-Party Integration"]
        SDK["📦 @zk-kyc/verifier-sdk<br/>• requestProof() • verifyProof()"]:::l4
        App["🔍 Mock Verifier App (Port 5174)<br/>• QR Generator • Predicate Selector"]:::l4
        App -->|"Calls API"| SDK
    end

    subgraph L3 ["⚡ LAYER 3: Cryptographic Core Engine"]
        ZK["📐 @zk-kyc/zk-core<br/>• SHA-256 Merkle Tree Engine<br/>• Leaf Inclusion Proofs<br/>• Predicate Witness Generator"]:::l3
    end

    subgraph L2 ["👛 LAYER 2: Self-Sovereign Identity Wallet"]
        WalletApp["🔐 Next.js 14 Wallet App (Port 3000)<br/>• RainbowKit + Wagmi Connector<br/>• Credential Dashboard<br/>• Interactive Proof Approval UI"]:::l2
        Store[("💾 Local Storage<br/>(Hashes + Roots Only)")]:::l2
        WalletApp <-->|"Read / Write"| Store
    end

    subgraph L1 ["⛓️ LAYER 1: Trust Anchors & Identity Issuance"]
        subgraph L1A ["🏛️ Layer 1a: Issuer Authority"]
            Issuer["🏢 Mock DigiLocker Issuer (Port 3001)<br/>• REST API: /issue /revoke<br/>• Merkle Builder & ECDSA Signer"]:::l1a
        end
        subgraph L1B ["🌐 Layer 1b: Ethereum Sepolia (11155111)"]
            Registry["📜 IssuerRegistry.sol<br/>0x4059CDA0a6b67e5FA70e3689767a53E95DE022e2"]:::l1b
            Status["📜 CredentialStatus.sol<br/>0xDDD18e10FC082911e30428B5EDAbd21AaF098822"]:::l1b
        end
    end

    %% Inter-layer connections
    Issuer -.->|"Signs Root & Registers"| Registry
    Issuer -.->|"Anchors / Revokes"| Status

    WalletApp -->|"1. Request Credential"| Issuer
    Issuer -->|"2. Return Signed Merkle Root"| WalletApp

    App -->|"3. QR / Deep-link Request"| WalletApp
    WalletApp -->|"4. Merkle Math & Proof Gen"| ZK
    WalletApp -->|"5. Proof Payload (Relay / Broadcast)"| App

    SDK -->|"6. Verify Merkle Proof"| ZK
    SDK -->|"7. Check Trusted Issuer"| Registry
    SDK -->|"8. Check Revocation Status"| Status
```

---

## 🌲 Merkle Tree & Selective Disclosure Mechanics

How a 4-field credential proves a single condition without revealing any other data:

```mermaid
flowchart TD
    classDef disclosed fill:#064e3b,stroke:#10b981,stroke-width:3px,color:#d1fae7,font-weight:bold;
    classDef hidden fill:#450a0a,stroke:#ef4444,stroke-width:1px,stroke-dasharray: 4 4,color:#fee2e2;
    classDef sibling fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff;
    classDef rootNode fill:#312e81,stroke:#6366f1,stroke-width:3px,color:#ffffff,font-weight:bold;

    subgraph Fields ["📄 Document Fields (Private in Wallet)"]
        F0["studentName: 'Arjun Sharma'"]:::hidden
        F1["cgpa: 8.7 (Matches: gte 8.0)"]:::disclosed
        F2["rollNumber: 'CS2021001'"]:::hidden
        F3["year: 2024"]:::hidden
    end

    subgraph Leaves ["🌱 Merkle Leaf Hashes"]
        H0["H₀ = SHA-256(studentName)"]:::sibling
        H1["H₁ = SHA-256(cgpa)"]:::disclosed
        H2["H₂ = SHA-256(rollNumber)"]:::hidden
        H3["H₃ = SHA-256(year)"]:::hidden
    end

    subgraph Tree ["🌳 Tree Aggregation"]
        H01["H₀₁ = SHA-256(H₀ + H₁)"]:::disclosed
        H23["H₂₃ = SHA-256(H₂ + H₃)"]:::sibling
        Root["👑 Merkle Root = SHA-256(H₀₁ + H₂₃)<br/>(Signed by Issuer on Sepolia)"]:::rootNode
    end

    F0 --> H0
    F1 --> H1
    F2 --> H2
    F3 --> H3

    H0 --> H01
    H1 --> H01
    H2 --> H23
    H3 --> H23

    H01 --> Root
    H23 --> Root

    subgraph ProofPayload ["📦 Proof Transmitted to Verifier"]
        direction LR
        P1["Disclosed: Predicate (gte 8.0)"]:::disclosed
        P2["Proof Sibling 1: H₀"]:::sibling
        P3["Proof Sibling 2: H₂₃"]:::sibling
        P4["Issuer ECDSA Signature"]:::rootNode
    end
```

> **Privacy Guarantee**: The verifier receives only `H₀` and `H₂₃` along with `H₁`. The verifier computes `SHA-256(H₀ + H₁) = H₀₁` and `SHA-256(H₀₁ + H₂₃) = Root`. The root matches the issuer's on-chain signature, yet the verifier learns **nothing** about `studentName`, `rollNumber`, or `year`.

---

## 🔄 End-to-End Interactive Sequence Flows

### 1. Credential Issuance Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Wallet User
    participant Wallet as 👛 Wallet App (Port 3000)
    participant Issuer as 🏛️ Mock Issuer (Port 3001)
    participant Sepolia as ⛓️ Ethereum Sepolia

    User->>Wallet: Connect Web3 Wallet (MetaMask / Rainbow)
    User->>Wallet: Click "Issue Credential" (e.g. Income Certificate)
    Wallet->>Issuer: POST /issue { holderAddress, documentType }
    
    activate Issuer
    Note over Issuer: 1. Extract template fields<br/>2. Compute SHA-256 hash per field<br/>3. Construct Merkle Tree<br/>4. Sign keccak256(root, holder, date) with ECDSA
    Issuer-->>Sepolia: (Optional) anchorCredential(merkleRoot)
    Issuer-->>Wallet: Return SignedCredential { leaves, merkleRoot, signature, issuerAddress }
    deactivate Issuer

    activate Wallet
    Note over Wallet: Store SignedCredential + field hashes<br/>in local browser storage.<br/>Raw PII is not sent anywhere!
    Wallet-->>User: Display Credential Card in Dashboard ✅
    deactivate Wallet
```

---

### 2. Zero-Knowledge Proof Request & Generation Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Wallet User
    participant Verifier as 🔍 Mock Verifier (Port 5174)
    participant SDK as 📦 @zk-kyc/verifier-sdk
    participant Wallet as 👛 Wallet App (Port 3000)
    participant Relay as 🔄 Dev Relay / BroadcastChannel

    Verifier->>SDK: requestProof({ verifierName, docType, predicates, relayUrl })
    activate SDK
    SDK-->>Verifier: Return { qrDataUrl, walletUrl, requestId }
    deactivate SDK

    Verifier->>Verifier: Render QR Code & "Open in Wallet" Deep Link
    Verifier->>Relay: Start polling /api/relay/:requestId & listen to BroadcastChannel

    User->>Wallet: Scan QR or Click Deep Link (?proofRequest=...)
    activate Wallet
    Wallet->>Wallet: Decode Base64URL ProofRequest payload
    Wallet->>Wallet: Match request with local stored credentials
    Wallet-->>User: Display Privacy Guarantee & Disclosure Consent Screen
    User->>Wallet: Click "Approve & Generate Proof"
    
    Note over Wallet: 1. Rebuild Merkle tree from hashes<br/>2. Extract sibling path for requested leaf<br/>3. Generate Predicate Proof payload
    
    Wallet->>Relay: 1. Broadcast via BroadcastChannel('zk_kyc_proof_relay')<br/>2. POST to relayUrl (/api/relay)
    Wallet-->>User: Display "Proof Generated" Confirmation ✅
    deactivate Wallet

    Relay-->>Verifier: ProofPayload received in real-time!
```

---

### 3. Proof Verification & Trust Anchoring Flow

```mermaid
sequenceDiagram
    autonumber
    participant Verifier as 🔍 Mock Verifier App
    participant SDK as 📦 @zk-kyc/verifier-sdk
    participant ZK as ⚡ @zk-kyc/zk-core
    participant Sepolia as ⛓️ Ethereum Sepolia RPC

    Verifier->>SDK: verifyProof(proofPayload, { issuerRegistry, credentialStatus, rpcUrl })
    activate SDK

    rect rgb(20, 30, 50)
        Note over SDK,ZK: Step 1: Cryptographic Merkle Verification
        SDK->>ZK: verifyMerkleProof(leafHash, siblingPath, expectedRoot)
        ZK-->>SDK: ✅ Merkle path is cryptographically valid
        SDK->>ZK: verifyPredicateWitness(predicate, leafHash)
        ZK-->>SDK: ✅ Predicate satisfied without revealing raw value
    end

    rect rgb(30, 20, 50)
        Note over SDK,Sepolia: Step 2: On-Chain Trust & Revocation Check
        SDK->>SDK: Recover issuer address from ECDSA signature
        SDK->>Sepolia: IssuerRegistry.isTrustedIssuer(issuerAddress)
        Sepolia-->>SDK: Return true (Issuer is registered on-chain)
        SDK->>Sepolia: CredentialStatus.isActive(credentialRoot)
        Sepolia-->>SDK: Return true (Root is not revoked/suspended)
    end

    SDK-->>Verifier: Return VerificationResult { valid: true, checks: [...] }
    deactivate SDK

    Verifier-->>Verifier: Display "✅ Proof Valid" with cryptographic audit breakdown!
```

---

## 📦 Monorepo Architecture & Directory Map

```
zk-kyc/
├── apps/
│   ├── wallet/                           # Next.js 14 App Router (Port 3000)
│   │   ├── src/app/
│   │   │   ├── page.tsx                  # Interactive landing & onboarding
│   │   │   ├── dashboard/page.tsx        # Credential dashboard & Merkle inspector
│   │   │   ├── proof-request/page.tsx    # Selective disclosure approval screen
│   │   │   └── docs/page.tsx             # Interactive API documentation
│   │   └── src/lib/
│   │       ├── proof-generation.ts       # Browser-safe ZK proof & Base64URL encoder
│   │       ├── credential-store.ts       # LocalStorage abstraction layer
│   │       └── wallet-connect.tsx        # Wagmi / RainbowKit Sepolia provider
│   │
│   └── mock-issuer/                      # Express REST API (Port 3001)
│       └── src/
│           ├── index.ts                  # REST Endpoints: /issue, /revoke, /documents
│           └── documents/templates.ts   # Mock document templates (Income, Marksheet)
│
├── packages/
│   ├── shared-types/                     # TypeScript Canonical Schemas
│   │   └── src/index.ts                 # ProofRequest, SignedCredential, ProofPayload
│   │
│   ├── zk-core/                          # Framework-Agnostic ZK Engine
│   │   ├── src/
│   │   │   ├── merkle/tree.ts            # SHA-256 Merkle tree & inclusion proofs
│   │   │   └── predicates/index.ts       # Range, threshold, & equality proof witnesses
│   │   └── tests/                        # 53 comprehensive unit tests
│   │
│   └── verifier-sdk/                     # Installable Third-Party Verifier SDK
│       ├── src/
│       │   ├── index.ts                  # Public SDK surface
│       │   ├── requestProof.ts           # QR code & deep-link generator
│       │   ├── verifyProof.ts            # Complete verification pipeline
│       │   └── contractReader.ts         # Sepolia on-chain contract readers
│       └── examples/
│           └── mock-verifier-app/        # Standalone Example Verifier (Port 5174)
│               ├── src/App.tsx           # Loan approval demo application
│               └── vite.config.ts        # Built-in /api/relay middleware plugin
│
├── contracts/                            # Solidity & Hardhat Testnet Suite
│   ├── contracts/
│   │   ├── IssuerRegistry.sol            # Trusted issuer whitelist registry
│   │   └── CredentialStatus.sol          # Credential root status & revocation registry
│   ├── scripts/deploy.ts                 # Sepolia deployment script
│   └── test/                             # 34 smart contract unit tests
│
├── docs/                                 # Technical Specifications
│   ├── architecture.md                   # System design, CIRCOM upgrade path
│   ├── sdk-integration-guide.md          # 3rd-party developer quick start
│   └── assumptions.md                    # What is simulated vs. production-grade
│
├── package.json                          # Workspace orchestration
└── pnpm-workspace.yaml                   # Monorepo workspace definition
```

---

## ⛓️ Live Smart Contracts on Ethereum Sepolia

Both trust-anchoring smart contracts are deployed and verified on **Ethereum Sepolia**:

| Contract | Address | Explorer | Description |
|---|---|---|---|
| **`IssuerRegistry`** | `0x4059CDA0a6b67e5FA70e3689767a53E95DE022e2` | [Sepolia Etherscan ↗](https://sepolia.etherscan.io/address/0x4059CDA0a6b67e5FA70e3689767a53E95DE022e2) | Whitelist of certified KYC and educational issuers |
| **`CredentialStatus`** | `0xDDD18e10FC082911e30428B5EDAbd21AaF098822` | [Sepolia Etherscan ↗](https://sepolia.etherscan.io/address/0xDDD18e10FC082911e30428B5EDAbd21AaF098822) | On-chain credential root revocation & suspension tracker |

* **Network**: Ethereum Sepolia (Chain ID: `11155111`)
* **RPC Endpoint**: `https://ethereum-sepolia-rpc.publicnode.com`
* **Testnet Faucet**: [Google Web3 Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

---

## 🚀 Quick Start & Local Setup

### Prerequisites
* **Node.js** 18+
* **pnpm** 8+ (`npm install -g pnpm`)
* **MetaMask** or any Web3 wallet configured to **Ethereum Sepolia**

### 1. Clone & Install
```bash
git clone https://github.com/aditya-raj9125/ZK-Kyc.git
cd ZK-Kyc
pnpm install
```

### 2. Environment Configuration
Copy the environment template:
```bash
cp .env.example .env
```
*(The pre-deployed Sepolia contract addresses are pre-configured, so it works out of the box!)*

### 3. Launch Services
Open **three terminal windows** and run:

```bash
# Terminal 1: Wallet Web Application (Port 3000)
pnpm dev:wallet

# Terminal 2: Mock Issuer Authority API (Port 3001)
pnpm dev:issuer

# Terminal 3: Third-Party Mock Verifier Demo (Port 5174)
pnpm dev:verifier
```

---

## 🧪 Comprehensive Test Suite

```bash
# Run all ZK Core cryptographic math unit tests (53 tests)
pnpm --filter @zk-kyc/zk-core test

# Run all Hardhat smart contract unit tests (34 tests)
pnpm contracts:test

# Compile & validate all monorepo packages (TypeScript check)
pnpm build
```

**Result: 87 / 87 Unit & Integration Tests Passing**

---

## 💻 3-Minute Verifier SDK Integration

Integrate privacy-preserving credential verification into any web or Node.js app:

```bash
npm install @zk-kyc/verifier-sdk
```

### Step 1: Request a Proof
```typescript
import { requestProof } from '@zk-kyc/verifier-sdk';

const { qrDataUrl, walletUrl, requestId } = await requestProof({
  verifierName: 'Fintech Loan App',
  issuerAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  documentType: 'INCOME_CERTIFICATE',
  predicates: [{ field: 'annualIncome', operator: 'gte', value: 800000 }],
  relayUrl: 'https://your-app.com/api/relay',
});

// Render qrDataUrl in an <img> tag or open walletUrl
```

### Step 2: Verify the Received Proof
```typescript
import { verifyProof } from '@zk-kyc/verifier-sdk';

const result = await verifyProof(receivedProofPayload, {
  issuerRegistryAddress: '0x4059CDA0a6b67e5FA70e3689767a53E95DE022e2',
  credentialStatusAddress: '0xDDD18e10FC082911e30428B5EDAbd21AaF098822',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
});

if (result.valid) {
  console.log('✅ Proof verified on-chain! Granting access to user.');
}
```

---

## 📊 Technical Comparison & Production Roadmap

| Feature | Current Implementation (Testnet) | Production Architecture (Roadmap) |
|---|---|---|
| **Selective Disclosure** | SHA-256 Merkle inclusion + commitment witnesses | Groth16 zk-SNARK circuits (Circom + SnarkJS) |
| **Hash Function** | SHA-256 (Web API standard) | Poseidon Hash (ZK-friendly, low-constraint) |
| **Credential Storage** | Local browser storage (`localStorage`) | Encrypted secure enclave / mobile keystore |
| **Issuer Signatures** | ECDSA (secp256k1) | BBS+ Signatures / BLS multi-signatures |
| **Proof Transport** | URL query + `BroadcastChannel` + HTTP relay | DIDComm / W3C OID4VP presentation exchange |
| **On-Chain Settlement** | Ethereum Sepolia Testnet | Ethereum Mainnet / Arbitrum / Polygon zkEVM |

---

## 📚 Technical Documentation Index

* 📖 **[System Architecture & Design Decisions](docs/architecture.md)** — In-depth breakdown of Merkle structures, data models, and Groth16 circuit upgrade specs.
* 🛠️ **[SDK Integration Reference](docs/sdk-integration-guide.md)** — Complete API documentation for `@zk-kyc/verifier-sdk`.
* 🔍 **[Assumptions & Reality Matrix](docs/assumptions.md)** — Transparent inventory of what is simulated vs. real-world production requirements.
* 📜 **[Smart Contract Technical Notes](contracts/README.md)** — Solidity contracts, deployment scripts, and test suite specs.

---

<div align="center">

*Built on Ethereum Sepolia · Hackathon Privacy & Identity Infrastructure Track*

</div>
