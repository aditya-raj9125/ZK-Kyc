'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';

import type { ProofRequest, SignedCredential } from '@zk-kyc/shared-types';

import { decodeProofRequest, generateProofPayload } from '@/lib/proof-generation';
import { getCredentials, getFieldValues } from '@/lib/credential-store';

function ProofRequestContent() {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const [request, setRequest] = useState<ProofRequest | null>(null);
  const [matchingCredential, setMatchingCredential] = useState<SignedCredential | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'generating' | 'done'>('pending');
  const [proofPayloadJson, setProofPayloadJson] = useState<string | null>(null);

  useEffect(() => {
    const encoded = searchParams.get('proofRequest');
    if (!encoded) {
      setError('No proof request found in URL. Scan a QR code from a verifier app.');
      return;
    }

    try {
      const decoded = decodeProofRequest(encoded);
      setRequest(decoded);
    } catch {
      setError('Invalid proof request encoding. The QR code may be corrupted.');
    }
  }, [searchParams]);

  const findMatchingCredential = useCallback(() => {
    if (!address || !request) return;

    const credentials = getCredentials(address);
    const match = credentials.find(
      (c) =>
        c.issuerAddress.toLowerCase() === request.issuerAddress.toLowerCase() &&
        c.documentType === request.documentType,
    );

    if (match) {
      setMatchingCredential(match);
    }
  }, [address, request]);

  useEffect(() => {
    findMatchingCredential();
  }, [findMatchingCredential]);

  const handleApprove = async () => {
    if (!matchingCredential || !request || !address) return;

    setStatus('generating');

    try {
      const fieldValues = getFieldValues(address, matchingCredential.id);
      if (!fieldValues) {
        throw new Error('Field values not found for this credential. Cannot generate proof.');
      }

      const proofPayload = generateProofPayload(request, matchingCredential, fieldValues);
      const payloadJson = JSON.stringify(proofPayload, null, 2);
      setProofPayloadJson(payloadJson);

      // 1. Broadcast via BroadcastChannel (instant cross-tab communication)
      try {
        const channel = new BroadcastChannel('zk_kyc_proof_relay');
        channel.postMessage({ requestId: request.requestId, proof: proofPayload });
        channel.close();
      } catch {}

      // 2. Post proof to relay URL
      try {
        await fetch(request.relayUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: request.requestId, proof: proofPayload }),
        });
      } catch (err) {
        console.warn('Relay post failed (network fallback):', err);
      }

      setStatus('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate proof';
      setError(msg);
      setStatus('pending');
    }
  };

  const handleReject = () => {
    setStatus('rejected');
  };

  if (!isConnected) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2>Wallet Not Connected</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '12px' }}>
          Connect your wallet to respond to proof requests.
        </p>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⚠️</div>
        <h2>Invalid Proof Request</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '12px', maxWidth: '400px', margin: '12px auto 0' }}>
          {error}
        </p>
        <Link href="/dashboard" className="btn btn--secondary" style={{ marginTop: '24px', display: 'inline-flex' }}>
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!request) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div className="animate-spin" style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-violet)',
          borderRadius: '50%',
          margin: '0 auto 16px',
        }} />
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading proof request...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Status: Done */}
      {status === 'done' && (
        <div className="card animate-fade-in" style={{
          borderColor: 'rgba(16, 185, 129, 0.3)',
          background: 'rgba(16, 185, 129, 0.05)',
          textAlign: 'center',
          padding: '40px',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>✅</div>
          <h2 style={{ marginBottom: '8px', color: 'var(--color-success)' }}>Proof Generated</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
            Your proof has been generated and sent to {request.verifierName}.
            Only the requested field was disclosed — no other data was shared.
          </p>
          {proofPayloadJson && (
            <div className="code-panel" style={{ textAlign: 'left', marginTop: '16px', maxHeight: '200px', overflow: 'auto' }}>
              <div className="code-panel__header">
                <div className="code-panel__dots">
                  <div className="code-panel__dot" /><div className="code-panel__dot" /><div className="code-panel__dot" />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>proof-payload.json</span>
              </div>
              <pre style={{ fontSize: '0.65rem', margin: 0 }}>{proofPayloadJson.slice(0, 600)}...</pre>
            </div>
          )}
          <Link href="/dashboard" className="btn btn--secondary" style={{ marginTop: '24px', display: 'inline-flex' }}>
            ← Back to Dashboard
          </Link>
        </div>
      )}

      {/* Status: Rejected */}
      {status === 'rejected' && (
        <div className="card animate-fade-in" style={{
          borderColor: 'rgba(239, 68, 68, 0.3)',
          textAlign: 'center',
          padding: '40px',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🚫</div>
          <h2 style={{ marginBottom: '8px' }}>Request Rejected</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
            You rejected the proof request from {request.verifierName}. No data was shared.
          </p>
          <Link href="/dashboard" className="btn btn--secondary" style={{ display: 'inline-flex' }}>
            ← Back to Dashboard
          </Link>
        </div>
      )}

      {/* Status: Pending / Generating */}
      {(status === 'pending' || status === 'generating') && (
        <>
          {/* Requester info */}
          <div className="card card--gradient-border animate-fade-in" style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Proof Request From
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '4px' }}>
              {request.verifierName}
            </div>
            {request.verifierAddress && (
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                {request.verifierAddress}
              </div>
            )}
          </div>

          {/* What's being requested */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '16px' }}>What This App is Requesting</h4>
            {request.predicates.map((predicate, i) => (
              <div key={i} style={{
                padding: '12px 16px',
                background: 'rgba(124, 58, 237, 0.08)',
                border: '1px solid rgba(124, 58, 237, 0.2)',
                borderRadius: '8px',
                marginBottom: '8px',
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  Field: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet-light)' }}>{predicate.field}</code>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  Predicate: {predicate.operator} {predicate.value !== undefined ? predicate.value : `[${predicate.min}, ${predicate.max}]`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: '6px' }}>
                  ✓ Only this predicate result will be shared — value is {predicate.operator === 'eq' ? 'revealed' : 'hidden'}
                </div>
              </div>
            ))}
          </div>

          {/* What will NOT be shared */}
          <div className="card" style={{ marginBottom: '20px', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '0.95rem' }}>🛡️ Privacy Guarantee</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: '1.7' }}>
              <p>✓ Only the requested field&apos;s proof will be disclosed</p>
              <p>✓ No other credential fields will be revealed</p>
              <p>✓ No raw document, no name, no unrelated data</p>
              <p>✓ {request.documentType === 'MARKSHEET' ? 'Your exact CGPA will not be revealed (only that it satisfies the predicate)' : 'Your exact income will not be revealed (only that it satisfies the predicate)'}</p>
            </div>
          </div>

          {/* Matching credential */}
          {!matchingCredential ? (
            <div className="card" style={{
              borderColor: 'rgba(239, 68, 68, 0.2)',
              marginBottom: '20px',
              textAlign: 'center',
              padding: '32px',
            }}>
              <p style={{ color: 'var(--color-error)' }}>
                ⚠️ No matching credential found for {request.documentType} from{' '}
                {request.issuerAddress.slice(0, 8)}...
              </p>
              <Link href="/dashboard" className="btn btn--secondary btn--sm" style={{ marginTop: '16px', display: 'inline-flex' }}>
                Import a Credential First
              </Link>
            </div>
          ) : null}

          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--color-error-bg)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              color: 'var(--color-error)',
            }}>
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleReject}
              className="btn btn--secondary"
              style={{ flex: 1 }}
              disabled={status === 'generating'}
              id="reject-proof-btn"
            >
              Reject
            </button>
            <button
              onClick={() => void handleApprove()}
              className="btn btn--primary"
              style={{ flex: 2 }}
              disabled={status === 'generating' || !matchingCredential}
              id="approve-proof-btn"
            >
              {status === 'generating' ? (
                <>
                  <span className="animate-spin" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                  Generating Proof...
                </>
              ) : (
                '🔐 Approve & Generate Proof'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ProofRequestPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <div className="container">
          <div className="nav__inner">
            <Link href="/" className="nav__logo">
              <div className="nav__logo-icon">🔐</div>
              <span>ZK-KYC</span>
            </Link>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Proof Request
            </div>
          </div>
        </div>
      </nav>
      <Suspense fallback={<div style={{ padding: '80px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>}>
        <ProofRequestContent />
      </Suspense>
    </div>
  );
}
