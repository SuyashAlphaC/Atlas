"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { PropsWithChildren, useRef } from "react";

/** Card that subtly tilts toward the cursor. Adds a soft sheen highlight
 *  that follows the pointer. GPU-only — transforms + opacity, no layout. */
export function TiltCard({
  children,
  className = "",
  max = 6,
  glare = true,
}: PropsWithChildren<{ className?: string; max?: number; glare?: boolean }>) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const px = useMotionValue(50);
  const py = useMotionValue(50);

  const rx = useSpring(useTransform(y, [-1, 1], [max, -max]), { stiffness: 200, damping: 22 });
  const ry = useSpring(useTransform(x, [-1, 1], [-max, max]), { stiffness: 200, damping: 22 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    x.set(nx);
    y.set(ny);
    px.set(((e.clientX - r.left) / r.width) * 100);
    py.set(((e.clientY - r.top) / r.height) * 100);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      className={`relative ${className}`}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{
            background: useTransform(
              [px, py],
              ([X, Y]: number[]) =>
                `radial-gradient(220px circle at ${X}% ${Y}%, rgba(255,255,255,0.10), transparent 60%)`
            ),
            mixBlendMode: "screen",
          }}
        />
      )}
    </motion.div>
  );
}
