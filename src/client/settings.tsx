"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface Settings {
  sound: boolean;
  volume: number; // 0..1
  motion: "system" | "reduced" | "full";
  intensity: "low" | "medium" | "high";
  chaos: boolean;
  crt: boolean;
}

const DEFAULTS: Settings = { sound: true, volume: 0.5, motion: "system", intensity: "medium", chaos: true, crt: true };
const KEY = "dopamine.settings.v1";

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reducedMotion: boolean;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* private mode or corrupted value: keep defaults */
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystemReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.motion = settings.motion;
    html.dataset.intensity = settings.intensity;
    html.dataset.crt = settings.crt ? "on" : "off";
    html.style.setProperty("--scan-opacity", settings.intensity === "high" ? "0.11" : settings.intensity === "low" ? "0.04" : "0.07");
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reducedMotion = settings.motion === "reduced" || (settings.motion === "system" && systemReduced);
  const value = useMemo(() => ({ settings, update, reducedMotion }), [settings, update, reducedMotion]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings outside provider");
  return ctx;
}
