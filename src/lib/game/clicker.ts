/**
 * DOOMCLICKER game math. The ONLY place that changes the clicker balance.
 * Runs on the server inside the per-player lock; the client imports the same
 * functions purely to display projections.
 */
import { stageForLevel } from "./config";
import {
  CLICKER_MISSIONS,
  CLICKER_RULES,
  CLICKER_UPGRADES,
  PET_CLICKER_PERKS,
  PET_STAGE_CLICK_BONUS,
  generatorCount,
  getUpgrade,
  isUnlocked,
  reactorLevel,
  shardsFor,
  upgradeCost,
} from "./clickerConfig";
import type { ClickerState, PublicPlayer, Reward } from "./types";

type P = Pick<PublicPlayer, "clicker" | "pet">;

export interface ClickerBonus {
  id: string;
  label: string;
  click: number; // fractional, e.g. 0.1 = +10%
  passive: number;
}

/** Every active bonus source, listed separately so the UI can show them. */
export function clickerBonuses(s: P, now: number, opts: { includeBuff?: boolean } = {}): ClickerBonus[] {
  const c = s.clicker;
  const list: ClickerBonus[] = [];
  if (c.shards > 0) list.push({ id: "shards", label: `${c.shards} prestige shard${c.shards === 1 ? "" : "s"}`, click: c.shards * CLICKER_RULES.shardBonus, passive: c.shards * CLICKER_RULES.shardBonus });
  const lvl = reactorLevel(c.lifetimeRun);
  if (lvl > 0) list.push({ id: "reactor", label: `Reactor level ${lvl}`, click: lvl * CLICKER_RULES.reactorLevelBonus, passive: 0 });
  const perk = PET_CLICKER_PERKS[s.pet.personality];
  if (perk.click || perk.passive) list.push({ id: "personality", label: perk.label, click: perk.click, passive: perk.passive });
  const stage = stageForLevel(s.pet.level);
  const stageBonus = PET_STAGE_CLICK_BONUS[stage.stage - 1] ?? 0;
  if (stageBonus > 0) list.push({ id: "stage", label: `Pet evolution: ${stage.name}`, click: stageBonus, passive: 0 });
  if ((opts.includeBuff ?? true) && now < c.buffUntil) {
    list.push({ id: "sugar", label: "Sugar Rush (pet was fed)", click: CLICKER_RULES.sugarRush.bonus, passive: CLICKER_RULES.sugarRush.bonus });
  }
  return list;
}

/** Bonuses from different sources multiply: Π(1 + bonus). */
export function multipliers(bonuses: ClickerBonus[]) {
  return bonuses.reduce((m, b) => ({ click: m.click * (1 + b.click), passive: m.passive * (1 + b.passive) }), { click: 1, passive: 1 });
}

export function baseClick(c: Pick<ClickerState, "owned">) {
  return 1 + CLICKER_UPGRADES.filter((u) => u.kind === "click").reduce((n, u) => n + (c.owned[u.id] ?? 0) * u.effect, 0);
}

export function basePps(c: Pick<ClickerState, "owned">) {
  return CLICKER_UPGRADES.filter((u) => u.kind === "generator").reduce((n, u) => n + (c.owned[u.id] ?? 0) * u.effect, 0);
}

export function clickPower(s: P, now: number) {
  return baseClick(s.clicker) * multipliers(clickerBonuses(s, now)).click;
}

export function productionPerSecond(s: P, now: number) {
  return basePps(s.clicker) * multipliers(clickerBonuses(s, now)).passive;
}

/** Passive output between two server timestamps, including partial Sugar Rush overlap. */
export function productionBetween(s: P, from: number, to: number) {
  if (!(to > from)) return 0;
  const base = basePps(s.clicker) * multipliers(clickerBonuses(s, from, { includeBuff: false })).passive;
  const buffOverlap = Math.max(0, Math.min(to, s.clicker.buffUntil) - from);
  return (base * ((to - from) + buffOverlap * CLICKER_RULES.sugarRush.bonus)) / 1000;
}

function earn(c: ClickerState, amount: number) {
  if (!(amount > 0) || !Number.isFinite(amount)) return;
  c.braincells += amount;
  c.lifetimeRun += amount;
  c.lifetimeAll += amount;
}

/**
 * Apply elapsed time. Short gaps are paid immediately; long gaps become a
 * claimable offline summary (capped). lastTickAt always advances, so the same
 * interval can never be paid twice — even with several tabs open.
 */
