// Body metrics: trend, loss rate, waist ratio, body fat, BMI, goal date (PRODUCT.md > Metrics, Goal date).
import { addDays, diffDays, formatDayShort } from "@/lib/dates";
import type { SexT } from "@/lib/supabase/types";
import { BODY } from "./config";

export type WeightEntry = { day: string; kg: number };

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function waistToHeight(waistCm: number, heightCm: number): number {
  return waistCm / heightCm;
}

/** True when waist to height is under 0.50. */
export function waistToHeightOk(waistCm: number, heightCm: number): boolean {
  return waistToHeight(waistCm, heightCm) < BODY.waistToHeightLimit;
}

/**
 * US Navy body fat estimate, percent. Male: waist, neck, height. Female also needs hips.
 * Returns null when the inputs cannot be used (missing hips, waist not above neck).
 */
export function bodyFatNavy(input: {
  sex: SexT;
  heightCm: number;
  waistCm: number;
  neckCm: number;
  hipsCm?: number | null;
}): number | null {
  const { sex, heightCm, waistCm, neckCm } = input;
  if (sex === "male") {
    const d = waistCm - neckCm;
    if (d <= 0 || heightCm <= 0) return null;
    return 495 / (1.0324 - 0.19077 * Math.log10(d) + 0.15456 * Math.log10(heightCm)) - 450;
  }
  const hips = input.hipsCm;
  if (hips === null || hips === undefined) return null;
  const d = waistCm + hips - neckCm;
  if (d <= 0 || heightCm <= 0) return null;
  return 495 / (1.29579 - 0.35004 * Math.log10(d) + 0.221 * Math.log10(heightCm)) - 450;
}

/** 7-day rolling average ending on `day`. Days with several weigh-ins count once, as their mean. Null when no weigh-in in the window. */
export function trendAt(entries: readonly WeightEntry[], day: string): number | null {
  const from = addDays(day, -(BODY.trendWindowDays - 1));
  const byDay = new Map<string, number[]>();
  for (const e of entries) {
    if (e.day < from || e.day > day) continue;
    const list = byDay.get(e.day);
    if (list) list.push(e.kg);
    else byDay.set(e.day, [e.kg]);
  }
  if (byDay.size === 0) return null;
  let sum = 0;
  for (const list of byDay.values()) sum += list.reduce((a, b) => a + b, 0) / list.length;
  return sum / byDay.size;
}

/** Trend value for every day in [from, to] that has one. */
export function trendSeries(
  entries: readonly WeightEntry[],
  from: string,
  to: string,
): { day: string; avgKg: number }[] {
  const out: { day: string; avgKg: number }[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const avg = trendAt(entries, d);
    if (avg !== null) out.push({ day: d, avgKg: avg });
  }
  return out;
}

/** (avg now - avg 7 days ago) / avg 7 days ago * 100. Negative is loss. Null without both averages. */
export function weeklyChangePct(avgNow: number | null, avgWeekAgo: number | null): number | null {
  if (avgNow === null || avgWeekAgo === null || avgWeekAgo === 0) return null;
  return ((avgNow - avgWeekAgo) / avgWeekAgo) * 100;
}

/** Weekly change on a day, from entries. */
export function weeklyChangeAt(entries: readonly WeightEntry[], day: string): number | null {
  return weeklyChangePct(trendAt(entries, day), trendAt(entries, addDays(day, -7)));
}

/** Loss rate target band, percent a week. */
export function lossRateBand(changePct: number | null): "slow" | "on_track" | "fast" | "unknown" {
  if (changePct === null) return "unknown";
  const loss = -changePct;
  if (loss > 1.0) return "fast";
  if (loss >= 0.5) return "on_track";
  return "slow";
}

export type GoalProjection =
  | { kind: "not_enough_data" }
  | { kind: "reached" }
  | { kind: "no_date" }
  | { kind: "date"; date: string; daysAway: number; kgPerWeek: number; goalKg: number };

/**
 * Linear fit on the 7-day average over the last 21 days.
 * Falling -> the day the fit reaches the goal. Flat or rising -> no date.
 */
export function projectGoalDate(input: {
  entries: readonly WeightEntry[];
  today: string;
  goalKg: number;
}): GoalProjection {
  const from = addDays(input.today, -(BODY.goalFitDays - 1));
  const pts = trendSeries(input.entries, from, input.today);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last || pts.length < BODY.goalFitMinPoints) return { kind: "not_enough_data" };
  if (diffDays(last.day, first.day) < BODY.goalFitMinSpanDays) return { kind: "not_enough_data" };
  if (last.avgKg <= input.goalKg) return { kind: "reached" };

  const xs = pts.map((p) => diffDays(p.day, from));
  const ys = pts.map((p) => p.avgKg);
  const n = pts.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = (xs[i] ?? 0) - mx;
    num += dx * ((ys[i] ?? 0) - my);
    den += dx * dx;
  }
  const slope = den === 0 ? 0 : num / den; // kg per day
  if (slope > -BODY.goalMinFallPerDay) return { kind: "no_date" };

  // Start from the fitted line's value on the last day, not the noisy last point.
  const fittedNow = my + slope * ((xs[n - 1] ?? 0) - mx);
  const days = Math.ceil((fittedNow - input.goalKg) / -slope);
  if (days > BODY.goalMaxDays) return { kind: "no_date" };
  const daysAway = Math.max(0, days);
  return {
    kind: "date",
    date: addDays(last.day, daysAway),
    daysAway,
    kgPerWeek: slope * 7,
    goalKg: input.goalKg,
  };
}

/** The plain goal line, or null when there is not enough data to say anything. */
export function goalLine(projection: GoalProjection): string | null {
  if (projection.kind === "date") {
    return BODY.goalTemplate
      .replace("{kg}", String(projection.goalKg))
      .replace("{date}", formatDayShort(projection.date));
  }
  if (projection.kind === "no_date") return BODY.goalNone;
  return null;
}
