import type { ItemDef, ItemKind, Rarity } from "./types";

type Def = Omit<ItemDef, "stackable" | "droppable"> & { stackable?: boolean; droppable?: boolean };

const STACKABLE_KINDS: ItemKind[] = ["food", "capsule", "effect"];

const RAW: Def[] = [
  // ── Hats ──────────────────────────────────────────────
  { id: "hat_propeller", name: "Propeller Cap", kind: "hat", rarity: "common", emoji: "🧢", description: "Generates 0.0003 watts of whimsy." },
  { id: "hat_cone", name: "Tiny Traffic Cone", kind: "hat", rarity: "common", emoji: "🚧", description: "Stolen from a very small road." },
  { id: "hat_beanie", name: "Beanie of Doom", kind: "hat", rarity: "uncommon", emoji: "🎿", description: "Warm. Ominous. Machine washable." },
  { id: "hat_frog", name: "Frog Bucket Hat", kind: "hat", rarity: "uncommon", emoji: "🐸", description: "The frog is load-bearing." },
  { id: "hat_wizard", name: "Wizard Hat (Discount)", kind: "hat", rarity: "rare", emoji: "🧙", description: "Casts 'mild inconvenience' at level 1." },
  { id: "hat_crown", name: "Crown of Ratio", kind: "hat", rarity: "epic", emoji: "👑", description: "Forged from the tears of reply guys." },
  { id: "hat_halo", name: "Halo.exe", kind: "hat", rarity: "legendary", emoji: "😇", description: "Not responding. Still holy." },
  { id: "hat_orb", name: "Floating Orb Crown", kind: "hat", rarity: "mythical", emoji: "🔮", description: "Seven orbs. Nobody knows who sent them." },
  // ── Eyewear ───────────────────────────────────────────
  { id: "eye_nerd", name: "Nerd Glasses", kind: "eyewear", rarity: "common", emoji: "🤓", description: "+2 to 'well actually'." },
  { id: "eye_3d", name: "3D Glasses", kind: "eyewear", rarity: "uncommon", emoji: "🎞️", description: "Reality now has a red and blue edge." },
  { id: "eye_shades", name: "Deal-With-It Shades", kind: "eyewear", rarity: "rare", emoji: "😎", description: "Descend slowly from the sky on equip." },
  { id: "eye_visor", name: "Cyber Visor", kind: "eyewear", rarity: "epic", emoji: "🥽", description: "Displays ads directly into the soul." },
  { id: "eye_monocle", name: "Monocle of Sigma", kind: "eyewear", rarity: "legendary", emoji: "🧐", description: "Sees through lies and most drywall." },
  // ── Auras ─────────────────────────────────────────────
  { id: "aura_stink", name: "Stink Lines", kind: "aura", rarity: "common", emoji: "♨️", description: "Authentic gamer musk, visualised." },
  { id: "aura_sparkle", name: "Sparkle Dust", kind: "aura", rarity: "uncommon", emoji: "✨", description: "Glitter, but legally distinct." },
  { id: "aura_ring", name: "Neon Ring", kind: "aura", rarity: "rare", emoji: "⭕", description: "A halo for people who stay up too late." },
  { id: "aura_fire", name: "Hellfire Drip", kind: "aura", rarity: "epic", emoji: "🔥", description: "Spicy. Do not pet." },
  { id: "aura_galaxy", name: "Galaxy Brain", kind: "aura", rarity: "legendary", emoji: "🌌", description: "Every thought is a supernova of bad ideas." },
  { id: "aura_void", name: "Void Rift", kind: "aura", rarity: "mythical", emoji: "🕳️", description: "Something on the other side is also scrolling." },
  // ── Colors ────────────────────────────────────────────
  { id: "color_toxic", name: "Toxic Green", kind: "color", rarity: "common", emoji: "🟩", color: "#39ff88", description: "Glows faintly. Tastes like batteries." },
  { id: "color_bruise", name: "Bruise Blue", kind: "color", rarity: "common", emoji: "🟦", color: "#4f7cff", description: "The color of stubbing your toe." },
  { id: "color_vapor", name: "Vaporwave Pink", kind: "color", rarity: "uncommon", emoji: "🌸", color: "#ff71ce", description: "Ａｅｓｔｈｅｔｉｃ." },
  { id: "color_uv", name: "Ultraviolet", kind: "color", rarity: "rare", emoji: "🟪", color: "#a855ff", description: "Visible only to bees and you." },
  { id: "color_gold", name: "Solid Gold", kind: "color", rarity: "epic", emoji: "🟨", color: "#ffcf3a", description: "Not real gold. Do not pawn." },
  { id: "color_chrome", name: "Liquid Chrome", kind: "color", rarity: "legendary", emoji: "🪩", color: "#d7e3f4", description: "Reflects your screen time back at you." },
  { id: "color_glitch", name: "Glitch Rainbow", kind: "color", rarity: "mythical", emoji: "🌈", color: "#ff2e97", description: "Shifts hue. Breaks the renderer's heart." },
  // ── Titles ────────────────────────────────────────────
  { id: "title_scroller", name: "Certified Scroller", kind: "title", rarity: "common", emoji: "📜", description: "A title for the thumb athletes." },
  { id: "title_grass", name: "Touch Grass Denier", kind: "title", rarity: "uncommon", emoji: "🌱", description: "Grass is a psyop." },
  { id: "title_yapper", name: "Professional Yapper", kind: "title", rarity: "rare", emoji: "🗣️", description: "Paid in vibes, per word." },
  { id: "title_lord", name: "Lord of the Feed", kind: "title", rarity: "epic", emoji: "🗡️", description: "The feed bends the knee." },
  { id: "title_main", name: "Main Character", kind: "title", rarity: "legendary", emoji: "🎬", description: "Everyone else is an NPC (affectionate)." },
  { id: "title_algo", name: "The Algorithm Itself", kind: "title", rarity: "mythical", emoji: "🧿", description: "You are what you recommend." },
  { id: "title_chaos", name: "Chaos Survivor", kind: "title", rarity: "rare", emoji: "🌪️", description: "Earned by enduring 5 chaos events.", droppable: false },
  { id: "title_button", name: "Button Presser", kind: "title", rarity: "uncommon", emoji: "🔴", description: "They said do not. You did.", droppable: false },
  // ── Badges (achievement-only) ─────────────────────────
  { id: "badge_dayone", name: "Day One Degenerate", kind: "badge", rarity: "common", emoji: "🥚", description: "Was here when it was cool (now).", droppable: false },
  { id: "badge_explorer", name: "Category Tourist", kind: "badge", rarity: "rare", emoji: "🧭", description: "Discovered every feed category.", droppable: false },
  { id: "badge_spinner", name: "Wheel Enjoyer", kind: "badge", rarity: "uncommon", emoji: "🎡", description: "Spun the wheel 10 times.", droppable: false },
  { id: "badge_feeder", name: "Snack Dealer", kind: "badge", rarity: "uncommon", emoji: "🍖", description: "Fed the pet 25 times.", droppable: false },
  { id: "badge_collector", name: "Hoarder Supreme", kind: "badge", rarity: "epic", emoji: "📦", description: "Owns 25 different items.", droppable: false },
  { id: "badge_mutant", name: "Certified Mutant", kind: "badge", rarity: "epic", emoji: "🧬", description: "Discovered a mutation combo.", droppable: false },
  { id: "badge_final", name: "Final Form Achieved", kind: "badge", rarity: "legendary", emoji: "🐉", description: "Raised a pet to its final evolution.", droppable: false },
  // ── Temporary effects (consumed on use) ───────────────
  { id: "fx_confetti", name: "Confetti Trail", kind: "effect", rarity: "uncommon", emoji: "🎊", effect: { durationMs: 10 * 60_000 }, description: "Your cursor leaks celebration for 10 min." },
  { id: "fx_comic", name: "Comic Sans Curse", kind: "effect", rarity: "rare", emoji: "🔤", effect: { durationMs: 5 * 60_000 }, description: "The whole UI goes Comic Sans for 5 min. Brave." },
  { id: "fx_rainbow", name: "Rainbow Overclock", kind: "effect", rarity: "rare", emoji: "🌈", effect: { durationMs: 5 * 60_000 }, description: "Accent colors cycle the spectrum for 5 min." },
  { id: "fx_doublexp", name: "Double XP Snack", kind: "effect", rarity: "epic", emoji: "⚡", effect: { durationMs: 10 * 60_000 }, description: "Player XP from new posts is doubled for 10 min." },
  // ── Food ──────────────────────────────────────────────
  { id: "food_air", name: "Bag of Air (Chips)", kind: "food", rarity: "common", emoji: "🥔", food: { hunger: 15, petXp: 10, mood: 4 }, description: "Contains 3 chips and an ocean of nitrogen." },
  { id: "food_nugget", name: "Mystery Nugget", kind: "food", rarity: "common", emoji: "🍗", food: { hunger: 22, petXp: 15, mood: 6 }, description: "Shaped like a nugget. Allegedly food." },
  { id: "food_yogurt", name: "Expired Yogurt", kind: "food", rarity: "uncommon", emoji: "🥛", food: { hunger: 12, petXp: 32, mood: 2 }, description: "Expired in 2019. Matured, really." },
  { id: "food_drink", name: "Suspicious Blue Energy", kind: "food", rarity: "rare", emoji: "🧃", food: { hunger: 6, petXp: 65, mood: 18 }, description: "Pet vibrates at 900 bpm afterwards." },
  { id: "food_taco", name: "Golden Taco", kind: "food", rarity: "epic", emoji: "🌮", food: { hunger: 40, petXp: 130, mood: 20 }, description: "Crunchy. Radiant. Slightly radioactive." },
  { id: "food_ramen", name: "Cosmic Ramen", kind: "food", rarity: "legendary", emoji: "🍜", food: { hunger: 60, petXp: 300, mood: 30 }, description: "Noodles from a dimension with better broth." },
  // ── Capsules ──────────────────────────────────────────
  { id: "cap_basic", name: "Basic Brainrot Capsule", kind: "capsule", rarity: "uncommon", emoji: "🥚", capsuleTable: "basic", description: "A capsule full of mostly-normal cosmetics." },
  { id: "cap_glitch", name: "Glitch Capsule", kind: "capsule", rarity: "rare", emoji: "💠", capsuleTable: "glitch", description: "Better odds. Rattles in binary." },
  { id: "cap_mythic", name: "Mythic Capsule", kind: "capsule", rarity: "legendary", emoji: "🌠", capsuleTable: "mythic", description: "Hums at a frequency only cats respect." },
  // ── Mutations ─────────────────────────────────────────
  { id: "mut_glitch", name: "Glitch Skin", kind: "mutation", rarity: "epic", emoji: "📺", description: "Pet occasionally renders at 3 fps." },
  { id: "mut_thirdeye", name: "Third Eye", kind: "mutation", rarity: "epic", emoji: "👁️", description: "Sees the timeline before you do." },
  { id: "mut_laser", name: "Laser Eyes", kind: "mutation", rarity: "legendary", emoji: "🔴", description: "Bullish on absolutely everything." },
  { id: "mut_ghost", name: "Ghost Mode", kind: "mutation", rarity: "epic", emoji: "👻", description: "50% pet, 50% vibes." },
  { id: "mut_pixel", name: "Pixel Body", kind: "mutation", rarity: "legendary", emoji: "👾", description: "Downscaled to 1998 graphics. Peak." },
  { id: "mut_crystal", name: "Crystal Spikes", kind: "mutation", rarity: "mythical", emoji: "💎", description: "Grew gemstones out of pure aura." },
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  RAW.map((d) => [
    d.id,
    { ...d, stackable: d.stackable ?? STACKABLE_KINDS.includes(d.kind), droppable: d.droppable ?? true } as ItemDef,
  ]),
);

