/**
 * @fileoverview Shared type definitions for the ZK-KYC system.
 *
 * These types are the single source of truth for credential schemas, proof
 * payloads, and proof requests — imported by all packages. No divergent
 * type definitions exist elsewhere in the monorepo.
 *
 * @version 0.1.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// Document field types
// ─────────────────────────────────────────────────────────────────────────────

/** Supported scalar field value types in a structured credential document. */
export type FieldValue = string | number | boolean;

/** A single field extracted from a structured document, ready for Merkle hashing. */
export interface DocumentField {
  /** Field key (e.g., "cgpa", "annualIncome", "studentName") */
  key: string;
  /** Field value — will be serialized to string before hashing */
  value: FieldValue;
}

// ─────────────────────────────────────────────────────────────────────────────
// Document types
// ─────────────────────────────────────────────────────────────────────────────

/** Supported document types issued by the mock issuer. */
export type DocumentType = 'MARKSHEET' | 'INCOME_CERTIFICATE';

/** Raw structured document as produced by the mock issuer (before hashing). */
export interface StructuredDocument {
  /** Unique document identifier (UUID) */
  id: string;
  /** Document type */
  type: DocumentType;
  /** Issuer DID or Ethereum address */
  issuerAddress: string;
  /** ISO 8601 issuance timestamp */
  issuedAt: string;
  /** ISO 8601 expiry timestamp (optional, none = no expiry) */
  expiresAt?: string;
  /** Extracted document fields */
  fields: DocumentField[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Merkle tree types
// ─────────────────────────────────────────────────────────────────────────────

/** A single leaf in the credential Merkle tree. */
export interface MerkleLeaf {
  /** Index in the tree (0-based) */
  index: number;
  /** Field key this leaf represents */
  fieldKey: string;
  /** Hex-encoded SHA-256 hash of "key:value" */
  hash: string;
}

/** A Merkle inclusion proof for a single leaf. */
export interface MerkleProof {
  /** The leaf being proven */
  leaf: MerkleLeaf;
  /** Ordered list of sibling hashes from leaf to root */
  siblings: string[];
  /** Bit array: 0 = sibling is on right, 1 = sibling is on left */
  pathIndices: number[];
  /** The claimed Merkle root (must match the credential root) */
  root: string;
  /** Total number of leaves in the tree */
  treeSize: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Credential types
// ─────────────────────────────────────────────────────────────────────────────

/** On-chain status of a credential, mirrors CredentialStatus.sol enum. */
export enum CredentialStatusEnum {
  Active = 0,
  Revoked = 1,
  Suspended = 2,
}

/**
 * A signed credential object returned by the mock issuer.
 * Contains ONLY cryptographic commitments — no raw PII or raw document data.
 * Raw documents stay with the issuer and are never transmitted to the wallet.
 */
export interface SignedCredential {
  /** Unique credential identifier (UUID) */
  id: string;
  /** Document type this credential represents */
  documentType: DocumentType;
  /** Ethereum address of the issuer */
  issuerAddress: string;
  /** Ethereum address of the credential holder */
  holderAddress: string;
  /** Hex-encoded Merkle root of all field hashes */
  merkleRoot: string;
  /** Hex-encoded bytes32 credential root (= merkleRoot padded, used on-chain) */
  credentialRoot: string;
  /** Ordered list of Merkle leaves (field key + hash only — no values) */
  leaves: MerkleLeaf[];
  /** ISO 8601 issuance timestamp */
  issuedAt: string;
  /** ISO 8601 expiry (optional) */
  expiresAt?: string;
  /**
   * ECDSA signature by the issuer over keccak256(merkleRoot + holderAddress + issuedAt).
   * Allows offline verification of issuer authenticity without an on-chain call.
   */
  issuerSignature: string;
  /** Schema version for forward compatibility */
  schemaVersion: '1.0';
}

// ─────────────────────────────────────────────────────────────────────────────
// Proof request / response types
// ─────────────────────────────────────────────────────────────────────────────

/** Supported predicate operators for selective disclosure. */
export type PredicateOperator = 'eq' | 'gte' | 'lte' | 'gt' | 'lt' | 'range';

/** A predicate constraint on a single credential field. */
export interface FieldPredicate {
  /** The field key to constrain (e.g., "cgpa") */
  field: string;
  /** Predicate operator */
  operator: PredicateOperator;
  /** Threshold value for single-bound predicates */
  value?: number | string;
  /** Lower bound for range predicate (inclusive) */
  min?: number;
  /** Upper bound for range predicate (inclusive) */
  max?: number;
}

/**
 * A proof request payload — encoded in the QR code by the verifier SDK
 * and consumed by the wallet to generate a proof.
 *
 * Modeled loosely after OID4VP presentation requests.
 * Production would use full OID4VP; this is a simplified analog.
 */
export interface ProofRequest {
  /** Unique request identifier (UUID) */
  requestId: string;
  /** Human-readable name of the verifying application */
  verifierName: string;
  /** Ethereum address of the verifier (used for audit trail) */
  verifierAddress?: string;
  /** The issuer whose credentials are acceptable */
  issuerAddress: string;
  /** Document type the proof must be for */
  documentType: DocumentType;
  /** List of field predicates the wallet must satisfy */
  predicates: FieldPredicate[];
  /** Origin URL of the verifier app (for postMessage routing) */
  callbackOrigin: string;
  /**
   * Relay endpoint URL where the wallet posts the completed proof.
   * The verifier SDK polls this endpoint.
   */
  relayUrl: string;
  /** ISO 8601 expiry of this request */
  expiresAt: string;
  /** Schema version */
  schemaVersion: '1.0';
}

/**
 * The proof payload generated by the wallet and consumed by the verifier SDK.
 * Contains Merkle proofs and predicate witnesses — no raw field values for
 * privacy-preserving predicates (gte/lte/gt/lt/range).
 */
export interface ProofPayload {
  /** The request ID this proof responds to */
  requestId: string;
  /** The credential this proof is for */
  credentialId: string;
  /** Merkle root of the credential (must be verified against on-chain status) */
  credentialRoot: string;
  /** Issuer Ethereum address */
  issuerAddress: string;
  /** Issuer ECDSA signature over the credential (from SignedCredential) */
  issuerSignature: string;
  /** Individual field proofs, one per predicate in the request */
  fieldProofs: FieldProof[];
  /** ISO 8601 timestamp of proof generation */
  generatedAt: string;
  /** Schema version */
  schemaVersion: '1.0';
}

/**
 * A proof for a single field predicate.
 * For 'eq' proofs: reveals the actual value.
 * For threshold proofs (gte/lte/gt/lt): does NOT reveal the value,
 * only a commitment + witness proving the predicate holds.
 */
export interface FieldProof {
  /** Field key being proven */
  fieldKey: string;
  /** The predicate this proof satisfies */
  predicate: FieldPredicate;
  /** Merkle inclusion proof for this field's leaf */
  merkleProof: MerkleProof;
  /** For 'eq': the revealed value. For threshold: null (value is hidden). */
  revealedValue: FieldValue | null;
  /**
   * Predicate witness for threshold proofs.
   * Contains Poseidon commitment and proof-of-range data.
   * Null for exact-value ('eq') proofs.
   */
  predicateWitness: PredicateWitness | null;
}

/**
 * Witness data for a threshold predicate proof.
 * Implementation: simplified commitment scheme using Poseidon hash.
 * Production: would use Groth16 circuit (circom + snarkjs) for full ZK range proof.
 *
 * @see packages/zk-core/README.md §"Predicate Proof Design"
 */
export interface PredicateWitness {
  /**
   * Poseidon hash of (value, salt) — the commitment to the hidden value.
   * The verifier checks: commitment = Poseidon(value, salt)
   * AND that the field leaf hash matches hash("key:value").
   */
  commitment: string;
  /** Random salt used in the Poseidon commitment (hex) */
  salt: string;
  /** The predicate that this witness proves holds */
  predicate: FieldPredicate;
  /**
   * Proof method identifier.
   * "poseidon-commitment-v1" = current hackathon implementation.
   * "groth16-range-v1" = future production ZK circuit upgrade.
   */
  proofMethod: 'poseidon-commitment-v1' | 'groth16-range-v1';
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification result types
// ─────────────────────────────────────────────────────────────────────────────

/** Result of verifyProof() in the verifier SDK. */
export interface VerificationResult {
  /** Whether the proof is valid and all checks pass */
  valid: boolean;
  /** Human-readable reason if invalid */
  reason?: string;
  /** Detailed check results for debugging */
  checks: VerificationChecks;
}

/** Individual verification check outcomes. */
export interface VerificationChecks {
  /** Merkle inclusion proof is mathematically valid */
  merkleProofValid: boolean;
  /** Predicate witnesses are valid (null if no predicates) */
  predicateValid: boolean | null;
  /** Issuer ECDSA signature verifies against the issuer address */
  issuerSignatureValid: boolean;
  /** Issuer is in the on-chain IssuerRegistry as trusted */
  issuerTrusted: boolean;
  /** Credential is Active in on-chain CredentialStatus (not revoked) */
  credentialActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract ABI types (minimal, for SDK contractReader)
// ─────────────────────────────────────────────────────────────────────────────

/** On-chain credential status values (mirrors CredentialStatus.sol enum). */
export enum OnChainStatus {
  Active = 0,
  Revoked = 1,
  Suspended = 2,
}
