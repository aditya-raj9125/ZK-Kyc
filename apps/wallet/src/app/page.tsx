'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

export default function HomePage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'without' | 'with' | 'detailed'>('without');
  const [activeNavTab, setActiveNavTab] = useState<'home' | 'docs'>('home');

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '800px',
        height: '500px',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(124, 58, 237, 0.25) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Navigation */}
      <nav className="nav">
        <div className="container">
          <div className="nav__inner">
            <Link href="/" className="nav__logo">
              <div className="nav__logo-icon">🔐</div>
              <span>ZK-KYC</span>
            </Link>

            <div className="nav__tabs">
              <button
                className={`nav__tab ${activeNavTab === 'home' ? 'nav__tab--active' : ''}`}
                onClick={() => setActiveNavTab('home')}
              >
                Home
              </button>
              <Link
                href="/docs"
                className={`nav__tab ${activeNavTab === 'docs' ? 'nav__tab--active' : ''}`}
                onClick={() => setActiveNavTab('docs')}
              >
                Docs
              </Link>
              {isConnected && (
                <Link href="/dashboard" className="nav__tab">
                  Dashboard
                </Link>
              )}
            </div>

            <ConnectButton
              label="Connect Wallet"
              showBalance={false}
              chainStatus="icon"
            />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: 'clamp(80px, 12vw, 140px) 0 clamp(60px, 8vw, 100px)',
        position: 'relative',
        zIndex: 1,
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          {/* Label */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(124, 58, 237, 0.12)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: '9999px',
            padding: '6px 16px',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: 'var(--color-violet-light)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '32px',
          }}>
            <span>●</span>
            <span>Polygon Amoy Testnet · Hackathon Build</span>
          </div>

          <h1 style={{ marginBottom: '24px', maxWidth: '800px', margin: '0 auto 24px' }}>
            Prove What You Know,{' '}
            <span className="gradient-text">Not What You Are</span>
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            maxWidth: '620px',
            margin: '0 auto 48px',
            color: 'var(--color-text-secondary)',
            lineHeight: '1.8',
          }}>
            A zero-knowledge credential wallet that stores only cryptographic hashes
            of your documents and lets you prove specific facts — CGPA ≥ 8, income &lt; ₹5L —
            without revealing the underlying document or unrelated fields.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {isConnected ? (
              <Link href="/dashboard" className="btn btn--primary btn--lg">
                Open Dashboard →
              </Link>
            ) : (
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="btn btn--primary btn--lg animate-pulse-glow"
                    id="hero-connect-btn"
                  >
                    Connect Wallet to Start
                  </button>
                )}
              </ConnectButton.Custom>
            )}
            <Link href="/docs" className="btn btn--secondary btn--lg">
              SDK Documentation
            </Link>
          </div>

          {/* Assumption notice */}
          <div style={{
            marginTop: '48px',
            padding: '16px 24px',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '12px',
            maxWidth: '700px',
            margin: '48px auto 0',
            fontSize: '0.85rem',
            color: 'var(--color-text-secondary)',
            textAlign: 'left',
          }}>
            <strong style={{ color: 'var(--color-info)' }}>ℹ️ Design assumption stated explicitly:</strong>
            {' '}This project assumes a future DigiLocker/NAD-style issuer already extracts structured fields
            from documents and signs them. We build the trust & verification layer above that assumption.
            The mock issuer simulates this interaction — no real DigiLocker API is used.{' '}
            <Link href="/docs#assumptions" style={{ color: 'var(--color-violet-light)' }}>
              Read assumptions →
            </Link>
          </div>
        </div>
      </section>

      {/* Problem → Solution Section */}
      <section style={{ padding: 'var(--space-16) 0', position: 'relative', zIndex: 1 }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            <div className="card" style={{
              borderColor: 'rgba(239, 68, 68, 0.2)',
              background: 'rgba(239, 68, 68, 0.04)',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '16px' }}>❌</div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--color-error)' }}>
                Today: Full Document Disclosure
              </h3>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.7' }}>
                Loan applicants share entire marksheets. Employers receive full income certificates.
                Unrelated fields leak — name, address, roll number, tax details — creating
                unnecessary privacy exposure and fraud surface.
              </p>
            </div>

            <div className="card card--gradient-border" style={{
              background: 'rgba(124, 58, 237, 0.04)',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '16px' }}>✅</div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--color-success)' }}>
                With ZK-KYC: Selective Disclosure
              </h3>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.7' }}>
                Prove "CGPA ≥ 8" or "annual income &lt; ₹5,00,000" with a
                zero-knowledge proof — no underlying document revealed, no unrelated
                fields disclosed, cryptographically verifiable by any third party.
              </p>
            </div>

            <div className="card" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '16px' }}>🔗</div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--color-info)' }}>
                On-Chain Trust Anchor
              </h3>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.7' }}>
                Issuer public keys and credential status (active/revoked) are anchored
                on Polygon Amoy. Verifiers check on-chain status client-side — no backend
                call to this project required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Tabs */}
      <section style={{
        padding: 'var(--space-16) 0',
        position: 'relative',
        zIndex: 1,
        background: 'linear-gradient(to bottom, transparent, rgba(15, 15, 26, 0.5), transparent)',
      }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ marginBottom: '16px' }}>System Architecture</h2>
            <p style={{ color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
              Four clean layers, strict separation of concerns. Verification happens
              entirely in the third-party verifier SDK — never inside the wallet.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
            <div className="tabs">
              <button
                className={`tab-btn ${activeTab === 'without' ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveTab('without')}
                id="tab-without-sdk"
              >
                Without ZK-KYC
              </button>
              <button
                className={`tab-btn ${activeTab === 'with' ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveTab('with')}
                id="tab-with-sdk"
              >
                With ZK-KYC
              </button>
              <button
                className={`tab-btn ${activeTab === 'detailed' ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveTab('detailed')}
                id="tab-detailed"
              >
                Detailed Architecture
              </button>
            </div>

            <div className="card card--glass animate-fade-in" style={{ width: '100%', maxWidth: '900px' }}>
              {activeTab === 'without' && (
                <div>
                  <h4 style={{ marginBottom: '24px', color: 'var(--color-error)' }}>
                    ❌ Traditional Document Sharing
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    textAlign: 'center',
                  }}>
                    {['User', '→ Full PDF →', 'Verifier'].map((item, i) => (
                      <div key={i} style={{
                        padding: '20px',
                        background: i === 1 ? 'var(--color-error-bg)' : 'rgba(255,255,255,0.04)',
                        borderRadius: '10px',
                        border: `1px solid ${i === 1 ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}`,
                        color: i === 1 ? 'var(--color-error)' : 'var(--color-text-secondary)',
                        fontSize: '0.9rem',
                      }}>
                        {item}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '24px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    <p>❌ Full name, roll number, address, all grades exposed</p>
                    <p>❌ Cannot be verified without manual inspection</p>
                    <p>❌ Document can be forged or manipulated</p>
                    <p>❌ No revocation mechanism</p>
                  </div>
                </div>
              )}

              {activeTab === 'with' && (
                <div>
                  <h4 style={{ marginBottom: '24px', color: 'var(--color-success)' }}>
                    ✅ ZK-KYC Selective Disclosure
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '12px',
                    textAlign: 'center',
                    alignItems: 'center',
                  }}>
                    {[
                      { label: 'Issuer', sub: 'Signs Merkle root' },
                      { label: '→', sub: '' },
                      { label: 'Wallet', sub: 'Stores hashes only' },
                      { label: '→ ZK Proof →', sub: 'No raw data' },
                      { label: 'Verifier SDK', sub: 'Client-side verify' },
                    ].map((item, i) => (
                      <div key={i} style={{
                        padding: '16px 8px',
                        background: i === 3 ? 'rgba(124, 58, 237, 0.1)' : 'rgba(255,255,255,0.04)',
                        borderRadius: '10px',
                        border: `1px solid ${i === 3 ? 'rgba(124,58,237,0.3)' : 'var(--color-border)'}`,
                        fontSize: '0.8rem',
                      }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{item.label}</div>
                        {item.sub && <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>{item.sub}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '24px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    <p style={{ color: 'var(--color-success)' }}>✅ Only the proven field (e.g., "CGPA ≥ 8") is disclosed</p>
                    <p style={{ color: 'var(--color-success)' }}>✅ Cryptographically verifiable, no manual inspection needed</p>
                    <p style={{ color: 'var(--color-success)' }}>✅ On-chain status check (active/revoked)</p>
                    <p style={{ color: 'var(--color-success)' }}>✅ Verifier SDK works client-side, no backend call required</p>
                  </div>
                </div>
              )}

              {activeTab === 'detailed' && (
                <div>
                  <h4 style={{ marginBottom: '24px' }}>Four-Layer Architecture</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      {
                        layer: '4',
                        name: 'Verifier SDK',
                        pkg: 'packages/verifier-sdk',
                        desc: 'Installable TS package. requestProof() + verifyProof() + on-chain reads. No backend call required.',
                        color: '#7c3aed',
                      },
                      {
                        layer: '3',
                        name: 'ZK / Selective Disclosure',
                        pkg: 'packages/zk-core',
                        desc: 'Merkle tree construction, leaf proof gen/verify, predicate witnesses (gte/lte/range).',
                        color: '#4f46e5',
                      },
                      {
                        layer: '2',
                        name: 'Wallet App',
                        pkg: 'apps/wallet',
                        desc: 'Next.js + MetaMask. Credential cards, Merkle tree visualizer, QR proof approval flow.',
                        color: '#2563eb',
                      },
                      {
                        layer: '1',
                        name: 'Mock Issuer + Contracts',
                        pkg: 'apps/mock-issuer + contracts/',
                        desc: 'Express REST API simulating DigiLocker. Builds Merkle tree, signs root. IssuerRegistry + CredentialStatus on Amoy.',
                        color: '#1d4ed8',
                      },
                    ].map((item) => (
                      <div key={item.layer} style={{
                        display: 'flex',
                        gap: '16px',
                        padding: '16px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '10px',
                        border: '1px solid var(--color-border)',
                        borderLeft: `3px solid ${item.color}`,
                      }}>
                        <div style={{
                          minWidth: '28px',
                          height: '28px',
                          background: item.color,
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          color: 'white',
                        }}>
                          {item.layer}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', marginBottom: '2px' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                            {item.pkg}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Code Preview */}
      <section style={{ padding: 'var(--space-16) 0', position: 'relative', zIndex: 1 }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px',
            alignItems: 'start',
          }}>
            <div>
              <h2 style={{ marginBottom: '16px' }}>
                SDK Integration in{' '}
                <span className="gradient-text">3 Lines</span>
              </h2>
              <p style={{ marginBottom: '24px' }}>
                Any third-party application can request and verify ZK credentials
                using the verifier SDK. No backend call to this project required.
              </p>
              <Link href="/docs#sdk" className="btn btn--primary">
                View Full SDK Docs →
              </Link>
            </div>

            <div className="code-panel">
              <div className="code-panel__header">
                <div className="code-panel__dots">
                  <div className="code-panel__dot" />
                  <div className="code-panel__dot" />
                  <div className="code-panel__dot" />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>verifier-app.ts</span>
              </div>
              <pre style={{ margin: 0 }}><code>{`<span class="code-keyword">import</span> { <span class="code-function">requestProof</span>, <span class="code-function">verifyProof</span> }
  <span class="code-keyword">from</span> <span class="code-string">'@zk-kyc/verifier-sdk'</span>;

<span class="code-comment">// 1. Request a proof from the wallet holder</span>
<span class="code-keyword">const</span> { qrPayload, requestId } = <span class="code-keyword">await</span> <span class="code-function">requestProof</span>({
  field: <span class="code-string">'cgpa'</span>,
  predicate: <span class="code-string">'gte'</span>,
  value: <span class="code-number">8</span>,
  issuerAddress: ISSUER_ADDRESS,
});

<span class="code-comment">// 2. Show QR code → wallet holder approves</span>
<span class="code-function">showQRCode</span>(qrPayload);

<span class="code-comment">// 3. Verify returned proof client-side</span>
<span class="code-keyword">const</span> result = <span class="code-keyword">await</span> <span class="code-function">verifyProof</span>(proof);
<span class="code-comment">// { valid: true, checks: { ... } }</span>`}</code></pre>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: 'var(--space-8) 0',
        position: 'relative',
        zIndex: 1,
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="nav__logo-icon" style={{ width: '24px', height: '24px', fontSize: '0.75rem' }}>🔐</div>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              ZK-KYC · Testnet Demo · Not for production use
            </span>
          </div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '0.85rem' }}>
            <Link href="/docs" style={{ color: 'var(--color-text-muted)' }}>Docs</Link>
            <Link href="/docs#sdk" style={{ color: 'var(--color-text-muted)' }}>SDK</Link>
            <Link href="/docs#assumptions" style={{ color: 'var(--color-text-muted)' }}>Assumptions</Link>
            <a
              href="https://amoy.polygonscan.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Amoy Explorer ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
