# @zk-kyc/verifier-sdk

Installable TypeScript SDK for requesting and verifying ZK credential proofs. Designed for third-party developer integration — import this into your own app, do not use the wallet internals.

## Install

```bash
npm install @zk-kyc/verifier-sdk
```

## Usage

```typescript
import { requestProof, verifyProof } from '@zk-kyc/verifier-sdk';

// 1. Request proof
const { qrPayload, requestId } = await requestProof({
  verifierName: 'My App',
  issuerAddress: '0x...',
  documentType: 'MARKSHEET',
  predicates: [{ field: 'cgpa', operator: 'gte', value: 8 }],
  relayUrl: 'http://localhost:5174/api/relay',
  callbackOrigin: 'http://localhost:5174',
});

// 2. Show QR → wallet approves → get proof from relay

// 3. Verify
const result = await verifyProof(proof, {
  issuerRegistryAddress: '0x...',
  credentialStatusAddress: '0x...',
});
// { valid: true, checks: { ... } }
```

See [`docs/sdk-integration-guide.md`](../../../../docs/sdk-integration-guide.md) for the full API reference.

## Examples

The `examples/mock-verifier-app/` folder contains a complete standalone Vite+React app (port 5174) demonstrating the full proof loop.
