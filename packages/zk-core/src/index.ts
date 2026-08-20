/**
 * @module @zk-kyc/zk-core
 *
 * Framework-agnostic ZK and Merkle proof logic for the ZK-KYC system.
 * Imported by apps/wallet (proof generation) and packages/verifier-sdk (verification).
 *
 * Public API surface is intentionally minimal — only export what external
 * packages need. Internal helpers remain private to this module.
 */

// Merkle tree primitives
export { MerkleTree, hashField, hashPair, generateFieldProof, verifyMerkleProof, verifyFieldHash } from './merkle/tree';

// Predicate proof logic
export {
  generateEqProof,
  generatePredicateProof,
  verifyFieldProof,
  evaluatePredicate,
} from './predicates/index';
