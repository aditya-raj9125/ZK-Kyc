import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

import type { SignedCredential, StructuredDocument, DocumentType } from '@zk-kyc/shared-types';

import { MARKSHEET_TEMPLATE, INCOME_CERT_TEMPLATE } from './documents/templates';
import { buildMerkleCredential, rootToBytes32 } from './merkle/builder';
import { createIssuerSigner } from './signing/signer';

dotenv.config({ path: '../../.env' });

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env['ISSUER_PORT'] ?? '3001', 10);

// TESTNET ONLY — this key is funded via faucet, zero real-world value
const ISSUER_PRIVATE_KEY =
  process.env['ISSUER_PRIVATE_KEY'] ??
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const issuerSigner = createIssuerSigner(ISSUER_PRIVATE_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// Express app
// ─────────────────────────────────────────────────────────────────────────────

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /
 * Root directory & health overview
 */
app.get('/', (_req, res) => {
  res.json({
    service: 'ZK-KYC Mock Issuer Service',
    description: 'Simulated DigiLocker/University Credential Issuer for ZK-KYC Testnet Demo',
    issuerAddress: issuerSigner.address,
    status: 'online',
    endpoints: {
      'GET /health': 'Service health status',
      'GET /issuer-info': 'Public issuer identity & supported document types',
      'GET /documents': 'List available document templates',
      'POST /issue': 'Issue a new signed credential (JSON body: { holderAddress, documentType, fieldOverrides? })',
      'POST /revoke': 'Revoke a credential by root (JSON body: { credentialRoot, reason? })',
    },
    walletAppUrl: 'http://localhost:3000',
    verifierAppUrl: 'http://localhost:5174',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health
 * Health check endpoint.
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    issuerAddress: issuerSigner.address,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /issuer-info
 * Returns the issuer's public address and supported document types.
 * Wallets call this to know which issuer to use.
 */
app.get('/issuer-info', (_req, res) => {
  res.json({
    issuerAddress: issuerSigner.address,
    name: 'Mock DigiLocker / University Issuer',
    description:
      'Simulated government/university credential issuer for ZK-KYC testnet demo. ' +
      'Not affiliated with the real DigiLocker service.',
    supportedTypes: ['MARKSHEET', 'INCOME_CERTIFICATE'],
    schemaVersion: '1.0',
  });
});

/**
 * GET /documents
 * Returns the available document templates (without raw field values).
 * Used by the wallet UI to let users browse what they can import.
 */
app.get('/documents', (_req, res) => {
  res.json({
    documents: [
      {
        type: 'MARKSHEET',
        name: 'Academic Marksheet',
        description: 'University semester marksheet with CGPA and credit information',
        fieldKeys: MARKSHEET_TEMPLATE.fields.map((f) => f.key),
      },
      {
        type: 'INCOME_CERTIFICATE',
        name: 'Income Certificate',
        description: 'Annual income certificate from the Income Tax Department',
        fieldKeys: INCOME_CERT_TEMPLATE.fields.map((f) => f.key),
      },
    ],
  });
});

/**
 * POST /issue
 * Issues a signed credential to a wallet holder.
 *
 * Request body:
 *   {
 *     holderAddress: string,  // wallet address to issue to
 *     documentType: 'MARKSHEET' | 'INCOME_CERTIFICATE',
 *     // Optional field overrides for demo purposes (e.g., custom CGPA)
 *     fieldOverrides?: Record<string, string | number | boolean>
 *   }
 *
 * Response: SignedCredential
 *
 * IMPORTANT: Raw field values are used only in-memory to build the Merkle tree.
 * The returned SignedCredential contains ONLY field hashes (no raw values).
 * Raw documents are never persisted or transmitted.
 */
app.post('/issue', async (req, res) => {
  try {
    const { holderAddress, documentType, fieldOverrides } = req.body as {
      holderAddress?: string;
      documentType?: string;
      fieldOverrides?: Record<string, string | number | boolean>;
    };

    // Validate inputs
    if (!holderAddress || typeof holderAddress !== 'string') {
      res.status(400).json({ error: 'holderAddress is required' });
      return;
    }

    if (!/^0x[0-9a-fA-F]{40}$/.test(holderAddress)) {
      res.status(400).json({ error: 'Invalid Ethereum address format' });
      return;
    }

    if (documentType !== 'MARKSHEET' && documentType !== 'INCOME_CERTIFICATE') {
      res.status(400).json({
        error: 'documentType must be MARKSHEET or INCOME_CERTIFICATE',
      });
      return;
    }

    // Select template
    const template =
      documentType === 'MARKSHEET' ? MARKSHEET_TEMPLATE : INCOME_CERT_TEMPLATE;

    const issuedAt = new Date().toISOString();
    const credentialId = uuidv4();

    // Apply any field overrides (for demo: custom CGPA, income, etc.)
    const fields = template.fields.map((f) => {
      if (fieldOverrides && f.key in fieldOverrides) {
        return { key: f.key, value: fieldOverrides[f.key]! };
      }
      return f;
    });

    // Build the full structured document (in memory only — not persisted)
    const document: StructuredDocument = {
      id: credentialId,
      type: documentType as DocumentType,
      issuerAddress: issuerSigner.address,
      issuedAt,
      fields,
    };

    // Build Merkle tree from field hashes
    const merkleCredential = buildMerkleCredential(document);

    // Sign the credential
    const issuerSignature = await issuerSigner.sign(
      merkleCredential.root,
      holderAddress,
      issuedAt,
    );

    // Build the signed credential (hashes only — no raw field values)
    const signedCredential: SignedCredential = {
      id: credentialId,
      documentType: documentType as DocumentType,
      issuerAddress: issuerSigner.address,
      holderAddress,
      merkleRoot: merkleCredential.root,
      credentialRoot: rootToBytes32(merkleCredential.root),
      leaves: merkleCredential.leaves,
      issuedAt,
      issuerSignature,
      schemaVersion: '1.0',
    };

    // NOTE: We do NOT persist raw document fields anywhere.
    // The wallet stores the SignedCredential locally.
    // For proof generation, the wallet must re-derive fields from user input
    // or a locally cached copy of field values (out of scope for this demo —
    // we pass field values back to the wallet once for storage).

    // For demo purposes only: include field values in a separate key so the
    // wallet can store them locally. In production, the wallet would have
    // obtained the document from a secure source before calling /issue.
    res.json({
      credential: signedCredential,
      // WARNING: fieldValues are included ONLY for demo/local-storage purposes.
      // In production, raw values would never leave the issuer over the wire.
      fieldValues: Object.fromEntries(fields.map((f) => [f.key, f.value])),
    });
  } catch (err) {
    console.error('Error issuing credential:', err);
    res.status(500).json({ error: 'Internal server error during credential issuance' });
  }
});

/**
 * POST /revoke
 * Revokes a credential by its Merkle root (simulates issuer-side revocation).
 * In production, this would call CredentialStatus.sol's updateStatus().
 * For the demo, we return a pre-built transaction payload for the issuer to broadcast.
 */
app.post('/revoke', async (req, res) => {
  try {
    const { credentialRoot } = req.body as { credentialRoot?: string };

    if (!credentialRoot || typeof credentialRoot !== 'string') {
      res.status(400).json({ error: 'credentialRoot is required' });
      return;
    }

    // Sign a revocation attestation
    const revokedAt = new Date().toISOString();
    const { ethers } = await import('ethers');
    const revocationMessage = ethers.solidityPackedKeccak256(
      ['string', 'bytes32', 'string'],
      ['REVOKE:', credentialRoot, revokedAt],
    );

    const wallet = new ethers.Wallet(
      process.env['ISSUER_PRIVATE_KEY'] ??
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    );
    const revocationSignature = await wallet.signMessage(ethers.getBytes(revocationMessage));

    res.json({
      credentialRoot,
      revokedAt,
      issuerAddress: issuerSigner.address,
      revocationSignature,
      // In production: call CredentialStatus.sol with this data
      note: 'Call CredentialStatus.updateStatus(credentialRoot, 1) on-chain to complete revocation',
    });
  } catch (err) {
    console.error('Error revoking credential:', err);
    res.status(500).json({ error: 'Internal server error during revocation' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ZK-KYC Mock Issuer Service');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Listening on: http://localhost:${PORT}`);
  console.log(`  Issuer address: ${issuerSigner.address}`);
  console.log('  ⚠️  TESTNET ONLY — for demo use only');
  console.log('═══════════════════════════════════════════════════════');
});

export default app;
