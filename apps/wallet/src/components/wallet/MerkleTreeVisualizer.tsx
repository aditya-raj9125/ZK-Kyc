'use client';

import type { MerkleLeaf } from '@zk-kyc/shared-types';

interface MerkleTreeVisualizerProps {
  leaves: MerkleLeaf[];
}

/**
 * Visual Merkle tree representation showing fields as leaves.
 * Uses a simple horizontal layout that groups pairs upward to the root.
 * This is illustrative, not a full re-computation of the tree.
 */
export default function MerkleTreeVisualizer({ leaves }: MerkleTreeVisualizerProps) {
  return (
    <div style={{
      padding: '16px',
      background: '#060610',
      borderRadius: '10px',
      border: '1px solid var(--color-border)',
      overflowX: 'auto',
    }}>
      <div style={{
        fontSize: '0.75rem',
        fontWeight: '600',
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '12px',
      }}>
        Merkle Tree — Field Leaves
      </div>

      {/* Root node */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <div style={{
          padding: '8px 16px',
          background: 'var(--gradient-accent)',
          borderRadius: '8px',
          fontSize: '0.72rem',
          fontFamily: 'var(--font-mono)',
          color: 'white',
          fontWeight: '600',
          letterSpacing: '0.02em',
        }}>
          ROOT (Merkle Root)
        </div>
      </div>

      {/* Connector lines visual hint */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
        fontSize: '1.2rem',
        marginBottom: '12px',
      }}>
        ↓
      </div>

      {/* Leaf nodes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '8px',
      }}>
        {leaves.map((leaf, i) => (
          <div
            key={leaf.index}
            style={{
              padding: '10px',
              background: 'rgba(124, 58, 237, 0.08)',
              border: '1px solid rgba(124, 58, 237, 0.2)',
              borderRadius: '8px',
              animation: `fade-in ${0.1 + i * 0.05}s ease`,
            }}
          >
            <div style={{
              fontSize: '0.7rem',
              fontWeight: '700',
              color: 'var(--color-violet-light)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}>
              {leaf.fieldKey}
            </div>
            <div style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-muted)',
              wordBreak: 'break-all',
              lineHeight: '1.4',
            }}>
              {leaf.hash.slice(0, 8)}...{leaf.hash.slice(-8)}
            </div>
            <div style={{
              marginTop: '6px',
              fontSize: '0.6rem',
              color: 'var(--color-text-muted)',
            }}>
              leaf [{leaf.index}]
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '12px',
        padding: '10px',
        background: 'rgba(59, 130, 246, 0.06)',
        borderRadius: '6px',
        fontSize: '0.72rem',
        color: 'var(--color-text-muted)',
        lineHeight: '1.6',
      }}>
        <strong style={{ color: 'var(--color-info)' }}>Privacy note:</strong>{' '}
        Only field names and SHA-256 hashes are stored. Raw field values (name, CGPA, income, etc.)
        are kept separately for proof generation only — never in the credential object itself.
      </div>
    </div>
  );
}
