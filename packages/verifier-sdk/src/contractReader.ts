import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────
// contractReader.ts
// ─────────────────────────────────────────────────────────────────────────────
//
// Reads on-chain state from IssuerRegistry and CredentialStatus contracts.
// Uses a public read-only RPC — no private key, no signer, no backend call.
// This is intentionally minimal: only the two reads needed for verification.
// ─────────────────────────────────────────────────────────────────────────────

const ISSUER_REGISTRY_ABI = [
  'function isTrustedIssuer(address issuer) external view returns (bool)',
] as const;

const CREDENTIAL_STATUS_ABI = [
  'function isActive(bytes32 credentialRoot) external view returns (bool)',
  'function getStatus(bytes32 credentialRoot) external view returns (uint8)',
] as const;

export interface ContractReaderOptions {
  issuerRegistryAddress: string;
  credentialStatusAddress: string;
  rpcUrl?: string;
}

/**
 * Creates a contract reader for on-chain verification checks.
 * Uses a public read-only JSON-RPC provider — free, no API key required.
 */
export function createContractReader(options: ContractReaderOptions) {
  const rpcUrl = options.rpcUrl ?? 'https://ethereum-sepolia-rpc.publicnode.com';
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const issuerRegistry = new ethers.Contract(
    options.issuerRegistryAddress,
    ISSUER_REGISTRY_ABI,
    provider,
  );

  const credentialStatus = new ethers.Contract(
    options.credentialStatusAddress,
    CREDENTIAL_STATUS_ABI,
    provider,
  );

  return {
    /**
     * Checks if an issuer address is trusted in the IssuerRegistry.
     * Returns false on network error (safe default for verification).
     */
    async isTrustedIssuer(issuerAddress: string): Promise<boolean> {
      try {
        const fn = issuerRegistry.getFunction('isTrustedIssuer');
        return (await fn(issuerAddress)) as boolean;
      } catch (err) {
        console.warn(`IssuerRegistry read failed for ${issuerAddress}:`, err);
        return false;
      }
    },

    /**
     * Checks if a credential is Active (not revoked/suspended) in CredentialStatus.
     * Returns false on network error (safe default for verification).
     *
     * @param credentialRoot - The bytes32 credential root (0x-prefixed hex)
     */
    async isCredentialActive(credentialRoot: string): Promise<boolean> {
      try {
        const fn = credentialStatus.getFunction('isActive');
        return (await fn(credentialRoot)) as boolean;
      } catch (err) {
        console.warn(`CredentialStatus read failed for ${credentialRoot}:`, err);
        return false;
      }
    },

    /**
     * Gets the numeric status of a credential (0=Active, 1=Revoked, 2=Suspended).
     */
    async getCredentialStatus(credentialRoot: string): Promise<number> {
      try {
        const fn = credentialStatus.getFunction('getStatus');
        return Number(await fn(credentialRoot));
      } catch (err) {
        console.warn(`CredentialStatus.getStatus failed for ${credentialRoot}:`, err);
        return -1; // Unknown
      }
    },
  };
}
