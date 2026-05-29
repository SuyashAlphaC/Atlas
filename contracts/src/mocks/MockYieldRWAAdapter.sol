// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRWAAdapter} from "../interfaces/IRWAAdapter.sol";

/// @title MockYieldRWAAdapter
/// @notice Drop-in adapter that simulates an RWA yield asset with continuous accrual.
///         Holds the base asset directly and accrues virtual yield at a configurable APY.
/// @dev    For testnet demo / backtest harness. Production adapters wrap real Ondo/Ethena/mETH calls
///         conforming to IRWAAdapter; the Executor and Vault stay unchanged.
contract MockYieldRWAAdapter is IRWAAdapter, Ownable {
    using SafeERC20 for IERC20;

    IERC20 private immutable _base;
    string private _label;
    uint256 public apyBps; // e.g. 500 = 5% APY
    uint256 public principal;
    uint256 public lastAccrualTs;
    uint256 public accrued;

    address public vault;

    event ApySet(uint256 apyBps);
    event VaultSet(address vault);

    constructor(address baseAsset_, string memory label_, uint256 apyBps_, address owner_) Ownable(owner_) {
        _base = IERC20(baseAsset_);
        _label = label_;
        apyBps = apyBps_;
        lastAccrualTs = block.timestamp;
    }

    modifier onlyVault() {
        require(msg.sender == vault, "Adapter: not vault");
        _;
    }

    function setVault(address v) external onlyOwner {
        vault = v;
        emit VaultSet(v);
    }

    function setApy(uint256 apyBps_) external onlyOwner {
        _accrue();
        apyBps = apyBps_;
        emit ApySet(apyBps_);
    }

    function baseAsset() external view returns (address) {
        return address(_base);
    }

    function underlying() external view returns (address) {
        return address(_base); // mock holds base directly
    }

    function label() external view returns (string memory) {
        return _label;
    }

    function totalAssetsInBase() public view returns (uint256) {
        return principal + accrued + _pendingAccrual();
    }

    function deposit(uint256 amount) external onlyVault returns (uint256 acquired) {
        _accrue();
        _base.safeTransferFrom(msg.sender, address(this), amount);
        principal += amount;
        return amount;
    }

    function withdraw(uint256 amountBase, address to) external onlyVault returns (uint256 delivered) {
        _accrue();
        uint256 total = principal + accrued;
        if (amountBase > total) amountBase = total;
        // Withdraw from accrued first, then principal.
        if (amountBase <= accrued) {
            accrued -= amountBase;
        } else {
            uint256 fromPrincipal = amountBase - accrued;
            accrued = 0;
            principal = principal > fromPrincipal ? principal - fromPrincipal : 0;
        }
        _base.safeTransfer(to, amountBase);
        return amountBase;
    }

    function _pendingAccrual() internal view returns (uint256) {
        if (apyBps == 0 || principal == 0) return 0;
        uint256 dt = block.timestamp - lastAccrualTs;
        // accrual = principal * apyBps * dt / (10000 * 365 days)
        return (principal * apyBps * dt) / (10_000 * 365 days);
    }

    function _accrue() internal {
        uint256 pending = _pendingAccrual();
        if (pending > 0) {
            accrued += pending;
        }
        lastAccrualTs = block.timestamp;
    }

    /// @notice Owner can mint accrued yield into the adapter so withdraws are fully backed.
    ///         In production an adapter receives yield from the underlying protocol directly.
    function fundYield(uint256 amount) external onlyOwner {
        _base.safeTransferFrom(msg.sender, address(this), amount);
    }
}
