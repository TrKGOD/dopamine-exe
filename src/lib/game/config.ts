/**
 * Centralised game rules. Every reward, probability, threshold and cooldown
 * lives here so balancing never requires touching engine or UI code.
 */
import { CATEGORIES, type Personality, type PublicPlayer as PlayerState, type Rarity, type Reward } from "./types";

// ── Rarity presentation ───────────────────────────────────────────────────
export const RARITY_META: Record<Rarity, { label: string; color: string; dupeTokens: number; order: number }> = {
  common: { label: "Common", color: "#9aa3b5", dupeTokens: 1, order: 0 },
  uncommon: { label: "Uncommon", color: "#39ff88", dupeTokens: 2, order: 1 },
  rare: { label: "Rare", color: "#2ef2ff", dupeTokens: 4, order: 2 },
  epic: { label: "Epic", color: "#a855ff", dupeTokens: 8, order: 3 },
  legendary: { label: "Legendary", color: "#ffb02e", dupeTokens: 15, order: 4 },
  mythical: { label: "Mythical", color: "#ff2e97", dupeTokens: 30, order: 5 },
};

// ── Levels ────────────────────────────────────────────────────────────────
/** XP needed to go from `level` to `level + 1`. */
export const playerXpToNext = (level: number) => Math.round(60 * Math.pow(level, 1.35));
export const petXpToNext = (level: number) => Math.round(45 * Math.pow(level, 1.3));
export const MAX_LEVEL = 99;

export function levelFromXp(totalXp: number, toNext: (l: number) => number) {
  let level = 1;
  let remaining = totalXp;
  while (level < MAX_LEVEL && remaining >= toNext(level)) {
    remaining -= toNext(level);
    level++;
  }
  return { level, into: remaining, needed: toNext(level) };
}

// ── Feed progression rules (shown verbatim in the UI) ─────────────────────
export const FEED_RULES = {
  dwellMs: 2000, // a post counts as "viewed" after 2s on screen
  minRewardGapMs: 1200, // server ignores view rewards faster than this
  newPost: { xp: 5, coins: 2 },
  firstLike: { xp: 2 },
  newCategory: { xp: 25, coins: 20 },
  masteryTiers: [
    { tier: 1, views: 2, reward: { xp: 20, coins: 15 } as Reward, label: "Initiate" },
    { tier: 2, views: 4, reward: { xp: 40, tokens: 2 } as Reward, label: "Enjoyer" },
    { tier: 3, views: 6, reward: { xp: 80, items: [{ id: "cap_basic", qty: 1 }] } as Reward, label: "Scholar" },
  ],
};

export const PROGRESSION_RULES: { label: string; value: string }[] = [
  { label: "Watch a NEW post for 2 seconds", value: "+5 XP, +2 🧠" },
  { label: "Discover a new category", value: "+25 XP, +20 🧠" },
  { label: "First like on a post", value: "+2 XP" },
  { label: "Category mastery (2 / 4 / 6 posts)", value: "XP, 💎 tokens, capsule" },
  { label: "Re-watching, re-liking, scroll-spamming", value: "+0 (nice try)" },
  { label: "Feed your pet", value: "Pet XP from the food" },
  { label: "Pat your pet (every 20s)", value: "+2 Pet XP, mood" },
  { label: "Roulette spin (every 2 min)", value: "Random reward, odds shown" },
  { label: "Quests, achievements, season tiers", value: "Listed rewards" },
  { label: "Duplicate cosmetic", value: "Converted to 💎 tokens" },
  { label: "Every 10 player XP", value: "+1 season point" },
];

// ── Pet ───────────────────────────────────────────────────────────────────
export const PET_RULES = {
  hungerDecayPerHour: 5,
  hungerFloor: 15, // never starves, never dies, never resets
  moodDecayPerHour: 4,
  moodFloor: 25,
  patCooldownMs: 20_000,
  patPetXp: 2,
  patMood: 8,
  feedCooldownMs: 1200,
  wellFedBonus: 0.1, // +10% pet XP when hunger >= 60
  maxMutations: 2,
};

