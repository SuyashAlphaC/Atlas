"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Reveal } from "./MotionPrimitives";
import { MarqueeTicker } from "./MarqueeTicker";
import { Scramble } from "./Scramble";
import { MagneticButton } from "./MagneticButton";
import { TiltCard } from "./TiltCard";

const AtlasOrb = dynamic(() => import("./AtlasOrb").then((m) => m.AtlasOrb), { ssr: false });

const SPONSORS: { name: string; src: string; preserveColor?: boolean }[] = [
  { name: "Mantle", src: "/mantle-Photoroom.png" , preserveColor: true},
  { name: "Bybit", src: "/bybit-Photoroom.png" , preserveColor: true},
  { name: "Byreal", src: "/byreal-Photoroom.png" , preserveColor: false},
  { name: "BGA", src: "/BGA.png" , preserveColor: true},
  { name: "Tencent Cloud", src: "/tencent_cloud-Photoroom.png" , preserveColor: true},
  { name: "Mirana", src: "/mirana-Photoroom.png" , preserveColor: true},
  { name: "Nansen", src: "/nansen-Photoroom.png" , preserveColor: true},
  { name: "Z.AI", src: "/zai-Photoroom.png" , preserveColor: true},
];

const FEATURES = [
  {
    eyebrow: "Identity",
    title: "ERC-8004 Trustless Agents",
    body: "Atlas registers itself as an ERC-721 identity NFT with on-chain metadata (model, skills). Hot-wallet binding via EIP-712 means execution authority is delegable.",
    accent: "#9B8AFB",
  },
  {
    eyebrow: "Memory",
    title: "IPFS-anchored rationale",
    body: "Every rebalance pins a structured decision payload (regime, factor breakdown, macro tilt) to IPFS. The CID is recorded on Mantle. Auditors replay end-to-end.",
    accent: "#FF6FB5",
  },
  {
    eyebrow: "Vault",
    title: "ERC-4626 RWA strategy",
    body: "USDC-denominated vault, delta-driven rebalances across Ondo USDY, Ethena USDe, Mantle mETH. Guardrails: min-cash floor + max-move cap. AccessControl-gated.",
    accent: "#54F0D1",
  },
  {
    eyebrow: "Reputation",
    title: "Self-grading on-chain",
    body: "Daily Sharpe + max-drawdown computed off-chain, written to ReputationRegistry under tagged feedback. Composable: any other contract can read the agent's track record.",
    accent: "#FFD580",
  },
  {
    eyebrow: "Cross-chain",
    title: "Byreal mirror + hedge",
    body: "Mantle is the primary venue. Byreal Skills CLI mirrors a configurable slice to Solana CLMM for LP carry; Byreal Perps shorts hedge when regime turns risk-off.",
    accent: "#FFB58B",
  },
  {
    eyebrow: "Telemetry",
    title: "Live-stream ready",
    body: "Each decision emits an indexed event with the IPFS CID. Decision timeline + Phase-2 Beat-Atlas leaderboard surface every action in real time during the broadcast.",
    accent: "#C7BCFF",
  },
];

/** Bento grid layout — asymmetric column/row spans per card */
const BENTO_SPANS = [
  "md:col-span-3 md:row-span-2",
  "md:col-span-3 md:row-span-1",
  "md:col-span-2 md:row-span-1",
  "md:col-span-2 md:row-span-2",
  "md:col-span-2 md:row-span-1",
  "md:col-span-3 md:row-span-1",
];

const HOW = [
  {
    n: "01",
    title: "Signals",
    body: "Three pipelines fuse into a single tilt: Gaussian HMM regime, cross-sectional factor model (yield / duration / liquidity / credit), and a Claude macro narrative.",
  },
  {
    n: "02",
    title: "Decision",
    body: "Allocation policy mixes signals with risk caps and smoothing, emits target weights in basis points. Rationale gets serialized + pinned to IPFS.",
  },
  {
    n: "03",
    title: "Execution",
    body: "Vault.rebalance(weights, hash, cid) lands in a single Mantle tx. DecisionLog commits. ERC-8004 reputation accrues. Cross-chain mirror fires if enabled.",
  },
];

