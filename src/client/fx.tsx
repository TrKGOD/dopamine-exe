"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CATEGORY_META } from "@/lib/content/posts";
import { ACHIEVEMENTS, CHAOS_EVENTS, RARITY_META, type ChaosId } from "@/lib/game/config";
import { MUTATION_COMBOS, getItem } from "@/lib/game/items";
import type { GameEffect, Rarity } from "@/lib/game/types";
import { useSettings } from "./settings";
import { configureSound, play } from "./sound";

type Tone = "info" | "good" | "bad" | "weird" | "gold";
interface Toast { id: number; text: string; tone: Tone; icon?: string }
interface Pop { id: number; text: string; color: string }
interface Reveal { id: number; itemId: string; source: string; dupeTokens?: number }
interface Celebration { id: number; title: string; subtitle: string; kind: "level" | "evolve" | "combo" }

interface FxCtx {
  toast: (text: string, tone?: Tone, icon?: string) => void;
  pop: (text: string, color?: string) => void;
  burst: (x?: number, y?: number, colors?: string[], count?: number) => void;
  burstAt: (el: Element | null, colors?: string[], count?: number) => void;
  reveal: (itemId: string, source: string, dupeTokens?: number) => void;
  process: (effects: GameEffect[]) => void;
  speech: { text: string; id: number } | null;
  say: (text: string) => void;
  sfx: typeof play;
}

const Ctx = createContext<FxCtx | null>(null);
let uid = 0;

const TONE_STYLE: Record<Tone, string> = {
  info: "border-ice/50 text-ice",
  good: "border-neon/60 text-neon",
  bad: "border-hot/60 text-hot",
  weird: "border-volt/60 text-volt",
  gold: "border-[#ffb02e]/70 text-[#ffb02e]",
};

const BIG_SOURCES = ["Roulette", "Capsule", "RARE MUTATION"];

