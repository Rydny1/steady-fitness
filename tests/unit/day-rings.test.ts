import { vi } from "vitest";
vi.mock("server-only", () => ({}));
import { describe, expect, it } from "vitest";
import { dayRings, plannedMinutes } from "@/features/game/day-rings";
import { planKeys, toPlanMap } from "@/features/data/day-facts";

const base = { anyEntry: true, eatenKcal: 1500, bmrKcal: 1800, burnedKcal: 0, budgetKcal: 1790, proteinG: 75, proteinTargetG: 150, activityMinutes: 0, plannedMinutes: 45 };

describe("dayRings: one definition for every screen", () => {
  it("a 68 minute walk on a rest day fills the training ring", () => {
    const r = dayRings({ ...base, activityMinutes: 68, plannedMinutes: plannedMinutes(["rest"]) });
    expect(r.train).toBeGreaterThanOrEqual(1);
  });
  it("38 of 60 minutes is about 63 percent, not full", () => {
    const r = dayRings({ ...base, activityMinutes: 38, plannedMinutes: 60 });
    expect(r.train).toBeCloseTo(0.63, 2);
  });
  it("walking counts toward a planned gym day too", () => {
    expect(dayRings({ ...base, activityMinutes: 22, plannedMinutes: 45 }).train).toBeCloseTo(0.49, 2);
  });
  it("two sessions ask for the minutes of both", () => {
    expect(plannedMinutes(["run", "football"])).toBe(90);
    expect(plannedMinutes(["rest"])).toBe(10);
    expect(plannedMinutes(["stretch"])).toBe(10);
    expect(plannedMinutes(["gym_a", "run", "football"])).toBe(135);
  });
  it("a day with nothing logged has no deficit ring, not a full one", () => {
    expect(dayRings({ ...base, anyEntry: false, eatenKcal: 0 }).deficit).toBe(0);
  });
  it("protein is eaten over target", () => {
    expect(dayRings(base).protein).toBeCloseTo(0.5, 2);
  });
});

describe("several sessions a day", () => {
  const plan = toPlanMap([
    { weekday: 2, session_key: "run" },
    { weekday: 2, session_key: "stretch" },
    { weekday: 3, session_key: "gym_a" },
    { weekday: 3, session_key: "run" },
    { weekday: 4, session_key: "rest" },
  ]);
  it("groups the rows by weekday and leaves rest and stretch out of the sessions", () => {
    expect(planKeys(plan, "2026-10-13")).toEqual(["run"]); // a Tuesday
    expect(planKeys(plan, "2026-10-14")).toEqual(["gym_a", "run"]); // a Wednesday
    expect(planKeys(plan, "2026-10-15")).toEqual([]); // a Thursday: rest
  });
});
