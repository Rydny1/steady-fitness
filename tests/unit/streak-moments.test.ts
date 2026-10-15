import { describe, expect, it } from "vitest";
import { fatKg, moveLine, nextMilestone, streakCopy, toMilestone } from "@/features/game/streak-moments";
import { quickParse } from "@/features/logging/quick-parse";

describe("streak moments", () => {
  it("points at the next milestone", () => {
    expect(nextMilestone(5)).toBe(7);
    expect(toMilestone(5)).toEqual({ target: 7, left: 2, from: 3 });
    expect(nextMilestone(400)).toBeNull();
  });
  it("makes milestones feel bigger than ordinary days", () => {
    expect(streakCopy(7).milestone).toBe(true);
    expect(streakCopy(8).milestone).toBe(false);
    expect(streakCopy(1).title).toBe("Day one");
  });
  it("says whether you are down or up today, in kg", () => {
    expect(fatKg(1500)).toBe(0.19);
    expect(moveLine(-2500)).toBe("Down ~0.32 kg today.");
    expect(moveLine(400)).toBe("Up ~0.05 kg today.");
    expect(moveLine(0)).toBeNull();
  });
  it("logs a fasting day as a zero-calorie entry", () => {
    const r = quickParse("I fasted today");
    expect(r.leftover).toEqual([]);
    const f = r.items[0];
    expect(f?.kind === "food" && f.kcal).toBe(0);
  });
});
