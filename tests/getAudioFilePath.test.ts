import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MAXIMUM_TAUNT_ID,
  MAXIMUM_TAUNT_ID_DEFINITIVE_EDITION,
  MINIMUM_TAUNT_ID,
} from "../src/constants/taunts";
import { getAudioFilePath } from "../src/utils/getAudioFilePath";

describe("getAudioFilePath", () => {
  it("zero-pads single-digit IDs", () => {
    expect(getAudioFilePath(1)).toBe("assets/01.mp3");
    expect(getAudioFilePath(9)).toBe("assets/09.mp3");
  });

  it("preserves two-digit IDs", () => {
    expect(getAudioFilePath(10)).toBe("assets/10.mp3");
    expect(getAudioFilePath(MAXIMUM_TAUNT_ID)).toBe(`assets/${MAXIMUM_TAUNT_ID}.mp3`);
  });

  it("returns null outside the implemented range", () => {
    expect(getAudioFilePath(0)).toBeNull();
    expect(getAudioFilePath(-1)).toBeNull();
    expect(getAudioFilePath(MAXIMUM_TAUNT_ID + 1)).toBeNull();
    expect(getAudioFilePath(MAXIMUM_TAUNT_ID_DEFINITIVE_EDITION)).toBeNull();
  });

  it("returns a path to a file that actually exists on disk for every implemented ID", () => {
    for (let id = MINIMUM_TAUNT_ID; id <= MAXIMUM_TAUNT_ID; id++) {
      const path = getAudioFilePath(id);
      expect(path, `id=${id} should resolve`).not.toBeNull();
      expect(existsSync(path as string), `${path} should exist`).toBe(true);
    }
  });
});
