'use client';

import { useState } from 'react';
import Link from 'next/link';

const ISSUER_REGISTRY_ADDRESS = process.env['NEXT_PUBLIC_ISSUER_REGISTRY_ADDRESS'] ?? '(deploy first)';
const CREDENTIAL_STATUS_ADDRESS = process.env['NEXT_PUBLIC_CREDENTIAL_STATUS_ADDRESS'] ?? '(deploy first)';

export default function DocsPage() {
  const [audience, setAudience] = useState<'users' | 'developers'>('users');

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <div className="container">
          <div className="nav__inner">
            <Link href="/" className="nav__logo">
              <div className="nav__logo-icon">🔐</div>
              <span>ZK-KYC</span>
            </Link>
            <div className="nav__tabs">
              <Link href="/" className="nav__tab">Home</Link>
              <Link href="/docs" className="nav__tab nav__tab--active">Docs</Link>
              <Link href="/dashboard" className="nav__tab">Dashboard</Link>
            </div>
          </div>
        </div>
      </nav>

      <main style={{ padding: 'var(--space-10) 0 var(--space-16)' }}>
        <div className="container container--narrow">
          <h1 style={{ marginBottom: '8px' }}>Documentation</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '40px' }}>
            Everything you need to know about the ZK-KYC Wallet & Verifier SDK.
          </p>

          {/* Audience selector */}
          <div className="tabs" style={{ marginBottom: '48px' }}>
            <button
              className={`tab-btn ${audience === 'users' ? 'tab-btn--active' : ''}`}
              onClick={() => setAudience('users')}
              id="docs-tab-users"
            >
              For Wallet Users
            </button>
            <button
              className={`tab-btn ${audience === 'developers' ? 'tab-btn--active' : ''}`}
              onClick={() => setAudience('developers')}
              id="docs-tab-developers"
            >
              For Developers
            </button>
          </div>

          {audience === 'users' ? <UserDocs /> : <DeveloperDocs
            issuerRegistry={ISSUER_REGISTRY_ADDRESS}
            credentialStatus={CREDENTIAL_STATUS_ADDRESS}
          />}
        </div>
      </main>
    </div>
  );
}

