import { describe, expect, it } from "vitest";
import { clampGuess, metFor } from "@/features/nutrition/mets";

describe("any activity", () => {
  it("uses the table for known activities, whatever the AI says", () => {
    expect(metFor("swimming laps", 2)).toBe(7);
    expect(metFor("skipping rope", null)).toBe(11);
  });
  it("uses the AI estimate for unknown ones, held to a believable range", () => {
    expect(metFor("underwater basket weaving", 4.2)).toBe(4.2);
    expect(metFor("quidditch", 99)).toBe(15);
    expect(metFor("napping", 0)).toBe(1.5);
    expect(metFor("mystery", null)).toBe(4);
  });
  it("guesses a duration only inside a sane range", () => {
    expect(clampGuess(null)).toBe(30);
    expect(clampGuess(2)).toBe(5);
    expect(clampGuess(900)).toBe(240);
  });
});
