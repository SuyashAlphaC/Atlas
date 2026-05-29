"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Reveal } from "./MotionPrimitives";

const AtlasOrb = dynamic(() => import("./AtlasOrb").then((m) => m.AtlasOrb), { ssr: false });

export function Hero() {
  return (
    <section className="relative pt-12 pb-2">
      <div className="grid grid-cols-12 gap-6 items-center">
        <div className="col-span-12 lg:col-span-7">
          <Reveal>
            <div className="eyebrow mb-4">erc-8004 · agent-id #1 · mantle-sepolia</div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="font-display font-bold tracking-[-0.04em] leading-[0.95] max-w-full">
              <span className="block text-grad whitespace-nowrap" style={{ fontSize: "clamp(38px, 5.6vw, 78px)" }}>
                Autonomous
              </span>
              <span className="block text-ink-50 whitespace-nowrap" style={{ fontSize: "clamp(38px, 5.6vw, 78px)" }}>
                RWA Alpha,
              </span>
              <span className="block font-serif italic text-ink-200 whitespace-nowrap" style={{ fontSize: "clamp(32px, 4.6vw, 64px)" }}>
                on-chain.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 text-ink-300 max-w-xl leading-relaxed text-base md:text-lg">
              Atlas is an AI fund manager that allocates real-world assets on Mantle.
              Every decision is signed by the agent, anchored to IPFS, and accrued
              to an <span className="text-ink-50 font-semibold">ERC-8004</span> reputation NFT.
            </p>
          </Reveal>
          <Reveal delay={0.22}>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="chip">primary · ai × rwa</span>
              <span className="chip">secondary · ai alpha & data</span>
              <span className="chip">byreal · cross-chain</span>
            </div>
          </Reveal>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.4, delay: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
          className="col-span-12 lg:col-span-5 h-[440px] md:h-[560px] relative flex items-center justify-center"
        >
          <AtlasOrb className="absolute inset-0 w-full h-full" />
        </motion.div>
      </div>
      <hr className="hr-grad mt-8" />
    </section>
  );
}
