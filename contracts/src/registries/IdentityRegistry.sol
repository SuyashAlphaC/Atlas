// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";

/// @title IdentityRegistry — ERC-8004 Trustless Agents Identity Registry
/// @notice Issues an ERC-721 identity NFT per autonomous agent. Owner = agent operator.
///         An agent may bind a hot wallet via EIP-712 signed delegation.
/// @dev Implements the ERC-8004 Identity Registry surface required for Atlas agents on Mantle.
contract IdentityRegistry is ERC721URIStorage, EIP712, IIdentityRegistry {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    bytes32 private constant _WALLET_TYPEHASH =
        keccak256("SetAgentWallet(uint256 agentId,address wallet,uint256 deadline,uint256 nonce)");

    uint256 private _nextId;

    mapping(uint256 => address) private _agentWallet;
    mapping(uint256 => uint256) private _walletNonce;
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    constructor() ERC721("Atlas Agent Identity", "ATLAS-ID") EIP712("AtlasIdentityRegistry", "1") {}

    // ───────────────────────── registration ─────────────────────────

    function register() external returns (uint256 agentId) {
        agentId = _registerInternal(msg.sender, "");
    }

    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _registerInternal(msg.sender, agentURI);
    }

    function register(string calldata agentURI, MetadataEntry[] calldata metadata)
        external
        returns (uint256 agentId)
    {
        agentId = _registerInternal(msg.sender, agentURI);
        uint256 len = metadata.length;
        for (uint256 i; i < len; ++i) {
            _setMetadata(agentId, metadata[i].metadataKey, metadata[i].metadataValue);
        }
    }

    function _registerInternal(address owner_, string memory agentURI) internal returns (uint256 agentId) {
        agentId = ++_nextId;
        _safeMint(owner_, agentId);
        if (bytes(agentURI).length != 0) {
            _setTokenURI(agentId, agentURI);
        }
        emit Registered(agentId, agentURI, owner_);
    }

    // ─────────────────────────── URI mgmt ───────────────────────────

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        _requireOwner(agentId);
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    // ───────────────────────── wallet binding ───────────────────────

    /// @notice Bind a hot wallet to an agent via EIP-712 signature from the agent NFT owner.
    /// @dev Signature lets a cold owner delegate execution authority to a hot agent address.
    function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external {
        require(block.timestamp <= deadline, "IdentityRegistry: expired");
        require(newWallet != address(0), "IdentityRegistry: zero wallet");
        address owner_ = ownerOf(agentId);
        uint256 nonce = _walletNonce[agentId]++;
        bytes32 structHash = keccak256(abi.encode(_WALLET_TYPEHASH, agentId, newWallet, deadline, nonce));
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = digest.recover(signature);
        require(recovered == owner_, "IdentityRegistry: bad sig");
        _agentWallet[agentId] = newWallet;
        emit AgentWalletSet(agentId, newWallet);
    }

    function unsetAgentWallet(uint256 agentId) external {
        _requireOwner(agentId);
        address wallet = _agentWallet[agentId];
        delete _agentWallet[agentId];
        emit AgentWalletUnset(agentId, wallet);
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        address wallet = _agentWallet[agentId];
        return wallet == address(0) ? ownerOf(agentId) : wallet;
    }

    // ───────────────────────────── metadata ─────────────────────────

    function setMetadata(uint256 agentId, string calldata metadataKey, bytes calldata metadataValue) external {
        _requireOwner(agentId);
        _setMetadata(agentId, metadataKey, metadataValue);
    }

    function _setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) internal {
        _metadata[agentId][metadataKey] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }

    function getMetadata(uint256 agentId, string calldata metadataKey) external view returns (bytes memory) {
        return _metadata[agentId][metadataKey];
    }

    // ─────────────────────────── helpers ────────────────────────────

    function totalAgents() external view returns (uint256) {
        return _nextId;
    }

    function _requireOwner(uint256 agentId) internal view {
        require(ownerOf(agentId) == msg.sender, "IdentityRegistry: not owner");
    }
}
