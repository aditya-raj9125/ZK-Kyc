import type { DocumentField, MerkleLeaf, FieldPredicate } from '@zk-kyc/shared-types';

import { MerkleTree, hashField } from '../src/merkle/tree';
import {
  generateEqProof,
  generatePredicateProof,
  verifyFieldProof,
  evaluatePredicate,
} from '../src/predicates/index';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const FIELDS: DocumentField[] = [
  { key: 'studentName', value: 'Priya Mehta' },
  { key: 'cgpa', value: 8.9 },
  { key: 'annualIncome', value: 420000 },
  { key: 'year', value: 2024 },
];

function makeLeavesFromFields(fields: DocumentField[]): MerkleLeaf[] {
  return fields.map((f, index) => ({
    index,
    fieldKey: f.key,
    hash: hashField(f),
  }));
}

const tree = MerkleTree.fromFields(FIELDS);
const leaves = makeLeavesFromFields(FIELDS);

// ─────────────────────────────────────────────────────────────────────────────
// evaluatePredicate tests
// ─────────────────────────────────────────────────────────────────────────────

describe('evaluatePredicate', () => {
  it('eq: true when values match', () => {
    expect(evaluatePredicate({ field: 'year', operator: 'eq', value: 2024 }, 2024)).toBe(true);
  });

  it('eq: false when values differ', () => {
    expect(evaluatePredicate({ field: 'year', operator: 'eq', value: 2023 }, 2024)).toBe(false);
  });

  it('gte: true when value equals threshold', () => {
    expect(evaluatePredicate({ field: 'cgpa', operator: 'gte', value: 8.9 }, 8.9)).toBe(true);
  });

  it('gte: true when value exceeds threshold', () => {
    expect(evaluatePredicate({ field: 'cgpa', operator: 'gte', value: 8 }, 8.9)).toBe(true);
  });

  it('gte: false when value below threshold', () => {
    expect(evaluatePredicate({ field: 'cgpa', operator: 'gte', value: 9 }, 8.9)).toBe(false);
  });

  it('lte: true when value below threshold', () => {
    expect(
      evaluatePredicate({ field: 'income', operator: 'lte', value: 500000 }, 420000),
    ).toBe(true);
  });

  it('lte: false when value above threshold', () => {
    expect(
      evaluatePredicate({ field: 'income', operator: 'lte', value: 400000 }, 420000),
    ).toBe(false);
  });

  it('gt: true when value strictly above', () => {
    expect(evaluatePredicate({ field: 'cgpa', operator: 'gt', value: 8 }, 8.9)).toBe(true);
  });

  it('gt: false when equal', () => {
    expect(evaluatePredicate({ field: 'cgpa', operator: 'gt', value: 8.9 }, 8.9)).toBe(false);
  });

  it('lt: true when value strictly below', () => {
    expect(evaluatePredicate({ field: 'cgpa', operator: 'lt', value: 9 }, 8.9)).toBe(true);
  });

  it('range: true when value within bounds', () => {
    expect(
      evaluatePredicate({ field: 'income', operator: 'range', min: 300000, max: 500000 }, 420000),
    ).toBe(true);
  });

  it('range: false when value below min', () => {
    expect(
      evaluatePredicate({ field: 'income', operator: 'range', min: 500000, max: 700000 }, 420000),
    ).toBe(false);
  });

  it('range: false when value above max', () => {
    expect(
      evaluatePredicate({ field: 'income', operator: 'range', min: 100000, max: 400000 }, 420000),
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateEqProof tests
// ─────────────────────────────────────────────────────────────────────────────

describe('generateEqProof', () => {
  it('generates a proof with a revealed value', () => {
    const field = FIELDS[3]!; // year = 2024
    const predicate: FieldPredicate = { field: 'year', operator: 'eq', value: 2024 };
    const proof = generateEqProof(field, predicate, tree, leaves);

    expect(proof.revealedValue).toBe(2024);
    expect(proof.predicateWitness).toBeNull();
    expect(proof.fieldKey).toBe('year');
  });

  it('throws when called with non-eq operator', () => {
    const field = FIELDS[1]!;
    const predicate: FieldPredicate = { field: 'cgpa', operator: 'gte', value: 8 };
    expect(() => generateEqProof(field, predicate, tree, leaves)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generatePredicateProof tests
// ─────────────────────────────────────────────────────────────────────────────

describe('generatePredicateProof', () => {
  it('generates a threshold proof without revealing the value', () => {
    const field = FIELDS[1]!; // cgpa = 8.9
    const predicate: FieldPredicate = { field: 'cgpa', operator: 'gte', value: 8 };
    const proof = generatePredicateProof(field, predicate, tree, leaves);

    expect(proof.revealedValue).toBeNull(); // value hidden
    expect(proof.predicateWitness).not.toBeNull();
    expect(proof.predicateWitness?.proofMethod).toBe('poseidon-commitment-v1');
  });

  it('throws when the predicate is not satisfied', () => {
    const field = FIELDS[1]!; // cgpa = 8.9
    const predicate: FieldPredicate = { field: 'cgpa', operator: 'gte', value: 9.5 }; // 8.9 < 9.5
    expect(() => generatePredicateProof(field, predicate, tree, leaves)).toThrow();
  });

  it('throws for non-numeric field with threshold predicate', () => {
    const field = FIELDS[0]!; // studentName = string
    const predicate: FieldPredicate = { field: 'studentName', operator: 'gte', value: 8 };
    expect(() => generatePredicateProof(field, predicate, tree, leaves)).toThrow();
  });

  it('generates unique commitments for the same input (random salt)', () => {
    const field = FIELDS[2]!; // annualIncome = 420000
    const predicate: FieldPredicate = { field: 'annualIncome', operator: 'lte', value: 500000 };
    const proof1 = generatePredicateProof(field, predicate, tree, leaves);
    const proof2 = generatePredicateProof(field, predicate, tree, leaves);
    // Different salts → different commitments
    expect(proof1.predicateWitness?.commitment).not.toBe(proof2.predicateWitness?.commitment);
    expect(proof1.predicateWitness?.salt).not.toBe(proof2.predicateWitness?.salt);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// verifyFieldProof tests
// ─────────────────────────────────────────────────────────────────────────────

describe('verifyFieldProof', () => {
  it('verifies a valid eq proof', () => {
    const field = FIELDS[3]!; // year = 2024
    const predicate: FieldPredicate = { field: 'year', operator: 'eq', value: 2024 };
    const proof = generateEqProof(field, predicate, tree, leaves);
    const result = verifyFieldProof(proof);
    expect(result.valid).toBe(true);
  });

  it('rejects an eq proof with wrong revealed value', () => {
    const field = FIELDS[3]!;
    const predicate: FieldPredicate = { field: 'year', operator: 'eq', value: 2024 };
    const proof = generateEqProof(field, predicate, tree, leaves);
    const tampered = { ...proof, revealedValue: 2023 };
    const result = verifyFieldProof(tampered);
    expect(result.valid).toBe(false);
  });

  it('verifies a valid gte predicate proof', () => {
    const field = FIELDS[1]!; // cgpa = 8.9
    const predicate: FieldPredicate = { field: 'cgpa', operator: 'gte', value: 8 };
    const proof = generatePredicateProof(field, predicate, tree, leaves);
    const result = verifyFieldProof(proof);
    expect(result.valid).toBe(true);
  });

  it('verifies a valid lte income proof', () => {
    const field = FIELDS[2]!; // annualIncome = 420000
    const predicate: FieldPredicate = { field: 'annualIncome', operator: 'lte', value: 500000 };
    const proof = generatePredicateProof(field, predicate, tree, leaves);
    const result = verifyFieldProof(proof);
    expect(result.valid).toBe(true);
  });

  it('rejects a proof with tampered Merkle root', () => {
    const field = FIELDS[1]!;
    const predicate: FieldPredicate = { field: 'cgpa', operator: 'gte', value: 8 };
    const proof = generatePredicateProof(field, predicate, tree, leaves);
    const tampered = {
      ...proof,
      merkleProof: { ...proof.merkleProof, root: 'a'.repeat(64) },
    };
    const result = verifyFieldProof(tampered);
    expect(result.valid).toBe(false);
  });

  it('rejects a threshold proof with missing witness', () => {
    const field = FIELDS[1]!;
    const predicate: FieldPredicate = { field: 'cgpa', operator: 'gte', value: 8 };
    const proof = generatePredicateProof(field, predicate, tree, leaves);
    const tampered = { ...proof, predicateWitness: null };
    const result = verifyFieldProof(tampered);
    expect(result.valid).toBe(false);
  });
});
