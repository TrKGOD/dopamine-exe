"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFx } from "@/client/fx";
import { errorMessage, useGame } from "@/client/game";
import { useSettings } from "@/client/settings";
import { ClickerMissions } from "@/components/clicker/ClickerMissions";
import { useClickerSync, useFastNow } from "@/components/clicker/useClicker";
import { PetAvatar } from "@/components/PetAvatar";
import { Bar, Modal, SectionTitle, Stat } from "@/components/ui";
import { basePps, baseClick, clickPower, clickerBonuses, formatBig, multipliers, productionPerSecond } from "@/lib/game/clicker";
import { CLICKER_RULES, CLICKER_UPGRADES, REACTOR_SKINS, isUnlocked, maxAffordable, reactorLevel, shardsFor, upgradeCost } from "@/lib/game/clickerConfig";
import { formatDuration } from "@/lib/game/time";

type Bulk = 1 | 10 | 25 | "max";
interface Floater { id: number; x: number; y: number; text: string }
let floatId = 0;

export default function DoomclickerPage() {
  const { state, act, pending } = useGame();
  const fx = useFx();
  const { reducedMotion, settings } = useSettings();
  const now = useFastNow(200);
  const sync = useClickerSync();
  const [bulk, setBulk] = useState<Bulk>(1);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const coreControls = useAnimationControls();
  const [prestigeOpen, setPrestigeOpen] = useState(false);
  const [offlineDismissed, setOfflineDismissed] = useState<number | null>(null);
  const [flash, setFlash] = useState<Record<string, number>>({});
  const lastSound = useRef(0);
  const prevAffordable = useRef<Set<string>>(new Set());

  const c = state?.clicker;
  const power = state ? clickPower(state, now) : 1;
  const pps = state ? productionPerSecond(state, now) : 0;

  // Display-only projection: confirmed server balance + time since its last tick + unsent clicks.
  const balance = c ? c.braincells + (pps * Math.min(Math.max(0, now - c.lastTickAt), CLICKER_RULES.onlineWindowMs)) / 1000 + sync.pendingCount * power : 0;

  const qtyFor = (id: string) => {
    if (!c) return 0;
    const u = CLICKER_UPGRADES.find((x) => x.id === id)!;
    return bulk === "max" ? maxAffordable(u, c.owned[id] ?? 0, balance) : bulk;
  };

  const affordableKey = useMemo(() => {
    if (!c || !state) return "";
    return CLICKER_UPGRADES.filter((u) => isUnlocked(u, c, state.pet.level) && upgradeCost(u, c.owned[u.id] ?? 0, 1) <= balance)
      .map((u) => u.id)
      .join(",");
  }, [c, state, balance]);

  // brief glow when an upgrade becomes affordable
  useEffect(() => {
    const nowSet = new Set(affordableKey ? affordableKey.split(",") : []);
    const fresh = [...nowSet].filter((id) => !prevAffordable.current.has(id));
    prevAffordable.current = nowSet;
    if (fresh.length) setFlash((f) => ({ ...f, ...Object.fromEntries(fresh.map((id) => [id, Date.now()])) }));
  }, [affordableKey]);

  if (!state || !c) return null;

  const skin = [...REACTOR_SKINS].reverse().find((s) => state.pet.level >= s.petLevel) ?? REACTOR_SKINS[0];
  const nextSkin = REACTOR_SKINS.find((s) => s.petLevel > state.pet.level);
  const bonuses = clickerBonuses(state, now);
  const mult = multipliers(bonuses);
  const level = reactorLevel(c.lifetimeRun);
  const shardsPreview = shardsFor(c.lifetimeRun);
  const showOffline = !!c.pendingOffline && offlineDismissed !== c.pendingOffline.at;

  const hit = (clientX: number, clientY: number, el: HTMLElement) => {
    sync.addClick();
    if (!reducedMotion) void coreControls.start({ scale: [0.9, 1], transition: { type: "spring", stiffness: 600, damping: 14 } });
    const r = el.getBoundingClientRect();
    const id = ++floatId;
    setFloaters((f) => [...f.slice(-11), { id, x: clientX - r.left, y: clientY - r.top, text: `+${formatBig(power)}` }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 800);
    if (settings.intensity !== "low") fx.burst(clientX, clientY, [skin.core, "#ffffff"], 5);
    if (Date.now() - lastSound.current > 50) {
      lastSound.current = Date.now();
      fx.sfx("zap");
    }
  };

  const buy = async (id: string) => {
    const qty = qtyFor(id);
    if (qty < 1) return;
    const clicks = sync.takePending();
    const r = await act({ type: "clickerBuy", upgradeId: id, qty, clicks }, { silent: true });
    if (r.ok) {
      fx.sfx("coin");
      fx.pop(`+${qty} ${CLICKER_UPGRADES.find((u) => u.id === id)?.name}`, "#39ff88");
    } else {
      if (r.error === "network" || r.error === "duplicate") sync.restorePending(clicks);
      if (r.error !== "duplicate") fx.toast(r.error === "insufficient_funds" ? "Not enough reactor braincells." : r.error === "locked" ? "That upgrade is still locked." : errorMessage(r.error), "bad");
    }
  };

  return (
    <div>
      <SectionTitle kicker="idle reactor · fictional braincells · zero real money" title="DOOMCLICKER">
        <div className="flex items-center gap-2">
          <span className="chip !border-neon/50 font-mono text-neon" aria-label="Production per second">
            ⚡ {formatBig(pps)}/s
          </span>
          {now < c.buffUntil && <span className="chip !border-acid/60 text-acid">🍬 Sugar Rush {formatDuration(c.buffUntil - now)}</span>}
        </div>
      </SectionTitle>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* ── Reactor ───────────────────────────── */}
        <section className="card-hi relative min-w-0 overflow-hidden p-4 md:p-6" aria-label="Reactor">
          <div className="text-center">
            <div className="label">reactor braincells</div>
            <div className="font-display text-5xl tabular-nums md:text-6xl" style={{ color: skin.core, textShadow: `0 0 24px ${skin.core}66` }} aria-live="off">
              {formatBig(balance)}
            </div>
            <div className="mt-1 font-mono text-xs text-muted">
              +{formatBig(power)} per click · +{formatBig(pps)}/s
            </div>
          </div>

          <div className="relative mx-auto mt-4 aspect-square w-full max-w-[340px] select-none">
            {/* rings */}
            <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <radialGradient id="core-g" cx="40%" cy="35%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="35%" stopColor={skin.core} />
                  <stop offset="100%" stopColor="#07060b" />
                </radialGradient>
              </defs>
              <g className="origin-center animate-[spin_14s_linear_infinite]" style={{ transformOrigin: "100px 100px" }}>
                <circle cx="100" cy="100" r="94" fill="none" stroke={skin.ring} strokeWidth="2" strokeDasharray="10 6" />
              </g>
              <g className="animate-[spin_9s_linear_infinite_reverse]" style={{ transformOrigin: "100px 100px" }}>
                <circle cx="100" cy="100" r="84" fill="none" stroke={skin.core} strokeWidth="1.5" strokeDasharray="2 8" opacity="0.8" />
                {state.pet.level >= 10 &&
                  [0, 120, 240].map((a) => <circle key={a} cx={100 + 84 * Math.cos((a * Math.PI) / 180)} cy={100 + 84 * Math.sin((a * Math.PI) / 180)} r="4" fill={skin.ring} />)}
              </g>
            </svg>

            <motion.button
              className="absolute inset-[16%] rounded-full outline-none focus-visible:ring-4 focus-visible:ring-acid"
              style={{ background: "radial-gradient(circle at 40% 35%, #ffffff, " + skin.core + " 35%, #07060b 100%)", boxShadow: `0 0 60px -6px ${skin.core}, inset 0 -12px 30px rgba(0,0,0,.5)` }}
              animate={coreControls}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                hit(e.clientX, e.clientY, e.currentTarget.parentElement as HTMLElement);
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  hit(r.left + r.width / 2, r.top + r.height / 2, e.currentTarget.parentElement as HTMLElement);
                }
              }}
              aria-label={`Click the energy core for ${formatBig(power)} braincells`}
            >
              <span className="pointer-events-none flex h-full w-full items-center justify-center font-display text-2xl text-black/70 drop-shadow">CLICK</span>
            </motion.button>

            <AnimatePresence>
              {floaters.map((f) => (
                <motion.span
                  key={f.id}
                  aria-hidden
                  className="pointer-events-none absolute font-display text-xl"
                  style={{ left: f.x, top: f.y, color: skin.core, textShadow: "0 2px 0 #000" }}
                  initial={{ opacity: 1, y: -10 }}
                  animate={{ opacity: 0, y: -70 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  {f.text}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-2 flex items-center justify-center gap-3">
            <PetAvatar {...state.pet} size={84} animate={!reducedMotion} title={`${state.pet.name}, reactor operator`} />
            <div className="text-xs">
              <div className="font-display text-sm text-white">{state.pet.name}, operator</div>
              <div className="text-muted">
                Skin: <span style={{ color: skin.core }}>{skin.name}</span>
              </div>
              {nextSkin && <div className="text-muted">Next skin at pet LV {nextSkin.petLevel}</div>}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Lifetime" value={formatBig(c.lifetimeAll)} color="#2ef2ff" />
            <Stat label="This run" value={formatBig(c.lifetimeRun)} color="#a855ff" />
            <Stat label="Click power" value={formatBig(power)} color="#39ff88" />
            <Stat label="Per second" value={formatBig(pps)} color="#e8ff3a" />
            <Stat label="Reactor LV" value={level} color="#ff2e97" />
            <Stat label="Doom shards" value={c.shards} color="#ffb02e" />
          </div>
        </section>

        {/* ── Upgrades ───────────────────────────── */}
        <section className="min-w-0" aria-label="Upgrades">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="h-display text-xl text-neon">Upgrades</h2>
            <div role="radiogroup" aria-label="Purchase quantity" className="flex gap-1 rounded-xl border border-line p-1">
              {([1, 10, 25, "max"] as Bulk[]).map((b) => (
                <button key={String(b)} role="radio" aria-checked={bulk === b} onClick={() => setBulk(b)} className={`rounded-lg px-2.5 py-1 font-display text-xs ${bulk === b ? "bg-neon text-black" : "text-white/80 hover:bg-white/5"}`}>
                  {b === "max" ? "MAX" : `×${b}`}
                </button>
              ))}
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-2">
            {CLICKER_UPGRADES.map((u) => {
              const owned = c.owned[u.id] ?? 0;
              const unlocked = isUnlocked(u, c, state.pet.level);
              const qty = qtyFor(u.id);
              const cost = upgradeCost(u, owned, Math.max(1, qty));
              const affordable = unlocked && qty >= 1 && cost <= balance;
              const flashing = flash[u.id] && now - flash[u.id] < 900;
              const each = u.kind === "click" ? `+${formatBig(u.effect)} click power` : `+${formatBig(u.effect)} braincells/sec`;
              if (!unlocked) {
                const req = [u.unlock.lifetime ? `${formatBig(u.unlock.lifetime)} lifetime braincells` : null, u.unlock.petLevel ? `pet level ${u.unlock.petLevel}` : null].filter(Boolean).join(" + ");
                return (
                  <li key={u.id} className="card flex items-center gap-3 border-dashed p-3 opacity-60">
                    <span className="text-3xl grayscale">❔</span>
                    <div className="text-sm">
                      <div className="font-semibold">??? — locked</div>
                      <div className="text-xs text-muted">Unlocks at {req}</div>
                    </div>
                  </li>
                );
              }
              return (
                <motion.li
                  key={u.id}
                  animate={flashing && !reducedMotion ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className={`card flex items-center gap-3 p-3 transition ${affordable ? "border-neon/60" : ""} ${flashing ? "shadow-neon" : ""}`}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-black/30 text-3xl">{u.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{u.name}</span>
                      <span className={`chip !py-0 text-[10px] ${u.kind === "click" ? "text-hot" : "text-ice"}`}>{u.kind === "click" ? "CLICK" : "GENERATOR"}</span>
                      <span className="font-mono text-xs text-muted">owned {owned}</span>
                    </div>
                    <div className="truncate text-xs text-white/70">{u.description}</div>
                    <div className="text-xs text-acid">
                      {each} each{u.kind === "generator" && owned > 0 ? ` · now ${formatBig(owned * u.effect * mult.passive)}/s` : ""}
                    </div>
                  </div>
                  <button
                    className={affordable ? "btn-neon shrink-0 !px-3" : "btn-ghost shrink-0 !px-3"}
                    disabled={!affordable || pending.has("clickerBuy")}
                    onClick={() => void buy(u.id)}
                    aria-label={`Buy ${qty || 1} ${u.name} for ${formatBig(cost)} braincells`}
                  >
                    <span className="flex flex-col items-end leading-tight">
                      <span className="text-[10px] opacity-80">×{qty || (bulk === "max" ? 0 : bulk)}</span>
                      <span>{formatBig(cost)}</span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* ── Bonuses ───────────────────────────── */}
      <section className="card mt-6 p-4" aria-labelledby="bonus-h">
        <h2 id="bonus-h" className="label mb-2">
          Bonuses (multiply together)
        </h2>
        {bonuses.length === 0 ? (
          <p className="text-sm text-muted">No bonuses yet. Evolve your pet, feed it for a Sugar Rush, or prestige.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-1 font-normal">Source</th>
                <th className="pb-1 text-right font-normal">Click</th>
                <th className="pb-1 text-right font-normal">Passive</th>
              </tr>
            </thead>
            <tbody>
              {bonuses.map((b) => (
                <tr key={b.id} className="border-t border-white/5">
                  <td className="py-1">{b.label}</td>
                  <td className="py-1 text-right font-mono text-hot">{b.click ? `+${Math.round(b.click * 100)}%` : "—"}</td>
                  <td className="py-1 text-right font-mono text-ice">{b.passive ? `+${Math.round(b.passive * 100)}%` : "—"}</td>
                </tr>
              ))}
              <tr className="border-t border-white/20 font-semibold">
                <td className="py-1">Total multiplier</td>
                <td className="py-1 text-right font-mono text-hot">×{mult.click.toFixed(2)}</td>
                <td className="py-1 text-right font-mono text-ice">×{mult.passive.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
        <p className="mt-2 text-xs text-muted">
          Base: {formatBig(baseClick(c))} per click, {formatBig(basePps(c))}/s. Feeding your pet grants a {Math.round(CLICKER_RULES.sugarRush.bonus * 100)}% Sugar Rush for {CLICKER_RULES.sugarRush.durationMs / 60000} minutes (doesn&apos;t stack). Cosmetics are visual only. Offline earnings are capped at {CLICKER_RULES.offlineCapMs / 3_600_000}h and the server accepts at most {CLICKER_RULES.maxCps} clicks/second.
        </p>
      </section>

      {/* ── Missions ───────────────────────────── */}
      <section className="mt-6" aria-labelledby="cm-h">
        <h2 id="cm-h" className="h-display mb-3 text-xl text-volt">
          Reactor missions
        </h2>
        <ClickerMissions />
      </section>

      {/* ── Prestige ───────────────────────────── */}
      <section className="card-hi mt-6 p-4" aria-labelledby="prestige-h">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="prestige-h" className="h-display text-xl text-[#ffb02e]">
              Prestige: reactor meltdown
            </h2>
            <p className="text-sm text-white/75">
              Unlocks at {formatBig(CLICKER_RULES.prestigeThreshold)} braincells earned this run. Reward: ⌊3 × √(run earnings ÷ {formatBig(CLICKER_RULES.prestigeThreshold)})⌋ doom shards, each +{Math.round(CLICKER_RULES.shardBonus * 100)}% click & passive forever.
            </p>
          </div>
          <button className="btn-hot" disabled={shardsPreview <= 0} onClick={() => setPrestigeOpen(true)}>
            {shardsPreview > 0 ? `Prestige for ${shardsPreview} 💠` : "Locked"}
          </button>
        </div>
        <div className="mt-3">
          <Bar value={Math.min(c.lifetimeRun, CLICKER_RULES.prestigeThreshold)} max={CLICKER_RULES.prestigeThreshold} color="#ffb02e" label="Prestige progress" />
          <div className="mt-1 text-xs text-muted">
            {formatBig(c.lifetimeRun)} / {formatBig(CLICKER_RULES.prestigeThreshold)} · prestiged {c.prestiges}×
          </div>
        </div>
      </section>

      <Modal open={prestigeOpen} onClose={() => setPrestigeOpen(false)} title="Melt down the reactor?">
        <div className="space-y-3 text-sm">
          <p>
            You will gain <b className="text-[#ffb02e]">{shardsPreview} doom shards</b> (+{Math.round(shardsPreview * CLICKER_RULES.shardBonus * 100)}% click & passive, permanently).
          </p>
          <div className="rounded-xl border border-hot/50 bg-hot/10 p-3">
            <div className="label !text-sm text-hot">Resets</div>
            <ul className="list-inside list-disc text-white/85">
              <li>Reactor braincells ({formatBig(balance)})</li>
              <li>All upgrades and generators</li>
              <li>This run&apos;s earnings and reactor level</li>
            </ul>
          </div>
          <div className="rounded-xl border border-neon/50 bg-neon/10 p-3">
            <div className="label !text-sm text-neon">Keeps</div>
            <ul className="list-inside list-disc text-white/85">
              <li>Doom shards ({c.shards} → {c.shards + shardsPreview}) and prestige count</li>
              <li>Lifetime stats, clicks, claimed missions, achievements</li>
              <li>Upgrade unlocks based on lifetime earnings</li>
              <li>Your pet, inventory, wallet and everything outside DOOMCLICKER</li>
            </ul>
          </div>
          {c.pendingOffline && <p className="text-hot">Claim your offline earnings first.</p>}
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setPrestigeOpen(false)} data-autofocus>
              Cancel
            </button>
            <button
              className="btn-hot"
              disabled={shardsPreview <= 0 || !!c.pendingOffline || pending.has("clickerPrestige")}
              onClick={async () => {
                const r = await act({ type: "clickerPrestige", confirm: true });
                if (r.ok) {
                  setPrestigeOpen(false);
                  fx.burst(undefined, undefined, ["#ffb02e", "#ff2e97", "#e8ff3a"], 120);
                  fx.sfx("evolve");
                }
              }}
            >
              Confirm meltdown
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showOffline} onClose={() => setOfflineDismissed(c.pendingOffline?.at ?? null)} title="While you were away…">
        {c.pendingOffline && (
          <div className="space-y-3 text-center">
            <div className="text-5xl">😴</div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Time away" value={formatDuration(c.pendingOffline.seconds * 1000)} color="#2ef2ff" />
              <Stat label="Generators" value={c.pendingOffline.generators} color="#a855ff" />
              <Stat label="Earned" value={formatBig(c.pendingOffline.amount)} color="#39ff88" />
            </div>
            <p className="text-xs text-muted">Offline time is capped at {CLICKER_RULES.offlineCapMs / 3_600_000} hours and calculated by the server clock.</p>
            <button
              className="btn-neon w-full"
              data-autofocus
              disabled={pending.has("clickerClaimOffline")}
              onClick={async (e) => {
                fx.burstAt(e.currentTarget, undefined, 60);
                await act({ type: "clickerClaimOffline" });
              }}
            >
              Claim {formatBig(c.pendingOffline.amount)} braincells
            </button>
          </div>
        )}
      </Modal>

      {c.pendingOffline && !showOffline && (
        <button className="btn-neon fixed bottom-24 left-1/2 z-40 -translate-x-1/2 md:bottom-6" onClick={() => setOfflineDismissed(null)}>
          😴 Claim offline earnings
        </button>
      )}
    </div>
  );
}
