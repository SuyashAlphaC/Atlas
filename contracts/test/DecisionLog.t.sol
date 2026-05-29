// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/registries/IdentityRegistry.sol";
import {DecisionLog} from "../src/strategy/DecisionLog.sol";

contract DecisionLogTest is Test {
    IdentityRegistry internal reg;
    DecisionLog internal dlog;
    address internal agentOwner = address(0xA1);

    function setUp() public {
        reg = new IdentityRegistry();
        dlog = new DecisionLog(address(reg));
    }

    function test_CommitAndRead() public {
        vm.prank(agentOwner);
        uint256 id = reg.register("ipfs://atlas");

        address[] memory assets = new address[](2);
        assets[0] = address(0);
        assets[1] = address(0xCAFE);
        uint256[] memory w = new uint256[](2);
        w[0] = 3_000;
        w[1] = 7_000;

        vm.prank(agentOwner);
        uint256 decisionId = dlog.commit(id, keccak256("decision-1"), "ipfs://rationale", assets, w);
        assertEq(decisionId, 0);
        assertEq(dlog.decisionsCount(), 1);

        DecisionLog.Decision memory d = dlog.getDecision(0);
        assertEq(d.agentId, id);
        assertEq(d.rationaleCID, "ipfs://rationale");
        assertEq(d.weightsBps[1], 7_000);
    }

    function test_RevertOnBadSum() public {
        vm.prank(agentOwner);
        uint256 id = reg.register("ipfs://atlas");
        address[] memory assets = new address[](2);
        assets[0] = address(0);
        assets[1] = address(0xCAFE);
        uint256[] memory w = new uint256[](2);
        w[0] = 3_000;
        w[1] = 6_000; // sum = 9_000, bad

        vm.prank(agentOwner);
        vm.expectRevert(abi.encodeWithSelector(DecisionLog.BadWeightSum.selector, 9_000));
        dlog.commit(id, keccak256("x"), "ipfs://x", assets, w);
    }

    function test_RevertWhenNotAgentWallet() public {
        vm.prank(agentOwner);
        uint256 id = reg.register("ipfs://atlas");
        address[] memory assets = new address[](1);
        uint256[] memory w = new uint256[](1);
        w[0] = 10_000;

        vm.expectRevert(DecisionLog.NotAgentWallet.selector);
        dlog.commit(id, keccak256("x"), "ipfs://x", assets, w);
    }
}
