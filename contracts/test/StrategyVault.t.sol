// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockYieldRWAAdapter} from "../src/mocks/MockYieldRWAAdapter.sol";
import {IRWAAdapter} from "../src/interfaces/IRWAAdapter.sol";
import {IdentityRegistry} from "../src/registries/IdentityRegistry.sol";
import {DecisionLog} from "../src/strategy/DecisionLog.sol";
import {StrategyVault} from "../src/strategy/StrategyVault.sol";

contract StrategyVaultTest is Test {
    MockERC20 internal usdc;
    IdentityRegistry internal idReg;
    DecisionLog internal dlog;
    StrategyVault internal vault;
    MockYieldRWAAdapter internal aUSDY;
    MockYieldRWAAdapter internal aMETH;

    address internal governor = address(this);
    address internal user = address(0xBEEF);
    address internal agent;
    uint256 internal agentPk = 0xB0B;
    uint256 internal agentId;

    function setUp() public {
        agent = vm.addr(agentPk);

        usdc = new MockERC20("USDC", "USDC", 6);
        idReg = new IdentityRegistry();
        dlog = new DecisionLog(address(idReg));
        vault = new StrategyVault(IERC20(address(usdc)), "Atlas Vault", "atUSDC", address(idReg), address(dlog), governor);

        aUSDY = new MockYieldRWAAdapter(address(usdc), "OndoUSDY", 500, governor); // 5% APY
        aMETH = new MockYieldRWAAdapter(address(usdc), "mETHWrap", 800, governor); // 8% APY synthetic

        aUSDY.setVault(address(vault));
        aMETH.setVault(address(vault));

        vault.addAdapter(IRWAAdapter(address(aUSDY)));
        vault.addAdapter(IRWAAdapter(address(aMETH)));

        // Agent NFT owned by `agent` directly (so getAgentWallet == agent w/o EIP-712 binding).
        vm.prank(agent);
        agentId = idReg.register("ipfs://atlas-v1");
        vault.bindAgent(agentId);
        vm.prank(agent);
        dlog.setAuthorizedCommitter(agentId, address(vault), true);

        // Seed user with USDC and deposit.
        usdc.mint(user, 1_000_000e6);
        vm.startPrank(user);
        usdc.approve(address(vault), type(uint256).max);
        vault.deposit(1_000_000e6, user);
        vm.stopPrank();
    }

    function test_DepositSetsShares() public {
        assertEq(vault.balanceOf(user), 1_000_000e6);
        assertEq(vault.totalAssets(), 1_000_000e6);
    }

    function test_RebalanceAllocatesAcrossAdapters() public {
        uint256[] memory w = new uint256[](3);
        w[0] = 1_000; // 10% cash
        w[1] = 5_000; // 50% USDY
        w[2] = 4_000; // 40% mETH

        vm.prank(agent);
        vault.rebalance(w, keccak256("d1"), "ipfs://rationale-1");

        assertApproxEqAbs(aUSDY.totalAssetsInBase(), 500_000e6, 1);
        assertApproxEqAbs(aMETH.totalAssetsInBase(), 400_000e6, 1);
        assertApproxEqAbs(IERC20(address(usdc)).balanceOf(address(vault)), 100_000e6, 1);
    }

    function test_RevertsForNonAgent() public {
        uint256[] memory w = new uint256[](3);
        w[0] = 10_000;
        w[1] = 0;
        w[2] = 0;
        vm.expectRevert(StrategyVault.NotAgentWallet.selector);
        vault.rebalance(w, keccak256("d"), "ipfs://x");
    }

    function test_YieldAccrualLiftsTotalAssets() public {
        uint256[] memory w = new uint256[](3);
        w[0] = 0; // ignored guardrail
        w[1] = 5_000;
        w[2] = 5_000;
        w[0] = 500; // satisfy min cash 5%
        w[1] = 4_750;
        w[2] = 4_750;
        // Fund adapters with future yield reserves so they can pay out.
        usdc.mint(governor, 200_000e6);
        usdc.approve(address(aUSDY), 100_000e6);
        usdc.approve(address(aMETH), 100_000e6);
        aUSDY.fundYield(100_000e6);
        aMETH.fundYield(100_000e6);

        vm.prank(agent);
        vault.rebalance(w, keccak256("d1"), "ipfs://r1");

        uint256 before = vault.totalAssets();
        vm.warp(block.timestamp + 365 days);
        uint256 afterAssets = vault.totalAssets();
        assertGt(afterAssets, before);
    }

    function test_WithdrawPullsFromAdapters() public {
        uint256[] memory w = new uint256[](3);
        w[0] = 500;
        w[1] = 5_000;
        w[2] = 4_500;
        vm.prank(agent);
        vault.rebalance(w, keccak256("d"), "ipfs://r");

        vm.prank(user);
        vault.withdraw(600_000e6, user, user);
        assertGe(usdc.balanceOf(user), 600_000e6);
    }

    function test_GuardrailRejectsBelowMinCash() public {
        uint256[] memory w = new uint256[](3);
        w[0] = 100; // 1% < minCashBps(500)
        w[1] = 4_900;
        w[2] = 5_000;
        vm.prank(agent);
        vm.expectRevert(StrategyVault.BadWeights.selector);
        vault.rebalance(w, keccak256("d"), "ipfs://r");
    }

    function test_GuardrailRejectsLargeMove() public {
        // Bootstrap with default cap, then tighten and try an aggressive flip.
        uint256[] memory w1 = new uint256[](3);
        w1[0] = 500;
        w1[1] = 4_750;
        w1[2] = 4_750;
        vm.prank(agent);
        vault.rebalance(w1, keccak256("d0"), "ipfs://r0");

        vault.setGuardrails(500, 5_000); // now cap at 50%

        uint256[] memory w2 = new uint256[](3);
        w2[0] = 500;
        w2[1] = 0;
        w2[2] = 9_500;
        vm.prank(agent);
        vm.expectRevert();
        vault.rebalance(w2, keccak256("d1"), "ipfs://r1");
    }
}
