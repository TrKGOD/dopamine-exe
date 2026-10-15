import { describe, expect, it } from "vitest";
import { POST_CATEGORY } from "../content/posts";
import type { GameAction } from "./actions";
import { basePps, clickPower, clickerBonuses, multipliers, productionPerSecond } from "./clicker";
import { CLICKER_RULES, CLICKER_UPGRADES, PET_CLICKER_PERKS, getUpgrade, maxAffordable, shardsFor, upgradeCost } from "./clickerConfig";
import { applyEnvelope, createPlayer, tick, type EngineCtx } from "./engine";
import { seeded } from "./rng";

const T0 = Date.UTC(2026, 9, 15, 12, 0, 0);
let n = 0;
const nonce = () => `clk-${++n}-abcdef`;
const ctx = (now: number): EngineCtx => ({ now, rng: seeded(3), postCategory: (id) => POST_CATEGORY.get(id) });

function fresh(personality: "gremlin" | "sigma" | "capybara" = "capybara") {
  const s = createPlayer("pid", "pub123456", T0);
  applyEnvelope(s, nonce(), { type: "onboard", name: "Blorbo", personality }, ctx(T0));
  return s;
}
const act = (s: ReturnType<typeof fresh>, a: GameAction, now: number) => applyEnvelope(s, nonce(), a, ctx(now));

describe("config validation", () => {
  it("upgrades have unique ids, positive costs, scaling > 1 and positive effects", () => {
    const ids = new Set(CLICKER_UPGRADES.map((u) => u.id));
    expect(ids.size).toBe(CLICKER_UPGRADES.length);
    for (const u of CLICKER_UPGRADES) {
      expect(u.baseCost).toBeGreaterThan(0);
      expect(u.costScale).toBeGreaterThan(1);
      expect(u.effect).toBeGreaterThan(0);
    }
    for (const id of ["rusty_mouse", "braincell_miner", "goblin_intern", "meme_farm", "skibidi_reactor", "quantum_rat", "blorbo_assistant", "the_algorithm"]) {
      expect(getUpgrade(id)).toBeDefined();
    }
  });

  it("bulk cost equals the sum of single purchases and maxAffordable never overshoots", () => {
    const u = getUpgrade("goblin_intern")!;
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += u.baseCost * Math.pow(u.costScale, 3 + i);
    expect(upgradeCost(u, 3, 10)).toBe(Math.ceil(sum));
    for (const bal of [0, 399, 400, 5000, 123456]) {
      const q = maxAffordable(u, 0, bal);
      expect(upgradeCost(u, 0, q)).toBeLessThanOrEqual(bal);
      if (q < CLICKER_RULES.maxBulk) expect(upgradeCost(u, 0, q + 1)).toBeGreaterThan(bal);
    }
  });
});

describe("clicking", () => {
  it("each accepted click earns exactly the click power", () => {
    const s = fresh("capybara"); // capybara has no click perk; stage 1 has no click bonus
    expect(clickPower(s, T0)).toBe(1);
    act(s, { type: "clickerSync", clicks: 10 }, T0);
    expect(s.clicker.braincells).toBe(10);
    expect(s.clicker.totalClicks).toBe(10);
  });

  it("caps clicks with a token bucket (autoclickers / duplicate tabs)", () => {
    const s = fresh();
    act(s, { type: "clickerSync", clicks: 200 }, T0);
    expect(s.clicker.totalClicks).toBe(CLICKER_RULES.clickBurst);
    // a second tab firing at the same instant gets nothing extra
    act(s, { type: "clickerSync", clicks: 200 }, T0);
    expect(s.clicker.totalClicks).toBe(CLICKER_RULES.clickBurst);
    // one second later only maxCps more are allowed
    act(s, { type: "clickerSync", clicks: 200 }, T0 + 1000);
    expect(s.clicker.totalClicks).toBe(CLICKER_RULES.clickBurst + CLICKER_RULES.maxCps);
  });
});

