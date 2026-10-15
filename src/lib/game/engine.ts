/**
 * Pure game engine. The server is the only caller that persists results;
 * every reward, cooldown and random roll is decided here, never by the client.
 */
import type { GameAction } from "./actions";
import {
  CAPSULE_TABLES,
  CHAOS_EVENTS,
  CHAOS_ROLL_CHANCE,
  CHAOS_ROLL_INTERVAL_MS,
  DNC_COOLDOWN_MS,
  FEED_RULES,
  NONCE_MEMORY,
  PERSONALITY_META,
  PET_RULES,
  RARITY_META,
  ROULETTE_COOLDOWN_MS,
  ROULETTE_SEGMENTS,
  SEASON,
  SHOP,
  STARTER_PERSONALITIES,
  STARTING_COINS,
  STARTING_ITEMS,
  ACHIEVEMENTS,
  _setRarityLookup,
  levelFromXp,
  petXpToNext,
  playerXpToNext,
  stageForLevel,
  type ChaosId,
  type QuestMetric,
} from "./config";
import { applyClicks, applySugarRush, buyUpgrade, claimClickerMission, claimOffline, clickerTick, formatBig, prestige } from "./clicker";
import { newClicker } from "./clickerConfig";
import { ITEMS, findCombo, getItem, poolItems } from "./items";
import { weightedPick, type Rng } from "./rng";
import { activeQuests, hasEffect, questMetricValue } from "./selectors";
import { dayKey, weekKey } from "./time";
import { SLOTS, type ActionOutcome, type Category, type GameEffect, type PlayerState, type Reward, type Slot } from "./types";

_setRarityLookup((id) => ITEMS[id]?.rarity);

export interface EngineCtx {
  now: number;
  rng: Rng;
  /** resolves a post id to its category, or undefined if the post does not exist / is not visible */
  postCategory: (postId: string) => Category | undefined;
}

export const LEVEL_UP_REWARD: Reward = { coins: 25, tokens: 1 };

// ── Factory ────────────────────────────────────────────────────────────────
export function createPlayer(id: string, publicId: string, now: number): PlayerState {
  const s: PlayerState = {
    version: 1,
    id,
    publicId,
    createdAt: now,
    onboarded: false,
    displayName: `anon_${publicId.slice(0, 5)}`,
    xp: 0,
    level: 1,
    coins: STARTING_COINS,
    tokens: 0,
    inventory: {},
    equippedTitle: null,
    equippedBadges: [],
    activeEffects: [],
    pet: {
      name: "Blorbo",
      personality: "gremlin",
      xp: 0,
      level: 1,
      hunger: 70,
      mood: 70,
      lastTickAt: now,
      equipped: {},
      mutations: [],
      formsSeen: [],
      combosSeen: [],
      fedCount: 0,
      lastFedAt: 0,
      lastPatAt: 0,
    },
    feed: { viewed: [], liked: [], likedEver: [], bookmarked: [], shared: [], categoryViews: {}, discovered: [], masteryClaimed: [], lastViewRewardAt: 0 },
    roulette: { nextSpinAt: now, totalSpins: 0, history: [] },
    quests: { dailyKey: dayKey(now), weeklyKey: weekKey(now), daily: {}, weekly: {}, dailyCategories: [], weeklyCategories: [], claimed: [] },
    stats: { views: 0, likes: 0, feeds: 0, pats: 0, spins: 0, capsules: 0, events: 0, dnc: 0, shares: 0, itemsFound: 0 },
    achievements: [],
    season: { id: SEASON.id, points: 0, claimedTiers: [] },
    weekly: { key: weekKey(now), xp: 0 },
    events: { active: null, nextRollAt: now + CHAOS_ROLL_INTERVAL_MS, nextDncAt: now, log: [] },
    recent: [],
    clicker: newClicker(now),
    processedActions: [],
  };
  for (const it of STARTING_ITEMS) addItem(s, it.id, it.qty, "Starter pack", now, []);
  s.recent = [];
  return s;
}

