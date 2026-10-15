"use client";

import { animate, motion, useMotionValue, useMotionValueEvent } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { useFx } from "@/client/fx";
import { useGame, useNow } from "@/client/game";
import { useSettings } from "@/client/settings";
import { Bar, RarityTag, SectionTitle } from "@/components/ui";
import { RARITY_META, ROULETTE_COOLDOWN_MS, ROULETTE_SEGMENTS } from "@/lib/game/config";
import { chances } from "@/lib/game/rng";
import { formatDuration } from "@/lib/game/time";
import type { GameEffect } from "@/lib/game/types";

const R = 150;
const CX = 160;

function arc(start: number, end: number) {
  const rad = (d: number) => ((d - 90) * Math.PI) / 180;
  const large = end - start > 180 ? 1 : 0;
  const x1 = CX + R * Math.cos(rad(start));
  const y1 = CX + R * Math.sin(rad(start));
  const x2 = CX + R * Math.cos(rad(end));
  const y2 = CX + R * Math.sin(rad(end));
  return `M${CX},${CX} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z`;
}

export default function RoulettePage() {
  const { state, act } = useGame();
  const fx = useFx();
  const now = useNow();
  const { reducedMotion } = useSettings();
  const rotation = useMotionValue(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ index: number } | null>(null);
  const lastTick = useRef(0);

  const pct = useMemo(() => chances(ROULETTE_SEGMENTS, (s) => s.weight), []);
  const slices = useMemo(() => {
    let a = 0;
    return ROULETTE_SEGMENTS.map((s, i) => {
      const size = (pct[i] / 100) * 360;
      const slice = { seg: s, start: a, end: a + size, size, pct: pct[i] };
      a += size;
      return slice;
    });
  }, [pct]);

  // tick sound whenever a slice boundary passes the pointer
  useMotionValueEvent(rotation, "change", (v) => {
    const at = ((-v % 360) + 360) % 360;
    const idx = slices.findIndex((s) => at >= s.start && at < s.end);
    if (idx !== lastTick.current) {
      lastTick.current = idx;
      if (spinning) fx.sfx("tick");
    }
  });

  if (!state) return null;
  const left = state.roulette.nextSpinAt - now;
  const ready = left <= 0 && !spinning;

  const spin = async () => {
    if (!ready) return;
    setSpinning(true);
    setResult(null);
    fx.sfx("click");
    const res = await act({ type: "spin" }, { defer: true });
    const spinFx = res.effects.find((e): e is Extract<GameEffect, { type: "spin" }> => e.type === "spin");
    if (!res.ok || !spinFx) {
      setSpinning(false);
      return;
    }
    const s = slices[spinFx.segmentIndex];
    // land somewhere inside the server-selected slice (never on an edge)
    const landing = s.start + s.size * (0.2 + Math.random() * 0.6);
    const cur = rotation.get();
    const base = (((-landing - cur) % 360) + 360) % 360;
    const target = cur + base + 360 * (reducedMotion ? 1 : 6);
    await animate(rotation, target, { duration: reducedMotion ? 0.6 : 5.2, ease: [0.12, 0.75, 0.15, 1] });
    setSpinning(false);
    setResult({ index: spinFx.segmentIndex });
    fx.process(res.deferred ?? res.effects);
  };

  const won = result ? ROULETTE_SEGMENTS[result.index] : null;

  return (
    <div>
      <SectionTitle kicker="free spin every 2 minutes · zero real money" title="ROULETTE" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card-hi flex flex-col items-center p-4 md:p-6">
          <div className="relative w-full max-w-[420px]">
            {/* pointer */}
            <div aria-hidden className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
              <svg width="40" height="44" viewBox="0 0 40 44">
                <path d="M20 44 L4 8 Q20 -4 36 8 Z" fill="#e8ff3a" stroke="#000" strokeWidth="3" />
              </svg>
            </div>
            <motion.svg viewBox="0 0 320 320" className="w-full drop-shadow-[0_0_30px_rgba(168,85,255,.35)]" style={{ rotate: rotation }} role="img" aria-label="Roulette wheel; slice size equals probability">
              <circle cx={CX} cy={CX} r={R + 8} fill="#14101f" stroke="#a855ff" strokeWidth="3" />
              {slices.map(({ seg, start, end, size }, i) => {
                const color = RARITY_META[seg.rarity].color;
                const mid = ((start + end) / 2 - 90) * (Math.PI / 180);
                return (
                  <g key={seg.id}>
                    <path d={arc(start, end)} fill={i % 2 ? color + "cc" : color + "88"} stroke="#07060b" strokeWidth="1.5" />
                    {size >= 11 && (
                      <text x={CX + Math.cos(mid) * R * 0.72} y={CX + Math.sin(mid) * R * 0.72} textAnchor="middle" dominantBaseline="central" fontSize={size > 30 ? 20 : 14}>
                        {seg.emoji}
                      </text>
                    )}
                  </g>
                );
              })}
              {Array.from({ length: 24 }).map((_, i) => {
                const a = (i / 24) * Math.PI * 2;
                return <circle key={i} cx={CX + Math.cos(a) * (R + 4)} cy={CX + Math.sin(a) * (R + 4)} r="2.5" fill={i % 2 ? "#ff2e97" : "#e8ff3a"} />;
              })}
            </motion.svg>
            <button
              onClick={spin}
              disabled={!ready}
              className={`absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-black font-display text-black transition active:scale-90 disabled:cursor-not-allowed ${ready ? "bg-neon shadow-neon hover:scale-105" : "bg-[#2a2540] text-white"}`}
              aria-label={ready ? "Spin the roulette" : spinning ? "Spinning" : `Next spin in ${formatDuration(left)}`}
            >
              {spinning ? (
                <span className="text-lg">…</span>
              ) : ready ? (
                <span className="text-2xl">SPIN</span>
              ) : (
                <>
                  <span className="font-pixel text-sm text-muted">NEXT IN</span>
                  <span className="font-mono text-xl text-white">{formatDuration(left)}</span>
                </>
              )}
            </button>
          </div>

          {!ready && !spinning && (
            <div className="mt-4 w-full max-w-sm">
              <Bar value={ROULETTE_COOLDOWN_MS - Math.max(0, left)} max={ROULETTE_COOLDOWN_MS} color="#a855ff" label="Cooldown progress" />
              <p className="mt-1 text-center text-xs text-muted">Cooldown is enforced by the server clock. Refreshing won&apos;t help (we checked).</p>
            </div>
          )}

          <div className="mt-4 min-h-[72px] text-center" aria-live="polite">
            {won && !spinning && (
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-1">
                <div className="label">landed on</div>
                <div className="font-display text-2xl" style={{ color: RARITY_META[won.rarity].color }}>
                  {won.emoji} {won.label}
                </div>
                <RarityTag rarity={won.rarity} />
              </motion.div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="label mb-2">Exact odds</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-1 font-normal">Reward</th>
                  <th className="pb-1 text-right font-normal">Chance</th>
                </tr>
              </thead>
              <tbody>
                {slices.map(({ seg, pct }) => (
                  <tr key={seg.id} className="border-t border-white/5">
                    <td className="py-1.5">
                      <span className="mr-1">{seg.emoji}</span>
                      {seg.label} <RarityTag rarity={seg.rarity} className="ml-1" />
                    </td>
                    <td className="py-1.5 text-right font-mono" style={{ color: RARITY_META[seg.rarity].color }}>
                      {pct < 1 ? pct.toFixed(2) : pct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">
              Cosmetic slices award a random droppable cosmetic of that rarity (uniform). Duplicates convert to 💎 tokens. Slices are drawn proportional to their real probability. Rewards are fictional and can&apos;t be bought or cashed out.
            </p>
          </div>

          <div className="card p-4">
            <div className="label mb-2">Spin history ({state.roulette.totalSpins} total)</div>
            {state.roulette.history.length === 0 ? (
              <p className="text-sm text-muted">No spins yet. The wheel is lonely.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {state.roulette.history.map((h) => (
                  <li key={h.at} className="flex items-center gap-2">
                    <RarityTag rarity={h.rarity} />
                    <span className="min-w-0 flex-1 truncate" title={h.granted}>
                      {h.label} <span className="text-muted">→ {h.granted}</span>
                    </span>
                    <span className="font-mono text-xs text-muted">{new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
