"use client";

import { Hero } from "./Hero";
import { PortfolioPanel } from "./PortfolioPanel";
import { AllocationPanel } from "./AllocationPanel";
import { DecisionTimeline } from "./DecisionTimeline";
import { ReputationPanel } from "./ReputationPanel";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { DepositPanel } from "./DepositPanel";
import { FireRebalanceButton } from "./FireRebalanceButton";
import { AppFooter } from "./AppFooter";
import { MarqueeTicker } from "./MarqueeTicker";
import { TiltCard } from "./TiltCard";
import { Reveal } from "./MotionPrimitives";

export function Dashboard() {
  return (
    <>
      <MarqueeTicker />
      <div className="max-w-6xl mx-auto px-6 pt-2 pb-24 relative z-10">
        <Hero />
        <div className="mt-10 grid grid-cols-12 gap-5">
          <section className="col-span-12 lg:col-span-8 grid grid-cols-1 gap-5">
            <Reveal>
              <TiltCard><PortfolioPanel /></TiltCard>
            </Reveal>
            <Reveal delay={0.05}>
              <TiltCard><AllocationPanel /></TiltCard>
            </Reveal>
            <Reveal delay={0.1}>
              <TiltCard><FireRebalanceButton /></TiltCard>
            </Reveal>
            <Reveal delay={0.15}>
              <TiltCard><DecisionTimeline /></TiltCard>
            </Reveal>
          </section>
          <aside className="col-span-12 lg:col-span-4 grid grid-cols-1 gap-5">
            <Reveal delay={0.05}>
              <TiltCard><DepositPanel /></TiltCard>
            </Reveal>
            <Reveal delay={0.1}>
              <TiltCard><ReputationPanel /></TiltCard>
            </Reveal>
            <Reveal delay={0.15}>
              <TiltCard><LeaderboardPanel /></TiltCard>
            </Reveal>
          </aside>
        </div>
      </div>
      <AppFooter />
    </>
  );
}
