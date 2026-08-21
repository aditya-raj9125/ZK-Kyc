# apps/wallet

ZK-KYC Wallet — the main user-facing credential dashboard.

## Purpose

- Connect MetaMask/WalletConnect wallet (Ethereum Sepolia testnet)
- Import credentials from the mock issuer
- Display credentials as cards with live on-chain status
- View Merkle tree structure of each credential
- Approve/reject incoming proof requests (from QR codes)
- **Does NOT include a verifier UI** — verification is SDK-only (see `packages/verifier-sdk`)

## Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage — hero, architecture tabs, SDK preview |
| `/dashboard` | Credential dashboard (wallet connection required) |
| `/docs` | Documentation (For Users / For Developers tabs) |
| `/proof-request` | Proof request approval flow (URL param: `?proofRequest=`) |

## Run

```bash
pnpm dev:wallet
# or
pnpm --filter @zk-kyc/wallet dev
```

App runs on http://localhost:3000

## Environment

Copy `.env.example` to `.env` in the monorepo root and set:
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` (free at cloud.walletconnect.com)
- `NEXT_PUBLIC_MOCK_ISSUER_URL` (default: http://localhost:3001)
- `NEXT_PUBLIC_ISSUER_REGISTRY_ADDRESS` (after contracts deploy)
- `NEXT_PUBLIC_CREDENTIAL_STATUS_ADDRESS` (after contracts deploy)
