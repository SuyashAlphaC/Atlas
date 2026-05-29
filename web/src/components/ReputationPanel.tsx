"use client";

import { useReadContract } from "wagmi";
import { Atlas, abi } from "@/lib/contracts";
import { FeedbackButton } from "./FeedbackButton";
import { FeedbackList } from "./FeedbackList";

export function ReputationPanel() {
  const agentId = 1n;
  const { data: sharpe } = useReadContract({
    address: Atlas.reputation,
    abi: abi.reputation as any,
    functionName: "getSummary",
    args: [agentId, [], "sharpe", "30d"],
  });
  const { data: dd } = useReadContract({
    address: Atlas.reputation,
    abi: abi.reputation as any,
    functionName: "getSummary",
    args: [agentId, [], "drawdown", "30d"],
  });
  const { data: attestation } = useReadContract({
    address: Atlas.reputation,
    abi: abi.reputation as any,
    functionName: "getSummary",
    args: [agentId, [], "attestation", "wallet-vote"],
  });
  const { data: tokenURI } = useReadContract({
    address: Atlas.identity,
    abi: abi.identity as any,
    functionName: "tokenURI",
    args: [agentId],
  });

  const fmt = (r: any) => {
    if (!r) return "—";
    const [count, val, dec] = r as [bigint, bigint, number];
    if (count === 0n) return "—";
    return (Number(val) / 10 ** Number(dec)).toFixed(3);
  };
  const sharpeCount = sharpe ? Number((sharpe as any)[0] as bigint) : 0;
  const ddCount = dd ? Number((dd as any)[0] as bigint) : 0;
  const attestCount = attestation ? Number((attestation as any)[0] as bigint) : 0;
  const attestMean = attestation ? Number((attestation as any)[1] as bigint) / 1e18 : 0;

  return (
    <div className="glass p-6">
      <div className="flex items-baseline justify-between">
        <div className="eyebrow">erc-8004 · reputation</div>
        <span className="chip chip-ai">NFT #1</span>
      </div>
      <div className="mt-2 font-display font-semibold text-2xl text-ink-50">Track record</div>
      <div className="mt-1 text-ink-300 text-xs font-serif italic">
        Reputation accrues on-chain. It follows the agent NFT, not the team.
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label="SHARPE · 30d" value={fmt(sharpe)} count={sharpeCount} color="text-mint-glow" hint="atlas feedback CLI" />
        <Metric label="MAX DD · 30d" value={fmt(dd)} count={ddCount} color="text-warn" hint="atlas feedback CLI" />
      </div>

      <div className="mt-3 rounded-xl border border-black/[0.06] bg-black/[0.025] p-3">
        <div className="flex items-baseline justify-between">
          <div className="eyebrow">USER ATTESTATIONS</div>
          <span className="text-[10px] font-mono text-ink-300">via web button below</span>
        </div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="font-display font-semibold text-xl tabular text-violet-glow">{attestCount}</span>
          <span className="text-ink-300 text-xs">votes · mean sentiment</span>
          <span className="ml-auto tabular text-xs text-ink-100">
            {attestCount > 0 ? attestMean.toFixed(2) : "—"}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <FeedbackList agentId={1n} limit={5} />
      </div>

      {tokenURI ? (
        <div className="mt-3 rounded-xl border border-black/[0.06] bg-black/[0.025] p-3">
          <div className="eyebrow mb-1">agent card uri</div>
          <code className="font-mono text-xs text-ink-200 break-all">{String(tokenURI)}</code>
        </div>
      ) : null}

      <div className="mt-4">
        <FeedbackButton agentId={1n} />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  count,
  color,
  hint,
}: {
  label: string;
  value: string;
  count: number;
  color: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-black/[0.025] p-3">
      <div className="eyebrow">{label}</div>
      <div className={`mt-1 font-display font-semibold text-xl tabular ${color}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-mono text-ink-300">{count} entries</div>
      {hint && <div className="mt-1 text-[9px] uppercase tracking-wider text-ink-400">via {hint}</div>}
    </div>
  );
}
