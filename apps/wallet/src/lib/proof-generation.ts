/**
 * @module proof-generation
 *
 * Wallet-side proof generation — bridges the credential store and zk-core.
 * Called when the wallet receives a proof request (via QR code URL param).
 *
 * This module:
 * 1. Reads the stored credential and field values from localStorage
 * 2. Rebuilds the Merkle tree from field hashes
 * 3. Generates the appropriate FieldProof for each requested predicate
 * 4. Packages everything into a ProofPayload for transmission to the verifier
 */

import type {
  DocumentField,
  FieldPredicate,
  FieldProof,
  MerkleLeaf,
  ProofPayload,
  ProofRequest,
  SignedCredential,
} from '@zk-kyc/shared-types';

import {
  MerkleTree,
  generateEqProof,
  generatePredicateProof,
} from '@zk-kyc/zk-core';

import type { FieldValueMap } from './credential-store';

// ─────────────────────────────────────────────────────────────────────────────
// Proof generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a complete ProofPayload for a given proof request.
 *
 * @param request      - The proof request from the verifier (decoded from QR)
 * @param credential   - The signed credential to prove from
 * @param fieldValues  - The locally stored field values (for proof generation)
 * @returns ProofPayload ready to send to the verifier relay
 * @throws If any predicate cannot be satisfied by the credential
 */
export function generateProofPayload(
  request: ProofRequest,
  credential: SignedCredential,
  fieldValues: FieldValueMap,
): ProofPayload {
  // Validate that the credential matches the request
  if (credential.issuerAddress.toLowerCase() !== request.issuerAddress.toLowerCase()) {
    throw new Error(
      `Credential issuer ${credential.issuerAddress} does not match ` +
        `requested issuer ${request.issuerAddress}`,
    );
  }

  if (credential.documentType !== request.documentType) {
    throw new Error(
      `Credential type ${credential.documentType} does not match ` +
        `requested type ${request.documentType}`,
    );
  }

  // Rebuild the Merkle tree from stored leaf hashes
  const leafHashes = credential.leaves.map((l) => l.hash);
  const tree = MerkleTree.fromLeafHashes(leafHashes);

  // Verify the tree root matches the stored credential root
  const computedRoot = tree.root;
  const storedRoot = credential.merkleRoot.startsWith('0x')
    ? credential.merkleRoot.slice(2)
    : credential.merkleRoot;

  if (computedRoot !== storedRoot) {
    throw new Error('Computed Merkle root does not match stored credential root — data may be corrupted');
  }

  // Generate a FieldProof for each requested predicate
  const fieldProofs: FieldProof[] = request.predicates.map((predicate: FieldPredicate) => {
    const rawValue = fieldValues[predicate.field];

    if (rawValue === undefined) {
      throw new Error(`Field "${predicate.field}" not found in stored field values`);
    }

    const field: DocumentField = {
      key: predicate.field,
      value: rawValue,
    };

    const leaves: MerkleLeaf[] = credential.leaves;

    if (predicate.operator === 'eq') {
      return generateEqProof(field, predicate, tree, leaves);
    } else {
      return generatePredicateProof(field, predicate, tree, leaves);
    }
  });

  const proofPayload: ProofPayload = {
    requestId: request.requestId,
    credentialId: credential.id,
    credentialRoot: credential.credentialRoot,
    issuerAddress: credential.issuerAddress,
    issuerSignature: credential.issuerSignature,
    fieldProofs,
    generatedAt: new Date().toISOString(),
    schemaVersion: '1.0',
  };

  return proofPayload;
}

// ─────────────────────────────────────────────────────────────────────────────
// QR / URL param decoding
// ─────────────────────────────────────────────────────────────────────────────

function decodeBase64Url(base64url: string): string {
  if (typeof window !== 'undefined' || typeof atob !== 'undefined') {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(base64url, 'base64url').toString('utf-8');
}

function encodeBase64Url(str: string): string {
  if (typeof window !== 'undefined' || typeof btoa !== 'undefined') {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  return Buffer.from(str, 'utf-8').toString('base64url');
}

/**
 * Decodes a ProofRequest from a URL search parameter.
 * The QR code encodes: ?proofRequest=<base64url(JSON(ProofRequest))>
 *
 * @param encodedRequest - Base64URL-encoded JSON ProofRequest string
 * @returns Decoded ProofRequest
 */
export function decodeProofRequest(encodedRequest: string): ProofRequest {
  try {
    const json = decodeBase64Url(encodedRequest);
    return JSON.parse(json) as ProofRequest;
  } catch {
    throw new Error('Invalid proof request encoding — could not decode QR payload');
  }
}

/**
 * Encodes a ProofRequest for QR code embedding.
 * Returns a base64url-encoded JSON string.
 */
export function encodeProofRequest(request: ProofRequest): string {
  const json = JSON.stringify(request);
  return encodeBase64Url(json);
}

