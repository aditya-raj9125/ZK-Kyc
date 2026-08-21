# Assumptions — What Is Simulated vs. Real

This document explicitly lists every assumption and simplification in the ZK-KYC build.
Reviewers and judges should read this to understand the scope and production upgrade path.

---

## Real vs. Simulated

| Component | Status | Notes |
|-----------|--------|-------|
| Merkle tree (SHA-256) | ✅ Real | Standard binary Merkle tree, sorted-pair nodes |
| ECDSA issuer signature | ✅ Real | ethers.js `wallet.signMessage` with EIP-191 |
| Merkle inclusion proof | ✅ Real | Verified by re-computing root from leaf + siblings |
| Predicate commitment | ✅ Real | SHA-256(value, salt) commitment scheme |
| Smart contracts | ✅ Real | Deployed Solidity on Ethereum Sepolia |
| On-chain issuer registry | ✅ Real | `IssuerRegistry.sol` read by verifier SDK |
| On-chain credential status | ✅ Real | `CredentialStatus.sol` read by verifier SDK |
| Full ZK range proof | ❌ Simplified | Commitment scheme used; Groth16 circuit documented as upgrade |
| DigiLocker API | ❌ Simulated | Mock Express REST service mimics the interaction shape |
| OCR/PDF extraction | ❌ Simulated | Structured JSON templates issued directly |
| Real government signing | ❌ Simulated | Mock issuer keypair used |
| DID-based identity | ❌ Simplified | Ethereum addresses used as issuer/holder identifiers |
| OID4VP protocol | ❌ Simplified | URL-param + relay used instead of full OID4VP |
| Proof key management | ❌ Simplified | LocalStorage (testnet/demo only) |

---

## Architecture Assumptions

### 1. Issuer Assumption (Critical — Stated Explicitly)

> **This project assumes that a future DigiLocker/NAD-style government issuer already extracts
> structured fields from documents and signs them.**

In the real system:
- DigiLocker provides authenticated PDF documents to holders
- An issuer service (university, income authority) would extract structured fields (CGPA, income, etc.)
  from these PDFs using OCR or direct database access
- The issuer would then build the Merkle tree and sign the root using their registered keypair

In this build:
- The mock issuer (`apps/mock-issuer`) provides pre-built structured JSON templates
- No real document processing occurs
- The interaction shape (REST API, signed credential response) is realistic

### 2. ZK Proof Assumption

> **The predicate proof is simplified for hackathon scope.**

The `poseidon-commitment-v1` scheme provides:
- Binding of a field value to a commitment (SHA-256 based)
- Merkle inclusion proof that the field exists in the signed tree
- Hiding of the exact value from passive observers of the proof payload

It does NOT provide:
- Full zero-knowledge in the formal sense (a verifier with the salt can open the commitment)
- Succinct proof size (a Groth16 proof would be ~200 bytes regardless of field count)

Production upgrade: Replace with a Groth16 circuit. The `ProofPayload` schema
(`PredicateWitness.proofMethod = 'groth16-range-v1'`) anticipates this without API breakage.

### 3. Storage Assumption

> **Credentials are stored in browser localStorage — testnet/demo only.**

Production alternatives:
- Encrypted keystore in browser (e.g., ethers.js encrypted JSON wallet pattern)
- User-controlled encrypted IPFS storage
- Hardware wallet key derivation for encryption

### 4. Proof Channel Assumption

> **The proof return channel is a simple relay HTTP endpoint — modeled after OID4VP but simplified.**

Production alternative: Full OID4VP with DIF Presentation Exchange, redirect_uri, and
JWT VP Token. The request/response shape mirrors OID4VP closely enough to be upgraded
without redesigning the core.

### 5. On-Chain Assumptions

- Credential roots are anchored on Ethereum Sepolia (testnet, no real value)
- Gas costs are faucet-funded (zero monetary cost as required)
- No mainnet deployment — this is explicitly testnet-only

---

## What This Is NOT

- Not a competitor to DigiLocker — it is a proposed extension layer
- Not a replacement for government document signing infrastructure
- Not production-ready — no security audit, no rate limiting, no DDoS protection
- Not compliant with any KYC regulation — purely a technical demonstration

---

## Production Upgrade Path Summary

1. **ZK proofs**: Replace `poseidon-commitment-v1` with `groth16-range-v1` using circom + snarkjs
2. **Hash function**: Replace SHA-256 leaves with Poseidon (SNARK-friendly)
3. **Proof channel**: Replace URL-param relay with full OID4VP
4. **Storage**: Replace localStorage with encrypted keystore
5. **DID**: Replace Ethereum addresses with W3C DIDs
6. **Issuer**: Replace mock REST with DigiLocker API integration
7. **Audit**: Smart contract security audit before mainnet
