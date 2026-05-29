"use client";

import { useReadContract } from "wagmi";
import { Atlas, abi } from "@/lib/contracts";

/** Real reputation-driven panel. Shows the count of recorded feedback entries against
 *  Agent #1 in the ERC-8004 ReputationRegistry, broken down by tag (Sharpe / Drawdown).
 *  Beat-Atlas (human-vs-AI) registration is a planned Phase-2 feature — no fake humans here. */
export function LeaderboardPanel() {
  const agentId = 1n;

  const { data: clients } = useReadContract({
    address: Atlas.reputation,
    abi: abi.reputation as any,
    functionName: "getClients",
    args: [agentId],
  });
  const { data: sharpe } = useReadContract({
    address: Atlas.reputation,
    abi: abi.reputation as any,
    functionName: "getSummary",
    args: [agentId, [], "sharpe", "30d"],
  });
  const { data: drawdown } = useReadContract({
    address: Atlas.reputation,
    abi: abi.reputation as any,
    functionName: "getSummary",
    args: [agentId, [], "drawdown", "30d"],
  });

  const clientList = (clients as `0x${string}`[] | undefined) ?? [];
  const sharpeCount = sharpe ? Number((sharpe as any)[0] as bigint) : 0;
  const drawdownCount = drawdown ? Number((drawdown as any)[0] as bigint) : 0;

  return (
    <div className="glass p-6">
      <div className="flex items-baseline justify-between">
        <div className="eyebrow">erc-8004 · feedback feed</div>
        <span className="chip">phase-2 hook</span>
      </div>
      <div className="mt-2 font-display font-semibold text-2xl text-ink-50">Atlas Track Record</div>
      <div className="mt-1 text-ink-300 text-xs font-serif italic">
        Live counters from `ReputationRegistry`. Beat-Atlas opens in Phase 2.
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Pill label="SHARPE FEEDBACK" value={sharpeCount} accent="#54F0D1" />
        <Pill label="DRAWDOWN FEEDBACK" value={drawdownCount} accent="#FFD580" />
      </div>

      <div className="mt-4 rounded-xl border border-black/[0.06] bg-black/[0.025] p-3">
        <div className="eyebrow mb-2">unique evaluators · {clientList.length}</div>
        {clientList.length === 0 ? (
          <div className="text-ink-300 text-xs">
            No reputation feedback yet. Once the off-chain scorer writes Sharpe / drawdown via
            <code className="mx-1 font-mono text-ink-200">giveFeedback</code>
            entries land here in real time.
          </div>
        ) : (
          <ul className="space-y-1">
            {clientList.slice(0, 5).map((addr) => (
              <li key={addr} className="font-mono text-xs text-ink-200">{short(addr)}</li>
            ))}
            {clientList.length > 5 && (
              <li className="font-mono text-xs text-ink-300">+ {clientList.length - 5} more</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function Pill({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-black/[0.025] p-3">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 font-display font-semibold text-xl tabular" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
