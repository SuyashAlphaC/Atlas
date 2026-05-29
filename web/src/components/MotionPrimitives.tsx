"use client";

import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { PropsWithChildren, useRef } from "react";

/** Fade + rise on scroll-into-view. */
export function Reveal({ children, delay = 0, className = "" }: PropsWithChildren<{ delay?: number; className?: string }>) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Card that lifts + glows on hover via framer-motion spring. */
export function GlassCard({ children, className = "", as = "div" }: PropsWithChildren<{ className?: string; as?: any }>) {
  const MotionTag = motion[as as "div"] ?? motion.div;
  return (
    <MotionTag
      whileHover={{ y: -3, transition: { type: "spring", stiffness: 320, damping: 24 } }}
      className={`glass ${className}`}
    >
      {children}
    </MotionTag>
  );
}

/** Parallax wrapper — translates Y based on page scroll progress. */
export function Parallax({ children, range = 60 }: PropsWithChildren<{ range?: number }>) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-range / 2, range / 2]);
  return (
    <div ref={ref} className="relative">
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

export function useCounter(value: number, duration = 1.2): MotionValue<number> | number {
  // Returns the value as-is; CountUp uses framer-motion for actual animation.
  return value;
}
