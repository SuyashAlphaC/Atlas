"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { AnimatePresence } from "framer-motion";
import { Atlas, abi } from "@/lib/contracts";
import Link from "next/link";
import { RationalePreview } from "./RationalePreview";

export function DecisionTimeline() {
  const { data: count } = useReadContract({
    address: Atlas.decisionLog,
    abi: abi.decisionLog as any,
    functionName: "decisionsCount",
  });
  const n = Number((count as bigint | undefined) ?? 0n);
  const ids = Array.from({ length: Math.min(8, n) }, (_, i) => n - 1 - i);
  return (
    <div className="glass p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="eyebrow">decision timeline · erc-8004 audit log</div>
          <h2 className="font-display font-semibold text-2xl mt-1">Atlas thoughts</h2>
          <div className="text-ink-300 text-xs font-serif italic mt-1">
            Hover any row to preview its IPFS rationale inline.
          </div>
        </div>
        <span className="chip">{n} on-chain</span>
      </div>
      <div className="mt-5 space-y-2">
        {ids.length === 0 && (
          <div className="text-ink-300 text-sm py-6 px-4 rounded-xl border border-dashed border-black/[0.08]">
            Atlas hasn't rebalanced yet. First decision lands as soon as the agent wakes up.
          </div>
        )}
        {ids.map((id) => (
          <DecisionRow key={id} id={id} />
        ))}
      </div>
    </div>
  );
}

function DecisionRow({ id }: { id: number }) {
  const [hover, setHover] = useState(false);
  const { data } = useReadContract({
    address: Atlas.decisionLog,
    abi: abi.decisionLog as any,
    functionName: "getDecision",
    args: [BigInt(id)],
  });
  const d = data as any;
  if (!d) return <div className="py-4 px-4 text-ink-300 text-sm">Loading decision #{id}…</div>;
  const ts = new Date(Number(d.timestamp) * 1000).toISOString().replace("T", " ").slice(0, 19);
  const cid: string = d.rationaleCID;
  const labels = ["cash", "USDY", "USDe", "mETH"];
  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="px-4 py-3 rounded-xl border border-black/[0.06] bg-black/[0.025] hover:bg-black/[0.04] hover:border-violet-glow/30 transition-all cursor-default">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold text-ink-50 text-sm">#{id}</span>
            <span className="tabular text-ink-300 text-xs">{ts}</span>
            {hover && (
              <span className="text-[10px] font-mono text-mint-glow tracking-wider uppercase animate-pulse">
                ● fetching rationale
              </span>
            )}
          </div>
          {cid && (
            <Link
              href={`https://gateway.pinata.cloud/ipfs/${cid.replace("ipfs://", "")}` as any}
              target="_blank"
              className="text-xs text-mint-glow underline underline-offset-4 hover:text-ink-50 transition-colors"
            >
              ↗ open ipfs
            </Link>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(d.weightsBps as bigint[]).map((w, i) => {
            const pct = Number(w) / 100;
            const tone =
              i === 0
                ? "border-black/[0.08] bg-black/[0.03]"
                : ["border-violet-glow/30 bg-violet-glow/10", "border-candy-pink/30 bg-candy-pink/10", "border-mint-glow/30 bg-mint-glow/10"][i - 1] ??
                  "border-black/[0.08]";
            return (
              <span
                key={i}
                className={`px-2.5 py-1 rounded-lg border ${tone} font-mono text-[11px] tabular text-ink-100 flex items-center gap-2`}
              >
                <span className="text-ink-300">{labels[i] ?? `s${i - 1}`}</span>
                <span>{pct.toFixed(2)}%</span>
              </span>
            );
          })}
        </div>
      </div>
      <AnimatePresence>
        {hover && cid && <RationalePreview cid={cid} />}
      </AnimatePresence>
    </div>
  );
}
