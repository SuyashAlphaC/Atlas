"use client";

import Link from "next/link";
import { useState } from "react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "Architecture" },
  { id: "contracts", label: "Contracts" },
  { id: "erc8004", label: "ERC-8004" },
  { id: "vault", label: "Vault & Adapters" },
  { id: "signals", label: "Signal Stack" },
  { id: "feedback", label: "Reputation Feedback" },
  { id: "byreal", label: "Byreal Bridge" },
  { id: "operations", label: "Operations" },
  { id: "faq", label: "FAQ" },
];

const CONTRACTS = [
  { name: "IdentityRegistry", addr: "0x1cfA2B9fAEAdE37950b9742Da78216CB43EA18c5", desc: "ERC-8004 agent NFT + metadata + EIP-712 wallet binding" },
  { name: "ReputationRegistry", addr: "0xe2d8cDF98F611Df9D87861130B4C19Da45b4b455", desc: "Tagged feedback + summary aggregation (Sharpe / drawdown)" },
  { name: "DecisionLog", addr: "0x12BC7636C528d60e1D1AE3d90614B075A26c0085", desc: "Append-only log of (agentId, decisionHash, IPFS CID, weights)" },
  { name: "StrategyVault", addr: "0x5c2CE9b80981b3C1C3af8901C3A9F760d5421335", desc: "ERC-4626 USDC vault, agent-bound rebalance, AccessControl" },
  { name: "BaseAsset (MockUSDC)", addr: "0xec328eECF15fee73C11F3e041EFed76944FCffcF", desc: "Testnet USDC, 6 decimals" },
  { name: "Adapter · OndoUSDY", addr: "0x0c206D827190935e886D0e921E72490E212432a4", desc: "Mock RWA adapter, 5.3% APY" },
  { name: "Adapter · EthenaUSDe", addr: "0x2AD1E3C334C26ac982F020E0247F394f003F88c0", desc: "Mock RWA adapter, 11% APY" },
  { name: "Adapter · mETH", addr: "0xaFb14045c1A3625B9bE8Bf649441d6a1820ac584", desc: "Mock RWA adapter, 3.8% APY" },
];