export const PET_STAGES = [
  { stage: 1, name: "Larval Byte", minLevel: 1, rarity: "common" as Rarity },
  { stage: 2, name: "Feral Lurker", minLevel: 3, rarity: "uncommon" as Rarity },
  { stage: 3, name: "Certified Menace", minLevel: 6, rarity: "rare" as Rarity },
  { stage: 4, name: "Ascended Poster", minLevel: 10, rarity: "epic" as Rarity },
  { stage: 5, name: "Final Form", minLevel: 15, rarity: "legendary" as Rarity },
];

export function stageForLevel(level: number) {
  let s = PET_STAGES[0];
  for (const st of PET_STAGES) if (level >= st.minLevel) s = st;
  return s;
}

export const PERSONALITY_META: Record<
  Personality,
  { name: string; emoji: string; color: string; unlockLevel: number; blurb: string; lines: { idle: string[]; fed: string[]; pat: string[]; hungry: string[]; levelUp: string[] } }
> = {
  gremlin: {
    name: "Gremlin",
    emoji: "👹",
    color: "#39ff88",
    unlockLevel: 1,
    blurb: "Chews cables. Loves you aggressively.",
    lines: {
      idle: ["hehehe", "i licked the router", "what if we pressed every button", "*vibrates menacingly*"],
      fed: ["NOM NOM CRUNCH", "more. MORE.", "tastes like wifi"],
      pat: ["*purrs like a dial-up modem*", "do it again or i bite", "hehe :3"],
      hungry: ["i will eat the furniture", "feed me or i chew the ethernet"],
      levelUp: ["I HAVE GROWN. FEAR ME.", "new teeth unlocked"],
    },
  },
  sigma: {
    name: "Sigma Rodent",
    emoji: "🐀",
    color: "#c7ccd8",
    unlockLevel: 1,
    blurb: "Wakes up at 3:47am. Cold showers in a thimble.",
    lines: {
      idle: ["grindset never sleeps", "while you scrolled, i scrolled harder", "*stares at sunset in 4k*"],
      fed: ["protein acquired", "macros: optimal", "a sigma eats in silence"],
      pat: ["no emotions. ok maybe one.", "this changes nothing", "*jawline intensifies*"],
      hungry: ["fasting. on purpose. definitely.", "hunger is a mindset"],
      levelUp: ["LEVEL UP. NO DAYS OFF.", "the grind rewards the grinder"],
    },
  },
  corporate: {
    name: "Corporate Rat",
    emoji: "💼",
    color: "#4f7cff",
    unlockLevel: 3,
    blurb: "Circles back. Synergizes. Has a lanyard.",
    lines: {
      idle: ["per my last squeak...", "let's take this offline", "quick sync?", "i'm OOO mentally"],
      fed: ["this is a great snack-ortunity", "adding to my expense report", "we love deliverables"],
      pat: ["let's circle back to that pat", "noted for my performance review", "ok but put it in an email"],
      hungry: ["the snack budget was cut", "per policy, i require lunch"],
      levelUp: ["PROMOTED (title only, no raise)", "i now have a slightly larger cubicle"],
    },
  },
  goblin: {
    name: "Goblin Trader",
    emoji: "👺",
    color: "#a3e635",
    unlockLevel: 5,
    blurb: "Buys low. Sells lower. Hoards shiny.",
    lines: {
      idle: ["psst. wanna buy a rock?", "shiny? SHINY??", "the market is a vibe"],
      fed: ["i'll trade you this crumb for 3 crumbs", "delicious AND appreciating in value", "*pockets half of it*"],
      pat: ["that'll be 2 braincells", "first pat free", "a fine transaction"],
      hungry: ["i sold my lunch for a stick", "bad trade. very hungry."],
      levelUp: ["PORTFOLIO DIVERSIFIED", "goblin.exe has ascended"],
    },
  },
  capybara: {
    name: "Cosmic Capybara",
    emoji: "🦫",
    color: "#c08a5a",
    unlockLevel: 1,
    blurb: "Calm. Unbothered. Orbiting.",
    lines: {
      idle: ["ok i chill", "the universe is a hot spring", "*sits*", "a bird is on my head. it is fine."],
      fed: ["mmm. nice.", "the cosmos provides", "*chews peacefully*"],
      pat: ["yes.", "this is the way", "*closes eyes contentedly*"],
      hungry: ["a little snack would be cosmic", "hungry but at peace"],
      levelUp: ["i have become... slightly more chill", "the stars aligned (they always do)"],
    },
  },
  radcat: {
    name: "Radioactive Cat",
    emoji: "☢️",
    color: "#e8ff3a",
    unlockLevel: 8,
    blurb: "Glows in the dark. Knocks things off reactors.",
    lines: {
      idle: ["*knocks uranium off table*", "mrrp (geiger noises)", "i am the night light now"],
      fed: ["*crunch* (glows brighter)", "half-life of this snack: 2 seconds", "mrow."],
      pat: ["*purrs at 400 rads*", "you may pet. briefly.", "*glow intensifies*"],
      hungry: ["i will knock your monitor off", "feeding time is NOW, human"],
      levelUp: ["CRITICAL MASS ACHIEVED", "mutation? no. evolution."],
    },
  },
  entity: {
    name: "Ancient Internet Entity",
    emoji: "🖥️",
    color: "#a855ff",
    unlockLevel: 12,
    blurb: "Born in a forum in 2003. Speaks only in lowercase.",
    lines: {
      idle: ["first", "this thread is 19 years old", "lurk moar", "under construction 🚧"],
      fed: ["bytes consumed", "+1 good snack, would eat again", "*modem screech of joy*"],
      pat: ["*hit counter increases*", "you have been visitor #000001", "this pat was archived"],
      hungry: ["404: snack not found", "bandwidth low. feed packets."],
      levelUp: ["SYSTEM UPGRADE: 56k → 128k", "i remember geocities"],
    },
  },
};

