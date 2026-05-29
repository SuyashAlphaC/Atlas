"use client";

import { motion } from "framer-motion";
import { useReadContract, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { Atlas, abi } from "@/lib/contracts";

const COLORS = ["#9C92B5", "#6B5BE6", "#E5478F", "#1FB89A", "#E0A03A"];
const LABELS_FALLBACK = ["Cash", "Ondo USDY", "Ethena USDe", "Mantle mETH"];

const adapterAbi = [
  { type: "function", name: "totalAssetsInBase", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "label", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

interface Slice {
  name: string;
  pct: number;
  raw: number;
  color: string;
}

const FRIENDLY: Record<string, string> = {
  OndoUSDY: "Ondo USDY",
  EthenaUSDe: "Ethena USDe",
  mETHWrap: "Mantle mETH",
};

export function RadialAllocation() {
  const { data: adapterAddrs } = useReadContract({
    address: Atlas.vault,
    abi: abi.vault as any,
    functionName: "adapters",
  });
  const adapters = (adapterAddrs as `0x${string}`[] | undefined) ?? [];

  const { data: idle } = useReadContract({
    address: Atlas.base,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [Atlas.vault],
  });

  const { data: adapterData } = useReadContracts({
    contracts: adapters.flatMap((a) => [
      { address: a, abi: adapterAbi as any, functionName: "totalAssetsInBase" },
      { address: a, abi: adapterAbi as any, functionName: "label" },
    ]),
    query: { enabled: adapters.length > 0 },
  });

  const cashVal = idle ? Number(idle as bigint) / 1e6 : 0;
  const adapterSlices = adapters.map((_, i) => {
    const v = (adapterData?.[i * 2]?.result as bigint | undefined) ?? 0n;
    const rawLabel = (adapterData?.[i * 2 + 1]?.result as string | undefined) ?? LABELS_FALLBACK[i + 1] ?? `Slot ${i}`;
    return { raw: Number(v) / 1e6, label: FRIENDLY[rawLabel] ?? rawLabel };
  });

  const total = cashVal + adapterSlices.reduce((s, x) => s + x.raw, 0);
  const slices: Slice[] = [
    { name: "Cash", pct: total === 0 ? 0 : (cashVal / total) * 100, raw: cashVal, color: COLORS[0] },
    ...adapterSlices.map((s, i) => ({
      name: s.label,
      pct: total === 0 ? 0 : (s.raw / total) * 100,
      raw: s.raw,
      color: COLORS[(i + 1) % COLORS.length],
    })),
  ];

  // Donut params
  const SIZE = 280;
  const STROKE = 26;
  const R = (SIZE - STROKE) / 2 - 8;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="grid grid-cols-12 gap-4 items-center">
      <div className="col-span-12 md:col-span-6 relative">
        <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} className="overflow-visible">
          <defs>
            {slices.map((s, i) => (
              <linearGradient id={`ra-${i}`} key={i} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="1" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.5" />
              </linearGradient>
            ))}
          </defs>

          {/* Track */}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(15,10,36,0.06)" strokeWidth={STROKE} />

          {/* Segments */}
          {slices.map((s, i) => {
            const len = (s.pct / 100) * C;
            const dash = `${len} ${C - len}`;
            const offset = -acc;
            acc += len;
            return (
              <motion.circle
                key={i}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={`url(#ra-${i})`}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={dash}
                strokeDashoffset={offset}
                initial={{ opacity: 0, strokeWidth: 0 }}
                animate={{ opacity: 1, strokeWidth: STROKE }}
                transition={{ duration: 0.9, delay: 0.1 * i, ease: [0.2, 0.7, 0.2, 1] }}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                style={{ filter: `drop-shadow(0 0 10px ${s.color}80)` }}
              />
            );
          })}

          {/* Center label */}
          <text x={SIZE / 2} y={SIZE / 2 - 6} textAnchor="middle" className="fill-ink-300" style={{ font: "11px JetBrains Mono", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            TVL
          </text>
          <text x={SIZE / 2} y={SIZE / 2 + 22} textAnchor="middle" className="fill-ink-50" style={{ font: "700 22px 'Bricolage Grotesque'", fontVariantNumeric: "tabular-nums" }}>
            ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </text>
          <text x={SIZE / 2} y={SIZE / 2 + 40} textAnchor="middle" className="fill-ink-400" style={{ font: "10px JetBrains Mono", letterSpacing: "0.18em" }}>
            {slices.length} POSITIONS
          </text>
        </svg>
      </div>

      <ul className="col-span-12 md:col-span-6 space-y-2">
        {slices.map((s, i) => (
          <motion.li
            key={s.name}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-black/[0.06] bg-black/[0.025] relative overflow-hidden"
          >
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 opacity-30"
              style={{ width: `${s.pct}%`, background: `linear-gradient(90deg, ${s.color}30, transparent)` }}
            />
            <div className="relative flex items-center gap-3">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: s.color, boxShadow: `0 0 12px ${s.color}` }}
              />
              <span className="text-ink-100 text-sm font-medium">{s.name}</span>
            </div>
            <div className="relative tabular text-right">
              <div className="text-ink-50 text-sm font-mono">{s.pct.toFixed(2)}%</div>
              <div className="text-ink-400 text-[10px] font-mono">${s.raw.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
