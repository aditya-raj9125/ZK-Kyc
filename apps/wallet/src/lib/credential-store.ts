/**
 * @module credential-store
 *
 * Client-side credential storage keyed to wallet address.
 * Uses localStorage as the persistence layer — explicitly documented as
 * testnet-grade only. In production, this would be an encrypted keystore
 * or a user-controlled encrypted remote store (e.g., IPFS + symmetric key).
 *
 * Security model:
 * - Credentials stored here contain ONLY field hashes (MerkleLeaf[]) and
 *   the issuer signature — no raw PII.
 * - Field values are stored separately (fieldValues map) for proof generation,
 *   also keyed to wallet address.
 * - No credentials are shared across wallet addresses.
 */

import type { SignedCredential } from '@zk-kyc/shared-types';

const STORAGE_KEY_PREFIX = 'zk-kyc:credentials:';
const FIELD_VALUES_KEY_PREFIX = 'zk-kyc:field-values:';

// ─────────────────────────────────────────────────────────────────────────────
// Credential store
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stores a signed credential for a wallet address.
 */
export function storeCredential(
  walletAddress: string,
  credential: SignedCredential,
): void {
  const key = `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`;
  const existing = getCredentials(walletAddress);
  const updated = [...existing.filter((c) => c.id !== credential.id), credential];
  localStorage.setItem(key, JSON.stringify(updated));
}

/**
 * Retrieves all stored credentials for a wallet address.
 */
export function getCredentials(walletAddress: string): SignedCredential[] {
  const key = `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SignedCredential[];
  } catch {
    return [];
  }
}

/**
 * Removes a credential by ID.
 */
export function removeCredential(walletAddress: string, credentialId: string): void {
  const key = `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`;
  const existing = getCredentials(walletAddress);
  const updated = existing.filter((c) => c.id !== credentialId);
  localStorage.setItem(key, JSON.stringify(updated));
}

// ─────────────────────────────────────────────────────────────────────────────
// Field value store (for proof generation)
// ─────────────────────────────────────────────────────────────────────────────

export type FieldValueMap = Record<string, string | number | boolean>;

/**
 * Stores the decrypted field values for a credential (for proof generation).
 * These are stored separately from the credential to make the privacy
 * boundary explicit.
 *
 * @param walletAddress  - The wallet address
 * @param credentialId   - The credential ID
 * @param fieldValues    - Map of fieldKey → value
 */
export function storeFieldValues(
  walletAddress: string,
  credentialId: string,
  fieldValues: FieldValueMap,
): void {
  const key = `${FIELD_VALUES_KEY_PREFIX}${walletAddress.toLowerCase()}:${credentialId}`;
  localStorage.setItem(key, JSON.stringify(fieldValues));
}

/**
 * Retrieves field values for a specific credential.
 */
export function getFieldValues(
  walletAddress: string,
  credentialId: string,
): FieldValueMap | null {
  const key = `${FIELD_VALUES_KEY_PREFIX}${walletAddress.toLowerCase()}:${credentialId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FieldValueMap;
  } catch {
    return null;
  }
}

/**
 * Clears all credential data for a wallet address.
 * Called on wallet disconnect.
 */
export function clearAllCredentials(walletAddress: string): void {
  const prefix = `${STORAGE_KEY_PREFIX}${walletAddress.toLowerCase()}`;
  const valuesPrefix = `${FIELD_VALUES_KEY_PREFIX}${walletAddress.toLowerCase()}`;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(prefix) || key.startsWith(valuesPrefix))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
