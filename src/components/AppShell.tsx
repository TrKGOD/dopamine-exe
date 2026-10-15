"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useFx } from "@/client/fx";
import { useGame, useNow } from "@/client/game";
import { useSettings } from "@/client/settings";
import { questView } from "@/lib/game/selectors";
import { ChaosLayer } from "./ChaosLayer";
import { EffectsLayer } from "./EffectsLayer";
import { Onboarding } from "./Onboarding";
import { PetAvatar } from "./PetAvatar";
import { PetCard } from "./PetCard";
import { RightPanel } from "./RightPanel";

export const NAV = [
  { href: "/home", label: "Home", icon: "🏠" },
  { href: "/", label: "Brainrot Feed", icon: "📱" },
  { href: "/roulette", label: "Roulette", icon: "🎡" },
  { href: "/pet", label: "Pet Lab", icon: "🧪" },
  { href: "/inventory", label: "Inventory", icon: "🎒" },
  { href: "/missions", label: "Missions", icon: "📋" },
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/achievements", label: "Achievements", icon: "🎖️" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

const MOBILE_NAV = [
  { href: "/", label: "Feed", icon: "📱" },
  { href: "/pet", label: "Pet", icon: "🧪" },
  { href: "/roulette", label: "Spin", icon: "🎡" },
  { href: "/missions", label: "Quests", icon: "📋" },
];

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link href="/home" className="group inline-flex items-baseline gap-0.5 font-display leading-none" aria-label="DOPAMINE.EXE home">
      <span className={`glitch text-neon ${small ? "text-lg" : "text-2xl"}`} data-text="DOPAMINE">
        DOPAMINE
      </span>
      <span className={`text-hot ${small ? "text-sm" : "text-lg"}`}>.EXE</span>
    </Link>
  );
}

export function SoundToggle() {
  const { settings, update } = useSettings();
  return (
    <button
      className="btn-ghost h-9 w-9 !p-0 text-base"
      onClick={() => update({ sound: !settings.sound })}
      aria-pressed={settings.sound}
      aria-label={settings.sound ? "Mute all sound" : "Unmute sound"}
      title={settings.sound ? "Mute" : "Unmute"}
    >
      {settings.sound ? "🔊" : "🔇"}
    </button>
  );
}

export function Wallet({ compact = false }: { compact?: boolean }) {
  const { state } = useGame();
  if (!state) return null;
  return (
    <div className={`flex items-center gap-2 font-display ${compact ? "text-xs" : "text-sm"}`}>
      <span className="chip !border-neon/40 text-neon" title="Braincells (soft currency)">
        🧠 {state.coins}
      </span>
      <span className="chip !border-volt/50 text-volt" title="Glitch tokens (cosmetic currency)">
        💎 {state.tokens}
      </span>
      {!compact && (
        <span className="chip !border-acid/40 text-acid" title="Player level">
          LV {state.level}
        </span>
      )}
    </div>
  );
}

function useNavBadges() {
  const { state } = useGame();
  const now = useNow();
  return useMemo(() => {
    if (!state) return {} as Record<string, string>;
    const claimable = questView(state).filter((q) => q.complete && !q.claimed).length;
    const b: Record<string, string> = {};
    if (now >= state.roulette.nextSpinAt) b["/roulette"] = "READY";
    if (claimable) b["/missions"] = String(claimable);
    return b;
  }, [state, now]);
}