/** Fill in any fields missing from older saves so new features never crash old players. */
export function normalizePlayer(p: PlayerState): PlayerState {
  const base = createPlayer(p.id, p.publicId, p.createdAt ?? Date.now());
  const merged = { ...base, ...p } as PlayerState;
  for (const key of ["pet", "feed", "roulette", "quests", "stats", "season", "weekly", "events", "clicker"] as const) {
    (merged as unknown as Record<string, unknown>)[key] = { ...(base[key] as object), ...((p[key] as object) ?? {}) };
  }
  return merged;
}

// ── Passive time-based updates (never punishing) ──────────────────────────
export function tick(s: PlayerState, now: number) {
  const hours = Math.max(0, now - s.pet.lastTickAt) / 3_600_000;
  if (hours > 0) {
    s.pet.hunger = Math.max(PET_RULES.hungerFloor, s.pet.hunger - PET_RULES.hungerDecayPerHour * hours);
    s.pet.mood = Math.max(PET_RULES.moodFloor, s.pet.mood - PET_RULES.moodDecayPerHour * hours);
    s.pet.lastTickAt = now;
  }
  const dk = dayKey(now);
  if (s.quests.dailyKey !== dk) {
    s.quests.dailyKey = dk;
    s.quests.daily = {};
    s.quests.dailyCategories = [];
  }
  const wk = weekKey(now);
  if (s.quests.weeklyKey !== wk) {
    s.quests.weeklyKey = wk;
    s.quests.weekly = {};
    s.quests.weeklyCategories = [];
  }
  if (s.weekly.key !== wk) s.weekly = { key: wk, xp: 0 };
  // keep only claims for current periods
  s.quests.claimed = s.quests.claimed.filter((c) => c.startsWith(dk + ":") || c.startsWith(wk + ":"));
  s.activeEffects = s.activeEffects.filter((e) => e.until > now);
  if (s.events.active && s.events.active.endsAt <= now) s.events.active = null;
  clickerTick(s, now);
}

// ── Reward plumbing ───────────────────────────────────────────────────────
function addItem(s: PlayerState, itemId: string, qty: number, source: string, now: number, fx: GameEffect[]): string {
  const def = getItem(itemId);
  if (!def || qty <= 0) return "";
  const existing = s.inventory[itemId];
  if (!def.stackable && existing) {
    const tokens = RARITY_META[def.rarity].dupeTokens;
    s.tokens += tokens;
    fx.push({ type: "item", itemId, qty: 0, source, duplicateTokens: tokens });
    return `${def.name} (dupe → ${tokens}💎)`;
  }
  if (existing) {
    existing.qty += def.stackable ? qty : 0;
    existing.lastAcquiredAt = now;
  } else {
    s.inventory[itemId] = { itemId, qty: def.stackable ? qty : 1, firstAcquiredAt: now, lastAcquiredAt: now };
    s.stats.itemsFound++;
  }
  s.recent.unshift({ at: now, itemId, label: def.name, rarity: def.rarity, source });
  s.recent = s.recent.slice(0, 20);
  fx.push({ type: "item", itemId, qty, source });
  return qty > 1 ? `${qty}× ${def.name}` : def.name;
}

function addPlayerXp(s: PlayerState, amount: number, reason: string, ctx: EngineCtx, fx: GameEffect[]) {
  if (amount <= 0) return;
  s.xp += amount;
  s.weekly.xp += amount;
  fx.push({ type: "xp", amount, reason });
  const { level } = levelFromXp(s.xp, playerXpToNext);
  while (s.level < level) {
    s.level++;
    fx.push({ type: "levelUp", level: s.level });
    grant(s, LEVEL_UP_REWARD, `Level ${s.level}`, ctx, fx);
  }
  // season points derive from lifetime XP; tiers auto-claim
  s.season.points = Math.floor(s.xp / SEASON.xpPerPoint);
  for (const t of SEASON.tiers) {
    if (s.season.points >= t.points && !s.season.claimedTiers.includes(t.tier)) {
      s.season.claimedTiers.push(t.tier);
      fx.push({ type: "seasonTier", tier: t.tier });
      grant(s, t.reward, `Season tier ${t.tier}`, ctx, fx);
    }
  }
}

