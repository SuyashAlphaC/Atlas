// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";

interface IERC721Like {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/// @title DecisionLog
/// @notice Append-only on-chain log of every agent decision. Each entry binds:
///         (agentId, decisionHash, ipfs rationaleCID, target allocations).
/// @dev    Decision hash = keccak256(encoded action) anchoring off-chain rationale.
contract DecisionLog {
    struct Decision {
        uint256 agentId;
        bytes32 decisionHash;
        string rationaleCID;
        address[] assets;
        uint256[] weightsBps; // basis points, must sum to 10_000
        uint256 timestamp;
        address submitter;
    }

    event DecisionCommitted(
        uint256 indexed agentId,
        uint256 indexed decisionId,
        bytes32 indexed decisionHash,
        string rationaleCID,
        address[] assets,
        uint256[] weightsBps,
        address submitter
    );

    IIdentityRegistry public immutable identity;
    Decision[] private _decisions;
    mapping(uint256 => uint256[]) private _agentDecisionIds;
    mapping(uint256 => mapping(address => bool)) public authorizedCommitter;

    event CommitterAuthorized(uint256 indexed agentId, address indexed committer, bool allowed);

    error WeightsMismatch();
    error BadWeightSum(uint256 got);
    error NotAgentWallet();
    error NotAgentOwner();

    constructor(address identityRegistry_) {
        require(identityRegistry_ != address(0), "DecisionLog: zero identity");
        identity = IIdentityRegistry(identityRegistry_);
    }

    /// @notice The agent NFT owner authorizes contracts (e.g. the StrategyVault) that may
    ///         commit decisions on their agent's behalf.
    function setAuthorizedCommitter(uint256 agentId, address committer, bool allowed) external {
        // Trust the Identity Registry's ownership view; revert if caller is not the NFT owner.
        try IERC721Like(address(identity)).ownerOf(agentId) returns (address owner_) {
            if (owner_ != msg.sender) revert NotAgentOwner();
        } catch {
            revert NotAgentOwner();
        }
        authorizedCommitter[agentId][committer] = allowed;
        emit CommitterAuthorized(agentId, committer, allowed);
    }

    /// @notice Commit a decision. msg.sender must be the agent's bound wallet or an authorized committer.
    function commit(
        uint256 agentId,
        bytes32 decisionHash,
        string calldata rationaleCID,
        address[] calldata assets,
        uint256[] calldata weightsBps
    ) external returns (uint256 decisionId) {
        if (identity.getAgentWallet(agentId) != msg.sender && !authorizedCommitter[agentId][msg.sender]) {
            revert NotAgentWallet();
        }
        if (assets.length != weightsBps.length) revert WeightsMismatch();

        uint256 sum;
        for (uint256 i; i < weightsBps.length; ++i) {
            sum += weightsBps[i];
        }
        if (sum != 10_000) revert BadWeightSum(sum);

        decisionId = _decisions.length;
        _decisions.push(
            Decision({
                agentId: agentId,
                decisionHash: decisionHash,
                rationaleCID: rationaleCID,
                assets: assets,
                weightsBps: weightsBps,
                timestamp: block.timestamp,
                submitter: msg.sender
            })
        );
        _agentDecisionIds[agentId].push(decisionId);

        emit DecisionCommitted(agentId, decisionId, decisionHash, rationaleCID, assets, weightsBps, msg.sender);
    }

    function getDecision(uint256 decisionId) external view returns (Decision memory) {
        return _decisions[decisionId];
    }

    function decisionsCount() external view returns (uint256) {
        return _decisions.length;
    }

    function agentDecisions(uint256 agentId) external view returns (uint256[] memory) {
        return _agentDecisionIds[agentId];
    }
}