describe("upgrades", () => {
  it("rejects purchases with insufficient funds and does not change state", () => {
    const s = fresh();
    const r = act(s, { type: "clickerBuy", upgradeId: "rusty_mouse", qty: 1, clicks: 0 }, T0);
    expect(r.error).toBe("insufficient_funds");
    expect(s.clicker.owned.rusty_mouse).toBeUndefined();
    expect(s.clicker.braincells).toBe(0);
  });

  it("charges the documented cost and applies the documented effect", () => {
    const s = fresh();
    s.clicker.braincells = 1000;
    act(s, { type: "clickerBuy", upgradeId: "rusty_mouse", qty: 2, clicks: 0 }, T0);
    expect(s.clicker.braincells).toBe(1000 - upgradeCost(getUpgrade("rusty_mouse")!, 0, 2));
    expect(clickPower(s, T0)).toBe(3); // 1 base + 2 × 1
    act(s, { type: "clickerBuy", upgradeId: "braincell_miner", qty: 1, clicks: 0 }, T0);
    expect(basePps(s.clicker)).toBe(1);
  });

  it("refuses locked upgrades", () => {
    const s = fresh();
    s.clicker.braincells = 1e9;
    expect(act(s, { type: "clickerBuy", upgradeId: "the_algorithm", qty: 1, clicks: 0 }, T0).error).toBe("locked");
  });

  it("applies pending clicks before the purchase in one step", () => {
    const s = fresh();
    expect(act(s, { type: "clickerBuy", upgradeId: "rusty_mouse", qty: 1, clicks: 15 }, T0).ok).toBe(true);
    expect(s.clicker.owned.rusty_mouse).toBe(1);
  });
});

describe("passive production & offline", () => {
  it("pays short gaps immediately and exactly once", () => {
    const s = fresh();
    s.clicker.owned.braincell_miner = 10; // 10/s base, capybara +10% passive
    tick(s, T0 + 30_000);
    const after = s.clicker.braincells;
    expect(after).toBeCloseTo(10 * 1.1 * 30, 5);
    tick(s, T0 + 30_000); // same instant again (e.g. a second tab): nothing more
    expect(s.clicker.braincells).toBe(after);
  });

  it("turns long gaps into one capped, claimable summary", () => {
    const s = fresh();
    s.clicker.owned.braincell_miner = 10;
    tick(s, T0 + 48 * 3_600_000); // away 48h
    const p = s.clicker.pendingOffline!;
    expect(p.seconds).toBe(8 * 3600);
    expect(p.amount).toBe(Math.floor(10 * 1.1 * 8 * 3600));
    expect(s.clicker.braincells).toBe(0);
    expect(act(s, { type: "clickerClaimOffline" }, T0 + 48 * 3_600_000).ok).toBe(true);
    expect(s.clicker.braincells).toBe(p.amount);
    expect(act(s, { type: "clickerClaimOffline" }, T0 + 48 * 3_600_000).error).toBe("nothing_to_claim");
    tick(s, T0 + 48 * 3_600_000 + 10);
    expect(s.clicker.pendingOffline).toBeNull();
  });

  it("ignores invalid / future timestamps", () => {
    const s = fresh();
    s.clicker.owned.braincell_miner = 10;
    s.clicker.lastTickAt = T0 + 10 * 3_600_000; // in the future
    tick(s, T0);
    expect(s.clicker.braincells).toBe(0);
    expect(s.clicker.pendingOffline).toBeNull();
    s.clicker.lastTickAt = Number.NaN;
    tick(s, T0 + 1000);
    expect(s.clicker.braincells).toBe(0);
  });
});

