import {
  ACHIEVEMENTS,
  DAILY_QUEST_COUNT,
  QUEST_POOL,
  WEEKLY_QUEST_COUNT,
  levelFromXp,
  petXpToNext,
  playerXpToNext,
  stageForLevel,
  type QuestDef,
  type QuestMetric,
} from "./config";
import { ITEM_LIST, findCombo } from "./items";
import { hashString, seeded } from "./rng";
import type { ItemKind, PublicPlayer as PlayerState } from "./types";

export const playerLevelInfo = (s: Pick<PlayerState, "xp">) => levelFromXp(s.xp, playerXpToNext);
export const petLevelInfo = (s: Pick<PlayerState, "pet">) => levelFromXp(s.pet.xp, petXpToNext);
export const petStage = (s: Pick<PlayerState, "pet">) => stageForLevel(s.pet.level);

function rotate(pool: QuestDef[], key: string, count: number): QuestDef[] {
  const rng = seeded(hashString(key));
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

/** Today's and this week's quests rotate deterministically from the period key. */
export function activeQuests(dailyKey: string, weeklyKey: string): QuestDef[] {
  return [
    ...rotate(QUEST_POOL.filter((q) => q.period === "daily"), "d" + dailyKey, DAILY_QUEST_COUNT),
    ...rotate(QUEST_POOL.filter((q) => q.period === "weekly"), "w" + weeklyKey, WEEKLY_QUEST_COUNT),
  ];
}

export function questMetricValue(s: PlayerState, period: "daily" | "weekly", metric: QuestMetric): number {
  if (metric === "categories") return period === "daily" ? s.quests.dailyCategories.length : s.quests.weeklyCategories.length;
  return (period === "daily" ? s.quests.daily : s.quests.weekly)[metric] ?? 0;
}

export function questView(s: PlayerState) {
  return activeQuests(s.quests.dailyKey, s.quests.weeklyKey).map((q) => {
    const key = q.period === "daily" ? s.quests.dailyKey : s.quests.weeklyKey;
    const progress = Math.min(q.target, questMetricValue(s, q.period, q.metric));
    const claimed = s.quests.claimed.includes(`${key}:${q.id}`);
    return { ...q, progress, claimed, complete: progress >= q.target };
  });
}

export function achievementView(s: PlayerState) {
  return ACHIEVEMENTS.map((a) => {
    const [cur, target] = a.progress(s);
    return { ...a, current: Math.min(cur, target), target, unlocked: s.achievements.includes(a.id) };
  });
}

export function collectionStats(s: PlayerState) {
  const kinds: ItemKind[] = ["hat", "eyewear", "aura", "color", "title", "badge", "mutation"];
  return kinds.map((kind) => {
    const all = ITEM_LIST.filter((i) => i.kind === kind);
    const owned = all.filter((i) => s.inventory[i.id]).length;
    return { kind, owned, total: all.length };
  });
}

export const activeCombo = (s: PlayerState) => findCombo(s.pet.mutations);

export function hasEffect(s: PlayerState, itemId: string, now: number) {
  return s.activeEffects.some((e) => e.itemId === itemId && e.until > now);
}
