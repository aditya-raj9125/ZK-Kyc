# apps/mock-issuer

Mock DigiLocker/University credential issuer service. Simulates the interaction shape a real DigiLocker issuer would have — no real government API is used.

## Purpose

- Issue mock structured credentials (marksheet, income certificate)
- Build Merkle tree of field hashes, sign root with ECDSA
- Return `SignedCredential` to wallet (hashes only — raw values never persisted)

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/issuer-info` | Issuer address and supported types |
| GET | `/documents` | Available document templates |
| POST | `/issue` | Issue a credential |
| POST | `/revoke` | Revoke a credential (returns revocation signature) |

### POST /issue

```json
{
  "holderAddress": "0x...",
  "documentType": "MARKSHEET",
  "fieldOverrides": { "cgpa": 9.1 }  // optional
}
```

Returns `{ credential: SignedCredential, fieldValues: Record<string, any> }`.

> **Note**: `fieldValues` is included for demo/local-storage purposes only. In production, raw field values would never be transmitted from issuer to wallet.

## Run

```bash
pnpm dev:issuer
# or
pnpm --filter @zk-kyc/mock-issuer dev
```

Service runs on http://localhost:3001

## Environment

- `ISSUER_PRIVATE_KEY` — testnet signing key (faucet-funded throwaway)
- `ISSUER_PORT` — defaults to 3001
