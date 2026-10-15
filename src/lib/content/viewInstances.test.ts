import { describe, expect, it } from "vitest";
import { EMPTY_INSTANCES, endInstance, isLikedInInstance, setInstanceLike } from "./viewInstances";

describe("per-viewing-instance like state", () => {
  it("like A, move to B, return to A: A starts unliked; B never affected", () => {
    let s = EMPTY_INSTANCES;
    s = setInstanceLike(s, "A", true);
    expect(isLikedInInstance(s, "A")).toBe(true);

    s = endInstance(s, "A"); // B becomes active
    expect(isLikedInInstance(s, "B")).toBe(false);
    s = setInstanceLike(s, "B", true);

    s = endInstance(s, "B"); // back to A: new instance
    expect(isLikedInInstance(s, "A")).toBe(false);
    expect(s.liked["B#0"]).toBeUndefined(); // B's old instance was dropped
  });

  it("every revisit of A starts unliked", () => {
    let s = EMPTY_INSTANCES;
    for (let i = 0; i < 5; i++) {
      expect(isLikedInInstance(s, "A")).toBe(false);
      s = setInstanceLike(s, "A", true);
      s = endInstance(s, "A");
    }
    expect(Object.keys(s.liked)).toHaveLength(0); // no leaked stale entries
  });

  it("ending one post's instance does not reset another post", () => {
    let s = setInstanceLike(EMPTY_INSTANCES, "B", true);
    s = setInstanceLike(s, "A", true);
    s = endInstance(s, "A");
    expect(isLikedInInstance(s, "B")).toBe(true);
  });

  it("never mutates the previous state object", () => {
    const s = setInstanceLike(EMPTY_INSTANCES, "A", true);
    const frozen = JSON.stringify(s);
    endInstance(s, "A");
    expect(JSON.stringify(s)).toBe(frozen);
    expect(EMPTY_INSTANCES).toEqual({ visits: {}, liked: {} });
  });
});
