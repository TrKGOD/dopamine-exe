"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useFx } from "@/client/fx";
import { useGame, useNow } from "@/client/game";
import { useSettings } from "@/client/settings";
import { CHAOS_EVENTS, type ChaosId } from "@/lib/game/config";
import { getItem } from "@/lib/game/items";
import { formatDuration } from "@/lib/game/time";

const CAPY_SPOTS = [
  [22, 24], [58, 18], [70, 52], [30, 60], [48, 38], [64, 72],
];
const LOOT = ["🍗", "💎", "🧠", "🥚", "🌮"];

/**
 * Renders the active chaos event. Events are decided by the server; this
 * component only rolls for them on a timer and draws their (dismissable) effects.
 */
export function ChaosLayer() {
  const { state, act } = useGame();
  const { settings } = useSettings();
  const fx = useFx();
  const now = useNow();
  const [hidden, setHidden] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // periodic roll: one interval, only while the tab is visible
  useEffect(() => {
    if (!settings.chaos) return;
    const id = setInterval(() => {
      const s = stateRef.current;
      if (!s || s.events.active || document.visibilityState !== "visible") return;
      if (Date.now() + 2000 < s.events.nextRollAt) return; // server enforces the real time
      void act({ type: "rollChaos" }, { silent: true });
    }, 10_000);
    return () => clearInterval(id);
  }, [settings.chaos, act]);

  const ev = state?.events.active && state.events.active.endsAt > now ? state.events.active : null;
  const key = ev ? `${ev.id}:${ev.startedAt}` : null;
  const effectsOn = !!ev && hidden !== key;

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("theme-overload", effectsOn && ev?.id === "overload" && settings.intensity !== "low");
    html.classList.toggle("theme-retro", effectsOn && ev?.id === "collapse");
    return () => {
      html.classList.remove("theme-overload", "theme-retro");
    };
  }, [effectsOn, ev?.id, settings.intensity]);

  if (!ev || !state) return null;
  const def = CHAOS_EVENTS[ev.id as ChaosId];
  const left = ev.endsAt - now;
  const done = ev.claimed || (def.targets ? ev.hits.length >= def.targets : false);

  const hit = async (i: number, el: Element) => {
    fx.burstAt(el, ["#ffb02e", "#39ff88"], 25);
    fx.sfx("coin");
    await act({ type: "eventHit", target: i });
  };

  const claim = async () => {
    fx.sfx("rare");
    await act({ type: "eventClaim" });
  };

  return (
    <>
      {/* banner */}
      <div className="pointer-events-none fixed inset-x-0 top-[6.5rem] z-[66] flex justify-center px-2 md:top-16">
      <motion.div
        key={key}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto w-[min(94vw,560px)]"
        role="region"
        aria-label={`Chaos event: ${def.name}`}
      >
        <div className="rounded-2xl border-2 border-hot bg-black/90 p-2 shadow-hot md:p-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl md:text-3xl" aria-hidden>
              {ev.id === "capybara" ? "🦫" : ev.id === "ceo" ? "🤵" : ev.id === "gravity" ? "🪐" : ev.id === "mutation" ? "🧬" : ev.id === "collapse" ? "📼" : "🧠"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm text-hot md:text-base">⚠ {def.name}</div>
              <div className="hidden text-xs text-white/80 sm:block">{def.tagline}</div>
            </div>
            <div className="font-mono text-sm text-acid" aria-label="time left">
              {formatDuration(left)}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {ev.id === "ceo" && (
              <>
                <span className="chip text-acid">
                  New posts: {Math.min(ev.progress, def.goal ?? 3)}/{def.goal}
                </span>
                <button className="btn-neon !py-1 text-xs" disabled={ev.claimed || ev.progress < (def.goal ?? 3)} onClick={claim}>
                  {ev.claimed ? "Bonus received" : "Collect bonus (+50 XP, 4 💎)"}
                </button>
              </>
            )}
            {ev.id === "mutation" && ev.mutationId && (
              <button className="btn-volt !py-1 text-xs" disabled={ev.claimed} onClick={claim}>
                {ev.claimed ? "Specimen claimed" : `Claim ${getItem(ev.mutationId)?.emoji} ${getItem(ev.mutationId)?.name}`}
              </button>
            )}
            {ev.id === "collapse" && (
              <button className="btn-neon !py-1 text-xs" disabled={ev.claimed} onClick={claim}>
                {ev.claimed ? "Internet rebooted (kind of)" : "🔌 Reboot the internet"}
              </button>
            )}
            {def.targets && (
              <span className="chip text-neon">
                Caught {ev.hits.length}/{def.targets}
              </span>
            )}
            {ev.id === "overload" && <span className="chip text-neon">2× XP on new posts</span>}
            {done && <span className="chip text-neon">✓ complete</span>}
            <button className="ml-auto text-xs text-muted underline hover:text-white" onClick={() => setHidden(effectsOn ? key : null)}>
              {effectsOn ? "Hide visual effects" : "Show effects"}
            </button>
          </div>
        </div>
      </motion.div>
      </div>

      {/* capybara invasion */}
      {effectsOn && ev.id === "capybara" && (
        <div className="pointer-events-none fixed inset-0 z-[64]" aria-label="Capybaras to boop">
          <AnimatePresence>
            {CAPY_SPOTS.slice(0, def.targets).map(([x, y], i) =>
              ev.hits.includes(i) ? null : (
                <motion.button
                  key={i}
                  className="pointer-events-auto absolute flex h-14 w-14 items-center justify-center rounded-full bg-[#c08a5a]/20 text-4xl hover:scale-110"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0, x: [0, 14, 0, -14, 0] }}
                  exit={{ scale: 0, opacity: 0, y: -40 }}
                  transition={{ x: { repeat: Infinity, duration: 3 + i * 0.4 }, scale: { type: "spring" } }}
                  onClick={(e) => hit(i, e.currentTarget)}
                  aria-label={`Boop capybara ${i + 1}`}
                >
                  🦫
                </motion.button>
              ),
            )}
          </AnimatePresence>
        </div>
      )}

      {/* gravity failure: contained physics arena */}
      {effectsOn && ev.id === "gravity" && !done && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[64] flex justify-center md:bottom-8">
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto relative h-56 w-[min(92vw,380px)] overflow-hidden rounded-2xl border-2 border-ice bg-black/85"
          role="group"
          aria-label="Gravity failure arena — catch the floating loot"
        >
          <div className="absolute left-3 top-2 font-pixel text-ice">ZERO-G ZONE · click the loot</div>
          {LOOT.slice(0, def.targets).map((emoji, i) =>
            ev.hits.includes(i) ? null : (
              <motion.button
                key={i}
                className="absolute flex h-12 w-12 items-center justify-center text-3xl"
                initial={{ left: `${10 + i * 17}%`, top: "70%" }}
                animate={{ left: [`${10 + i * 17}%`, `${70 - i * 12}%`, `${20 + i * 9}%`, `${10 + i * 17}%`], top: ["70%", "15%", "55%", "70%"], rotate: [0, 180, 360] }}
                transition={{ repeat: Infinity, duration: 5 + i, ease: "easeInOut" }}
                onClick={(e) => hit(i, e.currentTarget)}
                aria-label={`Catch floating ${emoji}`}
              >
                {emoji}
              </motion.button>
            ),
          )}
        </motion.div>
        </div>
      )}
    </>
  );
}
