import { describe, expect, it } from "vitest";
import { monthNeed, paceSentence, projectNet } from "@/features/nutrition/projection";

describe("projectNet", () => {
  it("turns an average deficit into kg a week and weeks to goal", () => {
    const p = projectNet({ goal: "lose", avgNet: -550, loggedDays: 10, currentKg: 94, goalKg: 88 });
    expect(p.kgPerWeek).toBe(-0.5);
    expect(p.weeksToGoal).toBe(12);
    expect(paceSentence(p)).toContain("lose about 0.5 kg a week");
  });
  it("tells you when the pace is the wrong way for the goal", () => {
    const p = projectNet({ goal: "lose", avgNet: 200, loggedDays: 10, currentKg: 94, goalKg: 88 });
    expect(p.weeksToGoal).toBeNull();
    expect(paceSentence(p)).toContain("To lose, eat less");
  });
  it("needs a few days of data before it predicts", () => {
    const p = projectNet({ goal: "lose", avgNet: -900, loggedDays: 2, currentKg: 94, goalKg: 88 });
    expect(p.kgPerWeek).toBeNull();
  });
  it("flags a one-month target past the safe limit", () => {
    const p = projectNet({ goal: "lose", avgNet: -500, loggedDays: 10, currentKg: 94, goalKg: 88 });
    expect(p.needPer30Days).toBe(-1540);
    expect(monthNeed(p)).toContain("safe limit");
  });
});
