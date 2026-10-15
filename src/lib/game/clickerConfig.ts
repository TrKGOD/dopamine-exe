/**
 * DOOMCLICKER balancing. Every number the clicker uses lives here.
 * (No imports from config.ts so achievements can read this without a cycle.)
 */
import type { ClickerState, Personality, Reward } from "./types";

export type ClickerUpgradeKind = "click" | "generator";

export interface ClickerUpgrade {
  id: string;
  name: string;
  emoji: string;
  description: string;
  kind: ClickerUpgradeKind;
  baseCost: number;
  /** price multiplier per owned unit (exponential growth) */
  costScale: number;
  /** click power added per unit, or braincells/sec per unit */
  effect: number;
  unlock: { lifetime?: number; petLevel?: number; prestiges?: number };
}

export const CLICKER_UPGRADES: ClickerUpgrade[] = [
  { id: "rusty_mouse", name: "Rusty Mouse", emoji: "🖱️", description: "Squeaks on every click. So do you.", kind: "click", baseCost: 15, costScale: 1.15, effect: 1, unlock: {} },
  { id: "braincell_miner", name: "Braincell Miner", emoji: "⛏️", description: "Digs braincells out of old group chats.", kind: "generator", baseCost: 50, costScale: 1.15, effect: 1, unlock: {} },
  { id: "goblin_intern", name: "Goblin Intern", emoji: "👺", description: "Unpaid. Unhinged. Surprisingly productive.", kind: "generator", baseCost: 400, costScale: 1.15, effect: 6, unlock: { lifetime: 200 } },
  { id: "meme_farm", name: "Meme Farm", emoji: "🌾", description: "Organic, free-range, slightly reposted memes.", kind: "generator", baseCost: 3_000, costScale: 1.15, effect: 35, unlock: { lifetime: 2_000 } },
  { id: "skibidi_reactor", name: "Skibidi Reactor", emoji: "☢️", description: "Nobody knows how it works. It just goes.", kind: "generator", baseCost: 25_000, costScale: 1.15, effect: 180, unlock: { lifetime: 15_000 } },
  { id: "quantum_rat", name: "Quantum Rat", emoji: "🐀", description: "Clicks in all timelines at once. Huge click power.", kind: "click", baseCost: 60_000, costScale: 1.2, effect: 25, unlock: { lifetime: 40_000 } },
  { id: "blorbo_assistant", name: "Blorbo's Assistant", emoji: "🧑‍🔧", description: "Your pet hired help. The help is also a pet.", kind: "generator", baseCost: 300_000, costScale: 1.15, effect: 1_000, unlock: { lifetime: 150_000, petLevel: 3 } },
  { id: "the_algorithm", name: "The Algorithm", emoji: "🧿", description: "It recommends braincells to itself. Forever.", kind: "generator", baseCost: 4_000_000, costScale: 1.15, effect: 7_500, unlock: { lifetime: 2_000_000 } },
];

export const CLICKER_RULES = {
  /** gaps up to this long count as "online" and are paid out immediately */
  onlineWindowMs: 90_000,
  /** maximum offline accumulation */
  offlineCapMs: 8 * 3_600_000,
  /** server-side click cap: refill rate and burst size of the token bucket */
  maxCps: 20,
  clickBurst: 40,
  maxClicksPerSync: 200,
  maxBulk: 100,
  prestigeThreshold: 1_000_000,
  /** each prestige shard: +10% click power and passive production, permanently */
  shardBonus: 0.1,
  /** reactor level: +2% click power per level (level = digits of run earnings - 1) */
  reactorLevelBonus: 0.02,
  /** feeding the pet: modest temporary buff, no penalty for not feeding */
  sugarRush: { bonus: 0.25, durationMs: 120_000 },
};

/** Pet personality perks. Cosmetics never change stats. */
export const PET_CLICKER_PERKS: Record<Personality, { click: number; passive: number; label: string }> = {
  gremlin: { click: 0.1, passive: 0, label: "Gremlin: aggressive clicking" },
  sigma: { click: 0.05, passive: 0.05, label: "Sigma Rodent: balanced grindset" },
  corporate: { click: 0, passive: 0.15, label: "Corporate Rat: optimized workflows" },
  goblin: { click: 0, passive: 0.1, label: "Goblin Trader: shady supply chain" },
  capybara: { click: 0, passive: 0.1, label: "Cosmic Capybara: calm compounding" },
  radcat: { click: 0.15, passive: 0, label: "Radioactive Cat: glowing paws" },
  entity: { click: 0.08, passive: 0.08, label: "Ancient Entity: dial-up synergy" },
};

/** Pet evolution stage → click bonus (index = stage - 1) */
export const PET_STAGE_CLICK_BONUS = [0, 0.05, 0.1, 0.15, 0.25];

