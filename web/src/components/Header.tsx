"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useReadContract } from "wagmi";
import { Atlas, abi } from "@/lib/contracts";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/app", label: "App" },
  { href: "/docs", label: "Docs" },
];

export function Header() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const { data: tvl } = useReadContract({
    address: Atlas.vault,
    abi: abi.vault as any,
    functionName: "totalAssets",
  });
  const { data: count } = useReadContract({
    address: Atlas.decisionLog,
    abi: abi.decisionLog as any,
    functionName: "decisionsCount",
  });
  const tvlNum = tvl ? Number(tvl as bigint) / 1e6 : null;

  return (
    <header className="sticky top-0 z-30">
      {/* Top scanline */}
      <div className="relative h-px bg-gradient-to-r from-transparent via-violet-glow/60 to-transparent" />
      {/* Glass strip */}
      <div className="relative backdrop-blur-2xl bg-white/70 border-b border-black/[0.06]">
        {/* Faint chromatic gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-glow/[0.06] via-transparent to-candy-pink/[0.06]" />
        <div className="relative max-w-6xl mx-auto px-6 py-3.5 flex items-center gap-4">
          {/* ── Brand ── */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-violet-glow/25 blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
              <Image
                src="/atlas_logo-Photoroom.png"
                alt="Atlas"
                width={48}
                height={48}
                priority
                className="relative h-12 w-12 object-contain drop-shadow-[0_2px_14px_rgba(107,91,230,0.45)]"
              />
            </div>
            <div className="leading-none flex flex-col">
              <div className="flex items-center gap-2">
                <Image
                  src="/atlas_name-Photoroom.png"
                  alt="ATLAS"
                  width={130}
                  height={32}
                  priority
                  className="h-[26px] w-auto object-contain logo-invert"
                />
                <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-ink-300 border border-black/[0.1] rounded-md px-1.5 py-0.5">
                  v0.1
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-300">
                <span className="text-mint-glow">●</span>
                <span>mantle · chain 5003</span>
              </div>
            </div>
          </Link>

          {/* ── Live ticker ── */}
          <div className="hidden xl:flex items-center gap-3 ml-3 pl-4 border-l border-black/[0.06] text-xs font-mono tabular">
            <TickerCell label="TVL" value={tvlNum !== null ? `$${tvlNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"} accent="text-ink-50" />
            <TickerCell label="DEC" value={count !== undefined ? String(count) : "—"} accent="text-violet-glow" />
            <TickerCell label="AGENT" value="#1" accent="text-mint-glow" />
          </div>

          {/* ── Nav (centered on wide) ── */}
          <nav className="hidden md:flex items-center mx-auto p-1 rounded-full border border-black/[0.06] bg-white/60 shadow-[0_8px_24px_-12px_rgba(15,10,36,0.18),inset_0_1px_0_rgba(255,255,255,0.6)]">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  className={`relative px-5 py-1.5 rounded-full text-sm font-medium tracking-tight transition-all duration-300 ${
                    active ? "text-ink-50" : "text-ink-300 hover:text-ink-100"
                  }`}
                >
                  {active && (
                    <span className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-glow/20 via-candy-pink/15 to-mint-glow/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_0_24px_-6px_rgba(107,91,230,0.5)]" />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ── Right cluster ── */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
                window.dispatchEvent(ev);
              }}
              className="hidden lg:inline-flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-mono text-ink-300 hover:text-ink-100 border border-black/[0.08] hover:border-black/15 rounded-lg bg-white/60 transition-colors"
              title="Open command palette"
            >
              <span>Search</span>
              <span className="flex items-center gap-0.5">
                <kbd className="px-1 border border-black/15 rounded text-[9px]">⌘</kbd>
                <kbd className="px-1 border border-black/15 rounded text-[9px]">K</kbd>
              </span>
            </button>
            <span className="hidden lg:inline-flex chip chip-ai">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-mint-glow opacity-60 animate-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-mint-glow shadow-[0_0_8px_#54F0D1]" />
              </span>
              LIVE
            </span>
            <ConnectButton.Custom>
              {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted }) => {
                if (!mounted) return null;
                const connected = account && chain;
                if (!connected)
                  return (
                    <button onClick={openConnectModal} className="btn-grad">
                      Connect
                    </button>
                  );
                if (chain.unsupported)
                  return (
                    <button
                      onClick={openChainModal}
                      className="btn-grad"
                      style={{ background: "linear-gradient(96deg,#FF5C7A,#FF6FB5)" }}
                    >
                      Wrong network
                    </button>
                  );
                return (
                  <div className="flex items-center gap-2">
                    <button onClick={openChainModal} className="btn-outline">
                      {chain.hasIcon && chain.iconUrl && (
                        <img src={chain.iconUrl} alt={chain.name} className="w-4 h-4 rounded-full" />
                      )}
                      {chain.name}
                    </button>
                    <button onClick={openAccountModal} className="btn-grad">
                      {account.displayName}
                    </button>
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    </header>
  );
}

function TickerCell({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300">{label}</span>
      <span className={accent}>{value}</span>
    </div>
  );
}
