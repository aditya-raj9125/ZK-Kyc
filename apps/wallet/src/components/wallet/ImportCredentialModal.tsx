'use client';

import { useState } from 'react';

import type { SignedCredential } from '@zk-kyc/shared-types';

interface ImportCredentialModalProps {
  walletAddress: string;
  onSuccess: (credential: SignedCredential, fieldValues: Record<string, string | number | boolean>) => void;
  onClose: () => void;
}

const ISSUER_URL = process.env['NEXT_PUBLIC_MOCK_ISSUER_URL'] ?? 'http://localhost:3001';

export default function ImportCredentialModal({
  walletAddress,
  onSuccess,
  onClose,
}: ImportCredentialModalProps) {
  const [docType, setDocType] = useState<'MARKSHEET' | 'INCOME_CERTIFICATE'>('MARKSHEET');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${ISSUER_URL}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holderAddress: walletAddress,
          documentType: docType,
        }),
      });

      if (!response.ok) {
        const err = await response.json() as { error?: string };
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      const data = await response.json() as {
        credential: SignedCredential;
        fieldValues: Record<string, string | number | boolean>;
      };

      onSuccess(data.credential, data.fieldValues);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to mock issuer service';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card animate-fade-in"
        style={{ width: '100%', maxWidth: '500px' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <div>
            <h3 style={{ marginBottom: '4px' }}>Import Credential</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              From mock DigiLocker/University issuer
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn--ghost btn--sm"
            style={{ fontSize: '1.2rem', padding: '4px 10px' }}
          >
            ×
          </button>
        </div>

        {/* Document type selector */}
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="doc-type-select">Document Type</label>
          <select
            id="doc-type-select"
            className="input select"
            value={docType}
            onChange={(e) => setDocType(e.target.value as 'MARKSHEET' | 'INCOME_CERTIFICATE')}
          >
            <option value="MARKSHEET">🎓 Academic Marksheet (IIT Bombay)</option>
            <option value="INCOME_CERTIFICATE">💰 Income Certificate</option>
          </select>
        </div>

        {/* Preview of what will be issued */}
        <div style={{
          padding: '16px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
          border: '1px solid var(--color-border)',
          marginBottom: '20px',
          fontSize: '0.8rem',
        }}>
          <div style={{ fontWeight: '600', marginBottom: '10px', color: 'var(--color-text-secondary)' }}>
            What gets stored:
          </div>
          {docType === 'MARKSHEET' ? (
            <ul style={{ paddingLeft: '16px', color: 'var(--color-text-muted)', lineHeight: '1.8' }}>
              <li>SHA-256 hash of: studentName, rollNumber, program, institution</li>
              <li>SHA-256 hash of: semester, academicYear, cgpa, creditsCompleted</li>
              <li>SHA-256 hash of: totalCredits, passStatus</li>
              <li>Issuer ECDSA signature over Merkle root</li>
            </ul>
          ) : (
            <ul style={{ paddingLeft: '16px', color: 'var(--color-text-muted)', lineHeight: '1.8' }}>
              <li>SHA-256 hash of: holderName, aadhaarSuffix, financialYear</li>
              <li>SHA-256 hash of: annualIncome, incomeTaxPaid, incomeCategory</li>
              <li>SHA-256 hash of: issuingAuthority, validUntil</li>
              <li>Issuer ECDSA signature over Merkle root</li>
            </ul>
          )}
          <div style={{
            marginTop: '10px',
            color: 'var(--color-success)',
            fontSize: '0.75rem',
          }}>
            ✓ Raw document values are never transmitted or persisted in the credential
          </div>
        </div>

        {/* Holder address */}
        <div style={{ marginBottom: '20px' }}>
          <label>Issuing To</label>
          <div style={{
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary)',
          }}>
            {walletAddress}
          </div>
        </div>

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
            ⚠️ {error}
            {error.includes('connect') && (
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Make sure the mock issuer is running: <code style={{ fontFamily: 'var(--font-mono)' }}>pnpm dev:issuer</code>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} className="btn btn--secondary" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            onClick={() => void handleImport()}
            className="btn btn--primary"
            style={{ flex: 2 }}
            disabled={isLoading}
            id="confirm-import-btn"
          >
            {isLoading ? (
              <>
                <span className="animate-spin" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                Issuing...
              </>
            ) : (
              'Issue & Import Credential'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
