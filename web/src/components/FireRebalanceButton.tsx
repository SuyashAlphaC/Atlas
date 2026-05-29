"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { keccak256, toBytes } from "viem";
import { Atlas, abi } from "@/lib/contracts";

interface Preset {
  id: "risk_off" | "neutral" | "risk_on";
  label: string;
  weightsBps: number[]; // length 4 — [cash, USDY, USDe, mETH]
  rationale: string;
  color: string;
}

const PRESETS: Preset[] = [
  {
    id: "risk_off",
    label: "Risk Off",
    weightsBps: [3000, 5500, 1000, 500],
    rationale: "Manual: rotate to T-bills (USDY) heavy, raise cash buffer.",
    color: "#FFB58B",
  },
  {
    id: "neutral",
    label: "Neutral",
    weightsBps: [500, 3000, 3500, 3000],
    rationale: "Manual: balanced allocation, slight USDe carry tilt.",
    color: "#9B8AFB",
  },
  {
    id: "risk_on",
    label: "Risk On",
    weightsBps: [500, 1500, 4000, 4000],
    rationale: "Manual: lean into USDe + mETH for higher carry.",
    color: "#54F0D1",
  },
];

export function FireRebalanceButton() {
  const { address } = useAccount();
  const [pick, setPick] = useState<Preset>(PRESETS[1]);
  const [status, setStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();

  const { data: agentWallet } = useReadContract({
    address: Atlas.identity,
    abi: abi.identity as any,
    functionName: "getAgentWallet",
    args: [1n],
  });
  const allowed = address && agentWallet && (agentWallet as string).toLowerCase() === address.toLowerCase();

  const payload = useMemo(() => {
    const ts = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ kind: "atlas-manual-rebalance", preset: pick.id, weights: pick.weightsBps, ts });
    return { ts, body, hash: keccak256(toBytes(body)) };
  }, [pick]);

  async function submit() {
    if (!allowed) return;
    try {
      setStatus("Pinning rationale to IPFS…");
      setTxHash(null);

      // 1. Try to pin a real rationale payload via /api/pin (server-side Pinata).
      const pinBody = {
        kind: "atlas-manual-rebalance",
        agent_id: 1,
        preset: pick.id,
        weights_bps: pick.weightsBps,
        rationale: pick.rationale,
        evaluator: address,
        timestamp: payload.ts,
      };
      let cid = `manual-${payload.ts}`; // fallback when /api/pin unavailable
      try {
        const r = await fetch("/api/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pinBody),
        });
        const j = await r.json();
        if (r.ok && j.cid) cid = j.cid;
      } catch {
        // network failure → fall back to placeholder CID
      }

      setStatus("Awaiting signature…");
      const tx = await writeContractAsync({
        address: Atlas.vault,
        abi: abi.vault as any,
        functionName: "rebalance",
        args: [pick.weightsBps.map((n) => BigInt(n)), payload.hash, `ipfs://${cid}`],
      });
      setTxHash(tx);
      setStatus(`Confirmed · ${tx.slice(0, 10)}…`);
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message?.slice(0, 140) || "Failed");
    }
  }

  return (
    <div className="glass p-6">
      <div className="flex items-baseline justify-between">
        <div className="eyebrow">manual rebalance · agent-gated</div>
        <span className={`chip ${allowed ? "chip-ai" : ""}`}>
          {allowed ? "agent wallet detected" : "agent wallet only"}
        </span>
      </div>
      <h2 className="font-display font-semibold text-2xl text-ink-50 mt-2">Fire Rebalance</h2>
      <p className="text-ink-300 text-xs font-serif italic mt-1">
        Atlas's off-chain agent rebalances on a schedule. This panel lets the bound agent wallet override with a preset directly.
      </p>

      <div className="grid grid-cols-3 gap-2 mt-5">
        {PRESETS.map((p) => {
          const active = p.id === pick.id;
          return (
            <button
              key={p.id}
              onClick={() => setPick(p)}
              className={`relative p-3 rounded-xl border text-left transition-all ${
                active ? "border-violet-glow/50 bg-violet-glow/8" : "border-black/[0.08] bg-black/[0.025] hover:border-black/[0.15]"
              }`}
            >
              <div className="font-display font-semibold text-ink-50 text-sm" style={{ color: active ? p.color : undefined }}>
                {p.label}
              </div>
              <div className="mt-1 grid grid-cols-4 gap-0.5">
                {p.weightsBps.map((w, i) => (
                  <div key={i} className="text-[9px] font-mono tabular text-ink-300">
                    {(w / 100).toFixed(0)}%
                  </div>
                ))}
              </div>
              <div className="mt-1 text-[10px] text-ink-300 font-mono uppercase tracking-wider">
                cash / usdy / usde / meth
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-black/[0.06] bg-black/[0.025] p-3">
        <div className="eyebrow mb-1">decision payload hash</div>
        <code className="font-mono text-[10px] text-ink-300 break-all block">{payload.hash}</code>
      </div>

      <button onClick={submit} disabled={!allowed || isPending} className="btn-grad w-full mt-4">
        {isPending ? "Signing & broadcasting…" : allowed ? `Commit ${pick.label}` : "Connect agent wallet"}
      </button>

      {status && (
        <div className="mt-3 text-center text-xs font-mono text-ink-300">
          {txHash ? (
            <a
              href={`https://sepolia.mantlescan.xyz/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-mint-glow underline underline-offset-4"
            >
              {status} ↗
            </a>
          ) : (
            status
          )}
        </div>
      )}

      {!allowed && address && (
        <div className="mt-3 text-[11px] text-ink-300 leading-relaxed">
          Connected wallet isn't the agent. Trigger from CLI instead:
          <code className="block mt-1 font-mono text-[10px] text-ink-200 break-all bg-black/30 rounded-md p-2 border border-black/[0.06]">
            atlas step --config configs/atlas.yaml
          </code>
        </div>
      )}
    </div>
  );
}
