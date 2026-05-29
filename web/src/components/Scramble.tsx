"use client";

import { useEffect, useRef, useState } from "react";

const CHARS = "ATLAS01·9B8AFB·54F0D1·FF6FB5·RWA·MANTLE";

interface Props {
  text: string;
  className?: string;
  duration?: number;
  delay?: number;
}

/** Text scramble reveal — characters cycle through random glyphs then settle. */
export function Scramble({ text, className = "", duration = 1200, delay = 0 }: Props) {
  const [display, setDisplay] = useState(text);
  const startedAt = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      const start = performance.now();
      startedAt.current = start;
      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        const settledChars = Math.floor(text.length * progress);
        const out = text
          .split("")
          .map((ch, i) => {
            if (i < settledChars) return ch;
            if (ch === " ") return " ";
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("");
        setDisplay(out);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setDisplay(text);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, duration, delay]);

  return <span className={className}>{display}</span>;
}
