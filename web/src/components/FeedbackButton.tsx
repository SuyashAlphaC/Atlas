"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import { keccak256, toBytes } from "viem";
import { Atlas, abi } from "@/lib/contracts";

/** On-chain attestation button — any connected wallet can write a tagged
 *  feedback entry to the ERC-8004 ReputationRegistry for the Atlas agent.
 *
 *  Sentiment is encoded as an int128 value with 6 decimals:
 *    Strong Bull = +2_000_000  (i.e. +2.0)
 *    Bull        = +1_000_000
 *    Neutral     =          0
 *    Bear        = -1_000_000
 *    Strong Bear = -2_000_000
 *
 *  The feedback is tagged ("attestation","wallet-vote") so the daily Sharpe /
 *  drawdown feed (tag1="sharpe"/"drawdown") stays isolated from human votes.
 */
const SENTIMENT = [
  { label: "Strong Bull", value: 2_000_000, color: "#54F0D1" },
  { label: "Bull", value: 1_000_000, color: "#9B8AFB" },
  { label: "Neutral", value: 0, color: "#9B96B8" },
  { label: "Bear", value: -1_000_000, color: "#FFB58B" },
  { label: "Strong Bear", value: -2_000_000, color: "#FF5C7A" },
];

export function FeedbackButton({ agentId = 1n }: { agentId?: bigint }) {
  const { address } = useAccount();
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<number>(1_000_000);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const { writeContractAsync, isPending } = useWriteContract();

  // Live state shown in modal — TVL, decisions count, share price.
  const { data: state } = useReadContracts({
    contracts: [
      { address: Atlas.vault, abi: abi.vault as any, functionName: "totalAssets" },
      { address: Atlas.vault, abi: abi.vault as any, functionName: "totalSupply" },
      { address: Atlas.decisionLog, abi: abi.decisionLog as any, functionName: "decisionsCount" },
    ],
    query: { enabled: open },
  });
  const tvl = state?.[0]?.result as bigint | undefined;
  const supply = state?.[1]?.result as bigint | undefined;
  const decisionsCount = state?.[2]?.result as bigint | undefined;
  const price = tvl && supply && supply > 0n ? Number(tvl) / Number(supply) : 1;

  const feedbackPayload = useMemo(() => {
    return JSON.stringify(
      {
        kind: "atlas-user-attestation",
        agent_id: Number(agentId),
        sentiment: SENTIMENT.find((s) => s.value === pick)?.label ?? "Neutral",
        sentiment_value: pick,
        snapshot: {
          tvl_usdc: tvl ? Number(tvl) / 1e6 : null,
          share_price: price,
          decisions_count: decisionsCount !== undefined ? Number(decisionsCount) : null,
        },
        evaluator: address ?? null,
        note: note.slice(0, 240),
        timestamp: Math.floor(Date.now() / 1000),
      },
      null,
      0,
    );
  }, [pick, tvl, price, decisionsCount, address, note, agentId]);

  const feedbackHash = useMemo(() => keccak256(toBytes(feedbackPayload)), [feedbackPayload]);

  async function submit() {
    if (!address) return;
    try {
      setStatus("Awaiting signature…");
      const tx = await writeContractAsync({
        address: Atlas.reputation,
        abi: abi.reputation as any,
        functionName: "giveFeedback",
        args: [
          agentId,
          BigInt(pick),
          6,
          "attestation",
          "wallet-vote",
          "atlas-web-v1",
          "",
          feedbackHash,
        ],
      });
      setStatus(`Submitted · ${tx.slice(0, 10)}…`);
      setTimeout(() => {
        setOpen(false);
        setStatus(null);
      }, 1800);
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message?.slice(0, 120) || "Failed");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!address}
        className="btn-grad w-full text-sm"
      >
        {address ? "Submit Attestation" : "Connect to Attest"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-50/30 backdrop-blur-md px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow">erc-8004 · onchain attestation</div>
                <div className="font-display font-semibold text-2xl text-ink-50 mt-1">
                  Rate Atlas
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-ink-300 hover:text-ink-50 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Stat label="TVL" v={tvl ? `$${(Number(tvl) / 1e6).toLocaleString()}` : "—"} />
              <Stat label="Decisions" v={decisionsCount !== undefined ? String(decisionsCount) : "—"} />
              <Stat label="Share Price" v={price.toFixed(4)} />
            </div>

            <div className="mt-5">
              <div className="eyebrow mb-2">your sentiment</div>
              <div className="grid grid-cols-5 gap-1.5">
                {SENTIMENT.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setPick(s.value)}
                    className={`px-2 py-2 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all ${
                      pick === s.value
                        ? "border-2 text-ink-50"
                        : "border border-black/[0.08] text-ink-300 hover:text-ink-100"
                    }`}
                    style={pick === s.value ? { borderColor: s.color, background: `${s.color}15` } : undefined}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="eyebrow mb-2">note (optional, on-chain hash)</div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="240 chars max — pinned to feedback hash"
                className="input text-sm"
                maxLength={240}
              />
            </div>

            <div className="mt-4 rounded-xl border border-black/[0.06] bg-black/[0.025] p-3 text-[10px] font-mono text-ink-300">
              <div className="mb-1 eyebrow">feedback hash</div>
              <div className="break-all">{feedbackHash}</div>
            </div>

            <button
              disabled={!address || isPending}
              onClick={submit}
              className="btn-grad w-full mt-5"
            >
              {isPending ? "Signing…" : "Sign & Submit"}
            </button>
            {status && (
              <div className="mt-3 text-center text-xs font-mono text-ink-300">{status}</div>
            )}
            <p className="mt-3 text-xs text-ink-300 text-center">
              Writes one tx to <code className="font-mono">ReputationRegistry.giveFeedback</code>. Visible to anyone reading the agent's reputation.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-lg border border-black/[0.06] bg-black/[0.025] p-2">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 font-mono text-sm tabular text-ink-50">{v}</div>
    </div>
  );
}
