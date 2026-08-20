import { ethers } from 'ethers';

import type { DocumentField, MerkleLeaf, MerkleProof } from '@zk-kyc/shared-types';

// ─────────────────────────────────────────────────────────────────────────────
// Leaf hashing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the SHA-256 hash of a document field for use as a Merkle leaf.
 *
 * Encoding: SHA-256("key:valueString") where valueString = String(value).
 * This canonical serialization ensures deterministic hashing across
 * languages and implementations.
 *
 * @param field - The document field to hash
 * @returns Hex-encoded SHA-256 hash (no "0x" prefix)
 */
export function hashField(field: DocumentField): string {
  const data = `${field.key}:${String(field.value)}`;
  const hash = ethers.sha256(ethers.toUtf8Bytes(data));
  return hash.startsWith('0x') ? hash.slice(2) : hash;
}

// ─────────────────────────────────────────────────────────────────────────────
// Node hashing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hashes two child nodes to produce a parent node.
 * Inputs are sorted lexicographically before hashing to make the tree
 * order-independent — a common pattern (used by OpenZeppelin's Merkle lib)
 * that prevents leaf order from leaking information.
 *
 * @param left  - Left child hash (hex, no prefix)
 * @param right - Right child hash (hex, no prefix)
 * @returns Parent node hash (hex, no prefix)
 */
export function hashPair(left: string, right: string): string {
  // Sort to make the tree position-independent (mitigates second-preimage attacks)
  const [a, b] = left <= right ? [left, right] : [right, left];
  const combinedHex = `0x${a}${b}`;
  const hash = ethers.sha256(combinedHex);
  return hash.startsWith('0x') ? hash.slice(2) : hash;
}

// ─────────────────────────────────────────────────────────────────────────────
// MerkleTree class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A binary Merkle tree built from document field hashes.
 *
 * Design choices:
 * - SHA-256 leaf and node hashing (SNARK-unfriendly but simple; Poseidon
 *   would be used in production circom circuits)
 * - Sorted-pair node hashing (position-independent)
 * - Odd-number-of-leaves handled by duplicating the last leaf
 * - Zero-indexed leaves match DocumentField ordering
 *
 * @example
 * const tree = MerkleTree.fromFields(document.fields);
 * const root = tree.root;
 * const proof = tree.generateProof(2); // proof for field at index 2
 */
export class MerkleTree {
  /** All tree levels, from leaves (index 0) to root (last element). */
  private readonly levels: string[][];

  /** Ordered leaf hashes (one per document field). */
  public readonly leaves: string[];

  private constructor(leaves: string[]) {
    if (leaves.length === 0) {
      throw new Error('MerkleTree requires at least one leaf');
    }
    this.leaves = leaves;
    this.levels = MerkleTree.buildLevels(leaves);
  }

  // ── Construction ──────────────────────────────────────────────────────────

  /**
   * Builds a MerkleTree from an ordered array of DocumentFields.
   */
  static fromFields(fields: DocumentField[]): MerkleTree {
    const leaves = fields.map((f) => hashField(f));
    return new MerkleTree(leaves);
  }

  /**
   * Builds a MerkleTree from pre-computed leaf hashes (e.g., from a stored credential).
   */
  static fromLeafHashes(hashes: string[]): MerkleTree {
    return new MerkleTree(hashes);
  }

  // ── Tree construction ──────────────────────────────────────────────────────

  private static buildLevels(leaves: string[]): string[][] {
    const levels: string[][] = [leaves.slice()];

    let currentLevel = leaves.slice();
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]!;
        // Duplicate the last node if the level has an odd number of nodes
        const right = currentLevel[i + 1] ?? currentLevel[i]!;
        nextLevel.push(hashPair(left, right));
      }
      levels.push(nextLevel);
      currentLevel = nextLevel;
    }

    return levels;
  }

  // ── Public accessors ───────────────────────────────────────────────────────

  /** The Merkle root hash (hex, no prefix). */
  get root(): string {
    const topLevel = this.levels[this.levels.length - 1];
    if (!topLevel || topLevel.length === 0) {
      throw new Error('Tree has no root');
    }
    return topLevel[0]!;
  }

  /** Total number of leaves. */
  get size(): number {
    return this.leaves.length;
  }

  /** Number of levels including leaf level. */
  get depth(): number {
    return this.levels.length;
  }

  // ── Proof generation ───────────────────────────────────────────────────────

  /**
   * Generates a Merkle inclusion proof for the leaf at the given index.
   *
   * @param leafIndex - Zero-based index of the leaf to prove
   * @returns MerkleProof object ready for transmission to a verifier
   * @throws If leafIndex is out of bounds
   */
  generateProof(leafIndex: number): Omit<MerkleProof, 'leaf'> & { leafHash: string } {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error(`Leaf index ${leafIndex} out of bounds (size: ${this.leaves.length})`);
    }

    const siblings: string[] = [];
    const pathIndices: number[] = [];

    let currentIndex = leafIndex;

    for (let level = 0; level < this.levels.length - 1; level++) {
      const currentLevel = this.levels[level]!;
      const isRightChild = currentIndex % 2 === 1;
      const siblingIndex = isRightChild ? currentIndex - 1 : currentIndex + 1;

      // Handle the case where the sibling doesn't exist (odd level, duplicated node)
      const sibling =
        siblingIndex < currentLevel.length
          ? currentLevel[siblingIndex]!
          : currentLevel[currentIndex]!;

      siblings.push(sibling);
      // pathIndices[i] = 0 means the leaf is on the LEFT at level i (sibling is on right)
      // pathIndices[i] = 1 means the leaf is on the RIGHT at level i (sibling is on left)
      pathIndices.push(isRightChild ? 1 : 0);

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      leafHash: this.leaves[leafIndex]!,
      siblings,
      pathIndices,
      root: this.root,
      treeSize: this.leaves.length,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Proof generation (with field metadata)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a complete MerkleProof for a specific field in a credential.
 *
 * @param tree     - The MerkleTree built from the credential's fields
 * @param field    - The field to prove inclusion of
 * @param leaves   - The ordered MerkleLeaf array from the SignedCredential
 * @returns A complete MerkleProof for use in ProofPayload
 */
export function generateFieldProof(
  tree: MerkleTree,
  field: DocumentField,
  leaves: MerkleLeaf[],
): MerkleProof {
  const leafIndex = leaves.findIndex((l) => l.fieldKey === field.key);
  if (leafIndex === -1) {
    throw new Error(`Field "${field.key}" not found in credential leaves`);
  }

  const proofData = tree.generateProof(leafIndex);
  const leaf = leaves[leafIndex]!;

  return {
    leaf,
    siblings: proofData.siblings,
    pathIndices: proofData.pathIndices,
    root: proofData.root,
    treeSize: proofData.treeSize,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Proof verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies a MerkleProof — reconstructs the root from the leaf and siblings
 * and checks it matches the claimed root.
 *
 * This function is pure and requires no external state — it can be called
 * in any environment (browser, Node.js, Edge runtime).
 *
 * @param proof - The proof to verify
 * @returns true if the proof is valid
 */
export function verifyMerkleProof(proof: MerkleProof): boolean {
  try {
    // Recompute the leaf hash and check it matches
    const expectedLeafHash = proof.leaf.hash;
    let currentHash = expectedLeafHash;

    for (let i = 0; i < proof.siblings.length; i++) {
      const sibling = proof.siblings[i]!;
      const pathIndex = proof.pathIndices[i]!;

      // pathIndex 0: we are the LEFT child, sibling is RIGHT → hash(us, sibling)
      // pathIndex 1: we are the RIGHT child, sibling is LEFT → hash(sibling, us)
      if (pathIndex === 0) {
        currentHash = hashPair(currentHash, sibling);
      } else {
        currentHash = hashPair(sibling, currentHash);
      }
    }

    return currentHash === proof.root;
  } catch {
    return false;
  }
}

/**
 * Verifies that a field hash in the proof matches the claimed value.
 * Used for exact-value ('eq') proofs where the value is revealed.
 *
 * @param proof         - The Merkle proof containing the leaf
 * @param field         - The field with the value being revealed
 * @returns true if the field hash matches the leaf hash in the proof
 */
export function verifyFieldHash(proof: MerkleProof, field: DocumentField): boolean {
  const expectedHash = hashField(field);
  return expectedHash === proof.leaf.hash;
}