function addPetXp(s: PlayerState, amount: number, ctx: EngineCtx, fx: GameEffect[]) {
  if (amount <= 0) return;
  const before = stageForLevel(s.pet.level);
  s.pet.xp += amount;
  fx.push({ type: "petXp", amount });
  const { level } = levelFromXp(s.pet.xp, petXpToNext);
  if (level > s.pet.level) {
    s.pet.level = level;
    fx.push({ type: "petLevelUp", level });
    const lines = PERSONALITY_META[s.pet.personality].lines.levelUp;
    fx.push({ type: "petSay", text: lines[Math.floor(ctx.rng() * lines.length)] });
    const after = stageForLevel(level);
    if (after.stage !== before.stage) {
      fx.push({ type: "evolve", stage: after.stage, stageName: after.name });
      markForm(s);
    }
  }
}

function markForm(s: PlayerState) {
  const form = `${s.pet.personality}:${stageForLevel(s.pet.level).stage}`;
  if (!s.pet.formsSeen.includes(form)) s.pet.formsSeen.push(form);
}

/** Apply a reward bundle. Returns human readable parts. */
export function grant(s: PlayerState, r: Reward, source: string, ctx: EngineCtx, fx: GameEffect[]): string[] {
  const parts: string[] = [];
  if (r.coins) {
    s.coins += r.coins;
    fx.push({ type: "coins", amount: r.coins });
    parts.push(`${r.coins} 🧠`);
  }
  if (r.tokens) {
    s.tokens += r.tokens;
    fx.push({ type: "tokens", amount: r.tokens });
    parts.push(`${r.tokens} 💎`);
  }
  for (const it of r.items ?? []) {
    const p = addItem(s, it.id, it.qty, source, ctx.now, fx);
    if (p) parts.push(p);
  }
  if (r.pool) {
    const candidates = poolItems(r.pool.kind, r.pool.rarity);
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(ctx.rng() * candidates.length)];
      parts.push(addItem(s, pick.id, 1, source, ctx.now, fx));
    } else {
      s.coins += 50;
      parts.push("50 🧠 (pool empty)");
    }
  }
  if (r.petXp) {
    addPetXp(s, r.petXp, ctx, fx);
    parts.push(`${r.petXp} Pet XP`);
  }
  if (r.xp) {
    addPlayerXp(s, r.xp, source, ctx, fx);
    parts.push(`${r.xp} XP`);
  }
  return parts;
}

function bump(s: PlayerState, metric: Exclude<QuestMetric, "categories">, n = 1) {
  s.quests.daily[metric] = (s.quests.daily[metric] ?? 0) + n;
  s.quests.weekly[metric] = (s.quests.weekly[metric] ?? 0) + n;
}

function checkAchievements(s: PlayerState, ctx: EngineCtx, fx: GameEffect[]) {
  // loop because achievement rewards can unlock further achievements
  for (let guard = 0; guard < 5; guard++) {
    let changed = false;
    for (const a of ACHIEVEMENTS) {
      if (s.achievements.includes(a.id)) continue;
      const [cur, target] = a.progress(s);
      if (cur >= target) {
        s.achievements.push(a.id);
        fx.push({ type: "achievement", id: a.id });
        s.recent.unshift({ at: ctx.now, label: `🏆 ${a.name}`, rarity: a.rarity, source: "Achievement" });
        s.recent = s.recent.slice(0, 20);
        grant(s, a.reward, `Achievement: ${a.name}`, ctx, fx);
        changed = true;
      }
    }
    if (!changed) break;
  }
}

