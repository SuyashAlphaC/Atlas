// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IReputationRegistry} from "../interfaces/IReputationRegistry.sol";
import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";

/// @title ReputationRegistry — ERC-8004 lite
/// @notice Stores feedback entries per (agent, client) and exposes summary aggregates.
/// @dev Decimal-normalized rolling mean. Tag-scoped queries supported for Atlas Sharpe/drawdown buckets.
contract ReputationRegistry is IReputationRegistry {
    struct Feedback {
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        bool revoked;
    }

    address private immutable _identityRegistry;

    mapping(uint256 => mapping(address => Feedback[])) private _feedback;
    mapping(uint256 => address[]) private _clients;
    mapping(uint256 => mapping(address => bool)) private _seen;

    constructor(address identityRegistry_) {
        require(identityRegistry_ != address(0), "Reputation: zero identity");
        _identityRegistry = identityRegistry_;
    }

    function getIdentityRegistry() external view returns (address) {
        return _identityRegistry;
    }

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        // Sanity check: agent must exist in identity registry.
        IIdentityRegistry(_identityRegistry).getAgentWallet(agentId);

        Feedback[] storage list = _feedback[agentId][msg.sender];
        if (!_seen[agentId][msg.sender]) {
            _seen[agentId][msg.sender] = true;
            _clients[agentId].push(msg.sender);
        }
        uint64 idx = uint64(list.length);
        list.push(Feedback({value: value, valueDecimals: valueDecimals, tag1: tag1, tag2: tag2, revoked: false}));

        emit NewFeedback(
            agentId, msg.sender, idx, value, valueDecimals, tag1, tag1, tag2, endpoint, feedbackURI, feedbackHash
        );
    }

    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        Feedback storage f = _feedback[agentId][msg.sender][feedbackIndex];
        require(!f.revoked, "Reputation: already revoked");
        f.revoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    function getSummary(uint256 agentId, address[] calldata clientAddresses, string calldata tag1, string calldata tag2)
        external
        view
        returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
    {
        bool filterClients = clientAddresses.length > 0;
        bytes32 t1 = keccak256(bytes(tag1));
        bytes32 t2 = keccak256(bytes(tag2));
        bool anyTag1 = bytes(tag1).length == 0;
        bool anyTag2 = bytes(tag2).length == 0;

        // Normalize all values to 18 decimals while accumulating to bound precision.
        int256 acc;
        uint64 n;
        summaryValueDecimals = 18;

        address[] storage clients = _clients[agentId];
        uint256 cl = filterClients ? clientAddresses.length : clients.length;
        for (uint256 i; i < cl; ++i) {
            address c = filterClients ? clientAddresses[i] : clients[i];
            Feedback[] storage arr = _feedback[agentId][c];
            uint256 al = arr.length;
            for (uint256 j; j < al; ++j) {
                Feedback storage f = arr[j];
                if (f.revoked) continue;
                if (!anyTag1 && keccak256(bytes(f.tag1)) != t1) continue;
                if (!anyTag2 && keccak256(bytes(f.tag2)) != t2) continue;
                acc += _scale(f.value, f.valueDecimals);
                unchecked {
                    ++n;
                }
            }
        }
        if (n == 0) return (0, 0, 18);
        summaryValue = int128(acc / int256(uint256(n)));
        count = n;
    }

    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64) {
        return uint64(_feedback[agentId][clientAddress].length);
    }

    function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex)
        external
        view
        returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked)
    {
        Feedback storage f = _feedback[agentId][clientAddress][feedbackIndex];
        return (f.value, f.valueDecimals, f.tag1, f.tag2, f.revoked);
    }

    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }

    function _scale(int128 value, uint8 decimals) private pure returns (int256) {
        if (decimals == 18) return int256(value);
        if (decimals < 18) return int256(value) * int256(10 ** (18 - decimals));
        return int256(value) / int256(10 ** (decimals - 18));
    }
}
