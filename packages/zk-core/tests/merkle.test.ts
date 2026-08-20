import type { DocumentField, MerkleLeaf } from '@zk-kyc/shared-types';

import { MerkleTree, hashField, hashPair, verifyMerkleProof, verifyFieldHash, generateFieldProof } from '../src/merkle/tree';

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const MARKSHEET_FIELDS: DocumentField[] = [
  { key: 'studentName', value: 'Arjun Sharma' },
  { key: 'rollNumber', value: 'CS2021001' },
  { key: 'cgpa', value: 8.7 },
  { key: 'semester', value: 6 },
  { key: 'institution', value: 'IIT Bombay' },
  { key: 'year', value: 2024 },
];

function makeLeavesFromFields(fields: DocumentField[]): MerkleLeaf[] {
  return fields.map((f, index) => ({
    index,
    fieldKey: f.key,
    hash: hashField(f),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// hashField tests
// ─────────────────────────────────────────────────────────────────────────────

describe('hashField', () => {
  it('produces a 64-character hex string', () => {
    const hash = hashField({ key: 'cgpa', value: 8.7 });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', () => {
    const h1 = hashField({ key: 'cgpa', value: 8.7 });
    const h2 = hashField({ key: 'cgpa', value: 8.7 });
    expect(h1).toBe(h2);
  });

  it('differs for different keys', () => {
    const h1 = hashField({ key: 'cgpa', value: 8 });
    const h2 = hashField({ key: 'gpa', value: 8 });
    expect(h1).not.toBe(h2);
  });

  it('differs for different values', () => {
    const h1 = hashField({ key: 'cgpa', value: 8 });
    const h2 = hashField({ key: 'cgpa', value: 9 });
    expect(h1).not.toBe(h2);
  });

  it('handles boolean values', () => {
    const h = hashField({ key: 'verified', value: true });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('handles string values', () => {
    const h = hashField({ key: 'name', value: 'Alice' });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hashPair tests
// ─────────────────────────────────────────────────────────────────────────────

describe('hashPair', () => {
  it('is commutative (order-independent)', () => {
    const a = hashField({ key: 'x', value: 1 });
    const b = hashField({ key: 'y', value: 2 });
    expect(hashPair(a, b)).toBe(hashPair(b, a));
  });

  it('produces distinct output from inputs', () => {
    const a = hashField({ key: 'x', value: 1 });
    const b = hashField({ key: 'y', value: 2 });
    expect(hashPair(a, b)).not.toBe(a);
    expect(hashPair(a, b)).not.toBe(b);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MerkleTree construction tests
// ─────────────────────────────────────────────────────────────────────────────

describe('MerkleTree construction', () => {
  it('builds a tree with the correct number of leaves', () => {
    const tree = MerkleTree.fromFields(MARKSHEET_FIELDS);
    expect(tree.size).toBe(MARKSHEET_FIELDS.length);
  });

  it('produces a deterministic root for the same inputs', () => {
    const tree1 = MerkleTree.fromFields(MARKSHEET_FIELDS);
    const tree2 = MerkleTree.fromFields(MARKSHEET_FIELDS);
    expect(tree1.root).toBe(tree2.root);
  });

  it('produces a different root if a field value changes', () => {
    const original = MerkleTree.fromFields(MARKSHEET_FIELDS);
    const modified = MerkleTree.fromFields([
      ...MARKSHEET_FIELDS.slice(0, 2),
      { key: 'cgpa', value: 9.0 }, // changed from 8.7
      ...MARKSHEET_FIELDS.slice(3),
    ]);
    expect(original.root).not.toBe(modified.root);
  });

  it('throws on empty fields', () => {
    expect(() => MerkleTree.fromFields([])).toThrow();
  });

  it('handles a single leaf', () => {
    const tree = MerkleTree.fromFields([{ key: 'x', value: 1 }]);
    expect(tree.root).toBe(hashField({ key: 'x', value: 1 }));
    expect(tree.size).toBe(1);
  });

  it('handles two leaves', () => {
    const fields: DocumentField[] = [
      { key: 'a', value: 1 },
      { key: 'b', value: 2 },
    ];
    const tree = MerkleTree.fromFields(fields);
    const expectedRoot = hashPair(hashField(fields[0]!), hashField(fields[1]!));
    expect(tree.root).toBe(expectedRoot);
  });

  it('handles odd number of leaves (duplication of last)', () => {
    const fields: DocumentField[] = [
      { key: 'a', value: 1 },
      { key: 'b', value: 2 },
      { key: 'c', value: 3 },
    ];
    const tree = MerkleTree.fromFields(fields);
    // Should not throw and should produce a valid root
    expect(tree.root).toMatch(/^[0-9a-f]{64}$/);
  });

  it('builds from leaf hashes', () => {
    const hashes = MARKSHEET_FIELDS.map((f) => hashField(f));
    const tree1 = MerkleTree.fromFields(MARKSHEET_FIELDS);
    const tree2 = MerkleTree.fromLeafHashes(hashes);
    expect(tree1.root).toBe(tree2.root);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Proof generation tests
// ─────────────────────────────────────────────────────────────────────────────

describe('MerkleTree proof generation', () => {
  const tree = MerkleTree.fromFields(MARKSHEET_FIELDS);
  const leaves = makeLeavesFromFields(MARKSHEET_FIELDS);

  it('generates a proof for the first leaf', () => {
    const proof = tree.generateProof(0);
    expect(proof.siblings.length).toBeGreaterThan(0);
    expect(proof.root).toBe(tree.root);
  });

  it('generates a proof for the last leaf', () => {
    const proof = tree.generateProof(MARKSHEET_FIELDS.length - 1);
    expect(proof.root).toBe(tree.root);
  });

  it('throws for out-of-bounds index', () => {
    expect(() => tree.generateProof(-1)).toThrow();
    expect(() => tree.generateProof(MARKSHEET_FIELDS.length)).toThrow();
  });

  it('generateFieldProof finds the correct leaf by key', () => {
    const cgpaField = MARKSHEET_FIELDS.find((f) => f.key === 'cgpa')!;
    const proof = generateFieldProof(tree, cgpaField, leaves);
    expect(proof.leaf.fieldKey).toBe('cgpa');
    expect(proof.root).toBe(tree.root);
  });

  it('generateFieldProof throws for missing field', () => {
    expect(() =>
      generateFieldProof(tree, { key: 'nonexistent', value: 0 }, leaves),
    ).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Proof verification tests
// ─────────────────────────────────────────────────────────────────────────────

describe('verifyMerkleProof', () => {
  const tree = MerkleTree.fromFields(MARKSHEET_FIELDS);
  const leaves = makeLeavesFromFields(MARKSHEET_FIELDS);

  it('verifies valid proofs for all leaves', () => {
    for (let i = 0; i < MARKSHEET_FIELDS.length; i++) {
      const field = MARKSHEET_FIELDS[i]!;
      const proof = generateFieldProof(tree, field, leaves);
      expect(verifyMerkleProof(proof)).toBe(true);
    }
  });

  it('rejects a proof with a tampered root', () => {
    const field = MARKSHEET_FIELDS[2]!;
    const proof = generateFieldProof(tree, field, leaves);
    const tampered = { ...proof, root: 'a'.repeat(64) };
    expect(verifyMerkleProof(tampered)).toBe(false);
  });

  it('rejects a proof with a tampered sibling', () => {
    const field = MARKSHEET_FIELDS[2]!;
    const proof = generateFieldProof(tree, field, leaves);
    const tamperedSiblings = [...proof.siblings];
    tamperedSiblings[0] = 'b'.repeat(64);
    const tampered = { ...proof, siblings: tamperedSiblings };
    expect(verifyMerkleProof(tampered)).toBe(false);
  });

  it('rejects a proof with a tampered leaf hash', () => {
    const field = MARKSHEET_FIELDS[2]!;
    const proof = generateFieldProof(tree, field, leaves);
    const tampered = {
      ...proof,
      leaf: { ...proof.leaf, hash: 'c'.repeat(64) },
    };
    expect(verifyMerkleProof(tampered)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// verifyFieldHash tests
// ─────────────────────────────────────────────────────────────────────────────

describe('verifyFieldHash', () => {
  const tree = MerkleTree.fromFields(MARKSHEET_FIELDS);
  const leaves = makeLeavesFromFields(MARKSHEET_FIELDS);

  it('returns true for correct field value', () => {
    const field = MARKSHEET_FIELDS[2]!; // cgpa = 8.7
    const proof = generateFieldProof(tree, field, leaves);
    expect(verifyFieldHash(proof, field)).toBe(true);
  });

  it('returns false for wrong field value', () => {
    const field = MARKSHEET_FIELDS[2]!;
    const proof = generateFieldProof(tree, field, leaves);
    const wrongField: DocumentField = { key: field.key, value: 9.9 };
    expect(verifyFieldHash(proof, wrongField)).toBe(false);
  });

  it('returns false for wrong field key', () => {
    const field = MARKSHEET_FIELDS[2]!;
    const proof = generateFieldProof(tree, field, leaves);
    const wrongField: DocumentField = { key: 'gpa', value: field.value };
    expect(verifyFieldHash(proof, wrongField)).toBe(false);
  });
});
