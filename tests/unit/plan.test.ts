import { describe, expect, it } from "vitest";
import { limitForNet, ratePerWeek, readPlan, suggestNet, weeksFor } from "@/features/nutrition/plan";

describe("plan", () => {
  it("suggests a deficit from goal and weeks", () => {
    // 6 kg in 8 weeks = 46,200 kcal over 56 days = 825 a day
    expect(suggestNet(94, 88, 8)).toBe(-820);
  });
  it("caps a suggestion that is too aggressive", () => {
    expect(suggestNet(94, 88, 4)).toBe(-1000);
    expect(suggestNet(60, 70, 4)).toBe(600);
  });
  it("defaults to a steady pace with no timeframe", () => {
    expect(suggestNet(94, 88, null)).toBe(-550);
    expect(suggestNet(70, 70, null)).toBe(0);
  });
  it("works out the weeks for a chosen net, and the wrong direction gives none", () => {
    expect(weeksFor(94, 88, -550)).toBe(12);
    expect(weeksFor(94, 88, 200)).toBeNull();
  });
  it("turns a net into kg a week and a limit", () => {
    expect(ratePerWeek(-1100)).toBe(-1);
    expect(limitForNet(2340, -1200)).toBe(1140);
    expect(limitForNet(1500, -1200)).toBe(1000);
  });
  it("reads the plan back plainly, for both goals", () => {
    expect(readPlan("lose", -550, 1700, 2340).tone).toBe("good");
    expect(readPlan("lose", -1200, 1800, 2340).tone).toBe("careful");
    expect(readPlan("lose", 100, 1800, 2340).tone).toBe("off");
    expect(readPlan("gain", 300, 1800, 2340).tone).toBe("good");
    expect(readPlan("gain", 900, 1800, 2340).tone).toBe("careful");
  });
});
