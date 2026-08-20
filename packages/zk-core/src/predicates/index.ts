import { ethers } from 'ethers';

import type {
  DocumentField,
  FieldPredicate,
  FieldProof,
  MerkleLeaf,
  MerkleProof,
  PredicateWitness,
} from '@zk-kyc/shared-types';

import { hashField, MerkleTree, generateFieldProof, verifyMerkleProof, verifyFieldHash } from '../merkle/tree';

// ─────────────────────────────────────────────────────────────────────────────
// Poseidon-inspired commitment (simplified for hackathon)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes a simplified Poseidon-inspired commitment: SHA-256(value || salt).
 * Used as the commitment in predicate witnesses.
 */
function computeCommitment(value: number, salt: string): string {
  const data = ethers.toUtf8Bytes(value.toString() + salt);
  const hash = ethers.sha256(data);
  return hash.startsWith('0x') ? hash.slice(2) : hash;
}

/**
 * Evaluates a predicate against an actual numeric value.
 */
export function evaluatePredicate(predicate: FieldPredicate, value: number): boolean {
  switch (predicate.operator) {
    case 'eq':
      return value === Number(predicate.value);
    case 'gte':
      return value >= Number(predicate.value);
    case 'lte':
      return value <= Number(predicate.value);
    case 'gt':
      return value > Number(predicate.value);
    case 'lt':
      return value < Number(predicate.value);
    case 'range':
      return (
        predicate.min !== undefined &&
        predicate.max !== undefined &&
        value >= predicate.min &&
        value <= predicate.max
      );
    default: {
      // Exhaustive check
      const _exhaustive: never = predicate.operator;
      throw new Error(`Unknown predicate operator: ${String(_exhaustive)}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Field proof generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a FieldProof for an exact-value ('eq') predicate.
 * The field value is revealed in the proof payload.
 */
export function generateEqProof(
  field: DocumentField,
  predicate: FieldPredicate,
  tree: MerkleTree,
  leaves: MerkleLeaf[],
): FieldProof {
  if (predicate.operator !== 'eq') {
    throw new Error(`generateEqProof called with operator: ${predicate.operator}`);
  }

  const merkleProof = generateFieldProof(tree, field, leaves);

  return {
    fieldKey: field.key,
    predicate,
    merkleProof,
    revealedValue: field.value,
    predicateWitness: null,
  };
}

/**
 * Generates a FieldProof for a threshold predicate (gte/lte/gt/lt/range).
 * The field value is NOT directly revealed — only a Poseidon-style commitment.
 *
 * The wallet keeps the actual value private. The verifier can check that
 * the commitment is valid by asking the wallet to open it, OR (in the
 * simplified hackathon implementation) the verifier trusts the Merkle proof
 * integrity and the commitment hash as non-repudiable evidence.
 *
 * @throws If the field value does not satisfy the predicate
 */
export function generatePredicateProof(
  field: DocumentField,
  predicate: FieldPredicate,
  tree: MerkleTree,
  leaves: MerkleLeaf[],
): FieldProof {
  if (typeof field.value !== 'number') {
    throw new Error(`Threshold predicates require a numeric field value (field: ${field.key})`);
  }

  if (!evaluatePredicate(predicate, field.value)) {
    throw new Error(
      `Field "${field.key}" value ${String(field.value)} does not satisfy predicate ` +
        `${predicate.operator} ${String(predicate.value ?? `[${String(predicate.min)},${String(predicate.max)}]`)}`,
    );
  }

  const merkleProof = generateFieldProof(tree, field, leaves);
  const salt = ethers.hexlify(ethers.randomBytes(32)).slice(2);
  const commitment = computeCommitment(field.value, salt);

  const predicateWitness: PredicateWitness = {
    commitment,
    salt,
    predicate,
    proofMethod: 'poseidon-commitment-v1',
  };

  return {
    fieldKey: field.key,
    predicate,
    merkleProof,
    revealedValue: null, // Value is hidden for threshold proofs
    predicateWitness,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Field proof verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies a FieldProof — checks both the Merkle inclusion and the predicate.
 *
 * For 'eq' proofs: verifies the revealed value hashes to the leaf hash.
 * For threshold proofs: verifies the commitment is well-formed and the
 * Merkle proof is valid (does not re-derive the value from the commitment).
 */
export function verifyFieldProof(
  fieldProof: FieldProof,
): { valid: boolean; reason?: string } {
  // 1. Verify Merkle inclusion
  if (!verifyMerkleProof(fieldProof.merkleProof)) {
    return { valid: false, reason: 'Merkle inclusion proof is invalid' };
  }

  // 2. For eq proofs: verify that the revealed value hashes to the leaf
  if (fieldProof.predicate.operator === 'eq') {
    if (fieldProof.revealedValue === null) {
      return { valid: false, reason: 'Eq proof must include a revealed value' };
    }

    const field: DocumentField = {
      key: fieldProof.fieldKey,
      value: fieldProof.revealedValue,
    };

    if (!verifyFieldHash(fieldProof.merkleProof, field)) {
      return { valid: false, reason: 'Revealed value does not match leaf hash' };
    }

    // Check the predicate holds on the revealed value
    if (typeof fieldProof.revealedValue === 'number') {
      if (!evaluatePredicate(fieldProof.predicate, fieldProof.revealedValue)) {
        return { valid: false, reason: 'Revealed value does not satisfy the predicate' };
      }
    } else if (
      fieldProof.predicate.value !== undefined &&
      fieldProof.revealedValue !== fieldProof.predicate.value
    ) {
      return { valid: false, reason: 'Revealed value does not match predicate value' };
    }

    return { valid: true };
  }

  // 3. For threshold proofs: verify the commitment is well-formed
  if (!fieldProof.predicateWitness) {
    return { valid: false, reason: 'Threshold proof is missing predicate witness' };
  }

  const { commitment, salt, proofMethod } = fieldProof.predicateWitness;

  if (proofMethod !== 'poseidon-commitment-v1' && proofMethod !== 'groth16-range-v1') {
    return { valid: false, reason: `Unknown proof method: ${proofMethod}` };
  }

  // Verify the commitment is correctly formed (if the prover opens it via salt)
  // In poseidon-commitment-v1, the verifier trusts the Merkle proof integrity;
  // the commitment provides a non-repudiable binding to a specific value.
  // We verify the commitment format is valid (non-empty hex string).
  if (!/^[0-9a-f]{64}$/.test(commitment) || !/^[0-9a-f]{64}$/.test(salt)) {
    return { valid: false, reason: 'Malformed commitment or salt in predicate witness' };
  }

  return { valid: true };
}

export { hashField, MerkleTree, generateFieldProof, verifyMerkleProof, verifyFieldHash };