function petSay(s: PlayerState, kind: keyof (typeof PERSONALITY_META)["gremlin"]["lines"], ctx: EngineCtx, fx: GameEffect[]) {
  const lines = PERSONALITY_META[s.pet.personality].lines[kind];
  fx.push({ type: "petSay", text: lines[Math.floor(ctx.rng() * lines.length)] });
}

function cleanName(raw: string, min: number, max: number): string | null {
  const v = raw
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (v.length < min || v.length > max) return null;
  if (/(https?:|www\.)/i.test(v)) return null;
  return v;
}

// ── Chaos events ──────────────────────────────────────────────────────────
function startEvent(s: PlayerState, id: ChaosId, ctx: EngineCtx, fx: GameEffect[]) {
  const def = CHAOS_EVENTS[id];
  s.events.active = {
    id,
    startedAt: ctx.now,
    endsAt: ctx.now + def.durationMs,
    claimed: false,
    hits: [],
    progress: 0,
    mutationId: id === "mutation" ? weightedPick(poolItems("mutation"), (m) => (m.rarity === "mythical" ? 1 : m.rarity === "legendary" ? 3 : 6), ctx.rng).item.id : undefined,
  };
  s.events.nextRollAt = ctx.now + def.durationMs + CHAOS_ROLL_INTERVAL_MS;
  s.events.log.unshift({ at: ctx.now, id, name: def.name, outcome: "In progress" });
  s.events.log = s.events.log.slice(0, 30);
  s.stats.events++;
  bump(s, "events");
  fx.push({ type: "event", id });
}

function setLogOutcome(s: PlayerState, outcome: string) {
  const a = s.events.active;
  const entry = a && s.events.log.find((l) => l.at === a.startedAt && l.id === a.id);
  if (entry) entry.outcome = outcome;
}

function randomEventId(rng: Rng): ChaosId {
  const ids = Object.keys(CHAOS_EVENTS) as ChaosId[];
  return weightedPick(ids, (id) => CHAOS_EVENTS[id].weight, rng).item;
}

// ── Actions ───────────────────────────────────────────────────────────────
const fail = (error: string, effects: GameEffect[] = []): ActionOutcome => ({ ok: false, error, effects });

/**
 * Apply one client action with replay protection. Mutates `s` in place;
 * callers should pass a clone and only persist when `ok` is true.
 */
export function applyEnvelope(s: PlayerState, nonce: string, action: GameAction, ctx: EngineCtx): ActionOutcome {
  if (s.processedActions.includes(nonce)) return fail("duplicate");
  tick(s, ctx.now);
  const out = applyAction(s, action, ctx);
  s.processedActions.push(nonce);
  if (s.processedActions.length > NONCE_MEMORY) s.processedActions = s.processedActions.slice(-NONCE_MEMORY);
  if (out.ok) checkAchievements(s, ctx, out.effects);
  return out;
}

