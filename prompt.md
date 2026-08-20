# Build prompt: ZK-KYC Wallet & Verifier SDK

Paste everything below into Antigravity as the project brief. It is written to be executed in three sequential phases — do not skip ahead to Phase 2/3 work until Phase 1's deliverables are complete and tested.

---

## 0. Role and mandate

You are acting as a senior blockchain engineer with production experience in zero-knowledge proof systems (circom/snarkjs or Noir), EVM smart contract development, and SDK design for third-party developer integration. This project will be reviewed by experienced Web3 founders and auditors. Code quality, architectural clarity, and security hygiene matter as much as functionality. Do not take shortcuts that would embarrass the project in a technical review — but also do not gold-plate: this is a testnet-only hackathon-grade deliverable, not a production audit-ready system, so be pragmatic about scope.

**Hard constraint: zero monetary cost.** Every deployed contract, every RPC endpoint, every hosting service, every dependency must be free-tier or testnet. Never suggest or use mainnet, paid RPC providers, paid hosting tiers, or paid APIs. Use public testnet faucets only.

**Reference inspiration for visual design and information architecture:** Space and Time's website (spaceandtime.io) — dark theme, glowing gradient accent (violet/blue), pill-shaped nav tabs, tabbed architecture diagrams ("With X / Without X / Detailed Architecture"), a clean two-column "problem → solution" layout, monospace code preview panel showing real API calls. Study this reference and adapt its visual language — dark background, single accent gradient, generous whitespace, professional fintech/infra aesthetic, not a generic crypto/NFT look. Do not copy their logo, copy, or brand assets — only the layout and design language.

---

## 1. Project summary

Build a **user-controlled digital credential wallet** that stores only cryptographic hashes (never raw documents) of a person's verified documents (marksheets, income certificates, etc., simulating a future DigiLocker-style issuer), plus a **zero-knowledge selective-disclosure layer** that lets the wallet holder prove specific facts about a credential (e.g. "CGPA ≥ 8", "income < ₹5,00,000") without revealing the underlying document or unrelated fields. Third-party applications integrate an **external verifier SDK** to request and verify these proofs — the wallet itself does **not** ship a verifier UI; verification is something any external developer builds using the SDK against their own frontend.

This is explicitly framed as a proposed extension to DigiLocker/NAD-style government infrastructure, not a replacement or competitor to it. The pitch assumes the issuer (simulated as a mock "DigiLocker" issuer service in this build) already extracts structured fields from documents and signs them — this project builds the trust/verification layer above that assumption, and this assumption must be stated explicitly in the README and on the homepage, not left implicit.

---

## 2. What must NOT be built (explicit non-goals)

- No verifier-facing UI/page inside the wallet application. Verification is SDK-only, consumed by external apps.
- No real DigiLocker/government API integration — use a mock issuer service that simulates the same shape of interaction.
- No real OCR/PDF field extraction — issue mock structured JSON "documents" directly.
- No mainnet deployment, no paid infrastructure, no real payment rails.
- No storage of raw PII or raw documents anywhere in the wallet backend or smart contracts — only field-level hashes and proofs.
- No production BBS+ implementation unless the team has time in Phase 3 — default to Merkle-tree-based selective disclosure, which is simpler to implement correctly and equally valid for the demo's purpose.

---

## 3. High-level architecture (4 layers)

1. **Issuer layer** (mock DigiLocker/university/income-authority service): takes a structured document, extracts fields, builds a Merkle tree of field hashes, signs the Merkle root with an issuer keypair, returns a signed credential object to the holder.
2. **Wallet layer** (the main user-facing product): connects via MetaMask/WalletConnect, stores signed credential objects (hashes only) locally/in browser storage or a lightweight backend keyed to the wallet address, displays credentials in a clean dashboard, generates ZK/Merkle proofs on demand when a third-party proof request arrives (via QR code or deep link), never displays or transmits full documents.
3. **ZK / selective-disclosure layer**: given a credential and a requested field + predicate (e.g. `cgpa >= 8`), generates a proof that the field satisfies the predicate and belongs to the signed Merkle tree, without revealing other fields or (for predicate proofs) the exact value.
4. **Verifier SDK layer**: a standalone, installable JS/TS package that any third-party developer imports into their own separate web app to (a) construct a proof request, (b) render a QR code / deep link for the wallet to consume, (c) receive the returned proof, and (d) verify it locally against the issuer's public key and the on-chain credential-status registry — with no call back to this project's backend required for the cryptographic verification step itself.

