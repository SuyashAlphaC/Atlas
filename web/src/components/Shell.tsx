"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

const ClientShell = dynamic(() => import("./ClientShell"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-ink-300 font-mono text-xs tracking-[0.2em] uppercase animate-pulse">
        Booting Atlas…
      </div>
    </main>
  ),
});

export function Shell({ children }: { children: ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