export function clickerTick(s: P, now: number) {
  const c = s.clicker;
  const elapsed = now - c.lastTickAt;
  if (!Number.isFinite(elapsed) || elapsed < 0) {
    c.lastTickAt = now; // invalid or future timestamp: resync, pay nothing
    return;
  }
  if (elapsed === 0) return;
  if (elapsed <= CLICKER_RULES.onlineWindowMs) {
    earn(c, productionBetween(s, c.lastTickAt, now));
  } else {
    const capped = Math.min(elapsed, CLICKER_RULES.offlineCapMs);
    const amount = productionBetween(s, c.lastTickAt, c.lastTickAt + capped);
    if (amount > 0) {
      const prev = c.pendingOffline;
      let seconds = (prev?.seconds ?? 0) + capped / 1000;
      let total = (prev?.amount ?? 0) + amount;
      const capS = CLICKER_RULES.offlineCapMs / 1000;
      if (seconds > capS) {
        total *= capS / seconds;
        seconds = capS;
      }
      c.pendingOffline = { seconds: Math.round(seconds), amount: Math.floor(total), generators: generatorCount(c), at: now };
    }
  }
  c.lastTickAt = now;
}

/** Accept clicks through a token bucket so autoclickers / duplicate tabs can't exceed the cap. */
export function applyClicks(s: P, requested: number, now: number) {
  const c = s.clicker;
  const n = Math.max(0, Math.min(Math.floor(requested), CLICKER_RULES.maxClicksPerSync));
  const since = Math.max(0, now - c.budgetAt);
  c.clickBudget = Math.min(CLICKER_RULES.clickBurst, c.clickBudget + (since / 1000) * CLICKER_RULES.maxCps);
  c.budgetAt = now;
  const accepted = Math.min(n, Math.floor(c.clickBudget));
  if (accepted <= 0) return { accepted: 0, earned: 0 };
  c.clickBudget -= accepted;
  const earned = accepted * clickPower(s, now);
  earn(c, earned);
  c.totalClicks += accepted;
  return { accepted, earned };
}

export type ClickerResult = { ok: true; detail?: string } | { ok: false; error: string };

export function buyUpgrade(s: P, upgradeId: string, qty: number): ClickerResult {
  const u = getUpgrade(upgradeId);
  if (!u) return { ok: false, error: "unknown_upgrade" };
  if (!Number.isInteger(qty) || qty < 1 || qty > CLICKER_RULES.maxBulk) return { ok: false, error: "invalid_quantity" };
  const c = s.clicker;
  if (!isUnlocked(u, c, s.pet.level)) return { ok: false, error: "locked" };
  const owned = c.owned[u.id] ?? 0;
  const cost = upgradeCost(u, owned, qty);
  if (!Number.isFinite(cost) || cost <= 0) return { ok: false, error: "invalid_cost" };
  if (c.braincells < cost) return { ok: false, error: "insufficient_funds" };
  c.braincells -= cost;
  c.owned[u.id] = owned + qty;
  return { ok: true, detail: `${qty}× ${u.name}` };
}

export function claimOffline(s: P): ClickerResult {
  const c = s.clicker;
  if (!c.pendingOffline) return { ok: false, error: "nothing_to_claim" };
  earn(c, c.pendingOffline.amount);
  c.offlineEarned += c.pendingOffline.amount;
  c.offlineClaims++;
  c.pendingOffline = null;
  return { ok: true };
}

/** Resets the run; keeps shards, prestige count, all-time stats, missions and everything outside the clicker. */
export function prestige(s: P): ClickerResult & { shards?: number } {
  const c = s.clicker;
  if (c.pendingOffline) return { ok: false, error: "claim_offline_first" };
  const gained = shardsFor(c.lifetimeRun);
  if (gained <= 0) return { ok: false, error: "prestige_locked" };
  c.shards += gained;
  c.prestiges++;
  c.braincells = 0;
  c.lifetimeRun = 0;
  c.owned = {};
  return { ok: true, shards: gained };
}

export function claimClickerMission(s: P, missionId: string, grant: (r: Reward, source: string) => void): ClickerResult {
  const m = CLICKER_MISSIONS.find((x) => x.id === missionId);
  if (!m) return { ok: false, error: "unknown_mission" };
  const c = s.clicker;
  if (c.missionsClaimed.includes(m.id)) return { ok: false, error: "already_claimed" };
  if (m.progress(c) < m.target) return { ok: false, error: "incomplete" };
  c.missionsClaimed.push(m.id);
  grant(m.reward, `DOOMCLICKER: ${m.title}`);
  return { ok: true };
}

/** Called when the pet is fed in the main game. Non-stacking, refreshes the timer. */
export function applySugarRush(s: P, now: number) {
  s.clicker.buffUntil = Math.max(s.clicker.buffUntil, now + CLICKER_RULES.sugarRush.durationMs);
}

export function formatBig(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  const abs = Math.abs(n);
  if (abs < 1000) return abs < 10 && abs % 1 ? n.toFixed(1) : Math.floor(n).toLocaleString("en-US");
  const units = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  let i = -1;
  let v = abs;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${n < 0 ? "-" : ""}${v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)}${units[i]}`;
}
