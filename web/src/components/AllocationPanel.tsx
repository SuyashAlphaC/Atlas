"use client";

import { RadialAllocation } from "./RadialAllocation";

export function AllocationPanel() {
  return (
    <div className="glass p-7 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl bg-violet-glow/15 pointer-events-none" />
      <div className="flex items-baseline justify-between relative">
        <div>
          <div className="eyebrow">current allocation</div>
          <h2 className="font-display font-semibold text-2xl mt-1 tracking-tight">Risk universe</h2>
        </div>
        <span className="chip">on-chain · live</span>
      </div>
      <div className="mt-6 relative">
        <RadialAllocation />
      </div>
    </div>
  );
}
