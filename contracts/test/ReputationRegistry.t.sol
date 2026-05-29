// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/registries/IdentityRegistry.sol";
import {ReputationRegistry} from "../src/registries/ReputationRegistry.sol";

contract ReputationRegistryTest is Test {
    IdentityRegistry internal idReg;
    ReputationRegistry internal repReg;
    address internal client1 = address(0xC1);
    address internal client2 = address(0xC2);
    address internal agentOwner = address(0xA);
    uint256 internal agentId;

    function setUp() public {
        idReg = new IdentityRegistry();
        repReg = new ReputationRegistry(address(idReg));
        vm.prank(agentOwner);
        agentId = idReg.register("ipfs://atlas");
    }

    function test_GiveAndAggregateFeedback() public {
        vm.prank(client1);
        repReg.giveFeedback(agentId, 8000, 4, "sharpe", "30d", "https://x", "ipfs://f1", bytes32(0));
        vm.prank(client2);
        repReg.giveFeedback(agentId, 12000, 4, "sharpe", "30d", "https://y", "ipfs://f2", bytes32(0));

        address[] memory none;
        (uint64 count, int128 summary, uint8 dec) = repReg.getSummary(agentId, none, "sharpe", "30d");
        assertEq(count, 2);
        assertEq(dec, 18);
        // mean of 8000 + 12000 with 4 decimals scaled to 18 = ((0.8 + 1.2)/2) * 1e18 = 1e18
        assertEq(uint256(int256(summary)), 1e18);
    }

    function test_RevokeRemovesFromSummary() public {
        vm.prank(client1);
        repReg.giveFeedback(agentId, 5000, 4, "sharpe", "30d", "", "", bytes32(0));
        vm.prank(client1);
        repReg.revokeFeedback(agentId, 0);

        address[] memory none;
        (uint64 count,,) = repReg.getSummary(agentId, none, "sharpe", "30d");
        assertEq(count, 0);
    }
}
