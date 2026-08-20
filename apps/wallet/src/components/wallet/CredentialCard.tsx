'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

import type { SignedCredential } from '@zk-kyc/shared-types';
import { CredentialStatusEnum } from '@zk-kyc/shared-types';

import { removeCredential } from '@/lib/credential-store';
import MerkleTreeVisualizer from './MerkleTreeVisualizer';

interface CredentialCardProps {
  credential: SignedCredential;
  walletAddress: string;
  onRemove: () => void;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  MARKSHEET: '🎓 Academic Marksheet',
  INCOME_CERTIFICATE: '💰 Income Certificate',
};

const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  MARKSHEET: '#7c3aed',
  INCOME_CERTIFICATE: '#2563eb',
};

// Minimal ABI for CredentialStatus.sol
const CREDENTIAL_STATUS_ABI = [
  'function isActive(bytes32 credentialRoot) external view returns (bool)',
  'function getStatus(bytes32 credentialRoot) external view returns (uint8)',
];

export default function CredentialCard({ credential, walletAddress, onRemove }: CredentialCardProps) {
  const [showTree, setShowTree] = useState(false);
  const [onChainStatus, setOnChainStatus] = useState<CredentialStatusEnum | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchOnChainStatus = useCallback(async () => {
    const statusAddress = process.env['NEXT_PUBLIC_CREDENTIAL_STATUS_ADDRESS'];
    const rpcUrl = process.env['NEXT_PUBLIC_RPC_URL'] ?? 'https://rpc-amoy.polygon.technology/';

    if (!statusAddress || statusAddress === '0x0000000000000000000000000000000000000000') {
      setStatusLoading(false);
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(statusAddress, CREDENTIAL_STATUS_ABI, provider);
      const fn = contract.getFunction('getStatus');
      const status = Number(await fn(credential.credentialRoot));
      setOnChainStatus(status as CredentialStatusEnum);
    } catch {
      // If contract not deployed / RPC unavailable, show as active (testnet)
      setOnChainStatus(CredentialStatusEnum.Active);
    } finally {
      setStatusLoading(false);
    }
  }, [credential.credentialRoot]);

  useEffect(() => {
    void fetchOnChainStatus();
  }, [fetchOnChainStatus]);

  const handleRemove = () => {
    setIsRemoving(true);
    removeCredential(walletAddress, credential.id);
    onRemove();
  };

  const statusBadge = () => {
    if (statusLoading) {
      return <span className="badge badge--pending">Loading...</span>;
    }
    if (onChainStatus === null) {
      return <span className="badge badge--info">No Contract</span>;
    }
    if (onChainStatus === CredentialStatusEnum.Revoked) {
      return <span className="badge badge--revoked">⚠ Revoked</span>;
    }
    if (onChainStatus === CredentialStatusEnum.Suspended) {
      return <span className="badge badge--pending">Suspended</span>;
    }
    return <span className="badge badge--active">✓ Active</span>;
  };

  const accentColor = DOCUMENT_TYPE_COLORS[credential.documentType] ?? '#7c3aed';

  return (
    <div
      className="card"
      style={{
        borderLeft: `3px solid ${accentColor}`,
        transition: 'all var(--transition-base)',
        animation: 'fade-in 0.3s ease',
      }}
      id={`credential-card-${credential.id}`}
    >
      {/* Card header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
        gap: '12px',
      }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '4px' }}>
            {DOCUMENT_TYPE_LABELS[credential.documentType] ?? credential.documentType}
          </div>
          <div style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-muted)',
          }}>
            ID: {credential.id.slice(0, 8)}...
          </div>
        </div>
        {statusBadge()}
      </div>

      {/* Credential details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        <DetailRow
          label="Issuer"
          value={`${credential.issuerAddress.slice(0, 8)}...${credential.issuerAddress.slice(-4)}`}
          mono
        />
        <DetailRow
          label="Merkle Root"
          value={`${credential.merkleRoot.slice(0, 10)}...${credential.merkleRoot.slice(-6)}`}
          mono
        />
        <DetailRow
          label="Fields"
          value={`${credential.leaves.length} field hashes (no raw values stored)`}
        />
        <DetailRow
          label="Issued"
          value={new Date(credential.issuedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        />
      </div>

      {/* Leaf count indicator */}
      <div style={{
        display: 'flex',
        gap: '4px',
        flexWrap: 'wrap',
        marginBottom: '16px',
      }}>
        {credential.leaves.map((leaf) => (
          <div
            key={leaf.index}
            title={`${leaf.fieldKey}: ${leaf.hash.slice(0, 8)}...`}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: `${accentColor}22`,
              border: `1px solid ${accentColor}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6rem',
              fontFamily: 'var(--font-mono)',
              color: accentColor,
              cursor: 'default',
            }}
          >
            {leaf.fieldKey.slice(0, 2).toUpperCase()}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowTree(!showTree)}
          className="btn btn--secondary btn--sm"
          id={`view-tree-${credential.id}`}
        >
          {showTree ? '▲ Hide Tree' : '🌳 View Field Tree'}
        </button>
        <button
          onClick={handleRemove}
          className="btn btn--danger btn--sm"
          disabled={isRemoving}
          id={`remove-credential-${credential.id}`}
        >
          Remove
        </button>
      </div>

      {/* Merkle tree visualizer */}
      {showTree && (
        <div style={{ marginTop: '16px' }}>
          <MerkleTreeVisualizer leaves={credential.leaves} />
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '60px' }}>
        {label}
      </span>
      <span style={{
        fontSize: '0.8rem',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        color: 'var(--color-text-secondary)',
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  );
}
