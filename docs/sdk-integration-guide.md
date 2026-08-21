# SDK Integration Guide — @zk-kyc/verifier-sdk

This guide is the complete reference for third-party developers integrating ZK-KYC
credential verification into their applications. You do NOT need access to the wallet
codebase to integrate the SDK.

---

## Installation

```bash
npm install @zk-kyc/verifier-sdk
# or
pnpm add @zk-kyc/verifier-sdk
```

**Prerequisites**: Node.js 18+, `ethers` v6 (peer dependency)

---

## Quick Start

```typescript
import { requestProof, verifyProof } from '@zk-kyc/verifier-sdk';

// Contract addresses (Ethereum Sepolia testnet)
const ISSUER_REGISTRY_ADDRESS = '0x...';  // from contracts/README.md
const CREDENTIAL_STATUS_ADDRESS = '0x...'; // from contracts/README.md
const ISSUER_ADDRESS = '0x...';           // from mock issuer /issuer-info

// Step 1: Request a proof
const { qrPayload, requestId, proofRequest } = await requestProof({
  verifierName: 'My Loan App',
  issuerAddress: ISSUER_ADDRESS,
  documentType: 'MARKSHEET',
  predicates: [
    { field: 'cgpa', operator: 'gte', value: 8 }
  ],
  callbackOrigin: 'http://localhost:5174',
  relayUrl: 'http://localhost:5174/api/relay',
  expirySeconds: 600, // 10 minutes
});

// Step 2: Display QR code to wallet holder
document.querySelector('#qr').src = qrPayload.qrDataUrl;
// OR: redirect to walletUrl for mobile
// window.location.href = qrPayload.walletUrl;

// Step 3: Wait for proof (poll relay endpoint)
const proof = await pollRelayForProof(requestId);

// Step 4: Verify proof — NO backend call required
const result = await verifyProof(proof, {
  issuerRegistryAddress: ISSUER_REGISTRY_ADDRESS,
  credentialStatusAddress: CREDENTIAL_STATUS_ADDRESS,
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com', // free, no API key
});

if (result.valid) {
  console.log('Proof valid! Credential predicate satisfied.');
} else {
  console.error('Proof invalid:', result.reason);
}
```

---

## API Reference

### `requestProof(config: RequestProofConfig): Promise<RequestProofResult>`

Constructs a proof request and generates a QR code for the wallet to scan.

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `verifierName` | `string` | ✓ | Human-readable name of your app |
| `issuerAddress` | `string` | ✓ | Ethereum address of the expected issuer |
| `documentType` | `'MARKSHEET' \| 'INCOME_CERTIFICATE'` | ✓ | Document type to prove from |
| `predicates` | `FieldPredicate[]` | ✓ | List of field predicates to prove |
| `callbackOrigin` | `string` | ✓ | Your app's origin (for CORS/postMessage) |
| `relayUrl` | `string` | ✓ | Endpoint where wallet POSTs the proof |
| `verifierAddress` | `string` | ✗ | Your Ethereum address (for audit) |
| `expirySeconds` | `number` | ✗ | Request expiry in seconds (default: 600) |

**Returns:**

```typescript
{
  requestId: string;        // UUID — use to identify the proof in relay
  proofRequest: ProofRequest; // Full request object
  qrPayload: {
    encodedRequest: string; // base64url JSON of ProofRequest
    walletUrl: string;      // Full URL for wallet navigation
    qrDataUrl: string;      // PNG QR code as data URL
  };
}
```

---

### `verifyProof(proof: ProofPayload, options: VerifyProofOptions): Promise<VerificationResult>`

Verifies a proof returned by the wallet. Performs all checks client-side.

**Checks performed (in order):**

1. **Merkle inclusion proofs** — re-computes root from leaf + siblings, checks it matches `credentialRoot`
2. **Field hash** — for `eq` proofs, verifies `SHA-256(key:value) = leaf.hash`
3. **Predicate witness** — for threshold proofs, checks commitment format
4. **Issuer signature** — ECDSA signature from issuer is valid
5. **Issuer trust** — `IssuerRegistry.isTrustedIssuer(issuerAddress)` [on-chain read]
6. **Credential status** — `CredentialStatus.isActive(credentialRoot)` [on-chain read]