describe("pet bonuses", () => {
  it("multiplies independent sources and lists each one", () => {
    const s = fresh("gremlin");
    s.pet.level = 6; // stage 3: +10% click
    s.clicker.shards = 2; // +20%
    const b = clickerBonuses(s, T0);
    expect(b.map((x) => x.id).sort()).toEqual(["personality", "shards", "stage"]);
    const m = multipliers(b);
    expect(m.click).toBeCloseTo((1 + PET_CLICKER_PERKS.gremlin.click) * 1.1 * 1.2, 10);
    expect(m.passive).toBeCloseTo(1.2, 10);
  });

  it("feeding grants a non-stacking temporary Sugar Rush", () => {
    const s = fresh("capybara");
    s.clicker.owned.braincell_miner = 10;
    act(s, { type: "feedPet", itemId: "food_nugget" }, T0);
    act(s, { type: "feedPet", itemId: "food_nugget" }, T0 + 5000);
    const sugar = clickerBonuses(s, T0 + 6000).filter((b) => b.id === "sugar");
    expect(sugar).toHaveLength(1);
    expect(productionPerSecond(s, T0 + 6000)).toBeCloseTo(10 * 1.1 * 1.25, 10);
    expect(clickerBonuses(s, T0 + 5000 + CLICKER_RULES.sugarRush.durationMs + 1).some((b) => b.id === "sugar")).toBe(false);
  });

  it("cosmetics never change stats", () => {
    const s = fresh("capybara");
    const before = clickPower(s, T0);
    s.pet.equipped = { hat: "hat_crown", aura: "aura_void", color: "color_gold" };
    expect(clickPower(s, T0)).toBe(before);
  });
});

describe("prestige", () => {
  it("is locked below the threshold", () => {
    const s = fresh();
    expect(act(s, { type: "clickerPrestige", confirm: true }, T0).error).toBe("prestige_locked");
  });

  it("resets only run progress and keeps permanent fields", () => {
    const s = fresh();
    s.clicker.lifetimeRun = 4_000_000;
    s.clicker.lifetimeAll = 5_000_000;
    s.clicker.braincells = 123_456;
    s.clicker.owned = { braincell_miner: 50, rusty_mouse: 10 };
    s.clicker.totalClicks = 777;
    s.clicker.missionsClaimed = ["cm_click100"];
    const coins = s.coins;
    const petXp = s.pet.xp;
    expect(act(s, { type: "clickerPrestige", confirm: true }, T0).ok).toBe(true);
    expect(s.clicker.shards).toBe(shardsFor(4_000_000));
    expect(s.clicker.shards).toBe(6);
    expect(s.clicker.braincells).toBe(0);
    expect(s.clicker.owned).toEqual({});
    expect(s.clicker.lifetimeRun).toBe(0);
    expect(s.clicker.lifetimeAll).toBe(5_000_000);
    expect(s.clicker.totalClicks).toBe(777);
    expect(s.clicker.missionsClaimed).toEqual(["cm_click100"]);
    expect(s.coins).toBeGreaterThanOrEqual(coins); // main wallet never reset (achievements may add)
    expect(s.pet.xp).toBeGreaterThanOrEqual(petXp);
    expect(s.achievements).toContain("c_prestige");
  });
});

describe("missions & achievements", () => {
  it("clicker missions pay once", () => {
    const s = fresh();
    s.clicker.totalClicks = 100;
    const xp = s.xp;
    expect(act(s, { type: "clickerClaimMission", missionId: "cm_click100" }, T0).ok).toBe(true);
    expect(s.xp).toBeGreaterThan(xp);
    expect(act(s, { type: "clickerClaimMission", missionId: "cm_click100" }, T0).error).toBe("already_claimed");
    expect(act(s, { type: "clickerClaimMission", missionId: "cm_prestige" }, T0).error).toBe("incomplete");
  });

  it("clicker achievements unlock once through the shared system", () => {
    const s = fresh();
    act(s, { type: "clickerSync", clicks: 1 }, T0);
    expect(s.achievements.filter((a) => a === "c_first_click")).toHaveLength(1);
    act(s, { type: "clickerSync", clicks: 1 }, T0 + 1000);
    expect(s.achievements.filter((a) => a === "c_first_click")).toHaveLength(1);
  });
});
