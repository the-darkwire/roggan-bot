import { describe, expect, it } from "vitest";
import {
  MAXIMUM_TAUNT_ID,
  MINIMUM_TAUNT_ID,
  TauntIDToMessageMap,
} from "../src/constants/taunts";

describe("TauntIDToMessageMap", () => {
  it("has exactly one entry for every id in the implemented range", () => {
    const expected = Array.from(
      { length: MAXIMUM_TAUNT_ID - MINIMUM_TAUNT_ID + 1 },
      (_, i) => i + MINIMUM_TAUNT_ID,
    );
    const actual = Object.keys(TauntIDToMessageMap)
      .map(Number)
      .sort((a, b) => a - b);
    expect(actual).toEqual(expected);
  });

  it("has a non-empty string message for every id", () => {
    for (const [id, message] of Object.entries(TauntIDToMessageMap)) {
      expect(message, `id=${id}`).toMatch(/\S/);
    }
  });
});
