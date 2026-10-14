import { describe, expect, it } from "vitest";
import {
  bmi,
  bodyFatNavy,
  goalLine,
  lossRateBand,
  projectGoalDate,
  trendAt,
  trendSeries,
  waistToHeight,
  waistToHeightOk,
  weeklyChangeAt,
  weeklyChangePct,
  type WeightEntry,
} from "@/features/body/metrics";
import { addDays } from "@/lib/dates";

function series(start: string, kgs: number[]): WeightEntry[] {
  return kgs.map((kg, i) => ({ day: addDays(start, i), kg }));
}

describe("body metrics", () => {
  it("BMI and waist to height", () => {
    expect(bmi(80, 180)).toBeCloseTo(24.69, 2);
    expect(waistToHeight(90, 180)).toBe(0.5);
    expect(waistToHeightOk(89, 180)).toBe(true);
    expect(waistToHeightOk(90, 180)).toBe(false);
  });

  it("US Navy body fat, male", () => {
    const bf = bodyFatNavy({ sex: "male", heightCm: 180, waistCm: 90, neckCm: 38 });
    expect(bf).toBeCloseTo(
      495 / (1.0324 - 0.19077 * Math.log10(52) + 0.15456 * Math.log10(180)) - 450,
      6,
    );
    expect(bf).toBeGreaterThan(15);
    expect(bf).toBeLessThan(25);
    expect(bodyFatNavy({ sex: "male", heightCm: 180, waistCm: 38, neckCm: 40 })).toBeNull();
    expect(bodyFatNavy({ sex: "male", heightCm: 0, waistCm: 90, neckCm: 38 })).toBeNull();
  });

  it("US Navy body fat, female needs hips", () => {
    expect(bodyFatNavy({ sex: "female", heightCm: 165, waistCm: 75, neckCm: 32 })).toBeNull();
    expect(bodyFatNavy({ sex: "female", heightCm: 165, waistCm: 75, neckCm: 32, hipsCm: null })).toBeNull();
    const bf = bodyFatNavy({ sex: "female", heightCm: 165, waistCm: 75, neckCm: 32, hipsCm: 98 });
    expect(bf).toBeCloseTo(
      495 / (1.29579 - 0.35004 * Math.log10(75 + 98 - 32) + 0.221 * Math.log10(165)) - 450,
      6,
    );
    expect(bodyFatNavy({ sex: "female", heightCm: 165, waistCm: 20, neckCm: 40, hipsCm: 10 })).toBeNull();
  });

  it("7-day trend averages the window and counts a day once", () => {
    const e = [...series("2026-10-01", [90, 89, 88]), { day: "2026-10-03", kg: 86 }];
    // days: 90, 89, mean(88, 86)=87
    expect(trendAt(e, "2026-10-03")).toBeCloseTo((90 + 89 + 87) / 3, 8);
    expect(trendAt(e, "2026-10-09")).toBeCloseTo(87, 8); // only 10-03 in 10-03..10-09
    expect(trendAt(e, "2026-10-20")).toBeNull();
    expect(trendAt([], "2026-10-20")).toBeNull();
  });

  it("trend series skips days without data", () => {
    const e = series("2026-10-01", [90, 89]);
    const s = trendSeries(e, "2026-09-29", "2026-10-12");
    expect(s[0]?.day).toBe("2026-10-01");
    expect(s[s.length - 1]?.day).toBe("2026-10-08");
  });

  it("weekly loss rate in percent, negative is loss", () => {
    expect(weeklyChangePct(89.1, 90)).toBeCloseTo(-1, 6);
    expect(weeklyChangePct(null, 90)).toBeNull();
    expect(weeklyChangePct(90, null)).toBeNull();
    expect(weeklyChangePct(90, 0)).toBeNull();
    const e = series("2026-10-01", Array.from({ length: 14 }, (_, i) => 90 - i * 0.1));
    expect(weeklyChangeAt(e, "2026-10-14")).toBeLessThan(0);
  });

  it("loss rate band", () => {
    expect(lossRateBand(null)).toBe("unknown");
    expect(lossRateBand(-0.2)).toBe("slow");
    expect(lossRateBand(0.3)).toBe("slow");
    expect(lossRateBand(-0.5)).toBe("on_track");
    expect(lossRateBand(-1.0)).toBe("on_track");
    expect(lossRateBand(-1.4)).toBe("fast");
  });
});

describe("goal date", () => {
  const today = "2026-10-21";
  const start = addDays(today, -20);

  it("falling trend gives a date and the plain line", () => {
    const kgs = Array.from({ length: 21 }, (_, i) => 90 - i * 0.1);
    const p = projectGoalDate({ entries: series(start, kgs), today, goalKg: 80 });
    expect(p.kind).toBe("date");
    if (p.kind !== "date") return;
    expect(p.daysAway).toBeGreaterThan(70);
    expect(p.daysAway).toBeLessThan(130);
    expect(p.kgPerWeek).toBeLessThan(0);
    expect(goalLine(p)).toMatch(/^At this pace, you'll reach 80 kg around [0-9]{1,2} [A-Z][a-z]{2}.$/);
  });

  it("flat or rising trend gives no date", () => {
    const flat = projectGoalDate({ entries: series(start, Array(21).fill(88)), today, goalKg: 80 });
    expect(flat.kind).toBe("no_date");
    expect(goalLine(flat)).toBe("The trend needs to fall before a date makes sense.");
    const rising = projectGoalDate({
      entries: series(start, Array.from({ length: 21 }, (_, i) => 88 + i * 0.1)),
      today,
      goalKg: 80,
    });
    expect(rising.kind).toBe("no_date");
  });

  it("goal already reached", () => {
    const kgs = Array.from({ length: 21 }, (_, i) => 80.5 - i * 0.1);
    expect(projectGoalDate({ entries: series(start, kgs), today, goalKg: 80 })).toEqual({ kind: "reached" });
    expect(goalLine({ kind: "reached" })).toBeNull();
  });

  it("not enough data", () => {
    expect(projectGoalDate({ entries: [], today, goalKg: 80 })).toEqual({ kind: "not_enough_data" });
    expect(projectGoalDate({ entries: series(addDays(today, -3), [90, 89.5, 89, 88.5]), today, goalKg: 80 })).toEqual({
      kind: "not_enough_data",
    });
    expect(goalLine({ kind: "not_enough_data" })).toBeNull();
    const dense = series(addDays(today, -6), [90, 89.9, 89.8, 89.7, 89.6, 89.5, 89.4]);
    expect(projectGoalDate({ entries: dense, today, goalKg: 80 }).kind).toBe("not_enough_data");
  });

  it("a projection beyond two years is no date", () => {
    const kgs = Array.from({ length: 21 }, (_, i) => 90 - i * 0.006);
    const p = projectGoalDate({ entries: series(start, kgs), today, goalKg: 60 });
    expect(p.kind).toBe("no_date");
  });

  it("works across the Riga DST change (2026-10-25) with plain day strings", () => {
    const t = "2026-10-28";
    const kgs = Array.from({ length: 21 }, (_, i) => 90 - i * 0.1);
    const p = projectGoalDate({ entries: series(addDays(t, -20), kgs), today: t, goalKg: 85 });
    expect(p.kind).toBe("date");
    if (p.kind === "date") expect(p.date > t).toBe(true);
  });
});
