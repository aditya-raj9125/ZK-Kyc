import type { DocumentField, MerkleLeaf, StructuredDocument } from '@zk-kyc/shared-types';
import { MerkleTree, hashField } from '@zk-kyc/zk-core';

// ─────────────────────────────────────────────────────────────────────────────
// Merkle tree building for the issuer
// ─────────────────────────────────────────────────────────────────────────────

export interface MerkleCredential {
  /** Ordered field leaves with field key and hash (no raw values) */
  leaves: MerkleLeaf[];
  /** The computed Merkle root */
  root: string;
  /** The MerkleTree instance (for proof generation in tests/demo) */
  tree: MerkleTree;
}

/**
 * Builds a Merkle credential from a structured document's fields.
 * Extracts only the hashes — raw field values are never stored in the output.
 *
 * This is the core privacy boundary: after this function runs, the issuer
 * service holds the field values only in memory (for signing), and the
 * wallet stores only leaves (hashes) + the signed credential.
 *
 * @param document - The structured document to hash and build a Merkle tree from
 * @returns MerkleCredential with leaves, root, and tree
 */
export function buildMerkleCredential(document: StructuredDocument): MerkleCredential {
  const tree = MerkleTree.fromFields(document.fields);

  const leaves: MerkleLeaf[] = document.fields.map((field: DocumentField, index: number) => ({
    index,
    fieldKey: field.key,
    hash: hashField(field),
  }));

  return {
    leaves,
    root: tree.root,
    tree,
  };
}

/**
 * Converts a Merkle root (hex string) to a 32-byte hex value suitable
 * for on-chain use as bytes32 (the credentialRoot on CredentialStatus.sol).
 *
 * If the root is a 64-char hex string (32 bytes), prefix with 0x.
 * If it's already 32 bytes, return as-is with 0x prefix.
 */
export function rootToBytes32(root: string): string {
  const clean = root.startsWith('0x') ? root.slice(2) : root;
  if (clean.length !== 64) {
    throw new Error(`Invalid root length: expected 64 hex chars, got ${clean.length}`);
  }
  return `0x${clean}`;
}
