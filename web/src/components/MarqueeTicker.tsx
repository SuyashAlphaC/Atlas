"use client";

import { useReadContract, useReadContracts, useBlockNumber } from "wagmi";
import { Atlas, abi } from "@/lib/contracts";

interface Cell {
  label: string;
  value: string;
  accent?: string;
}

export function MarqueeTicker() {
  const { data: vaultData } = useReadContracts({
    contracts: [
      { address: Atlas.vault, abi: abi.vault as any, functionName: "totalAssets" },
      { address: Atlas.vault, abi: abi.vault as any, functionName: "totalSupply" },
      { address: Atlas.decisionLog, abi: abi.decisionLog as any, functionName: "decisionsCount" },
    ],
  });
  const { data: sharpe } = useReadContract({
    address: Atlas.reputation,
    abi: abi.reputation as any,
    functionName: "getSummary",
    args: [1n, [], "sharpe", "30d"],
  });
  const { data: block } = useBlockNumber({ watch: true });

  const tvl = vaultData?.[0]?.result as bigint | undefined;
  const supply = vaultData?.[1]?.result as bigint | undefined;
  const count = vaultData?.[2]?.result as bigint | undefined;
  const sharpeVal = sharpe ? Number((sharpe as any)[1] as bigint) / 1e18 : null;
  const sharpeCount = sharpe ? Number((sharpe as any)[0] as bigint) : 0;
  const navPerShare = tvl && supply && supply > 0n ? Number(tvl) / Number(supply) : 1;
  const sharePriceChange = ((navPerShare - 1) * 100).toFixed(4);

  const cells: Cell[] = [
    { label: "TVL", value: tvl ? `$${(Number(tvl) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—", accent: "text-ink-50" },
    { label: "NAV", value: navPerShare.toFixed(6), accent: "text-mint-glow" },
    { label: "Δ", value: `${Number(sharePriceChange) >= 0 ? "+" : ""}${sharePriceChange}%`, accent: Number(sharePriceChange) >= 0 ? "text-mint-glow" : "text-danger" },
    { label: "DECISIONS", value: count !== undefined ? `#${count}` : "—", accent: "text-violet-glow" },
    { label: "SHARPE 30D", value: sharpeCount > 0 && sharpeVal !== null ? sharpeVal.toFixed(3) : "—", accent: "text-mint-glow" },
    { label: "AGENT", value: "ATLAS · NFT #1", accent: "text-ink-100" },
    { label: "CHAIN", value: "MANTLE SEPOLIA", accent: "text-ink-300" },
    { label: "BLOCK", value: block !== undefined ? `#${block.toString()}` : "—", accent: "text-candy-pink" },
    { label: "STATUS", value: "● NOMINAL", accent: "text-mint-glow" },
    { label: "ERC-8004", value: "IDENTITY · REPUTATION · LIVE", accent: "text-ink-200" },
  ];

  // duplicate cells for seamless infinite scroll
  const looped = [...cells, ...cells];

  return (
    <div className="relative w-full overflow-hidden border-y border-black/[0.06] bg-white/55 backdrop-blur-md">
      <div className="absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-bg via-bg/80 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-bg via-bg/80 to-transparent pointer-events-none" />
      <div className="marquee py-2.5 flex gap-10 whitespace-nowrap will-change-transform">
        {looped.map((c, i) => (
          <span key={i} className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] tabular shrink-0">
            <span className="text-ink-400">{c.label}</span>
            <span className={c.accent}>{c.value}</span>
            <span className="text-ink-500">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
