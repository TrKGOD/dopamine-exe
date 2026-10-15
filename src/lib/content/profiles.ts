import { DEMO_PLAYERS } from "./demo";
import { ITEMS } from "../game/items";
import { weekKey } from "../game/time";
import type { Personality, PublicPlayer, Slot } from "../game/types";

/** The only player fields that ever leave the server for other viewers. */
export interface PublicProfile {
  publicId: string;
  demo: boolean;
  displayName: string;
  title: string | null;
  level: number;
  weeklyXp: number;
  pet: { name: string; personality: Personality; level: number; equipped: Partial<Record<Slot, string>>; mutations: string[] };
  badges: string[];
  itemCount: number;
  achievementCount: number;
  uniqueViews: number;
  showcase: string[]; // a few rarest item ids
}

const RARITY_ORDER = ["mythical", "legendary", "epic", "rare", "uncommon", "common"];

export function toProfile(p: PublicPlayer, itemRarity: (id: string) => string | undefined = (id) => ITEMS[id]?.rarity): PublicProfile {
  const wk = weekKey(Date.now());
  const showcase = Object.keys(p.inventory)
    .filter((id) => !id.startsWith("food_") && !id.startsWith("cap_") && !id.startsWith("fx_"))
    .sort((a, b) => RARITY_ORDER.indexOf(itemRarity(a) ?? "common") - RARITY_ORDER.indexOf(itemRarity(b) ?? "common"))
    .slice(0, 6);
  return {
    publicId: p.publicId,
    demo: false,
    displayName: p.displayName,
    title: p.equippedTitle,
    level: p.level,
    weeklyXp: p.weekly.key === wk ? p.weekly.xp : 0,
    pet: { name: p.pet.name, personality: p.pet.personality, level: p.pet.level, equipped: p.pet.equipped, mutations: p.pet.mutations },
    badges: p.equippedBadges,
    itemCount: Object.keys(p.inventory).length,
    achievementCount: p.achievements.length,
    uniqueViews: p.feed.viewed.length,
    showcase,
  };
}

export function demoProfiles(): PublicProfile[] {
  return DEMO_PLAYERS.map((d) => ({
    publicId: d.publicId,
    demo: true,
    displayName: d.displayName,
    title: d.title,
    level: d.level,
    weeklyXp: d.weeklyXp,
    pet: {
      name: d.petName,
      personality: d.personality,
      level: d.petLevel,
      equipped: { hat: d.hat, eyewear: d.eyewear, aura: d.aura, color: d.color },
      mutations: d.mutations,
    },
    badges: d.badges,
    itemCount: d.items,
    achievementCount: d.achievements,
    uniqueViews: d.views,
    showcase: [d.hat, d.aura, d.color, d.eyewear, ...d.mutations].filter(Boolean) as string[],
  }));
}