export function applyAction(s: PlayerState, a: GameAction, ctx: EngineCtx): ActionOutcome {
  const fx: GameEffect[] = [];
  const now = ctx.now;

  if (!s.onboarded && a.type !== "onboard") return fail("not_onboarded");

  switch (a.type) {
    case "onboard": {
      if (s.onboarded) return fail("already_onboarded");
      if (!STARTER_PERSONALITIES.includes(a.personality)) return fail("locked_personality");
      const nm = cleanName(a.name, 1, 20);
      if (!nm) return fail("invalid_name");
      s.pet.name = nm;
      s.pet.personality = a.personality;
      s.onboarded = true;
      markForm(s);
      fx.push({ type: "toast", text: `${nm} has hatched. God help us all.`, tone: "good" });
      petSay(s, "idle", ctx, fx);
      return { ok: true, effects: fx };
    }

    case "viewPost": {
      const cat = ctx.postCategory(a.postId);
      if (!cat) return fail("unknown_post");
      if (s.feed.viewed.includes(a.postId)) return { ok: true, effects: [] }; // re-watch: no reward
      if (now - s.feed.lastViewRewardAt < FEED_RULES.minRewardGapMs) return fail("too_fast");
      s.feed.viewed.push(a.postId);
      s.feed.lastViewRewardAt = now;
      s.stats.views++;
      bump(s, "views");
      if (!s.quests.dailyCategories.includes(cat)) s.quests.dailyCategories.push(cat);
      if (!s.quests.weeklyCategories.includes(cat)) s.quests.weeklyCategories.push(cat);
      const ev = s.events.active;
      const overload = ev?.id === "overload";
      const double = hasEffect(s, "fx_doublexp", now);
      const mult = (overload ? 2 : 1) * (double ? 2 : 1);
      grant(s, { xp: FEED_RULES.newPost.xp * mult, coins: FEED_RULES.newPost.coins }, mult > 1 ? `New post ×${mult}` : "New post", ctx, fx);
      if (ev?.id === "ceo") ev.progress++;
      s.feed.categoryViews[cat] = (s.feed.categoryViews[cat] ?? 0) + 1;
      if (!s.feed.discovered.includes(cat)) {
        s.feed.discovered.push(cat);
        fx.push({ type: "discovery", category: cat });
        grant(s, FEED_RULES.newCategory, "New category", ctx, fx);
      }
      for (const t of FEED_RULES.masteryTiers) {
        const key = `${cat}:${t.tier}`;
        if ((s.feed.categoryViews[cat] ?? 0) >= t.views && !s.feed.masteryClaimed.includes(key)) {
          s.feed.masteryClaimed.push(key);
          fx.push({ type: "mastery", category: cat, tier: t.tier });
          grant(s, t.reward, `${cat} mastery`, ctx, fx);
        }
      }
      return { ok: true, effects: fx };
    }

    case "likePost": {
      // Idempotent "set" (not a toggle): the client's heart is per viewing instance,
      // so a re-like of an already-liked post must never flip the persisted like off.
      if (!ctx.postCategory(a.postId)) return fail("unknown_post");
      const i = s.feed.liked.indexOf(a.postId);
      if (!a.liked) {
        if (i >= 0) s.feed.liked.splice(i, 1);
        return { ok: true, effects: fx };
      }
      if (i < 0) s.feed.liked.push(a.postId);
      if (!s.feed.likedEver.includes(a.postId)) {
        s.feed.likedEver.push(a.postId);
        s.stats.likes++;
        bump(s, "likes");
        grant(s, FEED_RULES.firstLike, "First like", ctx, fx);
      }
      return { ok: true, effects: fx };
    }

    case "bookmarkPost": {
      if (!ctx.postCategory(a.postId)) return fail("unknown_post");
      const i = s.feed.bookmarked.indexOf(a.postId);
      if (i >= 0) s.feed.bookmarked.splice(i, 1);
      else s.feed.bookmarked.push(a.postId);
      return { ok: true, effects: fx };
    }

    case "share": {
      if (s.feed.shared.includes(a.target)) return { ok: true, effects: fx };
      s.feed.shared.push(a.target);
      s.feed.shared = s.feed.shared.slice(-300);
      s.stats.shares++;
      bump(s, "shares");
      return { ok: true, effects: fx };
    }

    case "feedPet": {
      const def = getItem(a.itemId);
      const entry = s.inventory[a.itemId];
      if (!def || def.kind !== "food" || !def.food) return fail("not_food");
      if (!entry || entry.qty < 1) return fail("not_owned");
      if (now - s.pet.lastFedAt < PET_RULES.feedCooldownMs) return fail("too_fast");
      entry.qty--;
      if (entry.qty <= 0) delete s.inventory[a.itemId];
      const wellFed = s.pet.hunger >= 60;
      s.pet.hunger = Math.min(100, s.pet.hunger + def.food.hunger);
      s.pet.mood = Math.min(100, s.pet.mood + def.food.mood);
      s.pet.lastFedAt = now;
      s.pet.fedCount++;
      s.stats.feeds++;
      bump(s, "feeds");
      addPetXp(s, Math.round(def.food.petXp * (wellFed ? 1 + PET_RULES.wellFedBonus : 1)), ctx, fx);
      applySugarRush(s, now);
      petSay(s, "fed", ctx, fx);
      return { ok: true, effects: fx };
    }

    case "patPet": {
      s.pet.mood = Math.min(100, s.pet.mood + 2);
      if (now - s.pet.lastPatAt < PET_RULES.patCooldownMs) {
        petSay(s, "pat", ctx, fx);
        return { ok: true, effects: fx };
      }
      s.pet.lastPatAt = now;
      s.pet.mood = Math.min(100, s.pet.mood + PET_RULES.patMood);
      s.stats.pats++;
      bump(s, "pats");
      addPetXp(s, PET_RULES.patPetXp, ctx, fx);
      petSay(s, s.pet.hunger < 35 ? "hungry" : "pat", ctx, fx);
      return { ok: true, effects: fx };
    }

    case "renamePet": {
      const nm = cleanName(a.name, 1, 20);
      if (!nm) return fail("invalid_name");
      s.pet.name = nm;
      fx.push({ type: "toast", text: `Pet renamed to ${nm}. It pretends not to notice.` });
      return { ok: true, effects: fx };
    }

    case "setPersonality": {
      const meta = PERSONALITY_META[a.personality];
      if (s.level < meta.unlockLevel) return fail("locked_personality");
      s.pet.personality = a.personality;
      markForm(s);
      petSay(s, "idle", ctx, fx);
      return { ok: true, effects: fx };
    }

    case "equip": {
      const def = getItem(a.itemId);
      if (!def || !s.inventory[a.itemId]) return fail("not_owned");
      if (!(SLOTS as readonly string[]).includes(def.kind)) return fail("not_equipable");
      s.pet.equipped[def.kind as Slot] = def.id;
      return { ok: true, effects: fx };
    }

    case "unequip": {
      delete s.pet.equipped[a.slot];
      return { ok: true, effects: fx };
    }

    case "toggleMutation": {
      const def = getItem(a.itemId);
      if (!def || def.kind !== "mutation" || !s.inventory[a.itemId]) return fail("not_owned");
      const i = s.pet.mutations.indexOf(a.itemId);
      if (i >= 0) {
        s.pet.mutations.splice(i, 1);
        return { ok: true, effects: fx };
      }
      if (s.pet.mutations.length >= PET_RULES.maxMutations) return fail("max_mutations");
      s.pet.mutations.push(a.itemId);
      const combo = findCombo(s.pet.mutations);
      if (combo && !s.pet.combosSeen.includes(combo.id)) {
        s.pet.combosSeen.push(combo.id);
        fx.push({ type: "combo", comboId: combo.id });
      }
      return { ok: true, effects: fx };
    }

    case "equipTitle": {
      if (a.itemId === null) {
        s.equippedTitle = null;
        return { ok: true, effects: fx };
      }
      const def = getItem(a.itemId);
      if (!def || def.kind !== "title" || !s.inventory[a.itemId]) return fail("not_owned");
      s.equippedTitle = a.itemId;
      return { ok: true, effects: fx };
    }

    case "toggleBadge": {
      const def = getItem(a.itemId);
      if (!def || def.kind !== "badge" || !s.inventory[a.itemId]) return fail("not_owned");
      const i = s.equippedBadges.indexOf(a.itemId);
      if (i >= 0) s.equippedBadges.splice(i, 1);
      else if (s.equippedBadges.length >= 3) return fail("max_badges");
      else s.equippedBadges.push(a.itemId);
      return { ok: true, effects: fx };
    }

    case "useEffect": {
      const def = getItem(a.itemId);
      const entry = s.inventory[a.itemId];
      if (!def || def.kind !== "effect" || !def.effect) return fail("not_effect");
      if (!entry || entry.qty < 1) return fail("not_owned");
      entry.qty--;
      if (entry.qty <= 0) delete s.inventory[a.itemId];
      const cur = s.activeEffects.find((e) => e.itemId === a.itemId);
      if (cur) cur.until = Math.max(cur.until, now) + def.effect.durationMs;
      else s.activeEffects.push({ itemId: a.itemId, until: now + def.effect.durationMs });
      fx.push({ type: "toast", text: `${def.emoji} ${def.name} activated!`, tone: "weird" });
      return { ok: true, effects: fx };
    }

    case "openCapsule": {
      const def = getItem(a.itemId);
      const entry = s.inventory[a.itemId];
      if (!def || def.kind !== "capsule" || !def.capsuleTable) return fail("not_capsule");
      if (!entry || entry.qty < 1) return fail("not_owned");
      const table = CAPSULE_TABLES[def.capsuleTable];
      if (!table) return fail("bad_table");
      entry.qty--;
      if (entry.qty <= 0) delete s.inventory[a.itemId];
      const { item: roll } = weightedPick(table, (t) => t.weight, ctx.rng);
      s.stats.capsules++;
      bump(s, "capsules");
      grant(s, { pool: { kind: "cosmetic", rarity: roll.rarity } }, def.name, ctx, fx);
      return { ok: true, effects: fx };
    }

    case "buy": {
      const offer = SHOP.find((o) => o.itemId === a.itemId);
      const def = getItem(a.itemId);
      if (!offer || !def) return fail("not_for_sale");
      if (!def.stackable && s.inventory[a.itemId]) return fail("already_owned");
      if (offer.currency === "coins") {
        if (s.coins < offer.price) return fail("insufficient_funds");
        s.coins -= offer.price;
      } else {
        if (s.tokens < offer.price) return fail("insufficient_funds");
        s.tokens -= offer.price;
      }
      addItem(s, a.itemId, 1, "Shop", now, fx);
      return { ok: true, effects: fx };
    }

    case "spin": {
      if (now < s.roulette.nextSpinAt) return fail("cooldown");
      const { item: seg, index } = weightedPick(ROULETTE_SEGMENTS, (x) => x.weight, ctx.rng);
      s.roulette.nextSpinAt = now + ROULETTE_COOLDOWN_MS;
      s.roulette.totalSpins++;
      s.stats.spins++;
      bump(s, "spins");
      fx.push({ type: "spin", segmentId: seg.id, segmentIndex: index });
      const parts = grant(s, seg.reward, "Roulette", ctx, fx);
      s.roulette.history.unshift({ at: now, segmentId: seg.id, rarity: seg.rarity, label: seg.label, granted: parts.join(", ") });
      s.roulette.history = s.roulette.history.slice(0, 15);
      return { ok: true, effects: fx };
    }

    case "claimQuest": {
      const q = activeQuests(s.quests.dailyKey, s.quests.weeklyKey).find((x) => x.id === a.questId);
      if (!q) return fail("unknown_quest");
      const key = `${q.period === "daily" ? s.quests.dailyKey : s.quests.weeklyKey}:${q.id}`;
      if (s.quests.claimed.includes(key)) return fail("already_claimed");
      if (questMetricValue(s, q.period, q.metric) < q.target) return fail("incomplete");
      s.quests.claimed.push(key);
      fx.push({ type: "questClaimed", id: q.id });
      grant(s, q.reward, `Quest: ${q.title}`, ctx, fx);
      return { ok: true, effects: fx };
    }

    case "rollChaos": {
      if (s.events.active) return fail("event_active");
      if (now < s.events.nextRollAt) return fail("not_yet");
      s.events.nextRollAt = now + CHAOS_ROLL_INTERVAL_MS;
      if (ctx.rng() < CHAOS_ROLL_CHANCE) startEvent(s, randomEventId(ctx.rng), ctx, fx);
      return { ok: true, effects: fx };
    }

    case "doNotClick": {
      if (now < s.events.nextDncAt) {
        fx.push({ type: "toast", text: "The button is recharging its audacity. Try again soon.", tone: "weird" });
        return { ok: true, effects: fx };
      }
      s.events.nextDncAt = now + DNC_COOLDOWN_MS;
      s.stats.dnc++;
      if (s.events.active) {
        fx.push({ type: "toast", text: "You clicked it during an event?? The chaos is already here.", tone: "weird" });
        return { ok: true, effects: fx };
      }
      startEvent(s, randomEventId(ctx.rng), ctx, fx);
      return { ok: true, effects: fx };
    }

    case "eventHit": {
      const ev = s.events.active;
      if (!ev) return fail("no_event");
      const def = CHAOS_EVENTS[ev.id as ChaosId];
      if (!def.targets || !def.perHit) return fail("not_hittable");
      if (a.target >= def.targets || ev.hits.includes(a.target)) return fail("invalid_target");
      ev.hits.push(a.target);
      grant(s, def.perHit, def.name, ctx, fx);
      setLogOutcome(s, `${ev.hits.length}/${def.targets} caught`);
      return { ok: true, effects: fx };
    }

    case "eventClaim": {
      const ev = s.events.active;
      if (!ev) return fail("no_event");
      if (ev.claimed) return fail("already_claimed");
      const def = CHAOS_EVENTS[ev.id as ChaosId];
      if (ev.id === "mutation" && ev.mutationId) {
        ev.claimed = true;
        grant(s, { items: [{ id: ev.mutationId, qty: 1 }] }, def.name, ctx, fx);
        setLogOutcome(s, `Claimed ${getItem(ev.mutationId)?.name}`);
        return { ok: true, effects: fx };
      }
      if (!def.claim) return fail("not_claimable");
      if (def.goal && ev.progress < def.goal) return fail("incomplete");
      ev.claimed = true;
      grant(s, def.claim, def.name, ctx, fx);
      setLogOutcome(s, "Completed");
      return { ok: true, effects: fx };
    }

    case "clickerSync": {
      applyClicks(s, a.clicks, now);
      return { ok: true, effects: fx };
    }

    case "clickerBuy": {
      // pending clicks land first so the purchase sees the up-to-date balance (one atomic step)
      applyClicks(s, a.clicks, now);
      const r = buyUpgrade(s, a.upgradeId, a.qty);
      return r.ok ? { ok: true, effects: fx } : fail(r.error);
    }

    case "clickerClaimOffline": {
      const amount = s.clicker.pendingOffline?.amount ?? 0;
      const r = claimOffline(s);
      if (!r.ok) return fail(r.error);
      fx.push({ type: "toast", text: `Offline earnings claimed: +${formatBig(amount)} reactor braincells`, tone: "good" });
      return { ok: true, effects: fx };
    }

    case "clickerPrestige": {
      const r = prestige(s);
      if (!r.ok) return fail(r.error);
      fx.push({ type: "toast", text: `PRESTIGE! +${r.shards} doom shard${r.shards === 1 ? "" : "s"}. The reactor is reborn.`, tone: "weird" });
      return { ok: true, effects: fx };
    }

    case "clickerClaimMission": {
      const r = claimClickerMission(s, a.missionId, (reward, source) => grant(s, reward, source, ctx, fx));
      if (!r.ok) return fail(r.error);
      fx.push({ type: "questClaimed", id: a.missionId });
      return { ok: true, effects: fx };
    }

    case "setDisplayName": {
      const nm = cleanName(a.name, 3, 20);
      if (!nm) return fail("invalid_name");
      s.displayName = nm;
      return { ok: true, effects: fx };
    }
  }
}

/** Strip server-only fields before sending state to the browser. */
export function publicState(s: PlayerState) {
  const { id: _id, processedActions: _p, ...rest } = s;
  return rest;
}
export type ClientState = ReturnType<typeof publicState>;
