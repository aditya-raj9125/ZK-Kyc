import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

import type { IssuerRegistry } from '../typechain-types';

describe('IssuerRegistry', () => {
  let registry: IssuerRegistry;
  let owner: HardhatEthersSigner;
  let issuer1: HardhatEthersSigner;
  let issuer2: HardhatEthersSigner;
  let nonOwner: HardhatEthersSigner;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[0] as unknown as HardhatEthersSigner;
    issuer1 = signers[1] as unknown as HardhatEthersSigner;
    issuer2 = signers[2] as unknown as HardhatEthersSigner;
    nonOwner = signers[3] as unknown as HardhatEthersSigner;

    const Factory = await ethers.getContractFactory('IssuerRegistry');
    registry = (await Factory.deploy()) as unknown as IssuerRegistry;
    await registry.waitForDeployment();
  });

  // ── Deployment ──────────────────────────────────────────────────────────────

  describe('deployment', () => {
    it('sets the deployer as owner', async () => {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it('starts with no trusted issuers', async () => {
      expect(await registry.isTrustedIssuer(issuer1.address)).to.be.false;
    });
  });

  // ── registerIssuer ──────────────────────────────────────────────────────────

  describe('registerIssuer', () => {
    it('allows owner to register an issuer', async () => {
      await registry.registerIssuer(issuer1.address);
      expect(await registry.isTrustedIssuer(issuer1.address)).to.be.true;
    });

    it('emits IssuerRegistered event', async () => {
      await expect(registry.registerIssuer(issuer1.address))
        .to.emit(registry, 'IssuerRegistered')
        .withArgs(issuer1.address, owner.address);
    });

    it('reverts when non-owner tries to register', async () => {
      await expect(
        registry.connect(nonOwner).registerIssuer(issuer1.address),
      ).to.be.revertedWithCustomError(registry, 'OwnableUnauthorizedAccount');
    });

    it('reverts when registering an already-trusted issuer', async () => {
      await registry.registerIssuer(issuer1.address);
      await expect(registry.registerIssuer(issuer1.address))
        .to.be.revertedWithCustomError(registry, 'IssuerAlreadyRegistered')
        .withArgs(issuer1.address);
    });

    it('reverts when registering the zero address', async () => {
      await expect(
        registry.registerIssuer(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(registry, 'ZeroAddress');
    });

    it('can register multiple issuers', async () => {
      await registry.registerIssuer(issuer1.address);
      await registry.registerIssuer(issuer2.address);
      expect(await registry.isTrustedIssuer(issuer1.address)).to.be.true;
      expect(await registry.isTrustedIssuer(issuer2.address)).to.be.true;
    });
  });

  // ── revokeIssuer ────────────────────────────────────────────────────────────

  describe('revokeIssuer', () => {
    beforeEach(async () => {
      await registry.registerIssuer(issuer1.address);
    });

    it('allows owner to revoke an issuer', async () => {
      await registry.revokeIssuer(issuer1.address);
      expect(await registry.isTrustedIssuer(issuer1.address)).to.be.false;
    });

    it('emits IssuerRevoked event', async () => {
      await expect(registry.revokeIssuer(issuer1.address))
        .to.emit(registry, 'IssuerRevoked')
        .withArgs(issuer1.address, owner.address);
    });

    it('reverts when non-owner tries to revoke', async () => {
      await expect(
        registry.connect(nonOwner).revokeIssuer(issuer1.address),
      ).to.be.revertedWithCustomError(registry, 'OwnableUnauthorizedAccount');
    });

    it('reverts when revoking an unregistered issuer', async () => {
      await expect(registry.revokeIssuer(issuer2.address))
        .to.be.revertedWithCustomError(registry, 'IssuerNotRegistered')
        .withArgs(issuer2.address);
    });

    it('can re-register an issuer after revocation', async () => {
      await registry.revokeIssuer(issuer1.address);
      await registry.registerIssuer(issuer1.address);
      expect(await registry.isTrustedIssuer(issuer1.address)).to.be.true;
    });
  });

  // ── isTrustedIssuer ─────────────────────────────────────────────────────────

  describe('isTrustedIssuer', () => {
    it('returns false for unknown addresses', async () => {
      expect(await registry.isTrustedIssuer(nonOwner.address)).to.be.false;
    });

    it('returns true after registration', async () => {
      await registry.registerIssuer(issuer1.address);
      expect(await registry.isTrustedIssuer(issuer1.address)).to.be.true;
    });

    it('returns false after revocation', async () => {
      await registry.registerIssuer(issuer1.address);
      await registry.revokeIssuer(issuer1.address);
      expect(await registry.isTrustedIssuer(issuer1.address)).to.be.false;
    });
  });
});
