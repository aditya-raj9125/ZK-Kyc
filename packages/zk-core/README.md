# @zk-kyc/zk-core

Framework-agnostic Merkle tree and predicate proof logic for the ZK-KYC system. Imported by `apps/wallet` (proof generation) and `packages/verifier-sdk` (verification).

## Purpose

Provides the cryptographic core:
- **Merkle tree** construction from document field hashes
- **Leaf inclusion proof** generation and verification
- **Predicate proofs** (exact-value and threshold)

## API

```typescript
import { MerkleTree, verifyMerkleProof, generateEqProof, generatePredicateProof, verifyFieldProof } from '@zk-kyc/zk-core';

// Build tree from document fields
const tree = MerkleTree.fromFields(fields);
console.log(tree.root); // hex string

// Generate proof for a specific field
const proof = tree.generateProof(leafIndex);

// Verify inclusion
verifyMerkleProof(merkleProof); // boolean

// Generate predicate proofs
const eqProof = generateEqProof(field, { field: 'year', operator: 'eq', value: 2024 }, tree, leaves);
const rangeProof = generatePredicateProof(field, { field: 'cgpa', operator: 'gte', value: 8 }, tree, leaves);
```

## Run Tests

```bash
pnpm --filter @zk-kyc/zk-core test
```

## Design Notes

- SHA-256 leaf hashing: `SHA-256("key:value")`
- Sorted-pair node hashing: `SHA-256(sort(left, right))` — position-independent
- Predicate proofs: Poseidon-commitment-v1 (hackathon); Groth16 upgrade documented
- See `docs/architecture.md §"Predicate Proof Design"` for production upgrade path
