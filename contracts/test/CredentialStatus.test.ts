import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

import type { IssuerRegistry, CredentialStatus } from '../typechain-types';

describe('CredentialStatus', () => {
  let issuerRegistry: IssuerRegistry;
  let credentialStatus: CredentialStatus;
  let owner: HardhatEthersSigner;
  let trustedIssuer: HardhatEthersSigner;
  let otherIssuer: HardhatEthersSigner;
  let nonIssuer: HardhatEthersSigner;

  // Sample credential roots (bytes32 hex values)
  const ROOT_1 = ethers.keccak256(ethers.toUtf8Bytes('credential-root-1'));
  const ROOT_2 = ethers.keccak256(ethers.toUtf8Bytes('credential-root-2'));
  const ZERO_ROOT = ethers.ZeroHash;

  beforeEach(async () => {
    [owner, trustedIssuer, otherIssuer, nonIssuer] = await ethers.getSigners() as [
      HardhatEthersSigner,
      HardhatEthersSigner,
      HardhatEthersSigner,
      HardhatEthersSigner,
    ];

    // Deploy IssuerRegistry and register trustedIssuer
    const RegistryFactory = await ethers.getContractFactory('IssuerRegistry');
    issuerRegistry = await RegistryFactory.deploy() as IssuerRegistry;
    await issuerRegistry.waitForDeployment();
    await issuerRegistry.registerIssuer(trustedIssuer.address);

    // Deploy CredentialStatus
    const StatusFactory = await ethers.getContractFactory('CredentialStatus');
    credentialStatus = await StatusFactory.deploy(
      await issuerRegistry.getAddress(),
    ) as CredentialStatus;
    await credentialStatus.waitForDeployment();
  });

  // ── Deployment ──────────────────────────────────────────────────────────────

  describe('deployment', () => {
    it('stores the IssuerRegistry reference', async () => {
      expect(await credentialStatus.issuerRegistry()).to.equal(
        await issuerRegistry.getAddress(),
      );
    });

    it('unanchored credentials default to Active (0)', async () => {
      expect(await credentialStatus.getStatus(ROOT_1)).to.equal(0); // Active
    });

    it('isActive returns true for unanchored credentials', async () => {
      expect(await credentialStatus.isActive(ROOT_1)).to.be.true;
    });
  });

  // ── anchorCredential ────────────────────────────────────────────────────────

  describe('anchorCredential', () => {
    it('allows a trusted issuer to anchor a credential', async () => {
      await credentialStatus.connect(trustedIssuer).anchorCredential(ROOT_1);
      expect(await credentialStatus.getStatus(ROOT_1)).to.equal(0); // Active
      expect(await credentialStatus.getIssuer(ROOT_1)).to.equal(trustedIssuer.address);
    });

    it('emits CredentialAnchored event', async () => {
      await expect(credentialStatus.connect(trustedIssuer).anchorCredential(ROOT_1))
        .to.emit(credentialStatus, 'CredentialAnchored')
        .withArgs(ROOT_1, trustedIssuer.address);
    });

    it('reverts when called by non-trusted issuer', async () => {
      await expect(
        credentialStatus.connect(nonIssuer).anchorCredential(ROOT_1),
      )
        .to.be.revertedWithCustomError(credentialStatus, 'NotTrustedIssuer')
        .withArgs(nonIssuer.address);
    });

    it('reverts for zero credential root', async () => {
      await expect(
        credentialStatus.connect(trustedIssuer).anchorCredential(ZERO_ROOT),
      ).to.be.revertedWithCustomError(credentialStatus, 'ZeroCredentialRoot');
    });
  });

  // ── updateStatus ─────────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    beforeEach(async () => {
      await credentialStatus.connect(trustedIssuer).anchorCredential(ROOT_1);
    });

    it('allows the issuing issuer to revoke a credential', async () => {
      await credentialStatus.connect(trustedIssuer).updateStatus(ROOT_1, 1); // Revoked
      expect(await credentialStatus.getStatus(ROOT_1)).to.equal(1);
      expect(await credentialStatus.isActive(ROOT_1)).to.be.false;
    });

    it('allows the issuing issuer to suspend a credential', async () => {
      await credentialStatus.connect(trustedIssuer).updateStatus(ROOT_1, 2); // Suspended
      expect(await credentialStatus.getStatus(ROOT_1)).to.equal(2);
    });

    it('emits StatusUpdated event with correct old/new status', async () => {
      await expect(credentialStatus.connect(trustedIssuer).updateStatus(ROOT_1, 1))
        .to.emit(credentialStatus, 'StatusUpdated')
        .withArgs(ROOT_1, 0, 1, trustedIssuer.address);
    });

    it('reverts when non-trusted issuer tries to update', async () => {
      await expect(
        credentialStatus.connect(nonIssuer).updateStatus(ROOT_1, 1),
      )
        .to.be.revertedWithCustomError(credentialStatus, 'NotTrustedIssuer')
        .withArgs(nonIssuer.address);
    });

    it('reverts when a different trusted issuer tries to update (not the original issuer)', async () => {
      // Register otherIssuer as trusted but they didn't anchor ROOT_1
      await issuerRegistry.registerIssuer(otherIssuer.address);
      await expect(
        credentialStatus.connect(otherIssuer).updateStatus(ROOT_1, 1),
      )
        .to.be.revertedWithCustomError(credentialStatus, 'NotCredentialIssuer')
        .withArgs(otherIssuer.address, ROOT_1);
    });

    it('reverts for zero credential root', async () => {
      await expect(
        credentialStatus.connect(trustedIssuer).updateStatus(ZERO_ROOT, 1),
      ).to.be.revertedWithCustomError(credentialStatus, 'ZeroCredentialRoot');
    });
  });

  // ── getStatus / isActive / getIssuer ────────────────────────────────────────

  describe('view functions', () => {
    beforeEach(async () => {
      await credentialStatus.connect(trustedIssuer).anchorCredential(ROOT_1);
    });

    it('getStatus returns Active after anchoring', async () => {
      expect(await credentialStatus.getStatus(ROOT_1)).to.equal(0);
    });

    it('getStatus returns Revoked after revocation', async () => {
      await credentialStatus.connect(trustedIssuer).updateStatus(ROOT_1, 1);
      expect(await credentialStatus.getStatus(ROOT_1)).to.equal(1);
    });

    it('isActive returns false after revocation', async () => {
      await credentialStatus.connect(trustedIssuer).updateStatus(ROOT_1, 1);
      expect(await credentialStatus.isActive(ROOT_1)).to.be.false;
    });

    it('getIssuer returns zero address for unanchored root', async () => {
      expect(await credentialStatus.getIssuer(ROOT_2)).to.equal(ethers.ZeroAddress);
    });

    it('getIssuer returns the correct issuer after anchoring', async () => {
      expect(await credentialStatus.getIssuer(ROOT_1)).to.equal(trustedIssuer.address);
    });
  });
});
