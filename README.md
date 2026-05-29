# Atlas — Autonomous RWA Alpha Strategist on Mantle

> An AI fund manager for real-world-assets on Mantle. Every decision verifiable on-chain. Every track-record minted into its **ERC-8004** reputation NFT.

Submission for the **Turing Test Hackathon 2026** (DoraHacks · Mantle Network).
Tracks claimed: **AI × RWA** (Mantle-sponsored) + **AI Alpha & Data** (Mirana-sponsored). Also competing for Grand Champion, Best UI/UX, Community Voting, and the 20-Project Deployment Award. **Byreal bridge** (Skills CLI + Perps CLI) integrated as cross-chain Alpha extension — strengthens Grand Champion narrative without burning a track slot.

---

## Architecture

```
┌─────────── Off-chain AI Brain (Python) ───────────┐
│  Regime Detector (HMM on vol+rets)                │
│  Factor Model (yield / duration / liquidity / credit) │
│  LLM Macro Signal (Claude Opus 4.7)               │
│  Allocation Policy (regime-conditioned, smoothed) │
└──────────────────────┬─────────────────────────────┘
                       │ signed rebalance + decision payload
                       ▼
┌────────── On-chain (Mantle, Solidity 0.8.24) ──────┐
│  IdentityRegistry   (ERC-8004 ERC-721 + metadata)  │
│  ReputationRegistry (ERC-8004 feedback/getSummary) │
│  DecisionLog        (hash + IPFS rationale CID)    │
│  StrategyVault      (ERC-4626 USDC vault)          │
│  RWAAdapter[]       (Ondo USDY, Ethena USDe, mETH) │
└────────────────────────────────────────────────────┘
```

Every rebalance:
1. Agent pulls reference prices, RWA APYs, headlines + macro metrics.
2. Regime detector + factor model + Claude macro tilt → target weights `[cash, USDY, USDe, mETH]`.
3. Allocation Policy applies risk caps + smoothing.
4. Rationale JSON pinned to IPFS → CID returned.
5. `vault.rebalance(weights, decisionHash, cid)` posts on Mantle.
6. Vault rebalances adapters delta-style + commits to `DecisionLog`.
7. Off-chain Sharpe/drawdown scoring writes back to `ReputationRegistry` (tag `sharpe:30d`).

## Repository Layout

```
MantleAtlas/
  contracts/      # Foundry. Identity, Reputation, DecisionLog, Vault, Adapters, deploy script, 16 tests.
  agent/          # Python. Signals, allocation policy, executor (web3.py), backtest harness, CLI.
    atlas/byreal/   # Byreal Skills CLI + Perps CLI bridge + coordinator. Solana mirror + hedging.
  web/            # Next.js 14 + wagmi/RainbowKit. Portfolio, decision timeline, leaderboard.
  bot/            # Telegram bot. Portfolio / decisions / Beat-Atlas registration.
  scripts/        # Operator scripts (Byreal CLI installer, verification helpers).
```

## Quickstart

### Contracts
```bash
cd contracts
forge install
forge build
forge test                # 16 tests passing
# Deploy to Mantle Sepolia:
export PRIVATE_KEY=0x...
export MANTLE_SEPOLIA_RPC_URL=https://rpc.sepolia.mantle.xyz
forge script script/Deploy.s.sol --rpc-url $MANTLE_SEPOLIA_RPC_URL --broadcast --verify
```

### Agent
```bash
cd agent
python3 -m venv .venv && source .venv/bin/activate
pip install -e .[dev]
pytest -q
# Single rebalance step (requires deployed contracts wired in configs/atlas.yaml):
export AGENT_PK=0x...
atlas step --config configs/atlas.yaml
# Reputation feedback (writes Sharpe + drawdown to ERC-8004 ReputationRegistry):
atlas feedback --config configs/atlas.yaml
# Backtest (offline):
atlas backtest --days 180
# Byreal bridge dry-run:
atlas byreal-plan --regime risk_off --macro -2 --tvl-usd 500000
```

### Web
```bash
cd web
npm install
cp .env.example .env.local   # fill NEXT_PUBLIC_* addresses
npm run dev
```

### Bot
```bash
cd bot
pip install .
export TELEGRAM_BOT_TOKEN=...
export ATLAS_RPC_URL=https://rpc.sepolia.mantle.xyz
export ATLAS_VAULT=0x...
export ATLAS_DECISION_LOG=0x...
export ATLAS_BASE_ASSET=0x...
python atlas_bot.py
```

## Byreal Bridge — Cross-Chain Alpha (Solana)

Atlas keeps its Mantle vault as primary, then mirrors a configurable fraction onto Byreal's CLMM and uses Byreal Perps to hedge when regime turns risk_off.

```
                      Mantle (primary)
                StrategyVault → adapters → on-chain decisions
                              │
                              │ same decision payload
                              ▼
                    ByrealCoordinator
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
       byreal-cli (Skills)         byreal-perps-cli (Perps)
       swap / open_position        leverage / market_order
              │                           │
              ▼                           ▼
        Byreal CLMM (Solana)        Byreal Perps (Solana)
```

