"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Rationale {
  rationale?: string;
  signals?: {
    regime?: { label?: string; annualized_vol?: number; annualized_drift?: number; state_probs?: number[] };
    macro?: { tilt?: number; rationale?: string };
    factor_scores?: number[];
    factor_breakdown?: Record<string, number>[];
  };
  weights_bps?: number[];
  timestamp_ms?: number;
}

const cache = new Map<string, Rationale>();

export function RationalePreview({ cid }: { cid: string }) {
  const [data, setData] = useState<Rationale | null>(cache.get(cid) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (cache.has(cid)) {
      setData(cache.get(cid)!);
      setLoading(false);
      return;
    }
    const clean = cid.replace("ipfs://", "");
    // Detect placeholder / non-IPFS CIDs (e.g. "manual-1779986006") and skip the fetch.
    if (!clean || !/^(Qm|baf|bafk|bafy)/i.test(clean)) {
      setLoading(false);
      setError("placeholder CID — no IPFS rationale was pinned for this decision");
      return;
    }
    let alive = true;
    setLoading(true);
    fetch(`https://gateway.pinata.cloud/ipfs/${clean}`)
      .then((r) => {
        if (!r.ok) throw new Error(`gateway ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (!alive) return;
        cache.set(cid, j);
        setData(j);
      })
      .catch((e) => alive && setError(e?.message || "fetch failed"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [cid]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className="absolute left-0 right-0 top-full mt-2 z-30 rounded-xl border border-black/[0.08] bg-white/95 backdrop-blur-2xl shadow-[0_30px_60px_-20px_rgba(107,91,230,0.35)] p-4"
    >
      <div className="eyebrow mb-2">ipfs rationale · live fetch</div>

      {loading && <div className="text-xs text-ink-300 font-mono">fetching from pinata gateway…</div>}
      {error && (
        <div className="text-xs font-mono break-all leading-relaxed text-ink-300">
          <span className="text-warn">⚠ </span>
          {error}
          {error.includes("placeholder") && (
            <div className="mt-1 text-[10px] text-ink-400">
              Add <code className="text-violet-glow">PINATA_JWT</code> to{" "}
              <code className="text-violet-glow">web/.env.local</code> so the dashboard's
              Fire Rebalance can pin real rationales next time.
            </div>
          )}
        </div>
      )}

      {data && (
        <div className="space-y-3 text-xs">
          {data.rationale && (
            <p className="text-ink-200 leading-relaxed">{data.rationale}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {data.signals?.regime && (
              <div className="rounded-lg border border-black/[0.06] bg-black/[0.025] p-2">
                <div className="eyebrow">regime</div>
                <div className="mt-1 font-display text-sm text-ink-50">{data.signals.regime.label}</div>
                {typeof data.signals.regime.annualized_vol === "number" && (
                  <div className="text-[10px] font-mono text-ink-300 mt-0.5">
                    vol {(data.signals.regime.annualized_vol * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            )}
            {data.signals?.macro && (
              <div className="rounded-lg border border-black/[0.06] bg-black/[0.025] p-2">
                <div className="eyebrow">macro tilt</div>
                <div className="mt-1 font-display text-sm text-ink-50">
                  {(data.signals.macro.tilt ?? 0) >= 0 ? "+" : ""}{data.signals.macro.tilt}
                </div>
                <div className="text-[10px] font-mono text-ink-300 mt-0.5 line-clamp-2">
                  {data.signals.macro.rationale?.slice(0, 90)}
                </div>
              </div>
            )}
          </div>

          {data.signals?.factor_scores && (
            <div className="rounded-lg border border-black/[0.06] bg-black/[0.025] p-2">
              <div className="eyebrow">factor scores</div>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {data.signals.factor_scores.map((s, i) => (
                  <span key={i} className="font-mono tabular text-[11px] text-ink-100">
                    {["USDY", "USDe", "mETH"][i] ?? `slot${i}`}: <span className="text-mint-glow">{s.toFixed(4)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.weights_bps && (
            <div className="flex flex-wrap gap-1.5">
              {data.weights_bps.map((w, i) => (
                <span
                  key={i}
                  className="text-[10px] font-mono px-2 py-1 rounded border border-black/[0.08] bg-black/[0.025] text-ink-100"
                >
                  {["cash", "USDY", "USDe", "mETH"][i] ?? `s${i}`}
                  <span className="text-violet-glow ml-1">{(w / 100).toFixed(2)}%</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
