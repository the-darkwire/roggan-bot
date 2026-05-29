import { describe, expect, it } from "vitest";
import { filterTauntChoices } from "../src/commands/taunt";
import { MAXIMUM_TAUNT_ID, MINIMUM_TAUNT_ID } from "../src/constants/taunts";

describe("filterTauntChoices", () => {
  it("returns pinned iconic taunts first, then the rest in id order, for an empty query", () => {
    const all = filterTauntChoices("");
    expect(all).toHaveLength(MAXIMUM_TAUNT_ID - MINIMUM_TAUNT_ID + 1);

    const expectedPinned = [30, 29, 11, 24, 26, 27, 42];
    expect(all.slice(0, expectedPinned.length).map((c) => c.id)).toEqual(expectedPinned);

    const restIds = all.slice(expectedPinned.length).map((c) => c.id);
    const pinnedSet = new Set(expectedPinned);
    expect(restIds.some((id) => pinnedSet.has(id))).toBe(false);
    for (let i = 1; i < restIds.length; i++) {
      expect(restIds[i]).toBeGreaterThan(restIds[i - 1]);
    }
  });

  it("treats whitespace-only as empty", () => {
    expect(filterTauntChoices("   ")).toEqual(filterTauntChoices(""));
  });

  it("matches by message substring case-insensitively", () => {
    const matches = filterTauntChoices("wolo");
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ id: 30, message: "Wololo" });
    expect(filterTauntChoices("WOLOLO")).toEqual(matches);
  });

  it("trims surrounding whitespace from the query", () => {
    expect(filterTauntChoices("  wolo  ")).toEqual(filterTauntChoices("wolo"));
  });

  it("matches by id prefix (a single digit returns that id plus every 2-digit id starting with it)", () => {
    const matches = filterTauntChoices("3");
    const ids = matches.map((m) => m.id);
    expect(ids).toContain(3);
    expect(ids).toContain(30);
    expect(ids).toContain(39);
    expect(ids).not.toContain(2);
    expect(ids).not.toContain(40);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterTauntChoices("zzzzz-no-such-taunt")).toEqual([]);
  });
});
