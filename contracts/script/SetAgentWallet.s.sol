// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/registries/IdentityRegistry.sol";

/// @notice Bind a hot agent wallet to an agentId via EIP-712 signature from the agent NFT owner.
///         Signature should be produced off-chain by the owner; this script posts the tx.
contract SetAgentWallet is Script {
    function run() external {
        uint256 broadcasterPk = vm.envUint("PRIVATE_KEY");
        address identityAddr = vm.envAddress("IDENTITY_REGISTRY");
        uint256 agentId = vm.envUint("AGENT_ID");
        address newWallet = vm.envAddress("AGENT_WALLET");
        uint256 deadline = vm.envUint("DEADLINE");
        bytes memory sig = vm.envBytes("SIGNATURE");

        vm.startBroadcast(broadcasterPk);
        IdentityRegistry(identityAddr).setAgentWallet(agentId, newWallet, deadline, sig);
        vm.stopBroadcast();
        console2.log("Bound wallet", newWallet, "to agent", agentId);
    }
}