**Options:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `issuerRegistryAddress` | `string` | ✓ | Deployed IssuerRegistry address |
| `credentialStatusAddress` | `string` | ✓ | Deployed CredentialStatus address |
| `rpcUrl` | `string` | ✗ | JSON-RPC URL (default: Sepolia public) |
| `skipOnChainChecks` | `boolean` | ✗ | Skip on-chain reads (offline testing) |

**Returns:**

```typescript
{
  valid: boolean;
  reason?: string;          // Human-readable failure reason
  checks: {
    merkleProofValid: boolean;
    predicateValid: boolean | null;   // null if no predicates
    issuerSignatureValid: boolean;
    issuerTrusted: boolean;
    credentialActive: boolean;
  };
}
```

---

## Predicate Operators

| Operator | Meaning | Value Hidden? |
|----------|---------|---------------|
| `eq` | field === value | No (value revealed) |
| `gte` | field >= value | Yes (commitment only) |
| `lte` | field <= value | Yes (commitment only) |
| `gt` | field > value | Yes (commitment only) |
| `lt` | field < value | Yes (commitment only) |
| `range` | min <= field <= max | Yes (commitment only) |

For threshold predicates, the exact field value is NOT revealed in the proof payload.
Only a Poseidon-style commitment is included. See `docs/architecture.md` for the
production Groth16 upgrade path.

---

## Proof Request Schema

```typescript
interface ProofRequest {
  requestId: string;
  verifierName: string;
  verifierAddress?: string;
  issuerAddress: string;
  documentType: 'MARKSHEET' | 'INCOME_CERTIFICATE';
  predicates: FieldPredicate[];
  callbackOrigin: string;
  relayUrl: string;
  expiresAt: string;         // ISO 8601
  schemaVersion: '1.0';
}

interface FieldPredicate {
  field: string;             // e.g. 'cgpa', 'annualIncome'
  operator: 'eq' | 'gte' | 'lte' | 'gt' | 'lt' | 'range';
  value?: number | string;   // For single-bound operators
  min?: number;              // For 'range'
  max?: number;              // For 'range'
}
```

---

## Proof Payload Schema

```typescript
interface ProofPayload {
  requestId: string;
  credentialId: string;
  credentialRoot: string;    // bytes32 hex (0x-prefixed)
  issuerAddress: string;
  issuerSignature: string;   // ECDSA signature (EIP-191)
  fieldProofs: FieldProof[];
  generatedAt: string;       // ISO 8601
  schemaVersion: '1.0';
}

interface FieldProof {
  fieldKey: string;
  predicate: FieldPredicate;
  merkleProof: MerkleProof;
  revealedValue: FieldValue | null; // null for threshold proofs
  predicateWitness: PredicateWitness | null;
}
```

---

## Relay Pattern

The SDK uses a relay pattern to return proofs from the wallet to the verifier:

1. Your verifier app exposes `POST /api/relay` endpoint
2. The wallet POSTs `{ requestId, proof }` to this endpoint when proof is approved
3. Your verifier app polls or listens for proofs at this endpoint
4. Match by `requestId` to the original `requestProof()` call

**Example relay server (Express):**

```typescript
import express from 'express';
const app = express();
const proofStore = new Map();

app.post('/api/relay', express.json(), (req, res) => {
  const { requestId, proof } = req.body;
  proofStore.set(requestId, proof);
  res.json({ ok: true });
});

app.get('/api/relay/:requestId', (req, res) => {
  const proof = proofStore.get(req.params.requestId);
  if (proof) res.json({ proof });
  else res.status(404).json({ error: 'Proof not yet available' });
});
```

---

## Testnet Contract Addresses

Network: **Ethereum Sepolia** (Chain ID: 11155111)
RPC: `https://ethereum-sepolia-rpc.publicnode.com` (free, no API key)

| Contract | Address | Explorer |
|----------|---------|---------|
| IssuerRegistry | `0x4059CDA0a6b67e5FA70e3689767a53E95DE022e2` | [sepolia.etherscan.io](https://sepolia.etherscan.io/address/0x4059CDA0a6b67e5FA70e3689767a53E95DE022e2) |
| CredentialStatus | `0xDDD18e10FC082911e30428B5EDAbd21AaF098822` | [sepolia.etherscan.io](https://sepolia.etherscan.io/address/0xDDD18e10FC082911e30428B5EDAbd21AaF098822) |

---

## See Also

- `docs/architecture.md` — System architecture and data flow
- `docs/assumptions.md` — What is simulated vs. real
- `packages/verifier-sdk/examples/mock-verifier-app` — Full working example