A minimal testnet smart contract layer anchors two things only: an **issuer registry** (which public keys are trusted issuers) and **credential status** (active/revoked), both non-sensitive, low-frequency data. Deploy to Polygon Amoy or Ethereum Sepolia testnet, faucet-funded, using Hardhat or Foundry.

---

## 4. Repository structure

Set up a monorepo (pnpm or turborepo workspaces) with these top-level packages. Keep concerns strictly separated — this separation is itself part of what's being evaluated.

```
zk-kyc-wallet/
├── README.md                          # top-level project README, see §8
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore
│
├── apps/
│   ├── wallet/                        # the main wallet web app (Next.js + TS)
│   │   ├── README.md
│   │   ├── src/
│   │   │   ├── app/                   # routes: dashboard, docs/instructions, connect
│   │   │   ├── components/
│   │   │   │   ├── wallet/            # credential cards, tree visualizer, status badges
│   │   │   │   ├── proof-request/     # QR scan/approve flow UI
│   │   │   │   └── ui/                # design-system primitives
│   │   │   ├── lib/
│   │   │   │   ├── wallet-connect.ts
│   │   │   │   ├── credential-store.ts
│   │   │   │   └── proof-generation.ts   # calls into packages/zk-core
│   │   │   ├── hooks/
│   │   │   └── styles/
│   │   └── public/
│   │
│   └── mock-issuer/                   # simulated DigiLocker/university/issuer service
│       ├── README.md
│       ├── src/
│       │   ├── documents/             # sample marksheet.json, income-cert.json etc
│       │   ├── merkle/                # field extraction + tree building
│       │   ├── signing/               # issuer keypair signing
│       │   └── api/                   # small REST/GraphQL endpoint issuing credentials
│       └── keys/                      # LOCAL DEV ONLY mock issuer keys, gitignored if real
│
├── packages/
│   ├── zk-core/                       # shared ZK + Merkle proof logic (framework-agnostic)
│   │   ├── README.md
│   │   ├── src/
│   │   │   ├── merkle/                # tree construction, proof generation/verification
│   │   │   ├── circuits/              # circom circuits (if used) + compiled artifacts
│   │   │   ├── predicates/            # >=, <=, ==, range proof helpers
│   │   │   └── types.ts
│   │   └── tests/
│   │
│   ├── verifier-sdk/                  # the installable third-party SDK — the key deliverable
│   │   ├── README.md                  # this README doubles as the public SDK docs
│   │   ├── src/
│   │   │   ├── requestProof.ts
│   │   │   ├── verifyProof.ts
│   │   │   ├── qr.ts
│   │   │   ├── contractReader.ts      # reads issuer registry + status from testnet
│   │   │   └── index.ts               # public API surface, kept minimal and stable
│   │   ├── examples/
│   │   │   └── mock-verifier-app/     # a SEPARATE example third-party app using the SDK
│   │   │       # this proves the "no verifier page in the wallet" requirement —
│   │   │       # verification only ever happens here, entirely outside apps/wallet
│   │   └── tests/
│   │
│   └── shared-types/                  # credential schema, proof schema, shared across all packages
│       └── src/
│
├── contracts/                         # Hardhat or Foundry project, testnet only
│   ├── README.md
│   ├── contracts/
│   │   ├── IssuerRegistry.sol
│   │   └── CredentialStatus.sol
│   ├── scripts/deploy.ts              # deploys to Polygon Amoy / Sepolia via faucet key
│   ├── test/
│   └── hardhat.config.ts              # network config: testnet RPC + faucet-funded key only
│
└── docs/
    ├── architecture.md                # diagrams + written architecture, mirrors homepage
    ├── sdk-integration-guide.md       # step-by-step for third-party devs, mirrors in-app docs tab
    └── assumptions.md                 # explicit list of what's simulated vs real (§2 content)
```

---

## 5. Phase-by-phase execution plan

Execute strictly in order. Each phase must be independently demoable before moving on.

