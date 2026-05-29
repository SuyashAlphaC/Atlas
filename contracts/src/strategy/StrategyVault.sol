// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IRWAAdapter} from "../interfaces/IRWAAdapter.sol";
import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";
import {DecisionLog} from "./DecisionLog.sol";

/// @title StrategyVault — ERC-4626 vault routed by an AI agent across RWA adapters.
/// @notice Holds a base asset (e.g. USDC). Funds split between idle cash and an ordered list of
///         IRWAAdapter slots. Weights are decided off-chain by the bound agent and committed
///         atomically with on-chain rebalancing via DecisionLog.
/// @dev    Rebalance is delta-driven: only moves what's needed between current and target value.
///         Caller of rebalance() MUST be the agent wallet bound to the configured agentId.
contract StrategyVault is ERC4626, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    IIdentityRegistry public immutable identity;
    DecisionLog public immutable decisionLog;
    uint256 public agentId;

    IRWAAdapter[] private _adapters;

    /// @notice Buffer kept as idle cash even when agent picks 0% cash. Protects redemptions.
    uint256 public minCashBps;

    /// @notice Max single-rebalance move (basis points of totalAssets). Prevents wild flips.
    uint256 public maxMoveBps;

    event AdapterAdded(uint256 indexed slot, address indexed adapter);
    event AdapterRemoved(uint256 indexed slot, address indexed adapter);
    event Rebalanced(uint256 indexed agentId, uint256 indexed decisionId, uint256[] weightsBps);
    event AgentBound(uint256 indexed agentId);
    event GuardrailsSet(uint256 minCashBps, uint256 maxMoveBps);

    error AdapterMismatch();
    error BadWeights();
    error NotAgentWallet();
    error MoveTooLarge(uint256 moved, uint256 max);

    constructor(
        IERC20 baseAsset_,
        string memory name_,
        string memory symbol_,
        address identity_,
        address decisionLog_,
        address governor
    ) ERC4626(baseAsset_) ERC20(name_, symbol_) {
        require(identity_ != address(0) && decisionLog_ != address(0), "Vault: zero dep");
        identity = IIdentityRegistry(identity_);
        decisionLog = DecisionLog(decisionLog_);
        _grantRole(DEFAULT_ADMIN_ROLE, governor);
        _grantRole(GOVERNOR_ROLE, governor);
        minCashBps = 500; // 5%
        maxMoveBps = 10_000; // off by default; governor tightens once strategy stabilizes
        emit GuardrailsSet(minCashBps, maxMoveBps);
    }

    // ─────────────────────── governance ───────────────────────

    function bindAgent(uint256 newAgentId) external onlyRole(GOVERNOR_ROLE) {
        agentId = newAgentId;
        emit AgentBound(newAgentId);
    }

    function addAdapter(IRWAAdapter adapter) external onlyRole(GOVERNOR_ROLE) {
        require(adapter.baseAsset() == asset(), "Vault: base mismatch");
        _adapters.push(adapter);
        emit AdapterAdded(_adapters.length - 1, address(adapter));
    }

    function removeAdapter(uint256 slot) external onlyRole(GOVERNOR_ROLE) {
        require(slot < _adapters.length, "Vault: slot oob");
        IRWAAdapter a = _adapters[slot];
        require(a.totalAssetsInBase() == 0, "Vault: drain first");
        _adapters[slot] = _adapters[_adapters.length - 1];
        _adapters.pop();
        emit AdapterRemoved(slot, address(a));
    }

    function setGuardrails(uint256 minCashBps_, uint256 maxMoveBps_) external onlyRole(GOVERNOR_ROLE) {
        require(minCashBps_ <= 5_000 && maxMoveBps_ <= 10_000, "Vault: bad guardrails");
        minCashBps = minCashBps_;
        maxMoveBps = maxMoveBps_;
        emit GuardrailsSet(minCashBps_, maxMoveBps_);
    }

    function pause() external onlyRole(GOVERNOR_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GOVERNOR_ROLE) {
        _unpause();
    }

    // ─────────────────────── views ───────────────────────

    function adapters() external view returns (IRWAAdapter[] memory) {
        return _adapters;
    }

    function adaptersLength() external view returns (uint256) {
        return _adapters.length;
    }

    function totalAssets() public view override returns (uint256 total) {
        total = IERC20(asset()).balanceOf(address(this));
        uint256 n = _adapters.length;
        for (uint256 i; i < n; ++i) {
            total += _adapters[i].totalAssetsInBase();
        }
    }

    // ─────────────────────── rebalance ───────────────────────

    /// @notice Apply a new allocation across [cash, adapter_0 ... adapter_{n-1}] in one tx.
    /// @param  weightsBps  length n+1 (idx 0 = cash). Must sum to 10_000.
    /// @param  decisionHash  keccak hash of the off-chain decision payload.
    /// @param  rationaleCID  IPFS CID containing model rationale, signals, risk notes.
    function rebalance(uint256[] calldata weightsBps, bytes32 decisionHash, string calldata rationaleCID)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 decisionId)
    {
        if (identity.getAgentWallet(agentId) != msg.sender) revert NotAgentWallet();

        uint256 n = _adapters.length;
        if (weightsBps.length != n + 1) revert BadWeights();
        if (weightsBps[0] < minCashBps) revert BadWeights();

        uint256 sum;
        for (uint256 i; i < weightsBps.length; ++i) {
            sum += weightsBps[i];
        }
        if (sum != 10_000) revert BadWeights();

        uint256 tvl = totalAssets();
        require(tvl > 0, "Vault: no TVL");

        // Pass 1: withdraw overweight adapters.
        uint256 totalMoved;
        for (uint256 i; i < n; ++i) {
            uint256 current = _adapters[i].totalAssetsInBase();
            uint256 target = (tvl * weightsBps[i + 1]) / 10_000;
            if (current > target) {
                uint256 d = current - target;
                _adapters[i].withdraw(d, address(this));
                totalMoved += d;
            }
        }

        // Pass 2: deposit underweight adapters.
        for (uint256 i; i < n; ++i) {
            uint256 current = _adapters[i].totalAssetsInBase();
            uint256 target = (tvl * weightsBps[i + 1]) / 10_000;
            if (current < target) {
                uint256 d = target - current;
                IERC20(asset()).forceApprove(address(_adapters[i]), d);
                _adapters[i].deposit(d);
                totalMoved += d;
            }
        }

        uint256 maxAllowed = (tvl * maxMoveBps) / 10_000;
        if (totalMoved > maxAllowed) revert MoveTooLarge(totalMoved, maxAllowed);

        // Commit decision payload (audit + reputation surface).
        address[] memory assets_ = new address[](n + 1);
        assets_[0] = address(0); // cash sentinel
        uint256[] memory wBps = new uint256[](n + 1);
        wBps[0] = weightsBps[0];
        for (uint256 i; i < n; ++i) {
            assets_[i + 1] = address(_adapters[i]);
            wBps[i + 1] = weightsBps[i + 1];
        }
        decisionId = decisionLog.commit(agentId, decisionHash, rationaleCID, assets_, wBps);
        emit Rebalanced(agentId, decisionId, weightsBps);
    }

    // ─────────────────────── deposit/withdraw hooks ───────────────────────

    /// @dev On user withdraw, pull from adapters proportionally if idle is insufficient.
    function _withdraw(address caller, address receiver, address owner_, uint256 assets_, uint256 shares)
        internal
        override
        whenNotPaused
    {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (assets_ > idle) {
            uint256 short = assets_ - idle;
            uint256 n = _adapters.length;
            uint256 totalAdapter;
            uint256[] memory take = new uint256[](n);
            for (uint256 i; i < n; ++i) {
                uint256 v = _adapters[i].totalAssetsInBase();
                totalAdapter += v;
                take[i] = v;
            }
            require(totalAdapter > 0, "Vault: insufficient liquidity");
            uint256 collected;
            for (uint256 i; i < n; ++i) {
                uint256 want = (short * take[i]) / totalAdapter;
                if (i == n - 1) {
                    want = short - collected;
                }
                if (want > 0) {
                    uint256 got = _adapters[i].withdraw(want, address(this));
                    collected += got;
                }
            }
        }
        super._withdraw(caller, receiver, owner_, assets_, shares);
    }

    function _deposit(address caller, address receiver, uint256 assets_, uint256 shares) internal override whenNotPaused {
        super._deposit(caller, receiver, assets_, shares);
    }
}