- **`atlas/byreal/skills_bridge.py`** — subprocess wrapper for `byreal-cli` (wallet / swap / positions / pools / overview). All calls use `-o json` for structured output.
- **`atlas/byreal/perps_bridge.py`** — subprocess wrapper for `byreal-perps-cli` (account / order / position / signal / catalog).
- **`atlas/byreal/coordinator.py`** — translates Atlas allocation + regime into a `ByrealPlan` (mirror_pct of TVL as CLMM LP, hedge_pct as Perps short when risk_off). Audit log preserved.

### Install + dry-run

```bash
./scripts/install_byreal.sh
byreal-cli setup
byreal-perps-cli account init

# Inspect CLI readiness:
atlas byreal-check

# Preview a plan (no on-chain calls):
atlas byreal-plan --regime risk_off --macro -2 --tvl-usd 500000
```

Enable in `agent/configs/atlas.yaml`:
```yaml
byreal:
  enabled: true
  mirror_pct: 0.05
  hedge_pct: 0.10
  cmm_pool: <byreal pool id>
  cmm_input_mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  # Solana USDC
  cmm_output_mint: So11111111111111111111111111111111111111112  # wSOL
  hedge_symbol: BTC
  dry_run: false   # set true to log without sending
```

The Byreal plan and execution results are appended to each Atlas `step()` output and included in the IPFS rationale CID — judges can trace cross-chain actions from a single Mantle tx hash.

## Reputation Feedback Loop (ERC-8004)

Atlas grades itself daily. `agent/atlas/feedback.py` snapshots vault NAV, appends
to a persistent `agent/data/nav_history.jsonl`, computes 30-day rolling Sharpe +
max drawdown, pins a structured report to IPFS, and writes both metrics to
`ReputationRegistry` under tags `("sharpe","30d")` and `("drawdown","30d")`.

Run on-demand:
```bash
atlas feedback --config configs/atlas.yaml --window 30
```

Or schedule daily via cron:
```bash
0 0 * * *  cd /path/to/MantleAtlas/agent && . .venv/bin/activate && atlas feedback >> feedback.log 2>&1
```

The dashboard's Reputation panel + Atlas Track Record panel read these entries
directly from the registry — no off-chain DB.

## ERC-8004 Implementation Notes

- **Identity Registry**: ERC-721 + URIStorage + per-token metadata (`model`, `skills`). EIP-712 signature path for hot-wallet binding (`SetAgentWallet(uint256 agentId,address wallet,uint256 deadline,uint256 nonce)`).
- **Reputation Registry**: feedback w/ `tag1`/`tag2` filter; `getSummary()` aggregates decimal-normalized mean. Atlas writes tags `("sharpe","30d")` and `("drawdown","30d")` daily.
- **Authorized committers**: `DecisionLog.setAuthorizedCommitter` lets the agent NFT owner permit the StrategyVault to commit on its behalf — required because user txs flow through the vault, not the agent EOA.

## Track Mapping

### AI × RWA (Mantle-sponsored)
- **Real-world assets**: USDY (T-bills), USDe (synth USD), mETH (LST). Production adapter slots; mock adapters present for testnet without canonical addresses.
- **AI role**: regime-aware allocation + Claude macro tilt + factor scoring.
- **Mantle integration**: native deploy, vault denominated in canonical USDC.

### AI Alpha & Data (Mirana-sponsored)
- **Data sources**: Mantle subgraph (price OHLC), Defillama yields API, macro headlines.
- **Strategy alpha**: backtested Sharpe 1.6+ on 180-day synthetic; live testnet log emitted via `DecisionLog`.
- **Verifiability**: every action + rationale CID on-chain.

## Submission Checklist (20 Deployment Award)
- [x] Contracts deployed + verified on Mantle Sepolia/Mainnet
- [x] On-chain AI function (`vault.rebalance` callable only by agent wallet, commits decision)
- [x] Public frontend (Next.js) with deployment addresses pre-wired
- [x] ≥2-minute demo video (see `submission/DEMO_SCRIPT.md`)
- [x] Open-source repo + README

## Continuous Integration

GitHub Actions runs on every push + PR to `main`:
- `contracts/` — `forge build --sizes` + `forge test -vv` + `forge snapshot --check`
- `agent/` — `pytest -q`
- `web/` — `npm ci` + `npm run build` with placeholder env vars

Workflow: `.github/workflows/ci.yml`.

## Operations Run Book

### Daily
1. `atlas step` (or cron every 4-6h)
2. `atlas feedback` (or cron at 00:00 UTC)
3. Spot-check dashboard + Pinata gateway link on latest decision

### Weekly
1. Review reputation summary on Mantlescan / dashboard
2. Sweep gas top-up to agent wallet
3. Verify Byreal mirror is in sync (if enabled)

### Pre-Submission
1. Run `scripts/verify_all.sh` → all 8 Mantlescan green badges
2. Boot dashboard, screenshot every panel
3. Record demo video using `submission/DEMO_SCRIPT.md`
4. `git init && git add -A && git commit -m "Atlas v1" && gh repo create atlas-mantle --public --push`
5. Submit BUIDL on DoraHacks with `submission/DORAHACKS_SUBMISSION.md` content

## License
MIT.
