/**
 * @module @zk-kyc/verifier-sdk
 * @version 0.1.0
 *
 * Installable verifier SDK for the ZK-KYC system.
 * Designed for third-party developer integration — import this package into
 * your own separate web app to request and verify ZK credential proofs.
 *
 * **This SDK does NOT include any wallet UI.** Verification happens entirely
 * in the third-party app that imports this package.
 *
 * @example
 * import { requestProof, verifyProof } from '@zk-kyc/verifier-sdk';
 *
 * // Request a proof from the wallet holder
 * const { qrPayload, requestId } = await requestProof({
 *   verifierName: 'My App',
 *   issuerAddress: '0x...',
 *   documentType: 'MARKSHEET',
 *   predicates: [{ field: 'cgpa', operator: 'gte', value: 8 }],
 *   relayUrl: 'http://localhost:5174/api/relay',
 *   callbackOrigin: 'http://localhost:5174',
 * });
 *
 * // Verify the returned proof (no backend call required)
 * const result = await verifyProof(proof, {
 *   issuerRegistryAddress: ISSUER_REGISTRY_ADDRESS,
 *   credentialStatusAddress: CREDENTIAL_STATUS_ADDRESS,
 * });
 */

// ─── Public API surface — kept minimal and stable ─────────────────────────────

export { requestProof } from './requestProof';
export type { RequestProofConfig, RequestProofResult, QRPayload } from './requestProof';

export { verifyProof } from './verifyProof';
export type { VerifyProofOptions } from './verifyProof';

export { generateQR } from './qr';

export { createContractReader } from './contractReader';
export type { ContractReaderOptions } from './contractReader';

// Re-export shared types for SDK consumers (no need to install @zk-kyc/shared-types separately)
export type {
  ProofPayload,
  ProofRequest,
  FieldPredicate,
  FieldProof,
  PredicateWitness,
  MerkleProof,
  MerkleLeaf,
  VerificationResult,
  VerificationChecks,
  DocumentType,
  PredicateOperator,
  SignedCredential,
} from '@zk-kyc/shared-types';