function UserDocs() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <DocSection
        id="users-connect"
        icon="🔌"
        title="1. Connect Your Wallet"
        content={[
          'Click "Connect Wallet" on the homepage or dashboard.',
          'Select MetaMask or any WalletConnect-compatible wallet.',
          'Make sure you are on the Ethereum Sepolia testnet (Chain ID: 11155111).',
          'Your wallet address becomes the holder identifier — credentials are stored locally and associated with this address.',
        ]}
      />

      <DocSection
        id="users-import"
        icon="📄"
        title="2. Import a Credential"
        content={[
          'From the Dashboard, click "Import Credential".',
          'Choose a document type: Academic Marksheet or Income Certificate.',
          'The mock issuer service generates a structured document, builds a Merkle tree of field hashes, and signs the root.',
          'Your wallet stores ONLY the field hashes (MerkleLeaf[]) and the issuer signature — never the raw document.',
          'Raw field values (name, CGPA, income, etc.) are stored separately for proof generation, never in the credential object.',
        ]}
      />

      <DocSection
        id="users-view"
        icon="🌳"
        title="3. View Your Credential"
        content={[
          'Each credential card shows: document type, issuer, Merkle root (shortened), and on-chain status.',
          'Click "View Field Tree" to see the Merkle leaves — field names and their SHA-256 hashes.',
          'The on-chain status is fetched live from CredentialStatus.sol on Ethereum Sepolia.',
          'Green "Active" badge = credential is valid. Red "Revoked" = credential has been revoked by the issuer.',
        ]}
      />

      <DocSection
        id="users-proof"
        icon="🔐"
        title="4. Respond to Proof Requests"
        content={[
          'When a third-party app requests a proof, it generates a QR code containing the proof request.',
          'Scan the QR code with your phone camera, or the verifier app may redirect you to the wallet URL directly.',
          'The wallet shows exactly what is being requested (e.g., "prove CGPA ≥ 8") and what will be disclosed.',
          'Review the privacy guarantee — for threshold predicates (gte/lte), your exact value is NOT revealed.',
          'Click "Approve & Generate Proof" to generate the ZK proof and send it to the verifier.',
          'You can also click "Reject" to deny the request — no data is shared.',
        ]}
      />

      <DocSection
        id="users-revoke"
        icon="⚠️"
        title="5. Revocation"
        content={[
          'Credential revocation is an issuer-side action, not a wallet action.',
          'If the issuer (university, income authority) revokes a credential, its on-chain status changes to "Revoked".',
          'Your credential card will show a red "Revoked" badge.',
          'Any subsequent proof verification by a third-party app will fail with "credential revoked".',
          'You cannot un-revoke a credential — contact the issuer.',
        ]}
      />

      <div id="assumptions" style={{
        padding: '24px',
        background: 'rgba(59, 130, 246, 0.06)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '12px',
      }}>
        <h3 style={{ marginBottom: '12px', fontSize: '1.1rem' }}>📋 What Is Simulated vs. Real</h3>
        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: '1.8' }}>
          <p><strong style={{ color: 'var(--color-info)' }}>Simulated:</strong> DigiLocker/government API integration, OCR/PDF field extraction, real document signing by government authorities.</p>
          <p><strong style={{ color: 'var(--color-success)' }}>Real:</strong> Merkle tree construction, SHA-256 field hashing, ECDSA issuer signatures, Ethereum Sepolia smart contracts, ZK proof generation and verification logic.</p>
          <p style={{ marginTop: '12px' }}><strong>This project is a proposed extension to DigiLocker/NAD-style infrastructure, not a replacement or competitor to it.</strong> The mock issuer simulates the shape of interaction a real DigiLocker issuer would have.</p>
        </div>
      </div>
    </div>
  );
}

