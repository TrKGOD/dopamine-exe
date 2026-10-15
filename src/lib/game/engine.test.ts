import { describe, expect, it } from "vitest";
import { POST_CATEGORY } from "../content/posts";
import type { GameAction } from "./actions";
import { CAPSULE_TABLES, PET_RULES, ROULETTE_COOLDOWN_MS, ROULETTE_SEGMENTS } from "./config";
import { applyEnvelope, createPlayer, tick, type EngineCtx } from "./engine";
import { ITEMS } from "./items";
import { chances, seeded, weightedPick } from "./rng";
import { questView } from "./selectors";

const T0 = Date.UTC(2026, 9, 15, 12, 0, 0);
let n = 0;
const nonce = () => `nonce-${++n}-abcdef`;
const ctx = (now: number, seed = 1): EngineCtx => ({ now, rng: seeded(seed), postCategory: (id) => POST_CATEGORY.get(id) });

function fresh() {
  const s = createPlayer("pid", "pub123456", T0);
  const r = applyEnvelope(s, nonce(), { type: "onboard", name: "Blorbo", personality: "gremlin" }, ctx(T0));
  expect(r.ok).toBe(true);
  return s;
}
const act = (s: ReturnType<typeof fresh>, a: GameAction, now: number, seed = 1) => applyEnvelope(s, nonce(), a, ctx(now, seed));