// ── Roulette ─────────────────────────────────────────────────────────────
export const ROULETTE_COOLDOWN_MS = 120_000;

export interface RouletteSegment {
  id: string;
  label: string;
  short: string;
  emoji: string;
  rarity: Rarity;
  weight: number;
  reward: Reward;
}

/** Slice sizes on the wheel are drawn proportional to these weights. */
export const ROULETTE_SEGMENTS: RouletteSegment[] = [
  { id: "petxp_s", label: "+25 Pet XP", short: "25 PXP", emoji: "🐾", rarity: "common", weight: 18, reward: { petXp: 25 } },
  { id: "coins_s", label: "+40 Braincells", short: "40🧠", emoji: "🧠", rarity: "common", weight: 16, reward: { coins: 40 } },
  { id: "food_s", label: "2× Mystery Nugget", short: "SNACK", emoji: "🍗", rarity: "common", weight: 14, reward: { items: [{ id: "food_nugget", qty: 2 }] } },
  { id: "cos_common", label: "Common Cosmetic", short: "COMMON", emoji: "🧢", rarity: "common", weight: 12, reward: { pool: { kind: "cosmetic", rarity: "common" } } },
  { id: "petxp_m", label: "+75 Pet XP", short: "75 PXP", emoji: "🐾", rarity: "uncommon", weight: 9, reward: { petXp: 75 } },
  { id: "cos_uncommon", label: "Uncommon Cosmetic", short: "UNCMN", emoji: "✨", rarity: "uncommon", weight: 9, reward: { pool: { kind: "cosmetic", rarity: "uncommon" } } },
  { id: "tokens", label: "+3 Glitch Tokens", short: "3💎", emoji: "💎", rarity: "uncommon", weight: 7, reward: { tokens: 3 } },
  { id: "capsule", label: "Basic Capsule", short: "CAPSULE", emoji: "🥚", rarity: "uncommon", weight: 4, reward: { items: [{ id: "cap_basic", qty: 1 }] } },
  { id: "cos_rare", label: "Rare Cosmetic", short: "RARE", emoji: "💠", rarity: "rare", weight: 5, reward: { pool: { kind: "cosmetic", rarity: "rare" } } },
  { id: "effect", label: "Temporary Effect", short: "EFFECT", emoji: "🎊", rarity: "rare", weight: 3, reward: { pool: { kind: "effect" } } },
  { id: "cos_epic", label: "Epic Cosmetic", short: "EPIC", emoji: "👑", rarity: "epic", weight: 1.5, reward: { pool: { kind: "cosmetic", rarity: "epic" } } },
  { id: "mutation", label: "Rare Pet Mutation", short: "MUTATE", emoji: "🧬", rarity: "epic", weight: 1, reward: { pool: { kind: "mutation" } } },
  { id: "cos_legendary", label: "Legendary Cosmetic", short: "LEGEND", emoji: "😇", rarity: "legendary", weight: 0.4, reward: { pool: { kind: "cosmetic", rarity: "legendary" } } },
  { id: "cos_mythical", label: "Mythical Cosmetic", short: "MYTH", emoji: "🔮", rarity: "mythical", weight: 0.1, reward: { pool: { kind: "cosmetic", rarity: "mythical" } } },
];