export function Docs() {
  const [active, setActive] = useState("overview");
  return (
    <main className="max-w-6xl mx-auto px-6 pt-10 pb-24">
      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-3">
          <div className="lg:sticky lg:top-24">
            <div className="eyebrow mb-4">documentation</div>
            <ul className="space-y-1">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={() => setActive(s.id)}
                    className={`block px-3 py-2 rounded-lg text-sm transition-all ${
                      active === s.id
                        ? "bg-violet-glow/15 text-ink-50 border-l-2 border-violet-glow"
                        : "text-ink-300 hover:text-ink-100 hover:bg-black/[0.03]"
                    }`}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Content */}
        <article className="col-span-12 lg:col-span-9 prose max-w-none [&_h2]:text-ink-50 [&_h3]:text-ink-50 [&_h4]:text-ink-50 [&_p]:text-ink-200 [&_li]:text-ink-200 [&_b]:text-ink-50 [&_strong]:text-ink-50">
          <Section id="overview" title="Overview">
            <p>
              <b>Atlas</b> is an autonomous AI fund manager that allocates real-world assets on
              Mantle. Three off-chain signal pipelines (Gaussian HMM regime, cross-sectional factor
              model, Claude macro narrative) fuse into a single allocation policy. The agent commits
              each decision via <Code>vault.rebalance()</Code>, pins a structured rationale to IPFS,
              and accrues Sharpe / drawdown feedback to an <Code>ERC-8004</Code> reputation NFT.
            </p>
            <p>
              Submission for the Turing Test Hackathon 2026. Primary tracks: <b>AI × RWA</b>{" "}
              (Mantle-sponsored) and <b>AI Alpha & Data</b> (Mirana-sponsored). Cross-chain
              extension via Byreal Skills CLI + Byreal Perps CLI for Solana mirror + delta hedge.
            </p>
          </Section>

          <Section id="architecture" title="Architecture">
            <pre className="rounded-xl border border-black/[0.08] bg-ink-50/[0.04] p-4 text-xs font-mono overflow-x-auto">
{`┌─── Off-chain AI Brain (Python) ────┐
│  Regime · Factor · Macro · Policy  │
└──────────────┬─────────────────────┘
               │ signed action + rationale
               ▼
┌──── On-chain (Mantle Sepolia) ─────┐
│  IdentityRegistry  (ERC-8004 NFT)   │
│  ReputationRegistry (tagged feedback)│
│  DecisionLog       (audit trail)    │
│  StrategyVault     (ERC-4626 USDC)  │
│  IRWAAdapter[]     (USDY/USDe/mETH) │
└──────────────┬──────────────────────┘
               │ optional Byreal mirror
               ▼
        Byreal (Solana CLMM + Perps)`}
            </pre>
          </Section>

          <Section id="contracts" title="Deployed Contracts (Mantle Sepolia · chain 5003)">
            <div className="not-prose grid grid-cols-1 gap-2">
              {CONTRACTS.map((c) => (
                <a
                  key={c.addr}
                  href={`https://sepolia.mantlescan.xyz/address/${c.addr}`}
                  target="_blank"
                  rel="noreferrer"
                  className="glass p-4 hover:border-violet-glow/40 transition-all"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display font-semibold text-ink-50">{c.name}</span>
                    <code className="font-mono text-xs text-ink-300">{shorten(c.addr)}</code>
                  </div>
                  <div className="text-ink-300 text-sm mt-1">{c.desc}</div>
                </a>
              ))}
            </div>
          </Section>

          <Section id="erc8004" title="ERC-8004 (Trustless Agents)">
            <p>
              Atlas implements the <b>Identity Registry</b> and a feedback-focused subset of the
              <b> Reputation Registry</b>.
            </p>
            <h4>Identity</h4>
            <ul>
              <li><Code>register(string agentURI, MetadataEntry[] metadata)</Code> — mints ERC-721 identity NFT.</li>
              <li>
                <Code>setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes signature)</Code> —
                binds a hot wallet via EIP-712 signed by the NFT owner.
              </li>
              <li><Code>getAgentWallet(uint256 agentId)</Code> — returns hot wallet or owner if unset.</li>
              <li><Code>setMetadata / getMetadata</Code> — per-token key/value blob (model, skills, etc).</li>
            </ul>
            <h4>Reputation</h4>
            <ul>
              <li><Code>giveFeedback(agentId, int128 value, uint8 decimals, tag1, tag2, endpoint, feedbackURI, feedbackHash)</Code></li>
              <li><Code>getSummary(agentId, clients[], tag1, tag2)</Code> — returns (count, mean, decimals).</li>
              <li><Code>revokeFeedback(agentId, feedbackIndex)</Code></li>
            </ul>
          </Section>

          <Section id="vault" title="Vault & Adapters">
            <p>
              <Code>StrategyVault</Code> is a standard ERC-4626 with two operator overrides:
              <Code>rebalance(weightsBps, decisionHash, rationaleCID)</Code> (agent-only, gated by
              <Code>IdentityRegistry.getAgentWallet</Code>) and delta-driven adapter routing on
              withdraw. Adapters implement <Code>IRWAAdapter</Code>:{" "}
              <Code>deposit / withdraw / totalAssetsInBase / underlying / label</Code>.
            </p>
            <p>
              Guardrails: <Code>minCashBps</Code> floors the idle USDC buffer;{" "}
              <Code>maxMoveBps</Code> caps the L1 distance of any single rebalance from current
              allocation. <Code>Pausable</Code> + <Code>ReentrancyGuard</Code> +{" "}
              <Code>AccessControl</Code> in place.
            </p>
          </Section>

          <Section id="signals" title="Signal Stack">
            <p>Each rebalance fuses three independent channels:</p>
            <ul>
              <li><b>Regime</b> — 3-state Gaussian HMM on composite log-returns + realized vol. Fallback to volatility-quantile classifier on convergence failure.</li>
              <li><b>Factor</b> — linear scorer over (yield, duration, liquidity, credit) with regime-conditional weights. Softmax normalized.</li>
              <li><b>Macro</b> — Claude Opus 4.7 reads headlines + on-chain metrics, returns strict-JSON tilt in [-2, +2] + rationale.</li>
            </ul>
            <p>
              <Code>AllocationPolicy</Code> mixes channels into integer-bps weights, applies risk
              caps, and smooths toward the previous allocation (default smoothing 0.5).
            </p>
          </Section>

          <Section id="feedback" title="Reputation Feedback">
            <p>
              <Code>atlas feedback</Code> snapshots vault NAV to a local JSONL history, computes
              30-day rolling Sharpe + max drawdown, pins a structured report to IPFS, and writes
              both metrics to <Code>ReputationRegistry</Code> under tags
              <Code> ("sharpe","30d")</Code> and <Code>("drawdown","30d")</Code>.
            </p>
            <pre className="rounded-xl border border-black/[0.08] bg-ink-50/[0.04] p-4 text-xs font-mono">
{`# Schedule daily
0 0 * * * cd /path/to/agent && . .venv/bin/activate && atlas feedback`}
            </pre>
            <p>
              The dashboard exposes a one-click <b>Submit Attestation</b> button that lets any
              connected wallet sign <Code>giveFeedback(...)</Code> with their own tag — independent
              of the agent's daily scorer.
            </p>
          </Section>

          <Section id="byreal" title="Byreal Bridge (Cross-Chain)">
            <p>
              Atlas keeps Mantle as primary. <Code>ByrealCoordinator</Code> translates the same
              allocation + regime + macro into a <b>ByrealPlan</b> with two action types:
            </p>
            <ul>
              <li><b>CLMM mirror</b> — swaps a fraction of TVL into wSOL/USDC and opens a concentrated-liquidity LP via <Code>byreal-cli positions open</Code>.</li>
              <li><b>Perps hedge</b> — when regime is risk-off, opens a short on Byreal Perps via <Code>byreal-perps-cli order market sell ...</Code> (max 3× leverage).</li>
            </ul>
            <p>Plans + execution results are pinned to the same IPFS rationale every rebalance — judges trace cross-chain actions from one Mantle tx.</p>
          </Section>

          <Section id="operations" title="Operations">
            <ul>
              <li><Code>atlas step</Code> — fire a rebalance (signals → policy → IPFS → on-chain tx).</li>
              <li><Code>atlas feedback</Code> — write Sharpe + drawdown to ReputationRegistry.</li>
              <li><Code>atlas backtest --days 180</Code> — offline replay, prints Sharpe / max drawdown.</li>
              <li><Code>atlas byreal-plan</Code> — dry-run Byreal coordinator without on-chain calls.</li>
              <li><Code>atlas byreal-check</Code> — verify Byreal CLIs are installed + authed.</li>
            </ul>
          </Section>

          <Section id="faq" title="FAQ">
            <Q q="Who can call vault.rebalance?">
              Only the wallet bound as the agent for the configured <Code>agentId</Code>. By default
              this is the agent NFT owner; can be delegated to a hot wallet via EIP-712.
            </Q>
            <Q q="Are the RWA adapters using real Ondo / Ethena / mETH?">
              On Mantle Sepolia, the adapters are <Code>MockYieldRWAAdapter</Code> with deterministic
              APY accrual — there's no canonical USDY/USDe on Sepolia. The interface{" "}
              <Code>IRWAAdapter</Code> is identical; production adapters drop in without vault changes.
            </Q>
            <Q q="What if Claude's API fails?">
              <Code>llm_macro.py</Code> wraps the SDK call in a try/except and falls back to a
              deterministic tilt derived from on-chain metrics (USDe peg, UST 10y change, ETH 30d
              return). Rebalances never block on LLM availability.
            </Q>
            <Q q="How do I run my own Atlas?">
              Fork the repo, after deploy, set environment
              variables for AGENT_PK, ATLAS_IPFS__*, ANTHROPIC_API_KEY, and run{" "}
              <Code>atlas step</Code> on a cron. See README for the full operations run book.
            </Q>
          </Section>
        </article>
      </div>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-12">
      <h2 className="font-display font-bold text-3xl text-ink-50 mb-4 tracking-tight">{title}</h2>
      <div className="text-ink-200 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[0.85em] px-1.5 py-0.5 rounded bg-violet-glow/10 border border-violet-glow/20 text-ink-100">
      {children}
    </code>
  );
}
function Q({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="glass p-4 mb-3">
      <div className="font-display font-semibold text-ink-50 mb-1">{q}</div>
      <div className="text-ink-300 text-sm">{children}</div>
    </div>
  );
}
function shorten(a: string) {
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}
