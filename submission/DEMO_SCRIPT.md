# Atlas demo video — 2:45 minute script

## Scene 1 — Hook (0:00–0:15)
Cold open: terminal showing Atlas booting up.
> "Atlas is an AI fund manager that allocates real-world assets on Mantle.
> Every decision is signed by the agent and verifiable on-chain — no trust required."

## Scene 2 — ERC-8004 Identity (0:15–0:35)
Screen: Mantlescan showing the IdentityRegistry NFT mint tx + token metadata (`model: atlas-v1`, `skills: regime,factor,llm-macro,rl-allocator`).
> "Atlas registers itself under ERC-8004 — the trustless-agents standard. Its identity is an NFT. Its track record will accrue to that NFT."

## Scene 3 — Signal Pipeline (0:35–1:10)
Screen-record `atlas step --config configs/atlas.yaml`. Show JSON output:
- regime: `risk_off`
- macro: `{"tilt": -1, "rationale": "..."}` (Claude generated)
- weights: `[3500, 4500, 1500, 500]` (cash-heavy in risk-off)
> "Three signal channels: a Gaussian HMM detects regime, a cross-sectional factor model ranks the RWA universe, and Claude reads the macro headlines for a discrete tilt."

## Scene 4 — On-chain Commit (1:10–1:35)
Show terminal logging `tx_hash`, `decision_id=12`, `rationale_cid=baf...`. Then open Mantlescan tx — point at the `DecisionCommitted` event with the IPFS CID.
> "Allocation is committed as a single transaction. The decision hash anchors an IPFS rationale that anyone can audit."

## Scene 5 — Dashboard (1:35–2:10)
Open localhost:3000. Pan over:
- Portfolio TVL ticker
- Allocation pie (Cash / USDY / USDe / mETH)
- Decision timeline — each row links to rationale CID + Mantlescan tx
- ERC-8004 Reputation panel — live Sharpe(30d) / Max DD(30d)
- Human-vs-AI leaderboard
> "Every rebalance flows into the dashboard in real time. The leaderboard is the Phase-2 Beat-Atlas challenge — humans pick weights against Atlas; best Sharpe wins."

## Scene 6 — Backtest + Reputation (2:10–2:30)
Show `atlas backtest --days 180` output: Sharpe 1.62, MaxDD 1.2%. Then a Mantlescan tx of `ReputationRegistry.giveFeedback(agentId, value=1620, tag1='sharpe', tag2='30d')`.
> "Atlas grades itself daily. The rating is on-chain. The reputation is portable — it follows the agent NFT, not the team."

## Scene 7 — Close (2:30–2:45)
> "Atlas — autonomous RWA alpha, on Mantle. Built for the Turing Test Hackathon 2026.
> Open source. ERC-8004 native. Live now on Mantle Sepolia."

Cards: GitHub URL · Mantlescan vault address · @AtlasOnMantle X handle.
