/**
 * Mock Verifier App — Example SDK Integration
 *
 * This is a SEPARATE, STANDALONE application from apps/wallet.
 * It runs on port 5174 (wallet is on port 3000).
 *
 * This app demonstrates the complete proof loop using ONLY the verifier SDK:
 *   1. requestProof() → generates QR code
 *   2. Wallet holder scans QR, approves → proof posted to relay
 *   3. verifyProof() → validates proof client-side
 *
 * It imports @zk-kyc/verifier-sdk exactly as a real third-party developer would.
 * No direct import of wallet internals or zk-core — only the SDK public API.
 */

import React, { useState, useEffect, useRef } from 'react';
import { requestProof, verifyProof } from '@zk-kyc/verifier-sdk';
import type { VerificationResult, ProofPayload } from '@zk-kyc/verifier-sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration — update after contract deployment
// ─────────────────────────────────────────────────────────────────────────────

const ISSUER_REGISTRY_ADDRESS =
  import.meta.env['VITE_ISSUER_REGISTRY_ADDRESS'] ?? '0x0000000000000000000000000000000000000000';
const CREDENTIAL_STATUS_ADDRESS =
  import.meta.env['VITE_CREDENTIAL_STATUS_ADDRESS'] ?? '0x0000000000000000000000000000000000000000';
const ISSUER_ADDRESS =
  import.meta.env['VITE_ISSUER_ADDRESS'] ?? '0x0000000000000000000000000000000000000000';
const RPC_URL = 'https://rpc-amoy.polygon.technology/';
const RELAY_URL = 'http://localhost:5174/api/relay'; // This app's relay endpoint

// In-memory relay store (dev only)
const relayStore = new Map<string, ProofPayload>();

// ─────────────────────────────────────────────────────────────────────────────
// Inline styles (matching ZK-KYC design system)
// ─────────────────────────────────────────────────────────────────────────────

const styles = {
  app: {
    fontFamily: "'Inter', sans-serif",
    background: '#0a0a0f',
    minHeight: '100vh',
    color: '#f0f0ff',
    padding: '0',
  } as React.CSSProperties,
  nav: {
    background: 'rgba(10, 10, 15, 0.9)',
    borderBottom: '1px solid rgba(124, 58, 237, 0.15)',
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(20px)',
  } as React.CSSProperties,
  main: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '48px 24px',
  } as React.CSSProperties,
  card: {
    background: '#0f0f1a',
    border: '1px solid rgba(124, 58, 237, 0.15)',
    borderRadius: '16px',
    padding: '28px',
    marginBottom: '20px',
  } as React.CSSProperties,
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '9999px',
    fontSize: '0.9rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Inter', sans-serif",
  } as React.CSSProperties,
  btnPrimary: {
    background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
    color: 'white',
    boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)',
  } as React.CSSProperties,
  btnSecondary: {
    background: 'transparent',
    color: '#f0f0ff',
    border: '1px solid rgba(124, 58, 237, 0.3)',
  } as React.CSSProperties,
  code: {
    fontFamily: "'JetBrains Mono', monospace",
    background: '#060610',
    border: '1px solid rgba(124, 58, 237, 0.15)',
    borderRadius: '10px',
    padding: '20px',
    fontSize: '0.8rem',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap' as const,
    overflowX: 'auto' as const,
    color: '#c4c4e0',
  } as React.CSSProperties,
  badge: (color: 'green' | 'red' | 'blue' | 'orange') => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 12px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600',
    background: color === 'green' ? 'rgba(16,185,129,0.1)' : color === 'red' ? 'rgba(239,68,68,0.1)' : color === 'orange' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
    color: color === 'green' ? '#10b981' : color === 'red' ? '#ef4444' : color === 'orange' ? '#f59e0b' : '#3b82f6',
    border: `1px solid ${color === 'green' ? 'rgba(16,185,129,0.2)' : color === 'red' ? 'rgba(239,68,68,0.2)' : color === 'orange' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)'}`,
  }) as React.CSSProperties,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────

type Step = 'configure' | 'qr' | 'waiting' | 'verifying' | 'result';