export const ITEM_LIST: ItemDef[] = Object.values(ITEMS);

export const COSMETIC_KINDS: ItemKind[] = ["hat", "eyewear", "aura", "color", "title"];

export function getItem(id: string): ItemDef | undefined {
  return ITEMS[id];
}

/** Items that can drop from a pool of the given kind/rarity. */
export function poolItems(kind: "cosmetic" | "mutation" | "effect" | "food", rarity?: Rarity): ItemDef[] {
  return ITEM_LIST.filter((i) => {
    if (!i.droppable) return false;
    if (rarity && i.rarity !== rarity) return false;
    if (kind === "cosmetic") return COSMETIC_KINDS.includes(i.kind);
    return i.kind === kind;
  });
}

export const MUTATION_COMBOS: { id: string; name: string; parts: [string, string]; description: string }[] = [
  { id: "combo_corrupt", name: "Corrupted Save File", parts: ["mut_glitch", "mut_pixel"], description: "Loads in 1998. Crashes in 2077." },
  { id: "combo_prophet", name: "Omniscient Laser Prophet", parts: ["mut_laser", "mut_thirdeye"], description: "Predicts the market. Wrong every time. Confident every time." },
  { id: "combo_dialup", name: "Haunted Dial-Up", parts: ["mut_ghost", "mut_glitch"], description: "Screeches at 56k when you look at it." },
  { id: "combo_oracle", name: "Gem Oracle", parts: ["mut_crystal", "mut_thirdeye"], description: "Fortunes told in carats." },
  { id: "combo_prism", name: "Prism Cannon", parts: ["mut_crystal", "mut_laser"], description: "Refracts lasers into a light show and a lawsuit." },
  { id: "combo_phantom", name: "8-Bit Phantom", parts: ["mut_ghost", "mut_pixel"], description: "Boo, but in chiptune." },
];

export function findCombo(mutations: string[]) {
  if (mutations.length < 2) return undefined;
  const [a, b] = mutations;
  return MUTATION_COMBOS.find((c) => (c.parts[0] === a && c.parts[1] === b) || (c.parts[0] === b && c.parts[1] === a));
}
