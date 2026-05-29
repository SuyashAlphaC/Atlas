"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

interface Props {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

export function CountUp({ value, decimals = 0, prefix = "", suffix = "", duration = 1.4, className = "" }: Props) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (latest) =>
    `${prefix}${Number(latest).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`
  );

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.2, 0.7, 0.2, 1] });
    return () => controls.stop();
  }, [value, duration, mv]);

  return <motion.span className={className}>{display}</motion.span>;
}
