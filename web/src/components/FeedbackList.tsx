"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { Atlas, abi } from "@/lib/contracts";

interface Entry {
  client: string;
  index: number;
  value: bigint;
  decimals: number;
  tag1: string;
  tag2: string;
  revoked: boolean;
}

const TAG_STYLE: Record<string, { color: string; label: string }> = {
  sharpe: { color: "#54F0D1", label: "SHARPE" },
  drawdown: { color: "#FFD580", label: "DRAWDOWN" },
  attestation: { color: "#9B8AFB", label: "ATTEST" },
};

/** Reads feedback purely via eth_call (no eth_getLogs — avoids the public RPC
 *  log-range throttle). Iterates ReputationRegistry.getClients(agentId) →
 *  getLastIndex per client → readFeedback per (client, index). Shows the most
 *  recent `limit` entries across all clients. */
export function FeedbackList({ agentId = 1n, limit = 5 }: { agentId?: bigint; limit?: number }) {
  const { data: rawClients } = useReadContract({
    address: Atlas.reputation,
    abi: abi.reputation as any,
    functionName: "getClients",
    args: [agentId],
  });
  const clients = (rawClients as `0x${string}`[] | undefined) ?? [];

  // Per-client total count.
  const { data: lastIndexData } = useReadContracts({
    contracts: clients.map((c) => ({
      address: Atlas.reputation,
      abi: abi.reputation as any,
      functionName: "getLastIndex",
      args: [agentId, c],
    })),
    query: { enabled: clients.length > 0 },
  });
  const counts = clients.map((_, i) => Number((lastIndexData?.[i]?.result as bigint | undefined) ?? 0n));

  // Build (client, idx) tuples descending by index per client, then pick the most recent `limit` overall.
  // Without per-entry timestamps we approximate "recent" as highest-index per client, round-robin.
  const tuples = pickRecent(clients, counts, limit);

  const { data: feedbackData, isLoading } = useReadContracts({
    contracts: tuples.map(([c, i]) => ({
      address: Atlas.reputation,
      abi: abi.reputation as any,
      functionName: "readFeedback",
      args: [agentId, c, BigInt(i)],
    })),
    query: { enabled: tuples.length > 0 },
  });

  const entries: Entry[] = tuples.map(([client, idx], i) => {
    const r = feedbackData?.[i]?.result as readonly [bigint, number, string, string, boolean] | undefined;
    if (!r) {
      return { client, index: idx, value: 0n, decimals: 18, tag1: "", tag2: "", revoked: false };
    }
    return {
      client,
      index: idx,
      value: r[0],
      decimals: Number(r[1]),
      tag1: r[2],
      tag2: r[3],
      revoked: r[4],
    };
  });

  return (
    <div className="rounded-xl border border-black/[0.06] bg-black/[0.025] p-3">
      <div className="flex items-baseline justify-between mb-2">
        <div className="eyebrow">last {limit} feedback</div>
        <span className="text-[10px] font-mono text-ink-300">
          {isLoading ? "loading…" : entries.length > 0 ? `${entries.length} shown` : "0"}
        </span>
      </div>

      {entries.length === 0 && !isLoading && (
        <div className="text-xs text-ink-300 py-2">No feedback yet. Run <code className="font-mono">atlas feedback</code> or click <b>Submit Attestation</b>.</div>
      )}

      <ul className="space-y-1.5">
        {entries.map((e, i) => {
          if (!e.tag1) return null;
          const style = TAG_STYLE[e.tag1] ?? { color: "#9B96B8", label: e.tag1.toUpperCase().slice(0, 8) };
          const numeric = (Number(e.value) / 10 ** e.decimals).toLocaleString(undefined, {
            maximumFractionDigits: 3,
          });
          return (
            <li
              key={`${e.client}-${e.index}-${i}`}
              className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-black/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border"
                  style={{ color: style.color, borderColor: `${style.color}40`, background: `${style.color}10` }}
                >
                  {style.label}
                </span>
                <span className="text-[10px] font-mono text-ink-300 truncate">{e.tag2}</span>
                {e.revoked && (
                  <span className="text-[9px] font-mono text-danger uppercase">revoked</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="tabular text-xs text-ink-100 font-mono">{numeric}</span>
                <a
                  href={`https://sepolia.mantlescan.xyz/address/${e.client}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-mono text-violet-glow hover:underline"
                  title={`${e.client} · idx ${e.index}`}
                >
                  ↗
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Round-robin pick of the most recent `limit` entries across all clients.
 *  Walks each client's index counter down by one per pass until we have `limit`
 *  total. Approximates global temporal ordering without per-entry timestamps. */
function pickRecent(clients: readonly `0x${string}`[], counts: number[], limit: number): [`0x${string}`, number][] {
  const cursors = counts.slice();
  const out: [`0x${string}`, number][] = [];
  while (out.length < limit) {
    let progressed = false;
    for (let c = 0; c < clients.length && out.length < limit; c++) {
      if (cursors[c] > 0) {
        cursors[c] -= 1;
        out.push([clients[c], cursors[c]]);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return out;
}
