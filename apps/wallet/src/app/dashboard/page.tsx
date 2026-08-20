'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

import type { SignedCredential } from '@zk-kyc/shared-types';

import { getCredentials, storeCredential, storeFieldValues } from '@/lib/credential-store';
import CredentialCard from '@/components/wallet/CredentialCard';
import ImportCredentialModal from '@/components/wallet/ImportCredentialModal';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [credentials, setCredentials] = useState<SignedCredential[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadCredentials = useCallback(() => {
    if (!address) return;
    const stored = getCredentials(address);
    setCredentials(stored);
    setIsLoading(false);
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      loadCredentials();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, address, loadCredentials]);

  const handleImportSuccess = useCallback(
    (credential: SignedCredential, fieldValues: Record<string, string | number | boolean>) => {
      if (!address) return;
      storeCredential(address, credential);
      storeFieldValues(address, credential.id, fieldValues);
      loadCredentials();
      setShowImport(false);
    },
    [address, loadCredentials],
  );

  if (!isConnected || !address) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '40px',
        textAlign: 'center',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'fixed',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(124, 58, 237, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          width: '80px',
          height: '80px',
          background: 'var(--gradient-accent)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          boxShadow: 'var(--shadow-glow-strong)',
        }}>
          🔐
        </div>

        <div>
          <h1 style={{ marginBottom: '12px', fontSize: '2rem' }}>Connect Your Wallet</h1>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto 32px' }}>
            Connect your MetaMask or WalletConnect wallet to access your credential dashboard.
          </p>
          <ConnectButton label="Connect Wallet" showBalance={false} />
        </div>

        <div style={{
          position: 'absolute',
          bottom: '32px',
          display: 'flex',
          gap: '24px',
          fontSize: '0.85rem',
        }}>
          <Link href="/" style={{ color: 'var(--color-text-muted)' }}>← Back to Home</Link>
          <Link href="/docs" style={{ color: 'var(--color-text-muted)' }}>Documentation</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="nav">
        <div className="container">
          <div className="nav__inner">
            <Link href="/" className="nav__logo">
              <div className="nav__logo-icon">🔐</div>
              <span>ZK-KYC</span>
            </Link>
            <div className="nav__tabs">
              <Link href="/" className="nav__tab">Home</Link>
              <Link href="/docs" className="nav__tab">Docs</Link>
              <Link href="/dashboard" className="nav__tab nav__tab--active">Dashboard</Link>
            </div>
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </nav>

      <main style={{ padding: 'var(--space-8) 0 var(--space-16)' }}>
        <div className="container">
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '40px',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <div>
              <h1 style={{ marginBottom: '8px', fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}>
                Credential Dashboard
              </h1>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                Connected: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-violet-light)' }}>
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                {' '}· Polygon Amoy Testnet
              </p>
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="btn btn--primary"
              id="import-credential-btn"
            >
              + Import Credential
            </button>
          </div>

          {/* Notice: no verifier UI here */}
          <div style={{
            padding: '14px 20px',
            background: 'rgba(124, 58, 237, 0.08)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            borderRadius: '10px',
            marginBottom: '32px',
            fontSize: '0.85rem',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span>🛡️</span>
            <span>
              This dashboard is for <strong style={{ color: 'var(--color-text-primary)' }}>credential holding</strong> only.
              Verification is handled by third-party apps using the{' '}
              <Link href="/docs#sdk" style={{ color: 'var(--color-violet-light)' }}>Verifier SDK</Link>.
              No verifier UI exists in this wallet by design.
            </span>
          </div>

          {/* Credentials grid */}
          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {[1, 2].map((i) => (
                <div key={i} className="card" style={{
                  height: '200px',
                  background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-2) 50%, var(--color-surface) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }} />
              ))}
            </div>
          ) : credentials.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📄</div>
              <h3 style={{ marginBottom: '8px', fontSize: '1.2rem' }}>No Credentials Yet</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
                Import your first credential from the mock issuer. Each credential is stored
                locally as a set of cryptographic hashes — never raw document data.
              </p>
              <button onClick={() => setShowImport(true)} className="btn btn--primary" id="empty-import-btn">
                Import First Credential
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px',
            }}>
              {credentials.map((credential) => (
                <CredentialCard
                  key={credential.id}
                  credential={credential}
                  walletAddress={address}
                  onRemove={loadCredentials}
                />
              ))}
            </div>
          )}

          {/* Proof requests section */}
          <div style={{ marginTop: '48px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <h2 style={{ fontSize: '1.25rem' }}>Pending Proof Requests</h2>
              <span className="badge badge--info">Phase 2</span>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                Proof requests from verifier apps will appear here after scanning a QR code.
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>
                Use the <Link href="/proof-request" style={{ color: 'var(--color-violet-light)' }}>
                  Proof Request flow
                </Link> to scan and approve incoming requests.
              </p>
            </div>
          </div>
        </div>
      </main>

      {showImport && (
        <ImportCredentialModal
          walletAddress={address}
          onSuccess={handleImportSuccess}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
