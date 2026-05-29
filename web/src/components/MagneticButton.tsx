"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { PropsWithChildren, useRef } from "react";

interface Props extends PropsWithChildren {
  className?: string;
  href?: string;
  onClick?: () => void;
  strength?: number;
}

/** Button or link that magnetically pulls toward the cursor on hover. */
export function MagneticButton({ children, className = "", href, onClick, strength = 0.35 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 240, damping: 18 });
  const sy = useSpring(y, { stiffness: 240, damping: 18 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  const Inner = (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
  if (href) return <a href={href}>{Inner}</a>;
  return Inner;
}
