import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ink scale runs *dark on light* now — `ink-50` is the darkest "primary" text.
        ink: {
          0: "#FFFFFF",
          50: "#0F0A24",
          100: "#2A2440",
          200: "#4A4060",
          300: "#6C6080",
          400: "#9C92B5",
          500: "#BBB2D0",
        },
        cosmic: {
          900: "#F4F0FB",
          850: "#ECE6F8",
          800: "#E3DCF4",
          700: "#D9D0EF",
          600: "#CFC4EA",
          500: "#BFB1E0",
        },
        violet: {
          glow: "#6B5BE6",
          deep: "#5141C9",
          ink: "#2E2680",
        },
        candy: {
          pink: "#E5478F",
          peach: "#FF9468",
        },
        mint: {
          glow: "#1FB89A",
          deep: "#0F8870",
        },
        warn: "#C68500",
        danger: "#E0455F",
        mute: "#6C6080",
        line: "rgba(15,10,36,0.08)",
        panel: "rgba(255,255,255,0.7)",
        bg: "#F4F0FB",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui"],
        sans: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        serif: ['"Newsreader"', "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        glass: "0 30px 80px -30px rgba(107,91,230,0.28), 0 1px 0 rgba(255,255,255,0.85) inset",
        glow: "0 0 60px -10px rgba(107,91,230,0.45)",
        pop: "0 12px 36px -12px rgba(15,10,36,0.18)",
      },
      borderRadius: {
        xl2: "20px",
        xl3: "28px",
      },
      keyframes: {
        drift: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(40px,-30px) scale(1.05)" },
        },
        drift2: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(-30px,40px) scale(0.95)" },
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        drift: "drift 28s ease-in-out infinite",
        drift2: "drift2 36s ease-in-out infinite",
        riseIn: "riseIn .6s cubic-bezier(.2,.7,.2,1) both",
        shimmer: "shimmer 3.4s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
