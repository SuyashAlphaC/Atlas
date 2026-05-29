// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IRWAAdapter
/// @notice Pluggable adapter wrapping an RWA / yield asset (e.g. Ondo USDY, Ethena USDe, mETH).
///         StrategyVault deposits base asset; adapter swaps/wraps into target asset and holds it.
/// @dev    Each adapter exposes a uniform deposit / withdraw / valuation surface in base-asset terms.
interface IRWAAdapter {
    /// @notice Base asset that deposits/withdrawals are denominated in (e.g. USDC).
    function baseAsset() external view returns (address);

    /// @notice Underlying RWA token held by the adapter.
    function underlying() external view returns (address);

    /// @notice Human-readable label (e.g. "OndoUSDY").
    function label() external view returns (string memory);

    /// @notice Current value of all adapter positions, denominated in baseAsset.
    function totalAssetsInBase() external view returns (uint256);

    /// @notice Deposit `amount` of base asset, convert into underlying, hold.
    /// @return acquired Amount of underlying acquired (informational; valuation uses totalAssetsInBase).
    function deposit(uint256 amount) external returns (uint256 acquired);

    /// @notice Withdraw `amountBase` worth back to base asset, transferred to `to`.
    /// @return delivered Amount of base asset actually delivered (≤ amountBase).
    function withdraw(uint256 amountBase, address to) external returns (uint256 delivered);
}