// ── Capsules ─────────────────────────────────────────────────────────────
/** Each capsule rolls a rarity, then a uniformly random droppable cosmetic of that rarity. */
export const CAPSULE_TABLES: Record<string, { rarity: Rarity; weight: number }[]> = {
  basic: [
    { rarity: "common", weight: 60 },
    { rarity: "uncommon", weight: 28 },
    { rarity: "rare", weight: 10 },
    { rarity: "epic", weight: 2 },
  ],
  glitch: [
    { rarity: "uncommon", weight: 45 },
    { rarity: "rare", weight: 35 },
    { rarity: "epic", weight: 15 },
    { rarity: "legendary", weight: 4.5 },
    { rarity: "mythical", weight: 0.5 },
  ],
  mythic: [
    { rarity: "rare", weight: 40 },
    { rarity: "epic", weight: 35 },
    { rarity: "legendary", weight: 20 },
    { rarity: "mythical", weight: 5 },
  ],
};

// ── Shop (deterministic prices, fictional currency only) ─────────────────
export const SHOP: { itemId: string; currency: "coins" | "tokens"; price: number }[] = [
  { itemId: "food_air", currency: "coins", price: 15 },
  { itemId: "food_nugget", currency: "coins", price: 25 },
  { itemId: "food_yogurt", currency: "coins", price: 60 },
  { itemId: "food_drink", currency: "coins", price: 140 },
  { itemId: "hat_cone", currency: "tokens", price: 4 },
  { itemId: "eye_nerd", currency: "tokens", price: 4 },
  { itemId: "color_bruise", currency: "tokens", price: 4 },
  { itemId: "aura_sparkle", currency: "tokens", price: 10 },
  { itemId: "color_vapor", currency: "tokens", price: 10 },
  { itemId: "title_grass", currency: "tokens", price: 10 },
  { itemId: "hat_wizard", currency: "tokens", price: 25 },
  { itemId: "eye_shades", currency: "tokens", price: 25 },
  { itemId: "title_yapper", currency: "tokens", price: 25 },
];

// ── Quests ───────────────────────────────────────────────────────────────
export type QuestMetric = "views" | "likes" | "feeds" | "spins" | "pats" | "events" | "capsules" | "categories" | "shares";

export interface QuestDef {
  id: string;
  period: "daily" | "weekly";
  title: string;
  description: string;
  metric: QuestMetric;
  target: number;
  reward: Reward;
}

