// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IssuerRegistry
 * @author ZK-KYC
 * @notice Registry of trusted credential issuers for the ZK-KYC system.
 *
 * @dev This contract stores a simple mapping of Ethereum addresses to
 *      trusted-issuer status. Off-chain verifiers call `isTrustedIssuer`
 *      to confirm that a credential's issuer is authorized before accepting
 *      a ZK proof.
 *
 *      Scope is intentionally minimal (EAS-inspired pattern): no on-chain
 *      credential content, no user data — only the trust anchor.
 *
 *      Access control:
 *      - Only the contract owner can add or remove issuers.
 *      - Issuers cannot self-register (prevents Sybil attacks in production;
 *        for this testnet build the deployer acts as the governance authority).
 *
 * @custom:testnet Deployed on Polygon Amoy (Chain ID 80002). Testnet only.
 */
contract IssuerRegistry is Ownable {
    // ─────────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Mapping from issuer address to trusted status.
    mapping(address issuer => bool trusted) private _trustedIssuers;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Emitted when an issuer is registered as trusted.
    /// @param issuer The address of the issuer being registered.
    /// @param registeredBy The address of the owner who registered them.
    event IssuerRegistered(address indexed issuer, address indexed registeredBy);

    /// @notice Emitted when an issuer's trusted status is revoked.
    /// @param issuer The address of the issuer being removed.
    /// @param removedBy The address of the owner who removed them.
    event IssuerRevoked(address indexed issuer, address indexed removedBy);

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Thrown when trying to register an already-trusted issuer.
    error IssuerAlreadyRegistered(address issuer);

    /// @notice Thrown when trying to remove an issuer that is not registered.
    error IssuerNotRegistered(address issuer);

    /// @notice Thrown when a zero address is provided.
    error ZeroAddress();

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Deploys the IssuerRegistry with the deployer as the initial owner.
     * @dev The initial owner can register the first issuer (typically the
     *      mock issuer service address) after deployment.
     */
    constructor() Ownable(msg.sender) {}

    // ─────────────────────────────────────────────────────────────────────────
    // Owner-only mutative functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Registers an issuer as trusted.
     * @dev Only callable by the contract owner. Reverts if the issuer is
     *      already registered or if the address is zero.
     * @param issuer The Ethereum address of the issuer to register.
     */
    function registerIssuer(address issuer) external onlyOwner {
        if (issuer == address(0)) revert ZeroAddress();
        if (_trustedIssuers[issuer]) revert IssuerAlreadyRegistered(issuer);

        _trustedIssuers[issuer] = true;
        emit IssuerRegistered(issuer, msg.sender);
    }

    /**
     * @notice Removes an issuer from the trusted registry.
     * @dev Only callable by the contract owner. Reverts if the issuer is
     *      not currently registered.
     * @param issuer The Ethereum address of the issuer to remove.
     */
    function revokeIssuer(address issuer) external onlyOwner {
        if (!_trustedIssuers[issuer]) revert IssuerNotRegistered(issuer);

        _trustedIssuers[issuer] = false;
        emit IssuerRevoked(issuer, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Checks whether an address is a trusted issuer.
     * @param issuer The address to check.
     * @return True if the issuer is trusted, false otherwise.
     */
    function isTrustedIssuer(address issuer) external view returns (bool) {
        return _trustedIssuers[issuer];
    }
}