function DeveloperDocs({
  issuerRegistry,
  credentialStatus,
}: {
  issuerRegistry: string;
  credentialStatus: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <DocSection
        id="sdk"
        icon="📦"
        title="SDK Installation"
      >
        <div className="code-panel">
          <div className="code-panel__header">
            <div className="code-panel__dots">
              <div className="code-panel__dot" /><div className="code-panel__dot" /><div className="code-panel__dot" />
            </div>
          </div>
          <pre><code>{`npm install @zk-kyc/verifier-sdk
# or
pnpm add @zk-kyc/verifier-sdk`}</code></pre>
        </div>
      </DocSection>

      <DocSection id="sdk-usage" icon="⚡" title="Quick Start">
        <div className="code-panel">
          <div className="code-panel__header">
            <div className="code-panel__dots">
              <div className="code-panel__dot" /><div className="code-panel__dot" /><div className="code-panel__dot" />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>verifier-app.ts</span>
          </div>
          <pre><code>{`import { requestProof, verifyProof } from '@zk-kyc/verifier-sdk';

// Step 1: Create a proof request
const { qrPayload, requestId } = await requestProof({
  verifierName: 'My Loan App',
  issuerAddress: '${issuerRegistry.slice(0, 20)}...',
  documentType: 'MARKSHEET',
  predicates: [{
    field: 'cgpa',
    operator: 'gte',
    value: 8
  }],
  relayUrl: 'http://localhost:5174/api/relay',
  callbackOrigin: 'http://localhost:5174',
});

// Step 2: Show QR code to wallet holder
displayQRCode(qrPayload.qrDataUrl);

// Step 3: Poll relay for proof (or use postMessage)
const proof = await pollRelay(requestId);

// Step 4: Verify proof client-side (no backend call)
const result = await verifyProof(proof, {
  issuerRegistryAddress: '${issuerRegistry}',
  credentialStatusAddress: '${credentialStatus}',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
});

console.log(result);
// {
//   valid: true,
//   checks: {
//     merkleProofValid: true,
//     predicateValid: true,
//     issuerSignatureValid: true,
//     issuerTrusted: true,
//     credentialActive: true,
//   }
// }`}</code></pre>
        </div>
      </DocSection>

      <DocSection id="sdk-api" icon="🔧" title="API Reference">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[
            {
              name: 'requestProof(config)',
              desc: 'Constructs a ProofRequest, encodes it as base64url, and generates a QR code data URL. Returns the QR payload and a requestId for polling.',
              returns: '{ qrPayload: { qrDataUrl, encodedRequest }, requestId }',
            },
            {
              name: 'verifyProof(proof, options)',
              desc: 'Verifies a ProofPayload client-side. Checks: Merkle inclusion proofs, predicate witnesses, issuer ECDSA signature, issuer trust (IssuerRegistry), and credential status (CredentialStatus). No backend call required.',
              returns: 'Promise<VerificationResult>',
            },
            {
              name: 'generateQR(data)',
              desc: 'Low-level QR code generator. Converts any string to a QR data URL.',
              returns: 'Promise<string> (data URL)',
            },
          ].map((item) => (
            <div key={item.name} style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
            }}>
              <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet-light)', fontSize: '0.9rem' }}>
                {item.name}
              </code>
              <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>{item.desc}</p>
              <div style={{ marginTop: '8px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                Returns: {item.returns}
              </div>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection id="contracts" icon="📋" title="Testnet Contracts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { name: 'IssuerRegistry', address: issuerRegistry, desc: 'Owner-controlled registry of trusted issuers.' },
            { name: 'CredentialStatus', address: credentialStatus, desc: 'Issuer-controlled credential revocation registry.' },
          ].map((contract) => (
            <div key={contract.name} style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>{contract.name}.sol</div>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-violet-light)' }}>
                {contract.address}
              </code>
              <p style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--color-text-secondary)' }}>{contract.desc}</p>
              {contract.address !== '(deploy first)' && (
                <a
                  href={`https://sepolia.etherscan.io/address/${contract.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', marginTop: '8px', display: 'inline-block' }}
                >
                  View on Sepolia Explorer ↗
                </a>
              )}
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection id="proof-schema" icon="📐" title="Proof Request Schema">
        <div className="code-panel">
          <div className="code-panel__header">
            <div className="code-panel__dots">
              <div className="code-panel__dot" /><div className="code-panel__dot" /><div className="code-panel__dot" />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>shared-types/ProofRequest</span>
          </div>
          <pre><code>{`interface ProofRequest {
  requestId: string;        // UUID
  verifierName: string;     // Human-readable verifier name
  issuerAddress: string;    // Expected issuer Ethereum address
  documentType: 'MARKSHEET' | 'INCOME_CERTIFICATE';
  predicates: FieldPredicate[];
  callbackOrigin: string;   // Verifier origin for postMessage
  relayUrl: string;         // Endpoint to POST proof to
  expiresAt: string;        // ISO 8601 expiry
  schemaVersion: '1.0';
}

interface FieldPredicate {
  field: string;            // e.g. 'cgpa', 'annualIncome'
  operator: 'eq' | 'gte' | 'lte' | 'gt' | 'lt' | 'range';
  value?: number | string;  // For single-bound predicates
  min?: number;             // For range predicate
  max?: number;             // For range predicate
}`}</code></pre>
        </div>
      </DocSection>
    </div>
  );
}

function DocSection({
  id,
  icon,
  title,
  content,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  content?: string[];
  children?: React.ReactNode;
}) {
  return (
    <div id={id}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
        <h2 style={{ fontSize: '1.2rem' }}>{title}</h2>
      </div>
      {content && (
        <ul style={{
          paddingLeft: '0',
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          {content.map((item, i) => (
            <li key={i} style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              fontSize: '0.9rem',
              color: 'var(--color-text-secondary)',
              lineHeight: '1.6',
            }}>
              <span style={{ color: 'var(--color-violet-light)', minWidth: '20px', marginTop: '1px' }}>→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}
