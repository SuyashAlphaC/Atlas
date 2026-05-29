"use client";

import { useEffect, useRef } from "react";

/** Soft radial gradient that follows the cursor, GPU-only (transform). */
export function CursorAura() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;
    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const tick = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.transform = `translate3d(${cx - 250}px, ${cy - 250}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-0 w-[500px] h-[500px] rounded-full"
      style={{
        background:
          "radial-gradient(circle at center, rgba(155,138,251,0.18), rgba(255,111,181,0.07) 40%, transparent 70%)",
        filter: "blur(28px)",
        mixBlendMode: "screen",
        transform: "translate3d(-9999px,-9999px,0)",
      }}
    />
  );
}
