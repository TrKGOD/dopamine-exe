"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { RARITY_META } from "@/lib/game/config";
import type { Rarity } from "@/lib/game/types";

export function RarityTag({ rarity, className = "" }: { rarity: Rarity; className?: string }) {
  const m = RARITY_META[rarity];
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-px font-pixel text-sm uppercase leading-none tracking-wider ${className}`} style={{ color: m.color, borderColor: m.color + "66", background: m.color + "14" }}>
      {rarity === "mythical" ? <span className="rainbow-text">{m.label}</span> : m.label}
    </span>
  );
}

export function Bar({ value, max, color = "#39ff88", label }: { value: number; max: number; color?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} aria-label={label}>
      <span style={{ width: `${pct}%`, background: color, boxShadow: `0 0 10px ${color}` }} />
    </div>
  );
}

export function SectionTitle({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && <div className="label">{kicker}</div>}
        <h1 className="glitch h-display text-3xl text-white md:text-5xl" data-text={title}>
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", k);
    setTimeout(() => ref.current?.querySelector<HTMLElement>("[data-autofocus], button, input")?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", k);
      prev?.focus?.();
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`card-hi safe-bottom max-h-[90dvh] w-full overflow-y-auto rounded-b-none p-5 sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
            initial={{ y: 40, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="h-display text-xl text-white">{title}</h2>
              <button className="btn-ghost h-9 w-9 !p-0" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function EmptyState({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center">
      <div className="text-5xl">{emoji}</div>
      <div className="h-display text-lg text-white">{title}</div>
      {children && <div className="text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, color = "#fff" }: { label: string; value: ReactNode; color?: string }) {
  return (
    <div className="rounded-xl border border-line bg-black/30 px-3 py-2">
      <div className="label !text-sm">{label}</div>
      <div className="font-display text-lg" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
