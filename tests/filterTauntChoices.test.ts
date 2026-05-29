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

  describe("with user-pinned ids", () => {
    it("places user pins first in the user's pin order, then everything else", () => {
      const all = filterTauntChoices("", [5, 18, 3]);
      expect(all.slice(0, 3).map((c) => c.id)).toEqual([5, 18, 3]);
      expect(all).toHaveLength(MAXIMUM_TAUNT_ID - MINIMUM_TAUNT_ID + 1);
    });

    it("does not duplicate a user pin that is also globally pinned", () => {
      // 30 (Wololo) is in PINNED_TAUNT_IDS; pinning it as a user should not show twice
      const all = filterTauntChoices("", [30]);
      const ids = all.map((c) => c.id);
      const occurrencesOf30 = ids.filter((id) => id === 30).length;
      expect(occurrencesOf30).toBe(1);
      expect(ids[0]).toBe(30);
      expect(all).toHaveLength(MAXIMUM_TAUNT_ID - MINIMUM_TAUNT_ID + 1);
    });

    it("ranks user pins above other matches when a query is provided", () => {
      // Both 30 (Wololo) and 3 (Food please) include something; the user pin should come first
      const matches = filterTauntChoices("o", [3]);
      expect(matches[0].id).toBe(3);
    });

    it("excludes user pins that don't match the typed query", () => {
      // User pinned 5 (Gold please) but searches for 'wol' — 5 should not appear
      const matches = filterTauntChoices("wol", [5]);
      expect(matches.map((c) => c.id)).not.toContain(5);
    });

    it("ignores user-pinned ids that don't exist in the taunt map", () => {
      // Defensive: if a stale pin row points to an unknown id, skip it rather than crash
      const all = filterTauntChoices("", [999, 5]);
      expect(all.slice(0, 1).map((c) => c.id)).toEqual([5]);
    });

    it("treats an empty userPinnedIds list the same as the no-arg default", () => {
      expect(filterTauntChoices("")).toEqual(filterTauntChoices("", []));
    });
  });
});
