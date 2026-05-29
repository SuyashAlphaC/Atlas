"use client";

/** Custom Atlas monogram — geometric A inscribed in a navigator's compass ring.
 *  Two angled apex strokes form the "A", a horizontal data crossbar interrupts
 *  with a node-mark in the middle, and an orbital arc traces the outer edge.
 *  Built so the wordmark beside it lives at a refined typographic scale.
 */
export function AtlasGlyph({ size = 36, className = "" }: { size?: number; className?: string }) {
  const id = "atlas-glyph"; // unique enough for one nav instance
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C7BCFF" />
          <stop offset="45%" stopColor="#9B8AFB" />
          <stop offset="85%" stopColor="#FF6FB5" />
          <stop offset="100%" stopColor="#54F0D1" />
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9B8AFB" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FF6FB5" stopOpacity="0.06" />
        </linearGradient>
        <radialGradient id={`${id}-node`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#9B8AFB" />
        </radialGradient>
      </defs>

      {/* Outer orbital ring */}
      <circle cx="24" cy="24" r="21" stroke={`url(#${id}-stroke)`} strokeWidth="1.2" opacity="0.7" />
      {/* Inner softer disc for depth */}
      <circle cx="24" cy="24" r="16" fill={`url(#${id}-fill)`} />

      {/* Orbit notches (compass ticks) */}
      <g stroke={`url(#${id}-stroke)`} strokeWidth="1.4" strokeLinecap="round" opacity="0.85">
        <line x1="24" y1="2" x2="24" y2="6" />
        <line x1="24" y1="42" x2="24" y2="46" />
        <line x1="2" y1="24" x2="6" y2="24" />
        <line x1="42" y1="24" x2="46" y2="24" />
      </g>

      {/* The A apex strokes */}
      <path
        d="M14 36 L24 10 L34 36"
        stroke={`url(#${id}-stroke)`}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Crossbar interrupted by node */}
      <line x1="18" y1="27" x2="21.5" y2="27" stroke={`url(#${id}-stroke)`} strokeWidth="2" strokeLinecap="round" />
      <line x1="26.5" y1="27" x2="30" y2="27" stroke={`url(#${id}-stroke)`} strokeWidth="2" strokeLinecap="round" />

      {/* Central node */}
      <circle cx="24" cy="27" r="2.6" fill={`url(#${id}-node)`} />
      <circle cx="24" cy="27" r="2.6" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.7" />
    </svg>
  );
}
