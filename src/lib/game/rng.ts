export type Rng = () => number;

/** Weighted random pick. Throws on an invalid table so bad config fails loudly. */
export function weightedPick<T>(items: readonly T[], weight: (t: T) => number, rng: Rng): { item: T; index: number } {
  if (items.length === 0) throw new Error("weightedPick: empty table");
  let total = 0;
  for (const it of items) {
    const w = weight(it);
    if (!Number.isFinite(w) || w < 0) throw new Error("weightedPick: invalid weight");
    total += w;
  }
  if (total <= 0) throw new Error("weightedPick: total weight must be > 0");
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weight(items[i]);
    if (roll < 0) return { item: items[i], index: i };
  }
  return { item: items[items.length - 1], index: items.length - 1 };
}

/** Percent chances for display, guaranteed to match weightedPick. */
export function chances<T>(items: readonly T[], weight: (t: T) => number): number[] {
  const total = items.reduce((a, t) => a + weight(t), 0);
  return items.map((t) => (weight(t) / total) * 100);
}

/** Deterministic PRNG (mulberry32) — used for seeded quest rotation and tests. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