export const QUEST_POOL: QuestDef[] = [
  { id: "d_scroll", period: "daily", title: "Doomscroll Responsibly", description: "Watch 8 new posts", metric: "views", target: 8, reward: { xp: 40, coins: 30 } },
  { id: "d_feed", period: "daily", title: "Feed the Beast", description: "Feed your pet 2 times", metric: "feeds", target: 2, reward: { petXp: 30, items: [{ id: "food_nugget", qty: 2 }] } },
  { id: "d_spin", period: "daily", title: "Spin Doctor", description: "Spin the roulette once", metric: "spins", target: 1, reward: { coins: 25 } },
  { id: "d_like", period: "daily", title: "Heart Attack", description: "Like 3 posts", metric: "likes", target: 3, reward: { xp: 15, coins: 10 } },
  { id: "d_pat", period: "daily", title: "Pet the Pet", description: "Pat your pet 4 times", metric: "pats", target: 4, reward: { petXp: 20, tokens: 1 } },
  { id: "d_share", period: "daily", title: "Spread the Rot", description: "Share 1 post or card", metric: "shares", target: 1, reward: { xp: 15, tokens: 1 } },
  { id: "d_cats", period: "daily", title: "Variety Pack", description: "Watch posts in 3 categories today", metric: "categories", target: 3, reward: { xp: 30, items: [{ id: "food_yogurt", qty: 1 }] } },
  { id: "w_tourist", period: "weekly", title: "Category Tourist", description: "Watch posts in 6 categories this week", metric: "categories", target: 6, reward: { xp: 120, items: [{ id: "cap_basic", qty: 1 }] } },
  { id: "w_roulette", period: "weekly", title: "Roulette Regular", description: "Spin the roulette 10 times", metric: "spins", target: 10, reward: { items: [{ id: "cap_glitch", qty: 1 }] } },
  { id: "w_chaos", period: "weekly", title: "Chaos Survivor", description: "Experience 3 chaos events", metric: "events", target: 3, reward: { tokens: 6, xp: 60 } },
  { id: "w_feeder", period: "weekly", title: "Professional Feeder", description: "Feed your pet 10 times", metric: "feeds", target: 10, reward: { items: [{ id: "food_taco", qty: 1 }] } },
  { id: "w_capsules", period: "weekly", title: "Unboxing Influencer", description: "Open 3 capsules", metric: "capsules", target: 3, reward: { tokens: 8 } },
];

export const DAILY_QUEST_COUNT = 4;
export const WEEKLY_QUEST_COUNT = 3;

// ── Season ───────────────────────────────────────────────────────────────
export const SEASON = {
  id: "s0",
  name: "Season 0: The Great Brainrot",
  xpPerPoint: 10,
  tiers: [
    { tier: 1, points: 10, reward: { coins: 50 } as Reward, label: "50 🧠" },
    { tier: 2, points: 30, reward: { items: [{ id: "cap_basic", qty: 1 }] } as Reward, label: "Basic Capsule" },
    { tier: 3, points: 60, reward: { items: [{ id: "title_scroller", qty: 1 }], tokens: 5 } as Reward, label: "Title + 5 💎" },
    { tier: 4, points: 100, reward: { items: [{ id: "cap_glitch", qty: 1 }] } as Reward, label: "Glitch Capsule" },
    { tier: 5, points: 160, reward: { items: [{ id: "food_ramen", qty: 1 }] } as Reward, label: "Cosmic Ramen" },
    { tier: 6, points: 250, reward: { items: [{ id: "cap_mythic", qty: 1 }] } as Reward, label: "Mythic Capsule" },
  ],
};

// ── Chaos events ─────────────────────────────────────────────────────────
export type ChaosId = "overload" | "capybara" | "ceo" | "gravity" | "mutation" | "collapse";