### Phase 1 — Issuer, wallet, and testnet anchor
- Build `apps/mock-issuer`: 2 sample document types (marksheet, income certificate) as structured JSON, field-level Merkle tree construction, issuer keypair signing of the Merkle root, small REST endpoint returning a signed credential object.
- Build `packages/zk-core` Merkle module: tree construction, leaf proof generation, leaf proof verification — with unit tests.
- Build `contracts`: `IssuerRegistry.sol` (mapping of issuer address → trusted bool, owner-only add/remove) and `CredentialStatus.sol` (mapping of credential root → status enum active/revoked, issuer-only update). Deploy both to a testnet (Polygon Amoy recommended for low friction faucet), verify on the relevant block explorer, record deployed addresses in `contracts/README.md`.
- Build `apps/wallet`: MetaMask/WalletConnect connection flow, dashboard displaying stored credentials as cards (issuer, type, status pulled live from `CredentialStatus.sol`, "view field tree" expandable visualization showing the Merkle structure with fields as leaves), credential import flow (calls the mock issuer, stores the returned signed credential client-side, associated with the connected wallet address).
- **Do not build any proof-generation or verification UI yet** — Phase 1 is issuance + storage + display only.

### Phase 2 — ZK selective disclosure layer
- Extend `packages/zk-core` with predicate proof support: at minimum, exact-value Merkle-inclusion proof (reveal one field, prove it's in the signed tree) and one range/threshold predicate (e.g. `field >= threshold`) using either a circom circuit compiled with snarkjs, or — if time is tight — a documented simplified approach (e.g. commitment + range check via a lightweight zk-friendly method) with a clear note in the README about what a production version would use instead (full circom/Groth16 or Noir circuit).
- Add the QR-code / deep-link proof-request flow to `apps/wallet`: wallet listens for an incoming proof request (encoded in a QR code or URL param), shows the user exactly what is being requested and what will/won't be disclosed, requires explicit approval, generates the proof, returns it via the same channel (redirect, postMessage, or displayed as a payload the requester's SDK polls for — pick one channel and document it clearly).
- This phase's demoable output: scan a QR code encoding "prove CGPA >= 8", approve in wallet, proof generated, payload available for a verifier to consume — even if the verifier side isn't built until Phase 3.

### Phase 3 — Verifier SDK + external example app
- Build `packages/verifier-sdk` with a minimal, stable, well-typed public API. At minimum export:
  - `requestProof(config: { field: string; predicate: string; issuerAddress: string }): { qrPayload, requestId }`
  - `verifyProof(proof: ProofPayload): Promise<{ valid: boolean; reason?: string }>` — checks proof validity, issuer trust via `IssuerRegistry`, and credential status via `CredentialStatus`, all read directly from the testnet contracts client-side, no backend call required.
  - Export TypeScript types for `ProofPayload`, `ProofRequest` from `shared-types`.
- Build `packages/verifier-sdk/examples/mock-verifier-app` — a **separate, standalone** web app (different port, different codebase folder, clearly not part of `apps/wallet`) that imports the SDK exactly as an external third-party developer would (`import { requestProof, verifyProof } from '@yourorg/verifier-sdk'`), and demonstrates the full loop: request a field → show QR → wallet approves → proof returned → `verifyProof()` called → pass/fail shown. This app is the proof that verification lives entirely outside the wallet product.
- Add the homepage docs tab (see §6) and finalize `docs/sdk-integration-guide.md` so any third-party reading only the docs could integrate the SDK without seeing this codebase's internals.
- Add revocation demo: issuer calls `CredentialStatus` to revoke a credential root; re-run `verifyProof()` in the example app and confirm it now returns `valid: false` with the reason "credential revoked."

---

## 6. Wallet homepage / product requirements

