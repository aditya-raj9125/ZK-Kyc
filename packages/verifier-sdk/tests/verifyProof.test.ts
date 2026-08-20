import type { DocumentField, MerkleLeaf, FieldPredicate } from '@zk-kyc/shared-types';

import { MerkleTree, hashField, generateEqProof, generatePredicateProof } from '@zk-kyc/zk-core';
import { verifyProof } from '../src/verifyProof';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const FIELDS: DocumentField[] = [
  { key: 'studentName', value: 'Test Student' },
  { key: 'cgpa', value: 8.7 },
  { key: 'semester', value: 6 },
];

function buildTestTree() {
  const tree = MerkleTree.fromFields(FIELDS);
  const leaves: MerkleLeaf[] = FIELDS.map((f, i) => ({
    index: i,
    fieldKey: f.key,
    hash: hashField(f),
  }));
  return { tree, leaves };
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyProof tests (offline, skipOnChainChecks = true)
// ─────────────────────────────────────────────────────────────────────────────

import { ethers } from 'ethers';

describe('verifyProof (offline, skipOnChainChecks)', () => {
  const { tree, leaves } = buildTestTree();
  const testWallet = ethers.Wallet.createRandom();
  const issuerAddress = testWallet.address;

  async function createValidSignature(root: string) {
    const merkleRoot = root.startsWith('0x') ? root : `0x${root}`;
    const formattedRoot = merkleRoot.length === 66 ? merkleRoot : `0x${merkleRoot.slice(2).padStart(64, '0')}`;
    const message = ethers.solidityPackedKeccak256(
      ['bytes32', 'address', 'string'],
      [formattedRoot, ethers.ZeroAddress, ''],
    );
    return await testWallet.signMessage(ethers.getBytes(message));
  }

  it('passes with a valid eq proof', async () => {
    const field = FIELDS[2]!; // semester = 6
    const predicate: FieldPredicate = { field: 'semester', operator: 'eq', value: 6 };
    const fieldProof = generateEqProof(field, predicate, tree, leaves);
    const signature = await createValidSignature(tree.root);

    const proof = {
      requestId: 'test-request-id',
      credentialId: 'test-cred-id',
      credentialRoot: `0x${tree.root}`,
      issuerAddress,
      issuerSignature: signature,
      fieldProofs: [fieldProof],
      generatedAt: new Date().toISOString(),
      schemaVersion: '1.0' as const,
    };

    const result = await verifyProof(proof, {
      issuerRegistryAddress: '0x0000000000000000000000000000000000000001',
      credentialStatusAddress: '0x0000000000000000000000000000000000000002',
      skipOnChainChecks: true,
    });

    expect(result.checks.merkleProofValid).toBe(true);
    expect(result.checks.issuerTrusted).toBe(true); // skipped
    expect(result.checks.credentialActive).toBe(true); // skipped
    expect(result.valid).toBe(true);
  });

  it('passes with a valid gte predicate proof', async () => {
    const field = FIELDS[1]!; // cgpa = 8.7
    const predicate: FieldPredicate = { field: 'cgpa', operator: 'gte', value: 8 };
    const fieldProof = generatePredicateProof(field, predicate, tree, leaves);
    const signature = await createValidSignature(tree.root);

    const proof = {
      requestId: 'test-request-id-2',
      credentialId: 'test-cred-id-2',
      credentialRoot: `0x${tree.root}`,
      issuerAddress,
      issuerSignature: signature,
      fieldProofs: [fieldProof],
      generatedAt: new Date().toISOString(),
      schemaVersion: '1.0' as const,
    };

    const result = await verifyProof(proof, {
      issuerRegistryAddress: '0x0000000000000000000000000000000000000001',
      credentialStatusAddress: '0x0000000000000000000000000000000000000002',
      skipOnChainChecks: true,
    });

    expect(result.checks.merkleProofValid).toBe(true);
    expect(result.valid).toBe(true);
  });

  it('fails with a tampered credentialRoot', async () => {
    const field = FIELDS[1]!;
    const predicate: FieldPredicate = { field: 'cgpa', operator: 'gte', value: 8 };
    const fieldProof = generatePredicateProof(field, predicate, tree, leaves);
    const signature = await createValidSignature(tree.root);

    const proof = {
      requestId: 'test-tamper',
      credentialId: 'test-cred-tamper',
      credentialRoot: `0x${'a'.repeat(64)}`, // tampered root
      issuerAddress,
      issuerSignature: signature,
      fieldProofs: [fieldProof],
      generatedAt: new Date().toISOString(),
      schemaVersion: '1.0' as const,
    };

    const result = await verifyProof(proof, {
      issuerRegistryAddress: '0x0000000000000000000000000000000000000001',
      credentialStatusAddress: '0x0000000000000000000000000000000000000002',
      skipOnChainChecks: true,
    });

    expect(result.valid).toBe(false);
    expect(result.checks.merkleProofValid).toBe(false);
  });

  it('fails with a tampered leaf hash', async () => {
    const field = FIELDS[1]!;
    const predicate: FieldPredicate = { field: 'cgpa', operator: 'gte', value: 8 };
    const fieldProof = generatePredicateProof(field, predicate, tree, leaves);
    const signature = await createValidSignature(tree.root);

    const tamperedProof = {
      ...fieldProof,
      merkleProof: {
        ...fieldProof.merkleProof,
        leaf: { ...fieldProof.merkleProof.leaf, hash: 'b'.repeat(64) },
      },
    };

    const proof = {
      requestId: 'test-tamper-leaf',
      credentialId: 'test-cred-tamper-leaf',
      credentialRoot: `0x${tree.root}`,
      issuerAddress,
      issuerSignature: signature,
      fieldProofs: [tamperedProof],
      generatedAt: new Date().toISOString(),
      schemaVersion: '1.0' as const,
    };

    const result = await verifyProof(proof, {
      issuerRegistryAddress: '0x0000000000000000000000000000000000000001',
      credentialStatusAddress: '0x0000000000000000000000000000000000000002',
      skipOnChainChecks: true,
    });

    expect(result.valid).toBe(false);
  });
});
