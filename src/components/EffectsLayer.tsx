"use client";

import { useEffect } from "react";
import { useFx } from "@/client/fx";
import { useGame, useNow } from "@/client/game";
import { useSettings } from "@/client/settings";

/** Applies temporary cosmetic effects (from inventory) to the whole UI. */
export function EffectsLayer() {
  const { state } = useGame();
  const now = useNow();
  const fx = useFx();
  const { reducedMotion } = useSettings();
  const active = (id: string) => !!state?.activeEffects.some((e) => e.itemId === id && e.until > now);
  const comic = active("fx_comic");
  const rainbow = active("fx_rainbow");
  const confetti = active("fx_confetti");

  useEffect(() => {
    document.documentElement.classList.toggle("fx-comic", comic);
    document.documentElement.classList.toggle("fx-rainbow", rainbow && !reducedMotion);
  }, [comic, rainbow, reducedMotion]);

  useEffect(() => {
    if (!confetti || reducedMotion) return;
    let last = 0;
    const move = (e: PointerEvent) => {
      if (e.timeStamp - last < 60) return;
      last = e.timeStamp;
      fx.burst(e.clientX, e.clientY, ["#ff2e97", "#e8ff3a", "#39ff88", "#2ef2ff"], 4);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [confetti, reducedMotion, fx]);

  return null;
}