function BootScreen({ error, retry }: { error: string | null; retry: () => void }) {
  return (
    <div className="app-bg flex h-[100dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo />
      {error ? (
        <>
          <p className="max-w-sm text-hot">{error}</p>
          <button className="btn-neon" onClick={retry}>
            Retry connection
          </button>
        </>
      ) : (
        <>
          <p className="font-pixel text-2xl text-neon" aria-live="polite">
            BOOTING BRAINROT KERNEL…
          </p>
          <div className="bar w-64">
            <span className="animate-pulse" style={{ width: "70%", background: "#39ff88" }} />
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state, loading, loadError, refresh } = useGame();
  const pathname = usePathname();
  const badges = useNavBadges();
  const [moreOpen, setMoreOpen] = useState(false);
  const [petOpen, setPetOpen] = useState(false);
  const fx = useFx();

  useEffect(() => {
    setMoreOpen(false);
    setPetOpen(false);
  }, [pathname]);

  if (loading || !state) return <BootScreen error={loadError} retry={() => void refresh()} />;
  if (!state.onboarded && !pathname.startsWith("/u/")) return <Onboarding />;

  const isFeed = pathname === "/";

  return (
    <div className="app-shell app-bg flex h-[100dvh] w-full overflow-hidden bg-void">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-acid focus:px-3 focus:py-1 focus:text-black">
        Skip to content
      </a>

      {/* ── Left sidebar (desktop) ─────────────────── */}
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-line bg-panel/70 p-4 md:flex lg:w-[240px]" aria-label="Main navigation">
        <Logo />
        <p className="mt-1 font-pixel text-sm text-muted">v6.6.6 · brainrot simulator</p>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-neon/10 text-neon" : "text-white/75 hover:bg-white/5 hover:text-white"}`}
              >
                {active && <motion.span layoutId="nav-active" className="absolute inset-y-1 left-0 w-1 rounded-full bg-neon shadow-neon" />}
                <span className="text-lg transition group-hover:scale-125">{n.icon}</span>
                <span>{n.label}</span>
                {badges[n.href] && <span className="ml-auto rounded-full bg-hot px-1.5 font-pixel text-sm leading-tight text-black">{badges[n.href]}</span>}
              </Link>
            );
          })}
        </nav>
        <DoNotClick />
        <div className="mt-3 flex items-center justify-between">
          <Wallet compact />
          <SoundToggle />
        </div>
      </aside>

      {/* ── Center ─────────────────────────────────── */}
      <main id="main" className="relative flex min-w-0 flex-1 flex-col">
        {!isFeed && (
          <header className="safe-top flex items-center justify-between gap-2 border-b border-line bg-panel/80 px-4 py-2 md:hidden">
            <Logo small />
            <div className="flex items-center gap-2">
              <Wallet compact />
              <SoundToggle />
            </div>
          </header>
        )}
        <div className={`min-h-0 flex-1 ${isFeed ? "overflow-hidden" : "overflow-y-auto"}`}>
          {isFeed ? children : <div className="mx-auto w-full max-w-5xl p-4 pb-28 md:p-8 md:pb-10">{children}</div>}
        </div>

        {/* floating pet widget (when the right panel is hidden) */}
        {pathname !== "/pet" && (
          <button
            className={`fixed bottom-24 right-3 z-40 h-16 w-16 items-center justify-center rounded-full border border-neon/50 bg-panel shadow-neon md:bottom-6 xl:hidden ${isFeed ? "hidden" : "flex"}`}
            onClick={() => {
              setPetOpen(true);
              fx.sfx("click");
            }}
            aria-label="Open pet panel"
          >
            <MiniPet />
          </button>
        )}
      </main>

      {/* ── Right sidebar (wide screens) ───────────── */}
      <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-line bg-panel/60 xl:block" aria-label="Pet and progress">
        <RightPanel />
      </aside>

      {/* ── Bottom nav (mobile) ─────────────────────── */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-line bg-void/95 backdrop-blur md:hidden" aria-label="Mobile navigation">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? "text-neon" : "text-white/70"}`}>
                <span className="text-xl">{n.icon}</span>
                {n.label}
                {badges[n.href] && <span className="absolute right-3 top-1 h-2.5 w-2.5 rounded-full bg-hot" aria-label="needs attention" />}
              </Link>
            );
          })}
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-white/70" aria-haspopup="dialog">
            <span className="text-xl">☰</span>
            More
          </button>
        </div>
      </nav>

      {/* mobile "more" sheet */}
      <AnimatePresence>
        {moreOpen && (
          <Sheet onClose={() => setMoreOpen(false)} label="More navigation">
            <div className="grid grid-cols-3 gap-2">
              {NAV.filter((n) => !MOBILE_NAV.some((m) => m.href === n.href)).map((n) => (
                <Link key={n.href} href={n.href} className="card flex flex-col items-center gap-1 p-3 text-xs font-semibold">
                  <span className="text-2xl">{n.icon}</span>
                  {n.label}
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <DoNotClick />
            </div>
          </Sheet>
        )}
        {petOpen && (
          <Sheet onClose={() => setPetOpen(false)} label="Your pet">
            <PetCard />
          </Sheet>
        )}
      </AnimatePresence>

      <ChaosLayer />
      <EffectsLayer />
    </div>
  );
}

function Sheet({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-end bg-black/60 md:items-center md:justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="card-hi safe-bottom max-h-[85dvh] w-full overflow-y-auto rounded-b-none p-4 md:max-w-md md:rounded-2xl"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 36 }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="label">{label}</span>
          <button className="btn-ghost h-9 w-9 !p-0" onClick={onClose} aria-label="Close" autoFocus>
            ✕
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function MiniPet() {
  const { state } = useGame();
  if (!state) return null;
  return <PetAvatar {...state.pet} size={52} animate={false} />;
}

export function DoNotClick() {
  const { act } = useGame();
  const fx = useFx();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="group relative w-full overflow-hidden rounded-xl border-2 border-hot bg-hot/10 px-3 py-3 font-display text-sm uppercase tracking-wider text-hot transition hover:bg-hot hover:text-black active:scale-95 disabled:opacity-50"
      disabled={busy}
      onClick={async (e) => {
        setBusy(true);
        fx.burstAt(e.currentTarget, ["#ff2e97", "#e8ff3a"], 30);
        fx.sfx("chaos");
        await act({ type: "doNotClick" });
        setBusy(false);
      }}
    >
      <span className="relative z-10">⚠ DO NOT CLICK ⚠</span>
      <span aria-hidden className="absolute inset-0 -z-0 bg-[repeating-linear-gradient(45deg,transparent_0_10px,rgba(255,46,151,.15)_10px_20px)]" />
    </button>
  );
}
