// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/registries/IdentityRegistry.sol";
import {IIdentityRegistry} from "../src/interfaces/IIdentityRegistry.sol";
import {ReputationRegistry} from "../src/registries/ReputationRegistry.sol";
import {DecisionLog} from "../src/strategy/DecisionLog.sol";
import {StrategyVault} from "../src/strategy/StrategyVault.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockYieldRWAAdapter} from "../src/mocks/MockYieldRWAAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IRWAAdapter} from "../src/interfaces/IRWAAdapter.sol";

/// @notice Deploys Atlas core to Mantle (mainnet or sepolia).
///         On Mantle Sepolia: spins up MockERC20 USDC + 3 mock adapters.
///         On Mantle Mainnet: expects BASE_ASSET env var pointing to canonical USDC; bring real adapters separately.
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address governor = vm.addr(pk);
        address agentAddress = vm.envOr("AGENT_ADDRESS", governor);

        vm.startBroadcast(pk);

        // Registries
        IdentityRegistry identity = new IdentityRegistry();
        ReputationRegistry reputation = new ReputationRegistry(address(identity));
        DecisionLog decisionLog = new DecisionLog(address(identity));

        // Base asset (USDC). On testnet we deploy a mock.
        address base = vm.envOr("BASE_ASSET", address(0));
        if (base == address(0)) {
            MockERC20 usdc = new MockERC20("USD Coin (Atlas Testnet)", "USDC", 6);
            usdc.mint(governor, 10_000_000e6);
            base = address(usdc);
            console2.log("Deployed MockUSDC at", base);
        }

        // Vault
        StrategyVault vault = new StrategyVault(
            IERC20(base), "Atlas RWA Vault", "atUSDC", address(identity), address(decisionLog), governor
        );

        // Adapters representing the RWA universe Atlas allocates across.
        MockYieldRWAAdapter aUSDY = new MockYieldRWAAdapter(base, "OndoUSDY", 530, governor); // ~5.3% APY
        MockYieldRWAAdapter aUSDe = new MockYieldRWAAdapter(base, "EthenaUSDe", 1100, governor); // ~11% APY
        MockYieldRWAAdapter aMETH = new MockYieldRWAAdapter(base, "mETHWrap", 380, governor); // ~3.8% APY
        aUSDY.setVault(address(vault));
        aUSDe.setVault(address(vault));
        aMETH.setVault(address(vault));

        vault.addAdapter(IRWAAdapter(address(aUSDY)));
        vault.addAdapter(IRWAAdapter(address(aUSDe)));
        vault.addAdapter(IRWAAdapter(address(aMETH)));

        // Register the agent identity (NFT minted to deployer; ownership transferable later).
        // Metadata pins the model card + skills manifest.
        IIdentityRegistry.MetadataEntry[] memory meta = new IIdentityRegistry.MetadataEntry[](2);
        meta[0] = IIdentityRegistry.MetadataEntry({metadataKey: "model", metadataValue: bytes("atlas-v1")});
        meta[1] = IIdentityRegistry.MetadataEntry({
            metadataKey: "skills",
            metadataValue: bytes("regime,factor,llm-macro,rl-allocator")
        });
        uint256 agentId = identity.register("ipfs://atlas-agent-card.json", meta);

        // Bind hot agent wallet (defaults to governor if AGENT_ADDRESS unset).
        // Using setAgentWallet would require a signed EIP-712 message; for deployment we leave
        // ownership = governor and let the off-chain agent be governor or accept a separate setAgentWallet tx.
        if (agentAddress != governor) {
            // Deployer will perform setAgentWallet via a separate signed tx (see scripts/bind_wallet.ts).
            console2.log("AGENT_ADDRESS differs from governor; bind it via signed setAgentWallet tx");
        }

        vault.bindAgent(agentId);
        decisionLog.setAuthorizedCommitter(agentId, address(vault), true);

        vm.stopBroadcast();

        console2.log("=== ATLAS DEPLOYMENT ===");
        console2.log("Governor       :", governor);
        console2.log("BaseAsset      :", base);
        console2.log("Identity       :", address(identity));
        console2.log("Reputation     :", address(reputation));
        console2.log("DecisionLog    :", address(decisionLog));
        console2.log("Vault          :", address(vault));
        console2.log("Adapter:USDY   :", address(aUSDY));
        console2.log("Adapter:USDe   :", address(aUSDe));
        console2.log("Adapter:mETH   :", address(aMETH));
        console2.log("Agent ID       :", agentId);
    }
}
