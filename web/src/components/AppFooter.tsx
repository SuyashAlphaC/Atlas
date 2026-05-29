"use client";

import { useBlockNumber, useReadContract, useReadContracts } from "wagmi";
import { Atlas, abi } from "@/lib/contracts";

export function AppFooter() {
  const { data: count } = useReadContract({
    address: Atlas.decisionLog,
    abi: abi.decisionLog as any,
    functionName: "decisionsCount",
  });
  const n = count !== undefined ? Number(count as bigint) : 0;
  const lastId = n > 0 ? BigInt(n - 1) : null;

  const { data: lastDecision } = useReadContract({
    address: Atlas.decisionLog,
    abi: abi.decisionLog as any,
    functionName: "getDecision",
    args: lastId !== null ? [lastId] : undefined,
    query: { enabled: lastId !== null },
  });

  const { data: block } = useBlockNumber({ watch: true });

  const d = lastDecision as any;
  const ts = d ? new Date(Number(d.timestamp) * 1000) : null;
  const tsStr = ts ? ts.toISOString().replace("T", " ").slice(0, 19) + " UTC" : "—";
  const age = ts ? ageString(Date.now() - ts.getTime()) : "—";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-black/[0.06] bg-white/75 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 py-2 grid grid-cols-12 gap-4 text-[11px] font-mono tabular text-ink-300">
        <Cell label="status">
          <span className="text-mint-glow">● nominal</span>
        </Cell>
        <Cell label="block">
          {block !== undefined ? `#${block.toString()}` : "—"}
        </Cell>
        <Cell label="last decision">
          {lastId !== null ? `#${lastId.toString()}` : "—"}
        </Cell>
        <Cell label="committed">{tsStr}</Cell>
        <Cell label="age">{age}</Cell>
        <Cell label="agent" right>
          <a
            href={`https://sepolia.mantlescan.xyz/address/${Atlas.vault}`}
            target="_blank"
            rel="noreferrer"
            className="text-violet-glow hover:underline"
          >
            mantlescan ↗
          </a>
        </Cell>
      </div>
    </div>
  );
}

function Cell({ label, children, right = false }: { label: string; children: React.ReactNode; right?: boolean }) {
  return (
    <div className={`col-span-6 md:col-span-2 ${right ? "text-right" : ""}`}>
      <div className="text-[9px] uppercase tracking-[0.18em] text-ink-400">{label}</div>
      <div className="mt-0.5 text-ink-100">{children}</div>
    </div>
  );
}

function ageString(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ago`;
}
