// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IssuerRegistry} from "./IssuerRegistry.sol";

/**
 * @title CredentialStatus
 * @author ZK-KYC
 * @notice On-chain registry of credential root hashes and their revocation status.
 *
 * @dev This contract stores the lifecycle status (Active / Revoked / Suspended)
 *      of credentials identified by their Merkle root hash (bytes32). Only
 *      trusted issuers (as registered in the IssuerRegistry) can update the
 *      status of credentials they issued.
 *
 *      Design is inspired by the Ethereum Attestation Service (EAS) minimal
 *      footprint pattern — the contract stores no PII, no credential content,
 *      and no user-identifying data. It is a pure revocation registry.
 *
 *      Verification flow (client-side, no backend required):
 *        1. Verifier receives ProofPayload containing credentialRoot + issuerAddress.
 *        2. Call IssuerRegistry.isTrustedIssuer(issuerAddress) → must be true.
 *        3. Call CredentialStatus.getStatus(credentialRoot) → must be Active.
 *        4. Verify Merkle proof and issuer signature off-chain.
 *
 * @custom:testnet Deployed on Ethereum Sepolia (Chain ID 11155111). Testnet only.
 */
contract CredentialStatus is Ownable {
    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Lifecycle status of a credential.
    /// @dev Mirrors the OnChainStatus enum in packages/shared-types/src/index.ts.
    enum Status {
        Active,    // 0 — credential is valid
        Revoked,   // 1 — credential has been revoked, proofs must be rejected
        Suspended  // 2 — credential is temporarily suspended
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Reference to the IssuerRegistry for access control.
    IssuerRegistry public immutable issuerRegistry;

    /// @dev Mapping from credential root hash to its status.
    ///      A root not present in this mapping is implicitly Active (zero value).
    mapping(bytes32 credentialRoot => Status status) private _credentialStatuses;

    /// @dev Mapping from credential root to the issuer who created it.
    mapping(bytes32 credentialRoot => address issuer) private _credentialIssuers;

    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Emitted when a credential's status is set for the first time (issuance anchor).
    /// @param credentialRoot The Merkle root hash of the credential.
    /// @param issuer The address of the issuer anchoring this credential.
    event CredentialAnchored(bytes32 indexed credentialRoot, address indexed issuer);

    /// @notice Emitted when a credential's status changes.
    /// @param credentialRoot The Merkle root hash of the credential.
    /// @param oldStatus The previous status.
    /// @param newStatus The new status.
    /// @param updatedBy The issuer who updated the status.
    event StatusUpdated(
        bytes32 indexed credentialRoot,
        Status oldStatus,
        Status newStatus,
        address indexed updatedBy
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Errors
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Thrown when a non-trusted issuer tries to anchor or update a credential.
    error NotTrustedIssuer(address caller);

    /// @notice Thrown when an issuer tries to update a credential they did not issue.
    error NotCredentialIssuer(address caller, bytes32 credentialRoot);

    /// @notice Thrown when a zero credential root is provided.
    error ZeroCredentialRoot();

    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Deploys CredentialStatus with a reference to the IssuerRegistry.
     * @param _issuerRegistry Address of the deployed IssuerRegistry contract.
     */
    constructor(address _issuerRegistry) Ownable(msg.sender) {
        issuerRegistry = IssuerRegistry(_issuerRegistry);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Issuer-only mutative functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Anchors a new credential on-chain with Active status.
     * @dev Only callable by trusted issuers (as registered in IssuerRegistry).
     *      Each issuer can only anchor a credential root once.
     * @param credentialRoot The bytes32 Merkle root hash of the credential.
     */
    function anchorCredential(bytes32 credentialRoot) external {
        if (credentialRoot == bytes32(0)) revert ZeroCredentialRoot();
        if (!issuerRegistry.isTrustedIssuer(msg.sender)) revert NotTrustedIssuer(msg.sender);

        _credentialIssuers[credentialRoot] = msg.sender;
        _credentialStatuses[credentialRoot] = Status.Active;

        emit CredentialAnchored(credentialRoot, msg.sender);
    }

    /**
     * @notice Updates the status of a credential (e.g., to revoke it).
     * @dev Only callable by the issuer who anchored this credential.
     *      Reverts if the caller is not the original issuer of the credential.
     * @param credentialRoot The bytes32 Merkle root hash of the credential.
     * @param newStatus      The new status to set.
     */
    function updateStatus(bytes32 credentialRoot, Status newStatus) external {
        if (credentialRoot == bytes32(0)) revert ZeroCredentialRoot();
        if (!issuerRegistry.isTrustedIssuer(msg.sender)) revert NotTrustedIssuer(msg.sender);
        if (_credentialIssuers[credentialRoot] != msg.sender) {
            revert NotCredentialIssuer(msg.sender, credentialRoot);
        }

        Status oldStatus = _credentialStatuses[credentialRoot];
        _credentialStatuses[credentialRoot] = newStatus;

        emit StatusUpdated(credentialRoot, oldStatus, newStatus, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Returns the current status of a credential.
     * @dev A credential root not yet anchored returns Active (0) by default.
     *      Verifiers should use isActive() for a boolean active check.
     * @param credentialRoot The bytes32 Merkle root hash of the credential.
     * @return The current Status of the credential.
     */
    function getStatus(bytes32 credentialRoot) external view returns (Status) {
        return _credentialStatuses[credentialRoot];
    }

    /**
     * @notice Returns true if a credential is currently Active (not revoked/suspended).
     * @param credentialRoot The bytes32 Merkle root hash of the credential.
     * @return True if the credential status is Active.
     */
    function isActive(bytes32 credentialRoot) external view returns (bool) {
        return _credentialStatuses[credentialRoot] == Status.Active;
    }

    /**
     * @notice Returns the address of the issuer who anchored a credential.
     * @param credentialRoot The bytes32 Merkle root hash of the credential.
     * @return The issuer's Ethereum address (zero address if not anchored).
     */
    function getIssuer(bytes32 credentialRoot) external view returns (address) {
        return _credentialIssuers[credentialRoot];
    }
}
