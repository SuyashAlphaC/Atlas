"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Atlas } from "@/lib/contracts";

interface Action {
  id: string;
  label: string;
  hint?: string;
  group: string;
  glyph?: string;
  onSelect: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedIdx, setFocusedIdx] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const actions: Action[] = useMemo(() => [
    { id: "n-home", group: "navigate", glyph: "→", label: "Go to Home", onSelect: () => router.push("/") },
    { id: "n-app", group: "navigate", glyph: "→", label: "Go to Dashboard", onSelect: () => router.push("/app") },
    { id: "n-docs", group: "navigate", glyph: "→", label: "Go to Docs", onSelect: () => router.push("/docs") },

    { id: "x-vault", group: "mantlescan", glyph: "↗", label: "Open Vault on Mantlescan", onSelect: () => open_(`https://sepolia.mantlescan.xyz/address/${Atlas.vault}`) },
    { id: "x-identity", group: "mantlescan", glyph: "↗", label: "Open Identity Registry", onSelect: () => open_(`https://sepolia.mantlescan.xyz/address/${Atlas.identity}`) },
    { id: "x-reputation", group: "mantlescan", glyph: "↗", label: "Open Reputation Registry", onSelect: () => open_(`https://sepolia.mantlescan.xyz/address/${Atlas.reputation}`) },
    { id: "x-decisions", group: "mantlescan", glyph: "↗", label: "Open Decision Log", onSelect: () => open_(`https://sepolia.mantlescan.xyz/address/${Atlas.decisionLog}`) },
    { id: "x-base", group: "mantlescan", glyph: "↗", label: "Open Base Asset (USDC)", onSelect: () => open_(`https://sepolia.mantlescan.xyz/address/${Atlas.base}`) },

    { id: "c-vault", group: "copy", glyph: "⎘", label: "Copy vault address", onSelect: () => copy(Atlas.vault) },
    { id: "c-identity", group: "copy", glyph: "⎘", label: "Copy identity address", onSelect: () => copy(Atlas.identity) },
    { id: "c-reputation", group: "copy", glyph: "⎘", label: "Copy reputation address", onSelect: () => copy(Atlas.reputation) },
    { id: "c-decisions", group: "copy", glyph: "⎘", label: "Copy decision log address", onSelect: () => copy(Atlas.decisionLog) },

    { id: "d-faucet", group: "actions", glyph: "•", label: "Mantle Sepolia faucet", onSelect: () => open_("https://faucet.sepolia.mantle.xyz/") },
    { id: "d-explorer", group: "actions", glyph: "•", label: "Mantle Sepolia block explorer", onSelect: () => open_("https://sepolia.mantlescan.xyz") },
    { id: "d-pinata", group: "actions", glyph: "•", label: "Pinata IPFS gateway", onSelect: () => open_("https://gateway.pinata.cloud") },
  ], [router]);

  const filtered = useMemo(() => {
    if (!query) return actions;
    const q = query.toLowerCase();
    return actions.filter((a) =>
      a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => setFocusedIdx(0), [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const action = filtered[focusedIdx];
        if (action) {
          action.onSelect();
          setOpen(false);
          setQuery("");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, focusedIdx]);

  const grouped: Record<string, { action: Action; idx: number }[]> = {};
  let running = 0;
  for (const a of filtered) {
    grouped[a.group] = grouped[a.group] || [];
    grouped[a.group].push({ action: a, idx: running++ });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-ink-50/30 backdrop-blur-xl" />
          <motion.div
            initial={{ y: -16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
            className="relative w-full max-w-xl rounded-2xl border border-black/[0.08] bg-white/95 backdrop-blur-2xl shadow-[0_40px_120px_-30px_rgba(107,91,230,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-black/[0.06]">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">⌕</span>
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands · navigate · open · copy"
                  className="w-full bg-transparent pl-9 pr-3 py-2.5 text-base text-ink-50 placeholder:text-ink-400 outline-none font-display"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-ink-300 border border-black/10 rounded px-1.5 py-0.5">
                  esc
                </kbd>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {Object.keys(grouped).length === 0 && (
                <div className="text-ink-300 text-sm py-12 text-center font-mono">No matches.</div>
              )}
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group} className="mb-1">
                  <div className="eyebrow px-3 pt-2 pb-1">{group}</div>
                  {items.map(({ action: a, idx }) => {
                    const active = idx === focusedIdx;
                    return (
                      <button
                        key={a.id}
                        onMouseEnter={() => setFocusedIdx(idx)}
                        onClick={() => {
                          a.onSelect();
                          setOpen(false);
                          setQuery("");
                        }}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          active
                            ? "bg-gradient-to-r from-violet-glow/15 to-candy-pink/8 text-ink-50 border border-violet-glow/30"
                            : "text-ink-200 hover:bg-white/[0.03] border border-transparent"
                        }`}
                      >
                        <span className="text-mint-glow text-sm font-mono w-5">{a.glyph}</span>
                        <span className="flex-1 text-sm">{a.label}</span>
                        {active && (
                          <kbd className="text-[10px] font-mono text-ink-200 border border-black/10 rounded px-1.5 py-0.5">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="border-t border-black/[0.06] px-3 py-2 flex items-center justify-between text-[10px] font-mono text-ink-300">
              <div className="flex items-center gap-3">
                <span><kbd className="px-1 py-0.5 border border-black/10 rounded">↑</kbd> <kbd className="px-1 py-0.5 border border-black/10 rounded">↓</kbd> navigate</span>
                <span><kbd className="px-1 py-0.5 border border-black/10 rounded">↵</kbd> select</span>
              </div>
              <span>v0.1 · atlas command palette</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function open_(url: string) {
  window.open(url, "_blank", "noopener");
}
function copy(text: string) {
  navigator.clipboard?.writeText(text);
}