describe("weighted selection", () => {
  it("respects weights statistically and chances sum to 100", () => {
    const rng = seeded(42);
    const counts = new Map<string, number>();
    for (let i = 0; i < 20000; i++) {
      const { item } = weightedPick(ROULETTE_SEGMENTS, (s) => s.weight, rng);
      counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
    }
    const pct = chances(ROULETTE_SEGMENTS, (s) => s.weight);
    expect(pct.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
    const first = ROULETTE_SEGMENTS[0];
    expect((counts.get(first.id)! / 20000) * 100).toBeCloseTo(pct[0], 0);
  });

  it("rejects invalid tables", () => {
    expect(() => weightedPick([], () => 1, Math.random)).toThrow();
    expect(() => weightedPick([1], () => -1, Math.random)).toThrow();
  });

  it("all reward tables reference real items and positive weights", () => {
    for (const seg of ROULETTE_SEGMENTS) {
      expect(seg.weight).toBeGreaterThan(0);
      for (const it of seg.reward.items ?? []) expect(ITEMS[it.id]).toBeDefined();
    }
    for (const t of Object.values(CAPSULE_TABLES)) for (const row of t) expect(row.weight).toBeGreaterThan(0);
  });
});

describe("roulette cooldown", () => {
  it("allows one spin per 120s, enforced on server time", () => {
    const s = fresh();
    expect(act(s, { type: "spin" }, T0).ok).toBe(true);
    const again = act(s, { type: "spin" }, T0 + 5_000);
    expect(again.ok).toBe(false);
    expect(again.error).toBe("cooldown");
    expect(act(s, { type: "spin" }, T0 + ROULETTE_COOLDOWN_MS - 1).ok).toBe(false);
    expect(act(s, { type: "spin" }, T0 + ROULETTE_COOLDOWN_MS).ok).toBe(true);
    expect(s.roulette.totalSpins).toBe(2);
  });

  it("returns the selected segment index for the wheel animation", () => {
    const s = fresh();
    const r = act(s, { type: "spin" }, T0, 7);
    const spin = r.effects.find((e) => e.type === "spin");
    expect(spin && spin.type === "spin" && ROULETTE_SEGMENTS[spin.segmentIndex].id === spin.segmentId).toBe(true);
  });
});

describe("replay protection", () => {
  it("rejects a reused nonce", () => {
    const s = fresh();
    const id = nonce();
    expect(applyEnvelope(s, id, { type: "spin" }, ctx(T0)).ok).toBe(true);
    const replay = applyEnvelope(s, id, { type: "spin" }, ctx(T0 + ROULETTE_COOLDOWN_MS * 2));
    expect(replay.error).toBe("duplicate");
  });

  it("does not let capsules be opened twice", () => {
    const s = fresh();
    expect(s.inventory.cap_basic.qty).toBe(1);
    expect(act(s, { type: "openCapsule", itemId: "cap_basic" }, T0).ok).toBe(true);
    const second = act(s, { type: "openCapsule", itemId: "cap_basic" }, T0 + 10);
    expect(second.ok).toBe(false);
    expect(second.error).toBe("not_owned");
  });
});

describe("feed progression", () => {
  it("rewards only new posts and throttles rapid views", () => {
    const s = fresh();
    const xp0 = s.xp;
    expect(act(s, { type: "viewPost", postId: "p01" }, T0 + 5000).ok).toBe(true);
    const xp1 = s.xp;
    expect(xp1).toBeGreaterThan(xp0);
    act(s, { type: "viewPost", postId: "p01" }, T0 + 9000);
    expect(s.xp).toBe(xp1); // re-watch gives nothing
    const fast = act(s, { type: "viewPost", postId: "p02" }, T0 + 5100);
    expect(fast.error).toBe("too_fast");
    expect(act(s, { type: "viewPost", postId: "nope" }, T0 + 20000).error).toBe("unknown_post");
  });

  it("rewards a like only the first time", () => {
    const s = fresh();
    act(s, { type: "likePost", postId: "p03" }, T0);
    const xp = s.xp;
    act(s, { type: "likePost", postId: "p03" }, T0 + 1); // unlike
    act(s, { type: "likePost", postId: "p03" }, T0 + 2); // like again
    expect(s.xp).toBe(xp);
    expect(s.feed.liked).toContain("p03");
  });

  it("discovers categories and grants mastery", () => {
    const s = fresh();
    let t = T0;
    for (const id of ["p19", "p20", "p21", "p22"]) act(s, { type: "viewPost", postId: id }, (t += 2000));
    expect(s.feed.discovered).toContain("animals");
    expect(s.feed.masteryClaimed).toEqual(expect.arrayContaining(["animals:1", "animals:2"]));
  });
});

describe("pet", () => {
  it("feeding consumes food and grants pet XP", () => {
    const s = fresh();
    const qty = s.inventory.food_nugget.qty;
    expect(act(s, { type: "feedPet", itemId: "food_nugget" }, T0).ok).toBe(true);
    expect(s.inventory.food_nugget.qty).toBe(qty - 1);
    expect(s.pet.xp).toBeGreaterThan(0);
    expect(act(s, { type: "feedPet", itemId: "food_nugget" }, T0 + 100).error).toBe("too_fast");
  });

  it("never starves or resets while the player is away", () => {
    const s = fresh();
    s.pet.xp = 500;
    tick(s, T0 + 1000 * 3_600_000);
    expect(s.pet.hunger).toBe(PET_RULES.hungerFloor);
    expect(s.pet.mood).toBe(PET_RULES.moodFloor);
    expect(s.pet.xp).toBe(500);
  });

  it("locks advanced personalities behind player level", () => {
    const s = fresh();
    expect(act(s, { type: "setPersonality", personality: "entity" }, T0).error).toBe("locked_personality");
  });

  it("detects mutation combos", () => {
    const s = fresh();
    s.inventory.mut_glitch = { itemId: "mut_glitch", qty: 1, firstAcquiredAt: T0, lastAcquiredAt: T0 };
    s.inventory.mut_pixel = { itemId: "mut_pixel", qty: 1, firstAcquiredAt: T0, lastAcquiredAt: T0 };
    act(s, { type: "toggleMutation", itemId: "mut_glitch" }, T0);
    const r = act(s, { type: "toggleMutation", itemId: "mut_pixel" }, T0);
    expect(r.effects.some((e) => e.type === "combo")).toBe(true);
    expect(s.achievements).toContain("a_combo");
  });
});

describe("quests", () => {
  it("cannot be claimed twice or before completion", () => {
    const s = fresh();
    const quests = questView(s);
    const q = quests[0];
    expect(act(s, { type: "claimQuest", questId: q.id }, T0).error).toBe("incomplete");
    (q.period === "daily" ? s.quests.daily : s.quests.weekly)[q.metric] = 999;
    if (q.metric === "categories") s.quests.dailyCategories = ["brainrot", "gaming", "cursed", "animals", "ai", "motivation"];
    expect(act(s, { type: "claimQuest", questId: q.id }, T0).ok).toBe(true);
    expect(act(s, { type: "claimQuest", questId: q.id }, T0 + 1).error).toBe("already_claimed");
  });
});

describe("duplicates", () => {
  it("converts duplicate cosmetics into tokens", () => {
    const s = fresh();
    s.tokens = 100;
    expect(act(s, { type: "buy", itemId: "hat_cone" }, T0).ok).toBe(true);
    expect(act(s, { type: "buy", itemId: "hat_cone" }, T0 + 1).error).toBe("already_owned");
  });
});

describe("chaos", () => {
  it("do-not-click starts an event and has a cooldown", () => {
    const s = fresh();
    act(s, { type: "doNotClick" }, T0);
    expect(s.events.active).not.toBeNull();
    expect(s.stats.dnc).toBe(1);
    act(s, { type: "doNotClick" }, T0 + 1000);
    expect(s.stats.dnc).toBe(1);
  });

  it("event targets can only be hit once", () => {
    const s = fresh();
    s.events.active = { id: "capybara", startedAt: T0, endsAt: T0 + 45_000, claimed: false, hits: [], progress: 0 };
    expect(act(s, { type: "eventHit", target: 0 }, T0 + 1).ok).toBe(true);
    expect(act(s, { type: "eventHit", target: 0 }, T0 + 2).error).toBe("invalid_target");
    expect(act(s, { type: "eventHit", target: 0 }, T0 + 60_000).error).toBe("no_event");
  });
});
