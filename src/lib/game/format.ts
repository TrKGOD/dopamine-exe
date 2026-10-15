import { ITEMS } from "./items";
import type { Reward } from "./types";

export function rewardText(r: Reward) {
  const parts: string[] = [];
  if (r.xp) parts.push(`${r.xp} XP`);
  if (r.petXp) parts.push(`${r.petXp} Pet XP`);
  if (r.coins) parts.push(`${r.coins} 🧠`);
  if (r.tokens) parts.push(`${r.tokens} 💎`);
  for (const it of r.items ?? []) parts.push(`${it.qty > 1 ? it.qty + "× " : ""}${ITEMS[it.id]?.emoji} ${ITEMS[it.id]?.name}`);
  if (r.pool) parts.push(`random ${r.pool.rarity ?? ""} ${r.pool.kind}`);
  return parts.join(" · ");
}
