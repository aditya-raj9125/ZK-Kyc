import type { Metadata } from 'next';
import '@rainbow-me/rainbowkit/styles.css';

import { WalletProviders } from '@/lib/wallet-connect';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'ZK-KYC Wallet — Zero-Knowledge Credential Wallet',
  description:
    'A privacy-preserving digital credential wallet that lets you prove facts about your credentials without revealing underlying documents. Built for DigiLocker-style government infrastructure.',
  keywords: [
    'ZK-KYC',
    'zero-knowledge',
    'credential wallet',
    'DigiLocker',
    'selective disclosure',
    'privacy',
    'blockchain',
    'Ethereum',
    'Sepolia',
  ],
  openGraph: {
    title: 'ZK-KYC Wallet',
    description: 'Prove credential facts without revealing documents.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <WalletProviders>{children}</WalletProviders>
      </body>
    </html>
  );
}
