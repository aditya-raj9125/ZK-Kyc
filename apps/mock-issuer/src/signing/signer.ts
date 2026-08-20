import { ethers } from 'ethers';

// ─────────────────────────────────────────────────────────────────────────────
// Issuer signing logic
// ─────────────────────────────────────────────────────────────────────────────
//
// The issuer signs: keccak256(abi.encodePacked(merkleRoot, holderAddress, issuedAt))
//
// This signature allows wallets and verifiers to confirm that a specific
// credential was legitimately issued to a specific holder by this issuer,
// without any on-chain call. Combined with on-chain IssuerRegistry trust
// status, it provides a complete trust chain.
//
// In production this would be a DID-based signature or a W3C VC proof,
// but ECDSA over structured data (EIP-191) is sufficient for the demo.
// ─────────────────────────────────────────────────────────────────────────────

export interface IssuerSigner {
  address: string;
  sign(merkleRoot: string, holderAddress: string, issuedAt: string): Promise<string>;
}

/**
 * Creates an IssuerSigner from a private key.
 * TESTNET ONLY — private key must be from .env, funded via faucet, never mainnet.
 */
export function createIssuerSigner(privateKey: string): IssuerSigner {
  const wallet = new ethers.Wallet(privateKey);

  return {
    address: wallet.address,

    async sign(merkleRoot: string, holderAddress: string, issuedAt: string): Promise<string> {
      // Encode the message matching the verifier's reconstruction
      const message = ethers.solidityPackedKeccak256(
        ['bytes32', 'address', 'string'],
        [
          `0x${merkleRoot.replace('0x', '')}`,
          holderAddress,
          issuedAt,
        ],
      );

      // Sign the hash with EIP-191 prefix (personal_sign compatible)
      return await wallet.signMessage(ethers.getBytes(message));
    },
  };
}

/**
 * Verifies an issuer signature off-chain.
 * Used by the verifier SDK to confirm the credential was legitimately issued.
 *
 * @param merkleRoot     - The credential's Merkle root
 * @param holderAddress  - The wallet address the credential was issued to
 * @param issuedAt       - ISO 8601 issuance timestamp
 * @param signature      - The ECDSA signature from the issuer
 * @param expectedIssuer - The expected issuer address (from IssuerRegistry)
 * @returns true if the signature was produced by expectedIssuer
 */
export function verifyIssuerSignature(
  merkleRoot: string,
  holderAddress: string,
  issuedAt: string,
  signature: string,
  expectedIssuer: string,
): boolean {
  try {
    const message = ethers.solidityPackedKeccak256(
      ['bytes32', 'address', 'string'],
      [
        `0x${merkleRoot.replace('0x', '')}`,
        holderAddress,
        issuedAt,
      ],
    );

    const recoveredAddress = ethers.verifyMessage(ethers.getBytes(message), signature);
    return recoveredAddress.toLowerCase() === expectedIssuer.toLowerCase();
  } catch {
    return false;
  }
}
