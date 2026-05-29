import { describe, expect, it } from "vitest";
import { filterTauntChoices } from "../src/commands/taunt";
import { MAXIMUM_TAUNT_ID, MINIMUM_TAUNT_ID } from "../src/constants/taunts";

describe("filterTauntChoices", () => {
  it("returns all choices for an empty query, sorted by id", () => {
    const all = filterTauntChoices("");
    expect(all).toHaveLength(MAXIMUM_TAUNT_ID - MINIMUM_TAUNT_ID + 1);
    expect(all[0].id).toBe(MINIMUM_TAUNT_ID);
    expect(all.at(-1)?.id).toBe(MAXIMUM_TAUNT_ID);
    for (let i = 1; i < all.length; i++) {
      expect(all[i].id).toBeGreaterThan(all[i - 1].id);
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