export const CHAOS_ROLL_INTERVAL_MS = 90_000;
export const CHAOS_ROLL_CHANCE = 0.35;
export const DNC_COOLDOWN_MS = 30_000;

export const CHAOS_EVENTS: Record<
  ChaosId,
  { name: string; tagline: string; weight: number; durationMs: number; targets?: number; perHit?: Reward; claim?: Reward; goal?: number }
> = {
  overload: { name: "BRAINROT OVERLOAD", tagline: "The feed is overclocked. New posts give 2× XP.", weight: 22, durationMs: 60_000 },
  capybara: { name: "CAPYBARA INVASION", tagline: "Capybaras have breached containment. Boop them for braincells.", weight: 22, durationMs: 45_000, targets: 6, perHit: { coins: 6 } },
  ceo: { name: "THE CEO HAS ARRIVED", tagline: "Quarterly challenge: watch 3 new posts before the meeting ends.", weight: 18, durationMs: 120_000, goal: 3, claim: { xp: 50, tokens: 4 } },
  gravity: { name: "GRAVITY FAILURE", tagline: "Physics.dll stopped working. Catch the floating loot.", weight: 16, durationMs: 40_000, targets: 5, perHit: { coins: 5, petXp: 4 } },
  mutation: { name: "RARE MUTATION", tagline: "A strange signal mutates the air. Claim the specimen.", weight: 8, durationMs: 60_000 },
  collapse: { name: "INTERNET COLLAPSE", tagline: "The year is 1999. Reboot the internet to restore 2026.", weight: 14, durationMs: 50_000, claim: { tokens: 3, coins: 20 } },
};

// ── Achievements ─────────────────────────────────────────────────────────
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: Rarity;
  reward: Reward;
  progress: (s: PlayerState) => [number, number];
}

const ownedDistinct = (s: PlayerState) => Object.keys(s.inventory).length;
const ownsRarity = (s: PlayerState, r: Rarity, itemsRarity: (id: string) => Rarity | undefined) =>
  Object.keys(s.inventory).some((id) => itemsRarity(id) === r);

