"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { Atlas, abi } from "@/lib/contracts";
import { parseUnits, erc20Abi } from "viem";

export function DepositPanel() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const { writeContractAsync, isPending } = useWriteContract();
  const { data: shares } = useReadContract({
    address: Atlas.vault,
    abi: abi.vault as any,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  async function approveAndDeposit() {
    if (!address || !amount) return;
    const a = parseUnits(amount, 6);
    await writeContractAsync({ address: Atlas.base, abi: erc20Abi, functionName: "approve", args: [Atlas.vault, a] });
    await writeContractAsync({ address: Atlas.vault, abi: abi.vault as any, functionName: "deposit", args: [a, address] });
  }

  return (
    <div className="glass p-6">
      <div className="flex items-baseline justify-between">
        <div className="eyebrow">deposit · usdc</div>
        <span className="font-serif italic text-ink-300 text-sm">ERC-4626</span>
      </div>
      <div className="mt-2 font-display font-semibold text-2xl text-ink-50">Atlas Vault</div>
      <div className="mt-1 text-ink-300 text-xs">
        Your shares: <span className="tabular text-ink-100">{shares ? (Number(shares) / 1e6).toFixed(4) : "—"}</span>
      </div>

      <div className="mt-5 space-y-3">
        <div className="relative">
          <input
            className="input pr-16"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs eyebrow">USDC</span>
        </div>
        <div className="flex gap-2">
          {["100", "1000", "10000"].map((p) => (
            <button key={p} onClick={() => setAmount(p)} className="btn-outline text-xs flex-1">
              {p}
            </button>
          ))}
        </div>
        <button
          disabled={!address || isPending || !amount}
          onClick={approveAndDeposit}
          className="btn-grad w-full"
        >
          {isPending ? "Submitting…" : address ? "Approve & Deposit" : "Connect Wallet"}
        </button>
      </div>
    </div>
  );
}
