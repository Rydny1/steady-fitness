import { describe, expect, it } from "vitest";
import { resolveActivity, speedMet } from "@/features/nutrition/activity";
import { activityKcal } from "@/features/nutrition/targets";

const base = { durationMin: null, distanceKm: null, steps: null, paceMinPerKm: null };

describe("resolveActivity", () => {
  it("I ran 4 km: minutes from a typical pace", () => {
    const r = resolveActivity({ ...base, type: "run", distanceKm: 4 });
    expect(r?.durationMin).toBe(27);
    expect(r?.speedKmh).toBe(9);
    expect(r?.note).toContain("4 km");
  });
  it("uses a stated pace", () => {
    const r = resolveActivity({ ...base, type: "run", distanceKm: 5, paceMinPerKm: 6 });
    expect(r?.durationMin).toBe(30);
    expect(r?.speedKmh).toBe(10);
  });
  it("5000 steps becomes a walk of about 45 minutes", () => {
    const r = resolveActivity({ ...base, type: "walk", steps: 5000 });
    expect(r?.durationMin).toBe(45);
    expect(r?.note).toContain("5,000 steps");
  });
  it("time and distance give the speed", () => {
    const r = resolveActivity({ ...base, type: "run", distanceKm: 5, durationMin: 25 });
    expect(r?.speedKmh).toBe(12);
  });
  it("a plain time still works", () => {
    expect(resolveActivity({ ...base, type: "gym", durationMin: 60 })?.durationMin).toBe(60);
  });
  it("nothing to go on gives null", () => {
    expect(resolveActivity({ ...base, type: "other" })).toBeNull();
  });
  it("a faster run burns more than a slow one over the same time", () => {
    const slow = activityKcal("run", 30, 90, { speedKmh: 8 });
    const fast = activityKcal("run", 30, 90, { speedKmh: 12 });
    expect(fast).toBeGreaterThan(slow);
    expect(speedMet("run", 10)).toBeCloseTo(10.3, 1);
  });
});