export default function App() {
  const [step, setStep] = useState<Step>('configure');
  const [docType, setDocType] = useState<'MARKSHEET' | 'INCOME_CERTIFICATE'>('MARKSHEET');
  const [field, setField] = useState('cgpa');
  const [operator, setOperator] = useState<'gte' | 'lte' | 'eq'>('gte');
  const [threshold, setThreshold] = useState(8);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [walletUrl, setWalletUrl] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [receivedProof, setReceivedProof] = useState<ProofPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pollInterval = useRef<number | null>(null);

  // Field options by document type
  const fieldOptions = docType === 'MARKSHEET'
    ? ['cgpa', 'semester', 'creditsCompleted', 'year']
    : ['annualIncome', 'incomeTaxPaid'];

  const handleRequestProof = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await requestProof({
        verifierName: 'Mock Loan Verifier App',
        verifierAddress: '0x0000000000000000000000000000000000000001',
        issuerAddress: ISSUER_ADDRESS,
        documentType: docType,
        predicates: [{ field, operator, value: threshold }],
        callbackOrigin: 'http://localhost:5174',
        relayUrl: RELAY_URL,
        expirySeconds: 600,
      });

      setQrDataUrl(result.qrPayload.qrDataUrl);
      setRequestId(result.requestId);
      setWalletUrl(result.qrPayload.walletUrl);
      setStep('qr');

      // Start polling for proof
      startPolling(result.requestId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate proof request');
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = (rid: string) => {
    setStep('waiting');
    pollInterval.current = window.setInterval(() => {
      const proof = relayStore.get(rid);
      if (proof) {
        clearInterval(pollInterval.current!);
        setReceivedProof(proof);
        void handleVerifyProof(proof);
      }
    }, 1000);
  };

  const handleVerifyProof = async (proof: ProofPayload) => {
    setStep('verifying');
    setIsLoading(true);

    try {
      const isContractDeployed =
        ISSUER_REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000000';

      const result = await verifyProof(proof, {
        issuerRegistryAddress: ISSUER_REGISTRY_ADDRESS,
        credentialStatusAddress: CREDENTIAL_STATUS_ADDRESS,
        rpcUrl: RPC_URL,
        skipOnChainChecks: !isContractDeployed,
      });

      setVerificationResult(result);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setStep('result');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    setStep('configure');
    setQrDataUrl(null);
    setRequestId(null);
    setWalletUrl(null);
    setVerificationResult(null);
    setReceivedProof(null);
    setError(null);
  };

  // Simulate relay receiving proof (for demo via manual paste or auto-detection)
  const handleManualProofInput = (json: string) => {
    try {
      const proof = JSON.parse(json) as ProofPayload;
      if (requestId) relayStore.set(requestId, proof);
      setReceivedProof(proof);
      void handleVerifyProof(proof);
    } catch {
      setError('Invalid proof JSON. Paste the full proof payload from the wallet.');
    }
  };

  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  return (
    <div style={styles.app}>
      {/* Nav */}
      <nav style={styles.nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>🔍</div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '1rem' }}>Mock Verifier App</div>
            <div style={{ fontSize: '0.7rem', color: '#5a5a7a' }}>@zk-kyc/verifier-sdk demo · port 5174</div>
          </div>
        </div>
        <div style={{
          fontSize: '0.75rem',
          color: '#5a5a7a',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '4px 12px',
          borderRadius: '9999px',
        }}>
          ⚠️ Separate from wallet · Verification only
        </div>
      </nav>

      <main style={styles.main}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            ZK Credential Verifier
          </h1>
          <p style={{ color: '#9090b0', maxWidth: '600px' }}>
            This app demonstrates the <code style={{ fontFamily: 'JetBrains Mono', color: '#a78bfa' }}>@zk-kyc/verifier-sdk</code> integration.
            It is intentionally separate from the ZK-KYC wallet — verification is SDK-only,
            never inside the wallet product.
          </p>
        </div>

        {/* SDK import badge */}
        <div style={{ ...styles.card, borderColor: 'rgba(124, 58, 237, 0.3)', marginBottom: '32px' }}>
          <div style={{ fontSize: '0.72rem', color: '#5a5a7a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            SDK Import (this is all a third-party dev needs)
          </div>
          <code style={{ fontFamily: 'JetBrains Mono', color: '#a78bfa', fontSize: '0.85rem' }}>
            import {'{ requestProof, verifyProof }'} from &apos;@zk-kyc/verifier-sdk&apos;;
          </code>
        </div>

        {/* Step 1: Configure */}
        {step === 'configure' && (
          <div style={styles.card}>
            <h3 style={{ marginBottom: '24px', fontSize: '1.1rem' }}>
              Step 1 — Configure Proof Request
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#9090b0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Document Type
                </label>
                <select
                  id="doc-type"
                  value={docType}
                  onChange={(e) => {
                    setDocType(e.target.value as 'MARKSHEET' | 'INCOME_CERTIFICATE');
                    setField(e.target.value === 'MARKSHEET' ? 'cgpa' : 'annualIncome');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    borderRadius: '10px',
                    color: '#f0f0ff',
                    fontFamily: 'Inter',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="MARKSHEET">Academic Marksheet</option>
                  <option value="INCOME_CERTIFICATE">Income Certificate</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#9090b0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Field
                </label>
                <select
                  id="field-select"
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    borderRadius: '10px',
                    color: '#f0f0ff',
                    fontFamily: 'Inter',
                    fontSize: '0.9rem',
                  }}
                >
                  {fieldOptions.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#9090b0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Predicate
                </label>
                <select
                  id="operator-select"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as 'gte' | 'lte' | 'eq')}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    borderRadius: '10px',
                    color: '#f0f0ff',
                    fontFamily: 'Inter',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="gte">≥ (gte)</option>
                  <option value="lte">≤ (lte)</option>
                  <option value="eq">= (eq)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#9090b0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Threshold Value
                </label>
                <input
                  id="threshold-input"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    borderRadius: '10px',
                    color: '#f0f0ff',
                    fontFamily: 'Inter',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            {/* Preview */}
            <div style={{
              padding: '14px 18px',
              background: 'rgba(124, 58, 237, 0.08)',
              borderRadius: '10px',
              border: '1px solid rgba(124,58,237,0.2)',
              marginBottom: '20px',
              fontSize: '0.9rem',
              color: '#a78bfa',
            }}>
              Request: Prove that <strong>{field}</strong> {operator} <strong>{threshold}</strong>
              {' '}from a <strong>{docType}</strong> credential
            </div>

            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px',
                marginBottom: '16px',
                color: '#ef4444',
                fontSize: '0.85rem',
              }}>
                {error}
              </div>
            )}

            <button
              id="generate-qr-btn"
              onClick={() => void handleRequestProof()}
              disabled={isLoading}
              style={{ ...styles.btn, ...styles.btnPrimary }}
            >
              {isLoading ? '⏳ Generating...' : '📱 Generate QR Code'}
            </button>
          </div>
        )}

        {/* Step 2: QR Code */}
        {(step === 'qr' || step === 'waiting') && qrDataUrl && (
          <div style={styles.card}>
            <h3 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>
              Step 2 — Wallet Holder Scans QR
            </h3>
            <p style={{ color: '#9090b0', marginBottom: '24px', fontSize: '0.9rem' }}>
              Share this QR code with the wallet holder. They will scan it and approve the proof request.
            </p>

            <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* QR code */}
              <div style={{ textAlign: 'center' }}>
                <img src={qrDataUrl} alt="Proof Request QR Code" style={{ borderRadius: '12px', border: '2px solid rgba(124,58,237,0.3)' }} />
                <div style={{ fontSize: '0.7rem', color: '#5a5a7a', marginTop: '8px' }}>
                  Request ID: {requestId?.slice(0, 8)}...
                </div>
              </div>

              {/* Alternative: direct link */}
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9090b0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Or open directly in wallet
                  </div>
                  <a
                    href={walletUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...styles.btn, ...styles.btnSecondary, display: 'inline-flex', textDecoration: 'none' }}
                    id="open-in-wallet-link"
                  >
                    Open in Wallet App ↗
                  </a>
                </div>

                {step === 'waiting' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 18px',
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: '10px',
                    color: '#f59e0b',
                    fontSize: '0.85rem',
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '16px', height: '16px',
                      border: '2px solid rgba(245,158,11,0.3)',
                      borderTopColor: '#f59e0b',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                    Waiting for wallet to approve and return proof...
                  </div>
                )}

                {/* Manual proof paste fallback */}
                <div style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9090b0', marginBottom: '8px' }}>
                    Paste proof payload manually (dev fallback):
                  </div>
                  <textarea
                    id="manual-proof-input"
                    placeholder='Paste {"requestId": "...", "fieldProofs": [...], ...}'
                    onChange={(e) => {
                      if (e.target.value.trim().startsWith('{')) {
                        handleManualProofInput(e.target.value);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '80px',
                      padding: '10px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#c4c4e0',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '0.7rem',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              style={{ ...styles.btn, ...styles.btnSecondary, marginTop: '20px' }}
            >
              ← Start Over
            </button>
          </div>
        )}

        {/* Step 3: Verifying */}
        {step === 'verifying' && (
          <div style={{ ...styles.card, textAlign: 'center', padding: '48px' }}>
            <div style={{
              width: '48px', height: '48px',
              border: '3px solid rgba(124,58,237,0.3)',
              borderTopColor: '#7c3aed',
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 1s linear infinite',
            }} />
            <h3>Verifying Proof...</h3>
            <p style={{ color: '#9090b0', marginTop: '8px' }}>
              Checking Merkle proofs, signature, issuer trust, and on-chain status.
            </p>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 'result' && verificationResult && (
          <div>
            <div style={{
              ...styles.card,
              borderColor: verificationResult.valid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
              background: verificationResult.valid ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
              textAlign: 'center',
              padding: '40px',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
                {verificationResult.valid ? '✅' : '❌'}
              </div>
              <h2 style={{
                color: verificationResult.valid ? '#10b981' : '#ef4444',
                marginBottom: '8px',
              }}>
                {verificationResult.valid ? 'Proof Valid' : 'Proof Invalid'}
              </h2>
              {!verificationResult.valid && verificationResult.reason && (
                <p style={{ color: '#9090b0' }}>{verificationResult.reason}</p>
              )}
              {verificationResult.valid && (
                <p style={{ color: '#9090b0' }}>
                  The credential predicate is proven valid. Issuer is trusted. Credential is active.
                </p>
              )}
            </div>

            {/* Verification checks breakdown */}
            <div style={styles.card}>
              <h4 style={{ marginBottom: '16px', fontSize: '0.95rem' }}>Verification Checks</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(verificationResult.checks).map(([key, value]) => (
                  <div key={key} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                  }}>
                    <span style={{ color: '#9090b0', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span style={styles.badge(
                      value === null ? 'blue' : value ? 'green' : 'red'
                    )}>
                      {value === null ? 'N/A' : value ? '✓ Pass' : '✗ Fail'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Received proof payload */}
            {receivedProof && (
              <div style={styles.card}>
                <h4 style={{ marginBottom: '16px', fontSize: '0.95rem' }}>Received Proof Payload</h4>
                <div style={{ ...styles.code, maxHeight: '300px', overflow: 'auto' }}>
                  {JSON.stringify(receivedProof, null, 2)}
                </div>
              </div>
            )}

            <button
              id="try-again-btn"
              onClick={handleReset}
              style={{ ...styles.btn, ...styles.btnPrimary }}
            >
              Try Another Proof
            </button>
          </div>
        )}

        {/* Revocation demo info */}
        <div style={{ ...styles.card, marginTop: '40px', borderColor: 'rgba(59,130,246,0.2)' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '0.95rem', color: '#3b82f6' }}>
            🔄 Revocation Demo
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#9090b0', lineHeight: '1.7' }}>
            To test revocation: call <code style={{ fontFamily: 'JetBrains Mono', color: '#a78bfa' }}>POST /revoke</code> on the mock issuer,
            then call <code style={{ fontFamily: 'JetBrains Mono', color: '#a78bfa' }}>CredentialStatus.updateStatus(root, 1)</code> on-chain.
            Re-run verification here — it should now return{' '}
            <code style={{ color: '#ef4444', fontFamily: 'JetBrains Mono' }}>{'{ valid: false, reason: "credential revoked" }'}</code>.
          </p>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; }
        select, input { outline: none; }
        select option { background: #0f0f1a; }
      `}</style>
    </div>
  );
}
