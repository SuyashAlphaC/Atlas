// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/registries/IdentityRegistry.sol";
import {IIdentityRegistry} from "../src/interfaces/IIdentityRegistry.sol";

contract IdentityRegistryTest is Test {
    IdentityRegistry internal reg;
    uint256 internal ownerPk = 0xA11CE;
    address internal owner = vm.addr(0xA11CE);

    function setUp() public {
        reg = new IdentityRegistry();
    }

    function test_RegisterAssignsSequentialIds() public {
        vm.prank(owner);
        uint256 id1 = reg.register("ipfs://atlas-1");
        vm.prank(owner);
        uint256 id2 = reg.register("ipfs://atlas-2");
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(reg.ownerOf(id1), owner);
        assertEq(reg.tokenURI(id1), "ipfs://atlas-1");
    }

    function test_SetAgentWalletViaSignature() public {
        vm.prank(owner);
        uint256 id = reg.register("ipfs://x");

        address hot = address(0xBEEF);
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("SetAgentWallet(uint256 agentId,address wallet,uint256 deadline,uint256 nonce)"),
                id,
                hot,
                deadline,
                uint256(0)
            )
        );
        bytes32 domainSeparator = _domainSeparator();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        reg.setAgentWallet(id, hot, deadline, sig);
        assertEq(reg.getAgentWallet(id), hot);
    }

    function test_GetAgentWalletDefaultsToOwner() public {
        vm.prank(owner);
        uint256 id = reg.register();
        assertEq(reg.getAgentWallet(id), owner);
    }

    function test_SetMetadataOnlyOwner() public {
        vm.prank(owner);
        uint256 id = reg.register("ipfs://x");
        vm.prank(owner);
        reg.setMetadata(id, "model", bytes("atlas-v1"));
        assertEq(string(reg.getMetadata(id, "model")), "atlas-v1");

        vm.expectRevert();
        reg.setMetadata(id, "model", bytes("hax"));
    }

    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("AtlasIdentityRegistry")),
                keccak256(bytes("1")),
                block.chainid,
                address(reg)
            )
        );
    }
}