- **Homepage** (public, no wallet connection required to view): hero section adapting the Space and Time visual language (dark theme, single accent gradient glow, pill nav, "Start Building" style primary CTA), a tabbed architecture section (e.g. "With SDK / Without SDK / Detailed Architecture" mirroring the reference's tab pattern) showing the 4-layer architecture from §3, and a partner-logo-style row if applicable (can be omitted or replaced with track/hackathon branding).
- **Docs / Instructions tab** (top-level nav item, not buried): must contain two clearly separated audiences —
  - **"For wallet users"**: how to connect a wallet, how documents get issued/imported, how proof requests work and what gets shared, how to revoke/manage credentials.
  - **"For developers"**: SDK install instructions, `requestProof`/`verifyProof` usage with real code snippets (mirrored from `docs/sdk-integration-guide.md`), the proof request/response schema, testnet contract addresses and ABIs, a link to the example verifier app source.
- **Dashboard** (post wallet-connect): credential cards only. No "verify someone else" functionality anywhere in this app — if a reviewer looks for a verifier page inside the wallet, it must not exist, by design, and the docs should explicitly state why (separation of concerns — the wallet issues/holds/proves, third parties verify).

---

## 7. Coding standards and best practices to enforce throughout

- TypeScript strict mode everywhere; no `any` without an inline justification comment.
- ESLint + Prettier configured at the monorepo root, consistent across all packages.
- Every package (`apps/*`, `packages/*`, `contracts/`) has its own `README.md` explaining its purpose, how to run it, and how it fits into the larger system — do not rely on the root README alone.
- Smart contracts: use OpenZeppelin's `Ownable` for access control, NatSpec comments on every public function, unit tests for both the happy path and revert paths (unauthorized status update, unauthorized issuer registration), and a documented deployment + verification step (constructor args, verified source on the explorer).
- Never commit real private keys, `.env.example` only, actual `.env` gitignored, testnet deployer key funded only via faucet and clearly labeled as disposable/testnet-only in comments.
- Credential and proof payload schemas defined once in `packages/shared-types` and imported everywhere else — no duplicated/divergent type definitions between the wallet, issuer, and SDK.
- SDK public API surface kept intentionally small and versioned (semver from the start, even at 0.x) — this is what "designed for third-party integration" actually looks like in practice, not just a claim in the README.
- Commit history should read as incremental, working states per phase (not one giant commit) — this matters for a technical review.

---

## 8. README requirements (root level)

The root `README.md` must include, in this order:
1. One-paragraph project summary and the explicit assumption statement from §2/§1 (what's simulated vs. what's a real DigiLocker capability).
2. Architecture diagram (can be an image export of the 4-layer diagram) with a short explanation of each layer.
3. Repository structure table (link to §4 of this doc, condensed).
4. Local setup instructions: prerequisites, install, environment variables needed (RPC URL for testnet, none of which cost money — link to the specific faucet used), how to run each app.
5. Testnet deployment info: network name, deployed contract addresses, block explorer links.
6. Phase-by-phase status (what's built, what's stubbed, what's explicitly out of scope) so a judge can see the project's honest current state at a glance.
7. Links to `docs/sdk-integration-guide.md` and `docs/assumptions.md`.
8. Credits/track alignment section noting which hackathon track(s) this targets and why.

---

## 9. Suggested reference reading before implementation

Before writing code, research (and briefly note learnings in `docs/architecture.md`) these existing systems for architectural patterns worth borrowing:
- W3C Verifiable Credentials Data Model and OpenID for Verifiable Presentations (OID4VP) — the request/response proof flow this project's QR mechanism is modeled after.
- Polygon ID / Privado ID — closest real-world analog for a wallet + SDK + on-chain issuer registry pattern.
- Ethereum Attestation Service (EAS) — pattern for on-chain, minimal-footprint attestations (relevant to how `CredentialStatus.sol` should be scoped small).
- circom + snarkjs documentation, specifically their Merkle-membership and range-proof circuit examples, if the team proceeds with real circuits in Phase 2/3.

Do not copy any of the above verbatim — use them only to sanity-check that this project's design choices match established patterns, which is itself a point worth stating explicitly to reviewers.

---

## 10. Definition of done

The project is complete when: a document is issued by the mock issuer, appears in the wallet as a hashed credential with live on-chain status, a completely separate example third-party app requests one field's predicate via the SDK, the wallet holder approves via QR and only that field's proof is disclosed, the third-party app verifies it client-side against the testnet contracts with no backend call to this project, and revoking the credential from the issuer side causes that same verification to subsequently fail — all of it documented well enough that an external developer could integrate the SDK using only `docs/sdk-integration-guide.md`.