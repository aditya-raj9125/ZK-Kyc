import { v4 as uuidv4 } from 'uuid';

import type { ProofRequest, FieldPredicate, DocumentType } from '@zk-kyc/shared-types';

import { generateQR } from './qr';

// ─────────────────────────────────────────────────────────────────────────────
// requestProof()
// ─────────────────────────────────────────────────────────────────────────────

export interface RequestProofConfig {
  /** Human-readable name of the verifier application */
  verifierName: string;
  /** Ethereum address of the verifier (optional, for audit) */
  verifierAddress?: string;
  /** Ethereum address of the issuer whose credentials are acceptable */
  issuerAddress: string;
  /** Document type the proof must be for */
  documentType: DocumentType;
  /** List of field predicates the wallet must satisfy */
  predicates: FieldPredicate[];
  /** Origin URL of the verifier app (for postMessage routing) */
  callbackOrigin: string;
  /**
   * Relay endpoint URL where the wallet POSTs the completed proof.
   * The verifier SDK polls or listens at this URL for the proof.
   */
  relayUrl: string;
  /** Expiry duration in seconds (default: 10 minutes) */
  expirySeconds?: number;
}

export interface QRPayload {
  /** Base64URL-encoded ProofRequest string (embedded in QR) */
  encodedRequest: string;
  /** Full URL the wallet should navigate to (for deep-link) */
  walletUrl: string;
  /** QR code image as a data URL (PNG) */
  qrDataUrl: string;
}

export interface RequestProofResult {
  /** Unique request ID for polling the relay */
  requestId: string;
  /** The constructed proof request */
  proofRequest: ProofRequest;
  /** QR code payload for display */
  qrPayload: QRPayload;
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
 * Creates a proof request and generates a QR code for the wallet to scan.
 *
 * This is the entry point for any third-party verifier app. Call this
 * function to initiate the proof flow, then display the returned QR code
 * to the wallet holder. Poll `relayUrl` for the returned proof, then
 * call `verifyProof()` to validate it.
 *
 * @example
 * const { qrPayload, requestId } = await requestProof({
 *   verifierName: 'My Loan App',
 *   issuerAddress: ISSUER_ADDRESS,
 *   documentType: 'MARKSHEET',
 *   predicates: [{ field: 'cgpa', operator: 'gte', value: 8 }],
 *   relayUrl: 'http://localhost:5174/api/relay',
 *   callbackOrigin: 'http://localhost:5174',
 * });
 */
export async function requestProof(config: RequestProofConfig): Promise<RequestProofResult> {
  const requestId = uuidv4();
  const expirySeconds = config.expirySeconds ?? 600; // 10 minutes default
  const expiresAt = new Date(Date.now() + expirySeconds * 1000).toISOString();

  const proofRequest: ProofRequest = {
    requestId,
    verifierName: config.verifierName,
    issuerAddress: config.issuerAddress,
    documentType: config.documentType,
    predicates: config.predicates,
    callbackOrigin: config.callbackOrigin,
    relayUrl: config.relayUrl,
    expiresAt,
    schemaVersion: '1.0',
    ...(config.verifierAddress ? { verifierAddress: config.verifierAddress } : {}),
  };

  // Encode as base64url JSON (browser & Node compatible)
  const encodedRequest = encodeBase64Url(JSON.stringify(proofRequest));

  // Construct the wallet deep-link URL
  // The wallet reads the `proofRequest` URL param and decodes it
  const walletBaseUrl = 'http://localhost:3000/proof-request';
  const walletUrl = `${walletBaseUrl}?proofRequest=${encodedRequest}`;

  // Generate QR code
  const qrDataUrl = await generateQR(walletUrl);

  return {
    requestId,
    proofRequest,
    qrPayload: {
      encodedRequest,
      walletUrl,
      qrDataUrl,
    },
  };
}