// rarity lookup is injected by the engine to avoid a circular import
let rarityOf: (id: string) => Rarity | undefined = () => undefined;
export function _setRarityLookup(fn: (id: string) => Rarity | undefined) {
  rarityOf = fn;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "a_first_view", name: "Welcome to the Rot", description: "Watch your first post", emoji: "👀", rarity: "common", reward: { xp: 10, items: [{ id: "badge_dayone", qty: 1 }] }, progress: (s) => [s.feed.viewed.length, 1] },
  { id: "a_views_15", name: "Thumb Warmed Up", description: "Watch 15 unique posts", emoji: "👍", rarity: "uncommon", reward: { xp: 40, coins: 40 }, progress: (s) => [s.feed.viewed.length, 15] },
  { id: "a_views_35", name: "Seen It All", description: "Watch 35 unique posts", emoji: "🫠", rarity: "epic", reward: { xp: 120, items: [{ id: "cap_glitch", qty: 1 }] }, progress: (s) => [s.feed.viewed.length, 35] },
  { id: "a_all_cats", name: "Category Tourist", description: "Discover all 8 categories", emoji: "🧭", rarity: "rare", reward: { xp: 80, items: [{ id: "badge_explorer", qty: 1 }] }, progress: (s) => [s.feed.discovered.length, CATEGORIES.length] },
  { id: "a_first_feed", name: "Snack Delivery", description: "Feed your pet", emoji: "🍗", rarity: "common", reward: { petXp: 15 }, progress: (s) => [s.stats.feeds, 1] },
  { id: "a_feed_25", name: "Snack Dealer", description: "Feed your pet 25 times", emoji: "🍖", rarity: "uncommon", reward: { items: [{ id: "badge_feeder", qty: 1 }, { id: "food_taco", qty: 1 }] }, progress: (s) => [s.stats.feeds, 25] },
  { id: "a_pet_5", name: "Growing Menace", description: "Reach pet level 5", emoji: "📈", rarity: "uncommon", reward: { tokens: 5 }, progress: (s) => [s.pet.level, 5] },
  { id: "a_pet_10", name: "Ascension Protocol", description: "Reach pet level 10", emoji: "🚀", rarity: "epic", reward: { tokens: 12, items: [{ id: "cap_glitch", qty: 1 }] }, progress: (s) => [s.pet.level, 10] },
  { id: "a_pet_final", name: "Final Form", description: "Evolve your pet to its final stage", emoji: "🐉", rarity: "legendary", reward: { items: [{ id: "badge_final", qty: 1 }, { id: "cap_mythic", qty: 1 }] }, progress: (s) => [s.pet.level, 15] },
  { id: "a_first_spin", name: "Wheel Curious", description: "Spin the roulette", emoji: "🎡", rarity: "common", reward: { coins: 20 }, progress: (s) => [s.stats.spins, 1] },
  { id: "a_spin_10", name: "Wheel Enjoyer", description: "Spin the roulette 10 times", emoji: "🌀", rarity: "uncommon", reward: { items: [{ id: "badge_spinner", qty: 1 }] }, progress: (s) => [s.stats.spins, 10] },
  { id: "a_capsule", name: "Unboxer", description: "Open a capsule", emoji: "🥚", rarity: "common", reward: { xp: 15 }, progress: (s) => [s.stats.capsules, 1] },
  { id: "a_collect_25", name: "Hoarder Supreme", description: "Own 25 different items", emoji: "📦", rarity: "epic", reward: { items: [{ id: "badge_collector", qty: 1 }], tokens: 10 }, progress: (s) => [ownedDistinct(s), 25] },
  { id: "a_legendary", name: "Shiny!!!", description: "Own a legendary item", emoji: "🌟", rarity: "legendary", reward: { tokens: 15 }, progress: (s) => [ownsRarity(s, "legendary", rarityOf) ? 1 : 0, 1] },
  { id: "a_mythical", name: "Statistically Impossible", description: "Own a mythical item", emoji: "🦄", rarity: "mythical", reward: { tokens: 30 }, progress: (s) => [ownsRarity(s, "mythical", rarityOf) ? 1 : 0, 1] },
  { id: "a_combo", name: "Certified Mutant", description: "Activate a mutation combo", emoji: "🧬", rarity: "epic", reward: { items: [{ id: "badge_mutant", qty: 1 }] }, progress: (s) => [s.pet.combosSeen.length, 1] },
  { id: "a_dnc", name: "You Had One Job", description: "Click the DO NOT CLICK button", emoji: "🔴", rarity: "uncommon", reward: { items: [{ id: "title_button", qty: 1 }] }, progress: (s) => [s.stats.dnc, 1] },
  { id: "a_chaos_5", name: "Chaos Survivor", description: "Experience 5 chaos events", emoji: "🌪️", rarity: "rare", reward: { items: [{ id: "title_chaos", qty: 1 }] }, progress: (s) => [s.stats.events, 5] },
  { id: "a_level_5", name: "Brain Partially Rotted", description: "Reach player level 5", emoji: "🧠", rarity: "uncommon", reward: { items: [{ id: "cap_basic", qty: 1 }] }, progress: (s) => [s.level, 5] },
];

// ── New player ───────────────────────────────────────────────────────────
export const STARTER_PERSONALITIES: Personality[] = ["gremlin", "sigma", "capybara"];
export const STARTING_COINS = 100;
export const STARTING_ITEMS: { id: string; qty: number }[] = [
  { id: "food_nugget", qty: 3 },
  { id: "food_air", qty: 2 },
  { id: "cap_basic", qty: 1 },
  { id: "color_toxic", qty: 1 },
];

// ── Anti-abuse ───────────────────────────────────────────────────────────
export const RATE_LIMIT = { windowMs: 10_000, maxActions: 40 };
export const NONCE_MEMORY = 200;
