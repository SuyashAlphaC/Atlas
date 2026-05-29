"use client";

/** Multi-layer animated gradient mesh that drifts behind everything.
 *  Sits between the static `mesh-bg` and the orbs in BackgroundFX. */
export function Aurora() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-[1] w-full h-full opacity-50 mix-blend-screen"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="aurora-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
        <radialGradient id="ag1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9B8AFB" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#9B8AFB" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ag2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF6FB5" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FF6FB5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ag3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#54F0D1" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#54F0D1" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g filter="url(#aurora-blur)">
        <circle cx="20%" cy="30%" r="220" fill="url(#ag1)">
          <animate attributeName="cx" values="20%;25%;15%;20%" dur="22s" repeatCount="indefinite" />
          <animate attributeName="cy" values="30%;25%;35%;30%" dur="22s" repeatCount="indefinite" />
        </circle>
        <circle cx="80%" cy="70%" r="260" fill="url(#ag2)">
          <animate attributeName="cx" values="80%;75%;82%;80%" dur="28s" repeatCount="indefinite" />
          <animate attributeName="cy" values="70%;75%;65%;70%" dur="28s" repeatCount="indefinite" />
        </circle>
        <circle cx="60%" cy="20%" r="180" fill="url(#ag3)">
          <animate attributeName="cx" values="60%;55%;65%;60%" dur="30s" repeatCount="indefinite" />
          <animate attributeName="cy" values="20%;18%;22%;20%" dur="30s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}
