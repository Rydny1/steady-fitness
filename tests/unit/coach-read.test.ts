import { describe, expect, it } from "vitest";
import { coachRead, type CoachStats } from "@/features/insights/coach-read";

const base: CoachStats = {
  days: 14, daysLogged: 13, avgSleep: 7.6, proteinDays: 12, sessionsPlanned: 8, sessionsDone: 7,
  avgNet: -600, targetNet: -600, goal: "lose", streak: 9,
};

describe("coachRead", () => {
  it("says nothing without enough days", () => {
    expect(coachRead({ ...base, days: 3, daysLogged: 2 })).toEqual([]);
  });
  it("a good fortnight: praise and keep going", () => {
    const r = coachRead(base);
    expect(r[0]?.kind).toBe("good");
    expect(r.at(-1)).toEqual({ kind: "do", text: "Keep it boring. Same again." });
  });
  it("names the weakest area and gives one move", () => {
    const r = coachRead({ ...base, avgSleep: 5.5 });
    expect(r.find((l) => l.kind === "work")?.text).toContain("Sleep averages 5.5 h");
    expect(r.find((l) => l.kind === "do")?.text).toContain("bed");
  });
  it("reads a short deficit against the target", () => {
    const r = coachRead({ ...base, avgNet: -150 });
    expect(r.find((l) => l.kind === "work")?.text).toContain("Deficit is 150 a day, target 600");
  });
});
