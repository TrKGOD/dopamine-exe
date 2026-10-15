export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythical"] as const;
export type Rarity = (typeof RARITIES)[number];

export const CATEGORIES = [
  "brainrot",
  "gaming",
  "cursed",
  "animals",
  "conspiracy",
  "motivation",
  "ai",
  "community",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SLOTS = ["hat", "eyewear", "aura", "color"] as const;
export type Slot = (typeof SLOTS)[number];

export type ItemKind =
  | "hat"
  | "eyewear"
  | "aura"
  | "color"
  | "title"
  | "badge"
  | "effect"
  | "food"
  | "capsule"
  | "mutation";

export const PERSONALITIES = ["gremlin", "sigma", "corporate", "goblin", "capybara", "radcat", "entity"] as const;
export type Personality = (typeof PERSONALITIES)[number];

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  rarity: Rarity;
  emoji: string;
  description: string;
  /** stackable items (food, capsules, effects) keep a quantity; others are owned once */
  stackable: boolean;
  /** color items: hex used for the pet body */
  color?: string;
  food?: { hunger: number; petXp: number; mood: number };
  effect?: { durationMs: number };
  /** capsule items: id of the drop table in CAPSULE_TABLES */
  capsuleTable?: string;
  /** can this item drop from random pools (roulette/capsules)? */
  droppable: boolean;
}

/** A reward bundle. Pools are resolved server-side at grant time. */
export interface Reward {
  xp?: number;
  petXp?: number;
  coins?: number;
  tokens?: number;
  items?: { id: string; qty: number }[];
  pool?: { kind: "cosmetic" | "mutation" | "effect" | "food"; rarity?: Rarity };
}

export interface InventoryEntry {
  itemId: string;
  qty: number;
  firstAcquiredAt: number;
  lastAcquiredAt: number;
}

export interface PetState {
  name: string;
  personality: Personality;
  xp: number;
  level: number;
  hunger: number; // 0..100 (100 = stuffed)
  mood: number; // 0..100
  lastTickAt: number;
  equipped: Partial<Record<Slot, string>>;
  mutations: string[]; // active mutation item ids (max 2)
  formsSeen: string[]; // "personality:stage"
  combosSeen: string[];
  fedCount: number;
  lastFedAt: number;
  lastPatAt: number;
}

export interface SpinRecord {
  at: number;
  segmentId: string;
  rarity: Rarity;
  label: string;
  granted: string; // human readable
}

export interface RecentUnlock {
  at: number;
  itemId?: string;
  label: string;
  rarity: Rarity;
  source: string;
}

export interface ActiveEvent {
  id: string;
  startedAt: number;
  endsAt: number;
  claimed: boolean;
  /** targets already hit (capybaras clicked, floating items caught) */
  hits: number[];
  /** event specific progress, e.g. new posts viewed during a CEO challenge */
  progress: number;
  /** pre-rolled mutation for RARE MUTATION events */
  mutationId?: string;
}

export interface EventLogEntry {
  at: number;
  id: string;
  name: string;
  outcome: string;
}

export interface PlayerState {
  version: 1;
  id: string;
  publicId: string;
  createdAt: number;
  onboarded: boolean;
  displayName: string;
  xp: number;
  level: number;
  coins: number;
  tokens: number;
  inventory: Record<string, InventoryEntry>;
  equippedTitle: string | null;
  equippedBadges: string[];
  activeEffects: { itemId: string; until: number }[];
  pet: PetState;
  feed: {
    viewed: string[];
    liked: string[];
    likedEver: string[];
    bookmarked: string[];
    shared: string[];
    categoryViews: Partial<Record<Category, number>>;
    discovered: Category[];
    masteryClaimed: string[]; // "category:tier"
    lastViewRewardAt: number;
  };
  roulette: { nextSpinAt: number; totalSpins: number; history: SpinRecord[] };
  quests: {
    dailyKey: string;
    weeklyKey: string;
    daily: Record<string, number>; // metric -> count for the day
    weekly: Record<string, number>;
    dailyCategories: Category[];
    weeklyCategories: Category[];
    claimed: string[]; // "<periodKey>:<questId>"
  };
  stats: {
    views: number;
    likes: number;
    feeds: number;
    pats: number;
    spins: number;
    capsules: number;
    events: number;
    dnc: number;
    shares: number;
    itemsFound: number;
  };
  achievements: string[];
  season: { id: string; points: number; claimedTiers: number[] };
  weekly: { key: string; xp: number };
  events: { active: ActiveEvent | null; nextRollAt: number; nextDncAt: number; log: EventLogEntry[] };
  recent: RecentUnlock[];
  processedActions: string[];
}

/** State as sent to the browser (server-only fields removed). */
export type PublicPlayer = Omit<PlayerState, "id" | "processedActions">;

/** UI-facing effects returned by the engine so the client can celebrate. */
export type GameEffect =
  | { type: "xp"; amount: number; reason: string }
  | { type: "petXp"; amount: number }
  | { type: "coins"; amount: number }
  | { type: "tokens"; amount: number }
  | { type: "levelUp"; level: number }
  | { type: "petLevelUp"; level: number }
  | { type: "evolve"; stage: number; stageName: string }
  | { type: "item"; itemId: string; qty: number; source: string; duplicateTokens?: number }
  | { type: "achievement"; id: string }
  | { type: "questClaimed"; id: string }
  | { type: "discovery"; category: Category }
  | { type: "mastery"; category: Category; tier: number }
  | { type: "spin"; segmentId: string; segmentIndex: number }
  | { type: "event"; id: string }
  | { type: "seasonTier"; tier: number }
  | { type: "combo"; comboId: string }
  | { type: "petSay"; text: string }
  | { type: "toast"; text: string; tone?: "info" | "good" | "bad" | "weird" };

export interface ActionOutcome {
  ok: boolean;
  error?: string;
  effects: GameEffect[];
}
