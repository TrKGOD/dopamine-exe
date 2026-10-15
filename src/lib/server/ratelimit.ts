/** In-memory sliding-window rate limiter (per process). Use Redis for multi-instance deploys. */
const g = globalThis as unknown as { __dopamineRl?: Map<string, number[]> };
const hits: Map<string, number[]> = (g.__dopamineRl ??= new Map());

export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 50_000) {
    for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
  }
  return true;
}
