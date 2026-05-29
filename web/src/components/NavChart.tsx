"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, Tooltip, YAxis } from "recharts";

interface Snap {
  timestamp: number;
  nav_per_share: number;
  decisions_count: number;
}

export function NavChart() {
  const [data, setData] = useState<Snap[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/nav", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && setData(j.snapshots || []))
      .catch((e) => alive && setError(e?.message || "fetch failed"));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="text-xs text-danger font-mono">nav api: {error}</div>
    );
  }
  if (!data) {
    return <div className="text-xs text-ink-300 font-mono">loading nav history…</div>;
  }
  if (data.length === 0) {
    return (
      <div className="text-[11px] text-ink-300 p-3 rounded-xl border border-dashed border-white/10 text-center font-mono">
        no snapshots yet · run <code className="text-violet-glow">atlas feedback</code> twice
      </div>
    );
  }

  const series = data.map((s) => ({
    t: s.timestamp,
    nav: Number(s.nav_per_share.toFixed(10)),
    decisions: s.decisions_count,
  }));
  const first = series[0].nav;
  const last = series[series.length - 1].nav;
  const change = ((last - first) / first) * 100;
  const positive = change >= 0;
  const span = series[series.length - 1].t - series[0].t; // seconds

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="eyebrow">nav · {humanWindow(span)} · {series.length} snapshots</div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono tabular text-ink-50 text-sm">{last.toFixed(6)}</span>
          <span className={`text-xs font-mono ${positive ? "text-mint-glow" : "text-danger"}`}>
            {positive ? "+" : ""}
            {change.toFixed(5)}%
          </span>
        </div>
      </div>
      <div className="h-32">
        <ResponsiveContainer>
          <AreaChart data={series} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="nav-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6B5BE6" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#6B5BE6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={["dataMin", "dataMax"]} hide />
            <Area
              type="monotone"
              dataKey="nav"
              stroke="#6B5BE6"
              strokeWidth={1.8}
              fill="url(#nav-fill)"
              animationDuration={1400}
              isAnimationActive
              dot={{ r: 2, stroke: "#6B5BE6", fill: "#FFFFFF", strokeWidth: 1.5 }}
              activeDot={{ r: 4, stroke: "#FFFFFF", fill: "#6B5BE6", strokeWidth: 1.5 }}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.96)",
                border: "1px solid rgba(15,10,36,0.12)",
                borderRadius: 10,
                color: "#0F0A24",
                fontFamily: "JetBrains Mono",
                fontSize: 11,
                boxShadow: "0 12px 32px -8px rgba(15,10,36,0.18)",
              }}
              labelFormatter={(_: any, payload: any) => {
                const t = payload?.[0]?.payload?.t;
                return t ? new Date(t * 1000).toISOString().slice(0, 19) + " UTC" : "";
              }}
              formatter={(v: any, _n: any, payload: any) => [Number(v).toFixed(8), `NAV · dec ${payload?.payload?.decisions ?? "?"}`]}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function humanWindow(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