export function FxProvider({ children }: { children: ReactNode }) {
  const { settings, reducedMotion } = useSettings();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [reveals, setReveals] = useState<Reveal[]>([]);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [speech, setSpeech] = useState<{ text: string; id: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[]>([]);
  const raf = useRef<number | null>(null);

  useEffect(() => configureSound(settings.sound, settings.volume), [settings.sound, settings.volume]);

  const toast = useCallback((text: string, tone: Tone = "info", icon?: string) => {
    const id = ++uid;
    setToasts((t) => [...t.slice(-3), { id, text, tone, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "bad" ? 3500 : 3000);
  }, []);

  const pop = useCallback((text: string, color = "#39ff88") => {
    const id = ++uid;
    setPops((p) => [...p.slice(-4), { id, text, color }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1400);
  }, []);

  // ── particle system (single canvas, single rAF loop, stops when idle) ──
  const loop = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const dpr = window.devicePixelRatio || 1;
    particles.current = particles.current.filter((p) => p.life > 0);
    for (const p of particles.current) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.vx *= 0.99;
      p.life -= 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 30));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x * dpr, p.y * dpr, p.size * dpr, p.size * dpr);
    }
    ctx.globalAlpha = 1;
    raf.current = particles.current.length ? requestAnimationFrame(loop) : null;
  }, []);

  const burst = useCallback(
    (x?: number, y?: number, colors = ["#39ff88", "#a855ff", "#ff2e97", "#e8ff3a", "#2ef2ff"], count = 40) => {
      if (reducedMotion) return;
      const c = canvasRef.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      if (c.width !== window.innerWidth * dpr) {
        c.width = window.innerWidth * dpr;
        c.height = window.innerHeight * dpr;
      }
      const scale = settings.intensity === "low" ? 0.4 : settings.intensity === "high" ? 1.6 : 1;
      const n = Math.round(count * scale);
      const cx = x ?? window.innerWidth / 2;
      const cy = y ?? window.innerHeight / 2;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 2 + Math.random() * 7;
        particles.current.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, life: 40 + Math.random() * 30, color: colors[i % colors.length], size: 3 + Math.random() * 4 });
      }
      if (particles.current.length > 600) particles.current.splice(0, particles.current.length - 600);
      if (raf.current === null) raf.current = requestAnimationFrame(loop);
    },
    [loop, reducedMotion, settings.intensity],
  );

  const burstAt = useCallback(
    (el: Element | null, colors?: string[], count?: number) => {
      if (!el) return burst(undefined, undefined, colors, count);
      const r = el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, colors, count);
    },
    [burst],
  );

  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  const reveal = useCallback((itemId: string, source: string, dupeTokens?: number) => {
    setReveals((r) => [...r, { id: ++uid, itemId, source, dupeTokens }]);
  }, []);

  const say = useCallback((text: string) => {
    const id = ++uid;
    setSpeech({ text, id });
    setTimeout(() => setSpeech((s) => (s?.id === id ? null : s)), 3800);
  }, []);

  const process = useCallback(
    (effects: GameEffect[]) => {
      let xp = 0;
      let coins = 0;
      let tokens = 0;
      let petXp = 0;
      for (const e of effects) {
        switch (e.type) {
          case "xp":
            xp += e.amount;
            break;
          case "coins":
            coins += e.amount;
            break;
          case "tokens":
            tokens += e.amount;
            break;
          case "petXp":
            petXp += e.amount;
            break;
          case "levelUp":
            setCelebration({ id: ++uid, title: `LEVEL ${e.level}`, subtitle: "Your brain has rotted further. +25 🧠 +1 💎", kind: "level" });
            play("level");
            burst(undefined, undefined, undefined, 90);
            break;
          case "petLevelUp":
            pop(`PET LVL ${e.level}!`, "#e8ff3a");
            break;
          case "evolve":
            setCelebration({ id: ++uid, title: "EVOLUTION", subtitle: `Your pet became: ${e.stageName}`, kind: "evolve" });
            play("evolve");
            burst(undefined, undefined, ["#a855ff", "#ff2e97", "#e8ff3a"], 120);
            break;
          case "item": {
            const def = getItem(e.itemId);
            if (!def) break;
            const big = RARITY_META[def.rarity].order >= 2 || BIG_SOURCES.some((s) => e.source.startsWith(s)) || e.source.includes("Capsule");
            if (big) reveal(e.itemId, e.source, e.duplicateTokens);
            else if (e.duplicateTokens) toast(`Duplicate ${def.name} → +${e.duplicateTokens} 💎`, "weird", def.emoji);
            else toast(`Got ${e.qty > 1 ? e.qty + "× " : ""}${def.name}`, "good", def.emoji);
            break;
          }
          case "achievement": {
            const a = ACHIEVEMENTS.find((x) => x.id === e.id);
            if (a) toast(`ACHIEVEMENT: ${a.name}`, "gold", a.emoji);
            play("achievement");
            break;
          }
          case "questClaimed":
            toast("Quest complete! Rewards delivered.", "good", "✅");
            break;
          case "discovery": {
            const m = CATEGORY_META[e.category];
            toast(`NEW CATEGORY DISCOVERED: ${m.label}`, "weird", m.emoji);
            play("rare");
            break;
          }
          case "mastery":
            toast(`${CATEGORY_META[e.category].label} mastery tier ${e.tier}!`, "gold", "🎓");
            break;
          case "event": {
            const ev = CHAOS_EVENTS[e.id as ChaosId];
            if (ev) toast(`⚠ ${ev.name}`, "bad", "🚨");
            play("chaos");
            break;
          }
          case "seasonTier":
            toast(`Season tier ${e.tier} unlocked!`, "gold", "🏁");
            break;
          case "combo": {
            const c = MUTATION_COMBOS.find((x) => x.id === e.comboId);
            if (c) setCelebration({ id: ++uid, title: "MUTATION COMBO", subtitle: c.name, kind: "combo" });
            play("mythic");
            break;
          }
          case "petSay":
            say(e.text);
            break;
          case "toast":
            toast(e.text, e.tone ?? "info");
            break;
          case "spin":
            break;
        }
      }
      const parts: string[] = [];
      if (xp) parts.push(`+${xp} XP`);
      if (coins) parts.push(`+${coins} 🧠`);
      if (tokens) parts.push(`+${tokens} 💎`);
      if (petXp) parts.push(`+${petXp} PET XP`);
      if (parts.length) {
        pop(parts.join("  "), xp ? "#39ff88" : petXp ? "#e8ff3a" : "#2ef2ff");
        if (coins || tokens) play("coin");
        else play("xp");
      }
    },
    [burst, pop, reveal, say, toast],
  );

  const value = useMemo<FxCtx>(
    () => ({ toast, pop, burst, burstAt, reveal, process, speech, say, sfx: play }),
    [toast, pop, burst, burstAt, reveal, process, speech, say],
  );

  const current = reveals[0];

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>
      <Ctx.Provider value={value}>
        {children}
        <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[80] h-full w-full" />

        {/* score pops */}
        <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-28 z-[75] flex flex-col items-center gap-1 md:bottom-12">
          <AnimatePresence>
            {pops.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="rounded-full border border-white/10 bg-black/80 px-4 py-1 font-display text-lg"
                style={{ color: p.color, textShadow: `0 0 12px ${p.color}` }}
              >
                {p.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* toasts */}
        <div role="status" aria-live="polite" className="pointer-events-none fixed right-3 top-16 z-[85] flex w-[min(92vw,360px)] flex-col gap-2 safe-top">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 60, rotate: 3 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: 60 }}
                className={`pointer-events-auto flex items-center gap-3 rounded-xl border bg-black/90 px-3 py-2 text-sm font-semibold shadow-lg ${TONE_STYLE[t.tone]}`}
              >
                {t.icon && <span className="text-xl">{t.icon}</span>}
                <span className="text-white/90">{t.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* reveal panel */}
        <AnimatePresence>
          {current && (
            <RevealPanel
              key={current.id}
              reveal={current}
              onClose={() => setReveals((r) => r.slice(1))}
              onShown={(rarity) => {
                play(rarity === "mythical" || rarity === "legendary" ? "mythic" : RARITY_META[rarity].order >= 2 ? "rare" : "reveal");
                burst(undefined, undefined, [RARITY_META[rarity].color, "#ffffff"], RARITY_META[rarity].order * 25 + 20);
              }}
            />
          )}
        </AnimatePresence>

        {/* level up / evolution / combo */}
        <AnimatePresence>
          {celebration && (
            <motion.div
              key={celebration.id}
              className="fixed inset-0 z-[88] flex items-center justify-center bg-black/70 p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCelebration(null)}
              role="dialog"
              aria-modal="true"
              aria-label={celebration.title}
            >
              <motion.div
                initial={{ scale: 0.3, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
                className="text-center"
              >
                <div className="mb-2 text-6xl">{celebration.kind === "evolve" ? "🧬" : celebration.kind === "combo" ? "☣️" : "⬆️"}</div>
                <h2 className="glitch h-display text-6xl text-acid md:text-8xl" data-text={celebration.title}>
                  {celebration.title}
                </h2>
                <p className="mt-3 text-lg text-white/80">{celebration.subtitle}</p>
                <button autoFocus className="btn-neon mt-6" onClick={() => setCelebration(null)}>
                  LET&apos;S GOOO
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Ctx.Provider>
    </MotionConfig>
  );
}

function RevealPanel({ reveal, onClose, onShown }: { reveal: Reveal; onClose: () => void; onShown: (r: Rarity) => void }) {
  const def = getItem(reveal.itemId);
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setOpened(true);
      if (def) onShown(def.rarity);
    }, 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  if (!def) return null;
  const meta = RARITY_META[def.rarity];
  return (
    <motion.div
      className="fixed inset-0 z-[87] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`New item: ${def.name}`}
    >
      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <motion.div
          aria-hidden
          className="absolute top-0 h-72 w-72 rounded-full opacity-60 blur-2xl"
          style={{ background: `conic-gradient(from 0deg, ${meta.color}, transparent, ${meta.color}, transparent, ${meta.color})` }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
        />
        <motion.div
          className={`relative mt-6 flex h-48 w-48 items-center justify-center rounded-3xl border-2 bg-panel text-8xl ${def.rarity === "mythical" ? "rainbow-border" : ""}`}
          style={{ borderColor: meta.color, boxShadow: `0 0 60px -10px ${meta.color}` }}
          initial={{ scale: 0.2, rotateY: 180 }}
          animate={opened ? { scale: 1, rotateY: 0 } : { scale: [0.6, 0.7, 0.6], rotate: [-6, 6, -6] }}
          transition={opened ? { type: "spring", stiffness: 200, damping: 12 } : { repeat: Infinity, duration: 0.3 }}
        >
          {opened ? def.emoji : "❔"}
        </motion.div>
        <AnimatePresence>
          {opened && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative mt-6">
              <div className="font-pixel text-xl uppercase tracking-[0.3em]" style={{ color: meta.color }}>
                {def.rarity === "mythical" ? <span className="rainbow-text">{meta.label}</span> : meta.label} · {def.kind}
              </div>
              <h2 className="h-display mt-1 text-3xl text-white">{def.name}</h2>
              <p className="mt-2 text-sm text-white/70">{def.description}</p>
              <p className="mt-1 text-xs text-muted">from {reveal.source}</p>
              {reveal.dupeTokens ? <p className="mt-2 text-sm text-volt">Duplicate! Converted to +{reveal.dupeTokens} 💎</p> : null}
              <button autoFocus className="btn-neon mt-5" onClick={onClose}>
                YOINK
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function useFx() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFx outside provider");
  return c;
}
