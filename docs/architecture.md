# Architecture — ZK-KYC Wallet & Verifier SDK

## Research Notes

Before implementation, we studied the following systems and note the key patterns we borrowed:

### W3C Verifiable Credentials + OID4VP
- **Pattern borrowed**: The proof request/response channel is modeled after OID4VP presentation requests.
  Our QR code encodes a `ProofRequest` (similar to an OID4VP Authorization Request), the wallet
  approves and returns a `ProofPayload` (similar to an OID4VP VP Token).
- **Our simplification**: We use base64url JSON over a direct URL + postMessage relay instead of
  full OID4VP with DIF Presentation Exchange. Explicitly documented as simplified.

### Polygon ID / Privado ID
- **Pattern borrowed**: Wallet + SDK + on-chain issuer registry separation. Polygon ID's
  identity state anchor maps to our `IssuerRegistry.sol` + `CredentialStatus.sol`.
- **Key difference**: We use Merkle tree selective disclosure instead of Groth16 circuits
  for scope reasons. The upgrade path to circom circuits is documented.

### Ethereum Attestation Service (EAS)
- **Pattern borrowed**: Minimal-footprint on-chain attestations. Our `CredentialStatus.sol`
  stores only a `bytes32 root → Status` mapping, exactly the EAS approach of anchoring
  minimal non-sensitive data on-chain.

### circom + snarkjs
- **Pattern borrowed**: Merkle tree membership proof circuit structure (leaf + siblings + root).
  Our TypeScript Merkle implementation mirrors the circom circuit pattern.
- **Production upgrade**: Replace `packages/zk-core/predicates` with a Groth16 circuit:
  `Poseidon(key, value) = leaf AND value >= threshold` using circomlib's Poseidon and
  range comparison templates.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Verifier SDK (packages/verifier-sdk)              │
│  requestProof() → QR → relay → verifyProof()                │
│  Client-side only, no backend call required for verification │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: ZK Core (packages/zk-core)                        │
│  SHA-256 Merkle tree, leaf inclusion proofs                  │
│  Predicate witnesses (Poseidon-commitment-v1)                │
│  Production upgrade: Groth16 range proofs (circom+snarkjs)  │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Wallet App (apps/wallet) — port 3000              │
│  Next.js 14 + wagmi + RainbowKit                            │
│  Credential dashboard, Merkle visualizer, QR approver       │
│  NO verifier UI — by design                                 │
├─────────────────────────────────────────────────────────────┤
│  Layer 1a: Mock Issuer (apps/mock-issuer) — port 3001       │
│  Express REST: /issue, /revoke, /documents, /issuer-info    │
│  Builds Merkle tree, signs root with ECDSA                  │
│                                                             │
│  Layer 1b: Smart Contracts (contracts/) — Ethereum Sepolia  │
│  IssuerRegistry.sol — trusted issuer mapping                │
│  CredentialStatus.sol — credential root → status            │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Credential Issuance

```
1. Wallet holder calls POST /issue (holderAddress, documentType)
2. Mock issuer:
   a. Selects document template (fields + values)
   b. Computes SHA-256 hash of each "key:value" string → leaves[]
   c. Builds Merkle tree from leaves
   d. Signs keccak256(merkleRoot, holderAddress, issuedAt) with ECDSA
   e. Returns SignedCredential {leaves (hashes only), merkleRoot, signature}
3. Wallet stores SignedCredential + fieldValues locally (localStorage)
4. (Optional) Issuer calls CredentialStatus.anchorCredential(bytes32 root)
```

## Data Flow: Proof Generation

```
1. Verifier app calls requestProof() → ProofRequest (base64url JSON)
2. QR code encodes wallet URL + proof request
3. Wallet decodes ProofRequest, shows user what will be disclosed
4. User approves → wallet:
   a. Rebuilds Merkle tree from stored leaf hashes
   b. Verifies computed root matches stored credentialRoot
   c. For each predicate: generateEqProof() or generatePredicateProof()
   d. Packages into ProofPayload {fieldProofs, credentialRoot, issuerSignature}
5. Wallet POSTs ProofPayload to ProofRequest.relayUrl
6. Verifier app receives proof from relay
```

## Data Flow: Proof Verification

```
verifyProof(proof, options):
  1. For each FieldProof:
     a. verifyMerkleProof() → reconstruct root from leaf + siblings
     b. For 'eq': verifyFieldHash() → SHA-256(key:value) = leaf.hash
     c. verifyFieldProof() → commitment format check for threshold proofs
  2. All fieldProof.merkleProof.root === proof.credentialRoot
  3. Recover signer from ECDSA signature
  4. IssuerRegistry.isTrustedIssuer(proof.issuerAddress) [on-chain read]
  5. CredentialStatus.isActive(proof.credentialRoot) [on-chain read]
  → Returns VerificationResult with per-check breakdown
```

---

## Predicate Proof Design

### Current Implementation (poseidon-commitment-v1)

For threshold predicates (gte/lte/gt/lt/range):
1. Wallet generates salt = random 32 bytes
2. commitment = SHA-256(value || salt)
3. ProofPayload contains: Merkle proof (proves field exists in signed tree) + commitment + salt
4. Verifier checks: Merkle proof valid, commitment format valid
5. Verifier trusts that the Merkle proof integrity binds the commitment to a specific field value

**Limitation**: The verifier cannot independently verify the predicate holds without being
given the actual value (or using the salt to open the commitment). This is not full ZK.
The system provides *privacy from passive observers* (the proof payload doesn't directly
reveal the value) but not ZK in the formal sense.

### Production Upgrade Path (groth16-range-v1)

Replace with a Groth16 circuit proving:
```circom
template CGPAProof(levels) {
  signal input leaf;      // Poseidon(key, value)
  signal input siblings[levels];
  signal input pathIndices[levels];
  signal input root;      // public
  signal input threshold; // public
  signal input value;     // private

  // 1. Verify value hashes to leaf
  component hasher = Poseidon(2);
  hasher.inputs[0] <== fieldKeyHash;
  hasher.inputs[1] <== value;
  leaf === hasher.out;

  // 2. Verify Merkle inclusion
  component merkleChecker = MerkleTreeChecker(levels);
  // ... (circomlib MerkleTreeChecker)

  // 3. Assert predicate
  signal diff <== value - threshold;
  component rangeCheck = Num2Bits(32);
  rangeCheck.in <== diff;
  // diff >= 0 means value >= threshold
}
```

The `PredicateWitness.proofMethod = 'groth16-range-v1'` field in `ProofPayload`
anticipates this upgrade without breaking the SDK API.

---

## Security Considerations (Testnet Build)

1. **No real PII**: All data is mock. No real names, income data, or document numbers.
2. **Testnet keys only**: ISSUER_PRIVATE_KEY is a throwaway faucet-funded key.
3. **LocalStorage**: Field values stored in browser localStorage for proof generation.
   In production: encrypted keystore or user-controlled secure storage.
4. **Merkle tree**: SHA-256 (not SNARK-friendly). Poseidon would be used in production
   for circuit compatibility.
5. **No rate limiting, no auth**: Mock issuer has no auth — any address can issue any credential.
   In production: DigiLocker auth + issuer key management.
