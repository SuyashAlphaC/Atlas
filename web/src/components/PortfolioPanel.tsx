"use client";

import { useReadContracts } from "wagmi";
import { Atlas, abi } from "@/lib/contracts";
import { CountUp } from "./CountUp";
import { NavChart } from "./NavChart";

export function PortfolioPanel() {
  const { data } = useReadContracts({
    contracts: [
      { address: Atlas.vault, abi: abi.vault as any, functionName: "totalAssets" },
      { address: Atlas.vault, abi: abi.vault as any, functionName: "totalSupply" },
      { address: Atlas.vault, abi: abi.vault as any, functionName: "minCashBps" },
      { address: Atlas.decisionLog, abi: abi.decisionLog as any, functionName: "decisionsCount" },
    ],
  });
  const tvl = data?.[0]?.result as bigint | undefined;
  const supply = data?.[1]?.result as bigint | undefined;
  const minCash = data?.[2]?.result as bigint | undefined;
  const decisionsCount = data?.[3]?.result as bigint | undefined;
  const price = tvl && supply && supply > 0n ? Number(tvl) / Number(supply) : 1;
  const tvlNum = tvl ? Number(tvl) / 1e6 : 0;

  return (
    <div className="glass p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow">portfolio · usdc-denominated</div>
          <div className="mt-3 flex items-baseline gap-3 flex-wrap">
            <span
              className="font-display font-bold tracking-[-0.03em] tabular text-ink-50"
              style={{ fontSize: "clamp(40px, 6vw, 64px)" }}
            >
              <CountUp value={tvlNum} decimals={2} prefix="$" />
            </span>
            <span className="chip chip-ai">live · sepolia</span>
          </div>
          <div className="text-ink-300 mt-1 text-sm font-serif italic">Total assets · 6-decimal USDC</div>
        </div>
        <div className="text-right shrink-0">
          <div className="eyebrow">vault</div>
          <code className="block text-xs font-mono text-ink-200 mt-1">{short(Atlas.vault)}</code>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-black/[0.06] bg-black/[0.025] p-4">
        <NavChart />
      </div>

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="SHARES" value={supply ? humanUnit(supply, 6, 2) : "0"} />
        <Stat label="SHARE PRICE" value={price.toFixed(6)} />
        <Stat label="MIN CASH" value={minCash !== undefined ? `${Number(minCash) / 100}%` : "—"} />
        <Stat label="DECISIONS" value={decisionsCount !== undefined ? String(decisionsCount) : "—"} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-black/[0.025] p-4 min-w-0">
      <div className="eyebrow truncate">{label}</div>
      <div className="mt-1.5 font-display font-semibold text-xl tabular text-ink-50 truncate">{value}</div>
    </div>
  );
}

function humanUnit(v: bigint, dec: number, frac: number) {
  return (Number(v) / 10 ** dec).toLocaleString(undefined, { maximumFractionDigits: frac });
}
function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
}
