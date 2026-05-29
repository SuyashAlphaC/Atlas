# DoraHacks BUIDL submission text

## One-line pitch
Atlas — Autonomous RWA Alpha Strategist. An AI fund manager that allocates real-world assets on Mantle, with every decision verifiable on-chain via ERC-8004.

## Tracks
- AI × RWA (primary)
- AI Alpha & Data

## Description
Atlas combines a Gaussian-HMM regime detector, a cross-sectional factor model, and a Claude-driven macro signal into a single allocation policy across Ondo USDY, Ethena USDe, and Mantle's mETH. Every rebalance posts a signed transaction to a Mantle-native ERC-4626 vault, anchors an IPFS rationale CID via DecisionLog, and grades itself daily into an ERC-8004 ReputationRegistry. The agent identity is itself an ERC-8004 NFT — reputation is portable, not custodial.

## Why it's novel
- First on-chain AI fund manager whose **track record lives in an ERC-8004 NFT** instead of off-chain dashboards.
- **IPFS-anchored decision rationale** per action solves the "AI black box" objection — auditors can verify *why*, not just *what*.
- **Cross-chain via Byreal**: Atlas mirrors a configurable fraction of Mantle TVL onto Byreal CLMM (Solana) for LP carry, and uses Byreal Perps to hedge when its regime detector turns risk_off — every action driven from the same Mantle decision payload.
- Built-in **Human-vs-AI leaderboard** ("Beat Atlas") that fits Phase 2 live-stream format directly.

## Tell us in your submission

### Which data sources does your project use?
- Mantle on-chain subgraph (Goldsky/The Graph) for hourly OHLC of ETH/BTC/MNT-proxy pools.
- Defillama yields API for USDY, USDe, mETH APYs.
- Macro headline + on-chain metrics feed (UST 10y change, USDe peg deviation, ETH/BTC 30d returns, Mantle TVL change).

### What role does AI play?
- Regime detection (HMM on log-returns + realized vol).
- Cross-sectional factor scoring with regime-conditional weights.
- Claude Opus 4.7 macro tilt with strict-JSON output schema.
- Allocation policy fuses signals into integer-bps weights with risk-cap + smoothing.

### How does it generate verifiable value on Mantle?
- Every rebalance is a Mantle tx with a `DecisionCommitted` event.
- The IPFS CID in each event hashes the full signal payload — anyone can replay and verify.
- Sharpe + drawdown emit into ReputationRegistry under tags `("sharpe","30d")` and `("drawdown","30d")` — composable by other contracts.

### What type of real-world asset are you bringing on-chain?
- Short-duration T-bills via Ondo USDY.
- Synthetic-USD carry via Ethena USDe.
- Liquid-staked ETH yield via Mantle mETH.

### How is AI realized on Mantle?
- Solidity 0.8.24 contracts; agent EOA bound to ERC-8004 Identity NFT.
- `vault.rebalance(weights, decisionHash, rationaleCID)` is the on-chain AI function.
- Off-chain agent runs in Python; can be ported to TEE / zkML when validators come online.

### Byreal integration (cross-chain Alpha layer)
- `byreal-cli` (Skills) and `byreal-perps-cli` (Perps) wrapped in `agent/atlas/byreal/`.
- `ByrealCoordinator` consumes the same allocation + regime + macro that drives the Mantle rebalance and produces a `ByrealPlan` of CLMM LP + Perps actions.
- All Byreal actions are recorded in the IPFS rationale pinned at each Mantle rebalance, so the entire cross-chain decision chain is verifiable from one Mantle tx.

## Deployment

| Network | Vault | Identity | Reputation | DecisionLog |
| --- | --- | --- | --- | --- |
| Mantle Sepolia | `0x…` | `0x…` | `0x…` | `0x…` |
| Mantle Mainnet (limited) | `0x…` | `0x…` | `0x…` | `0x…` |

## Open source
GitHub: https://github.com/<org>/atlas-mantle
License: MIT

## Demo video
2:45 min walkthrough — see `submission/DEMO_SCRIPT.md`. Loom/YouTube link to be added on submission.

## Team
- @suyashalphac — full-stack, contracts, agent core