/** Visual-only reactor skins unlocked by pet level. */
export const REACTOR_SKINS = [
  { petLevel: 1, name: "Factory Default", core: "#39ff88", ring: "#a855ff" },
  { petLevel: 5, name: "Hot Pink Meltdown", core: "#ff2e97", ring: "#e8ff3a" },
  { petLevel: 10, name: "Ice Core", core: "#2ef2ff", ring: "#ff2e97" },
  { petLevel: 15, name: "Glitch Singularity", core: "#e8ff3a", ring: "#2ef2ff" },
];

export interface ClickerMission {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: (c: ClickerState) => number;
  reward: Reward;
}

/** One-time missions. Progress uses all-time counters so prestige never breaks them. */
export const CLICKER_MISSIONS: ClickerMission[] = [
  { id: "cm_click100", title: "Warm Up The Finger", description: "Click the core 100 times", target: 100, progress: (c) => c.totalClicks, reward: { xp: 30, coins: 20 } },
  { id: "cm_gen10", title: "Middle Management", description: "Own 10 generators at once", target: 10, progress: (c) => generatorCount(c), reward: { items: [{ id: "cap_basic", qty: 1 }] } },
  { id: "cm_10k", title: "Five Digits Of Rot", description: "Earn 10,000 reactor braincells (all-time)", target: 10_000, progress: (c) => c.lifetimeAll, reward: { tokens: 3, xp: 40 } },
  { id: "cm_offline", title: "Touch Grass (Productively)", description: "Claim offline earnings once", target: 1, progress: (c) => c.offlineClaims, reward: { items: [{ id: "food_drink", qty: 1 }] } },
  { id: "cm_algorithm", title: "Become The Algorithm", description: "Own The Algorithm", target: 1, progress: (c) => c.owned.the_algorithm ?? 0, reward: { tokens: 10 } },
  { id: "cm_prestige", title: "Burn It Down", description: "Prestige once", target: 1, progress: (c) => c.prestiges, reward: { items: [{ id: "cap_glitch", qty: 1 }] } },
];

// ── Pure formulas ─────────────────────────────────────────────────────────

export function getUpgrade(id: string) {
  return CLICKER_UPGRADES.find((u) => u.id === id);
}

export function generatorCount(c: Pick<ClickerState, "owned">) {
  return CLICKER_UPGRADES.filter((u) => u.kind === "generator").reduce((n, u) => n + (c.owned[u.id] ?? 0), 0);
}

/** Total price of buying `qty` units when `owned` are already owned (geometric series). */
export function upgradeCost(u: ClickerUpgrade, owned: number, qty: number) {
  if (qty <= 0) return 0;
  const r = u.costScale;
  return Math.ceil((u.baseCost * Math.pow(r, owned) * (Math.pow(r, qty) - 1)) / (r - 1));
}

/** Largest qty affordable with `balance` (capped). */
export function maxAffordable(u: ClickerUpgrade, owned: number, balance: number, cap = CLICKER_RULES.maxBulk) {
  if (balance <= 0) return 0;
  const r = u.costScale;
  let n = Math.floor(Math.log((balance * (r - 1)) / (u.baseCost * Math.pow(r, owned)) + 1) / Math.log(r));
  n = Math.max(0, Math.min(cap, n));
  while (n > 0 && upgradeCost(u, owned, n) > balance) n--; // guard float rounding
  return n;
}

export function isUnlocked(u: ClickerUpgrade, c: Pick<ClickerState, "lifetimeAll" | "prestiges">, petLevel: number) {
  return (u.unlock.lifetime ?? 0) <= c.lifetimeAll && (u.unlock.petLevel ?? 0) <= petLevel && (u.unlock.prestiges ?? 0) <= c.prestiges;
}

export function reactorLevel(lifetimeRun: number) {
  return lifetimeRun < 10 ? 0 : Math.floor(Math.log10(lifetimeRun));
}

/** Deterministic prestige reward: 3 × √(run earnings / threshold), floored. */
export function shardsFor(lifetimeRun: number) {
  if (lifetimeRun < CLICKER_RULES.prestigeThreshold) return 0;
  return Math.floor(3 * Math.sqrt(lifetimeRun / CLICKER_RULES.prestigeThreshold));
}

export function newClicker(now: number): ClickerState {
  return {
    version: 1,
    braincells: 0,
    lifetimeRun: 0,
    lifetimeAll: 0,
    totalClicks: 0,
    owned: {},
    lastTickAt: now,
    clickBudget: CLICKER_RULES.clickBurst,
    budgetAt: now,
    buffUntil: 0,
    shards: 0,
    prestiges: 0,
    pendingOffline: null,
    offlineEarned: 0,
    offlineClaims: 0,
    missionsClaimed: [],
  };
}
