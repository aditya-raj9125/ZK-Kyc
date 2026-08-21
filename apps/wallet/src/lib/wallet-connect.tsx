'use client';

import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import * as React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Wagmi + RainbowKit configuration
// ─────────────────────────────────────────────────────────────────────────────

const projectId =
  process.env['NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID'] ?? 'demo-project-id-replace-me';

const wagmiConfig = getDefaultConfig({
  appName: 'ZK-KYC Wallet',
  projectId,
  chains: [sepolia],
  ssr: true,
});

const queryClient = new QueryClient();

// ─────────────────────────────────────────────────────────────────────────────
// Provider wrapper
// ─────────────────────────────────────────────────────────────────────────────

export function WalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