export function Landing() {
  return (
    <main className="relative">
      <MarqueeTicker />

      {/* ───── HERO ───── */}
      <section className="relative pt-16 pb-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-12 gap-6 items-center">
          <div className="col-span-12 lg:col-span-7">
            <Reveal>
              <div className="eyebrow mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-mint-glow shadow-[0_0_10px_#54F0D1]" />
                erc-8004 · mantle network · turing test 2026
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="font-display font-bold tracking-[-0.045em] leading-[0.95] max-w-full">
                <span
                  className="block text-grad whitespace-nowrap"
                  style={{ fontSize: "clamp(42px, 6.4vw, 88px)" }}
                >
                  <Scramble text="Autonomous" duration={900} />
                </span>
                <span
                  className="block text-ink-50 whitespace-nowrap"
                  style={{ fontSize: "clamp(42px, 6.4vw, 88px)" }}
                >
                  <Scramble text="RWA Alpha," duration={900} delay={180} />
                </span>
                <span
                  className="block font-serif italic text-ink-200 whitespace-nowrap"
                  style={{ fontSize: "clamp(36px, 5.2vw, 74px)" }}
                >
                  on-chain.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.25}>
              <p className="mt-8 text-ink-300 max-w-xl leading-relaxed text-base md:text-lg">
                Atlas is an AI fund manager that allocates real-world assets on Mantle.
                Every decision is signed by the agent, anchored to IPFS, and accrued to an
                <span className="text-ink-50 font-semibold"> ERC-8004</span> reputation NFT.
              </p>
            </Reveal>
            <Reveal delay={0.32}>
              <div className="mt-9 flex flex-wrap gap-3">
                <MagneticButton href="/app">
                  <span className="btn-grad text-base px-6 py-3 inline-flex">Launch App ↗</span>
                </MagneticButton>
                <MagneticButton href="/docs" strength={0.25}>
                  <span className="btn-outline inline-flex">Read Docs</span>
                </MagneticButton>
                <MagneticButton href="https://sepolia.mantlescan.xyz/address/0x5c2CE9b80981b3C1C3af8901C3A9F760d5421335" strength={0.25}>
                  <span className="btn-outline inline-flex">View Vault ↗</span>
                </MagneticButton>
              </div>
            </Reveal>
            <Reveal delay={0.4}>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="chip">primary · ai × rwa</span>
                <span className="chip">secondary · ai alpha & data</span>
                <span className="chip">byreal · cross-chain</span>
              </div>
            </Reveal>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.55, rotate: -18 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.8, delay: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            className="col-span-12 lg:col-span-5 h-[480px] md:h-[620px] relative"
          >
            <AtlasOrb className="absolute inset-0" />
            {/* corner brackets for "interface" feel */}
            <CornerBrackets />
          </motion.div>
        </div>
      </section>

      <div className="section-divider max-w-6xl mx-auto px-6" />

      {/* ───── HOW IT WORKS ───── */}
      <section className="relative py-16">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="eyebrow">how atlas works</div>
            <h2 className="font-display font-bold tracking-[-0.03em] mt-2 text-ink-50" style={{ fontSize: "clamp(36px, 4.6vw, 56px)" }}>
              Three pipelines.<br />
              <span className="font-serif italic text-ink-200">one tx.</span>
            </h2>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
            {HOW.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.08}>
                <TiltCard className="h-full">
                  <div className="glass p-6 h-full">
                    <div className="font-mono text-violet-glow text-xs">{step.n}</div>
                    <div className="font-display font-semibold text-2xl mt-2 text-ink-50">{step.title}</div>
                    <p className="mt-3 text-ink-300 leading-relaxed">{step.body}</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FEATURE GRID ───── */}
      <section className="relative py-16">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="eyebrow">verifiable by default</div>
            <h2 className="font-display font-bold tracking-[-0.03em] mt-2 text-ink-50" style={{ fontSize: "clamp(36px, 4.6vw, 56px)" }}>
              Every claim,<br />
              <span className="text-grad">replayable.</span>
            </h2>
          </Reveal>
          {/* Bento grid — asymmetric */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-[180px]">
            {FEATURES.map((f, i) => {
              const span = BENTO_SPANS[i] ?? "md:col-span-2 md:row-span-1";
              return (
                <Reveal key={f.title} delay={i * 0.04} className={span}>
                  <TiltCard className="h-full" max={4}>
                    <div className="glass p-6 h-full relative overflow-hidden flex flex-col">
                      <div
                        className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-40 transition-opacity hover:opacity-60"
                        style={{ background: f.accent }}
                      />
                      <div className="eyebrow" style={{ color: f.accent }}>
                        {f.eyebrow}
                      </div>
                      <div className="font-display font-semibold text-xl mt-2 text-ink-50 tracking-tight">{f.title}</div>
                      <p className="mt-3 text-ink-300 leading-relaxed text-sm flex-1">{f.body}</p>
                      <div className="mt-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───── SPONSORS ───── */}
      <section className="relative py-16">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="eyebrow text-center">backed by the leaders defining ai × on-chain finance</div>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
            {SPONSORS.map((s, i) => (
              <Reveal key={s.name} delay={i * 0.03}>
                <div className="sponsor-tile flex items-center justify-center px-8 py-10 h-44 group relative overflow-hidden">
                  <div className="pointer-events-none absolute -top-14 -right-14 w-36 h-36 rounded-full blur-3xl bg-violet-glow/0 group-hover:bg-violet-glow/22 transition-all duration-500" />
                  <div className="pointer-events-none absolute -bottom-14 -left-14 w-36 h-36 rounded-full blur-3xl bg-candy-pink/0 group-hover:bg-candy-pink/18 transition-all duration-500" />
                  <Image
                    src={s.src}
                    alt={s.name}
                    width={320}
                    height={128}
                    className= {`relative max-h-35 max-w-[110%] w-auto object-contain transition-transform duration-300 group-hover:scale-[1.08] ${                                                                               
                          s.preserveColor ? "logo-preserve" : "logo-invert"                                                                                                                                                   
                          }`}   
                  />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="relative py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="font-display font-bold tracking-[-0.03em] text-ink-50" style={{ fontSize: "clamp(40px, 6vw, 80px)" }}>
              See Atlas <span className="font-serif italic text-grad">decide</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 text-ink-300 max-w-xl mx-auto">
              Deposit USDC. Watch the agent commit allocation decisions to Mantle. Click any decision to read the
              Claude-generated rationale on IPFS.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/app" className="btn-grad text-base px-6 py-3">
                Launch Dashboard ↗
              </Link>
              <a
                className="btn-outline"
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
              >
                Open Source ↗
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function CornerBrackets() {
  return (
    <>
      {(["tl", "tr", "bl", "br"] as const).map((k) => {
        const pos: Record<string, string> = {
          tl: "top-0 left-0",
          tr: "top-0 right-0 rotate-90",
          bl: "bottom-0 left-0 -rotate-90",
          br: "bottom-0 right-0 rotate-180",
        };
        return (
          <svg
            key={k}
            className={`absolute ${pos[k]} pointer-events-none`}
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            aria-hidden
          >
            <path d="M1 22 V1 H22" stroke="#9B8AFB" strokeOpacity="0.45" strokeWidth="1.3" />
          </svg>
        );
      })}
    </>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 mt-8">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-3">
            <Image
              src="/atlas_logo-Photoroom.png"
              alt="Atlas"
              width={40}
              height={40}
              className="h-10 w-10 object-contain drop-shadow-[0_2px_10px_rgba(107,91,230,0.4)]"
            />
            <Image
              src="/atlas_name-Photoroom.png"
              alt="ATLAS"
              width={120}
              height={28}
              className="h-7 w-auto object-contain logo-invert"
            />
            <span className="font-serif italic text-ink-300">on Mantle</span>
          </div>
          <p className="mt-3 text-ink-300 max-w-md">
            Submitted to the Turing Test Hackathon 2026. Open source. Powered by Mantle, IPFS, and Claude.
          </p>
        </div>
        <div>
          <div className="eyebrow mb-3">Product</div>
          <ul className="space-y-2 text-ink-300">
            <li><Link href="/app">Dashboard</Link></li>
            <li><Link href="/docs">Docs</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-3">On-chain</div>
          <ul className="space-y-2 text-ink-300 break-all">
            <li>
              <a target="_blank" rel="noreferrer" href="https://sepolia.mantlescan.xyz/address/0x5c2CE9b80981b3C1C3af8901C3A9F760d5421335">
                Vault ↗
              </a>
            </li>
            <li>
              <a target="_blank" rel="noreferrer" href="https://sepolia.mantlescan.xyz/address/0x1cfA2B9fAEAdE37950b9742Da78216CB43EA18c5">
                Identity ↗
              </a>
            </li>
            <li>
              <a target="_blank" rel="noreferrer" href="https://sepolia.mantlescan.xyz/address/0xe2d8cDF98F611Df9D87861130B4C19Da45b4b455">
                Reputation ↗
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-ink-300">
          <span>© 2026 Atlas. MIT.</span>
          <span className="font-mono">v0.1.0 · mantle-sepolia · chain-5003</span>
        </div>
      </div>
    </footer>
  );
}
