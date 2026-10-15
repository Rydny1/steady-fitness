// The plan: your daily burn, plus the deficit (to lose) or surplus (to gain) that YOU choose.
// Steady suggests one from your goal weight and how many weeks you give yourself, then reads it
// back to you honestly. You always have the last word.
import { TARGETS } from "./config";
import type { Goal } from "./energy";

const KCAL_PER_KG = 7700;

/** Suggestion caps. The person may go past them, and gets told what that means. */
export const PLAN_CAP = { loss: 1000, gain: 600 } as const;
/** Lowest eating limit Steady will set. */
export const MIN_LIMIT = 1000;
/** Pace used when no timeframe is given, kg a week. */
const DEFAULT_RATE = { lose: 0.5, gain: 0.25 } as const;

const round10 = (n: number) => Math.round(n / 10) * 10;

/** Signed daily net to reach goal in `weeks`, capped at a sensible pace. Negative means deficit. */
export function suggestNet(currentKg: number, goalKg: number, weeks: number | null): number {
  const goal: Goal = goalKg < currentKg - 1 ? "lose" : goalKg > currentKg + 1 ? "gain" : "maintain";
  if (goal === "maintain") return 0;
  const diff = goalKg - currentKg;
  const days = weeks && weeks > 0 ? weeks * 7 : (Math.abs(diff) / DEFAULT_RATE[goal]) * 7;
  const raw = (diff * KCAL_PER_KG) / days;
  const cap = goal === "lose" ? PLAN_CAP.loss : PLAN_CAP.gain;
  return round10(Math.max(-cap, Math.min(cap, raw)));
}

/** Weeks the plan takes. Null when the plan moves weight the wrong way or not at all. */
export function weeksFor(currentKg: number, goalKg: number, net: number): number | null {
  const diff = goalKg - currentKg;
  if (Math.abs(diff) < 0.5 || net === 0 || Math.sign(net) !== Math.sign(diff)) return null;
  return Math.max(1, Math.round((Math.abs(diff) * KCAL_PER_KG) / Math.abs(net) / 7));
}

/** kg a week this net moves. Signed. */
export function ratePerWeek(net: number): number {
  return Math.round(((net * 7) / KCAL_PER_KG) * 100) / 100;
}

/** Rest-day eating limit that gives this net. */
export function limitForNet(baseBurnKcal: number, net: number): number {
  return Math.max(MIN_LIMIT, Math.round(baseBurnKcal + net));
}

/** The net a stored limit implies. */
export function netForLimit(baseBurnKcal: number, limit: number): number {
  return Math.round(limit - baseBurnKcal);
}

export function baseBurn(bmrKcal: number): number {
  return Math.round(bmrKcal * TARGETS.activityFactor);
}

export type PlanRead = { tone: "good" | "careful" | "off"; text: string };

/** One short honest line on the plan the person picked. */
export function readPlan(goal: Goal, net: number, bmrKcal: number, baseBurnKcal: number): PlanRead {
  const rate = Math.abs(ratePerWeek(net));
  const limit = baseBurnKcal + net;
  if (goal === "maintain") return { tone: "good", text: net === 0 ? "Hold your weight." : `${rate} kg a week.` };
  if (goal === "lose") {
    if (net >= 0) return { tone: "off", text: "No deficit, so no weight loss." };
    if (limit < bmrKcal) return { tone: "careful", text: `${rate} kg a week. Below your resting burn. Fast, and hard on muscle.` };
    if (rate > 1) return { tone: "careful", text: `${rate} kg a week. Very fast. Keep protein high.` };
    if (rate >= 0.7) return { tone: "good", text: `${rate} kg a week. Fast and doable.` };
    if (rate >= 0.3) return { tone: "good", text: `${rate} kg a week. Steady.` };
    return { tone: "good", text: `${rate} kg a week. Gentle.` };
  }
  if (net <= 0) return { tone: "off", text: "No surplus, so no weight gain." };
  if (rate > 0.5) return { tone: "careful", text: `${rate} kg a week. Fast. More of it will be fat.` };
  return { tone: "good", text: `${rate} kg a week. ${rate >= 0.2 ? "Good for lean gain." : "Gentle."}` };
}
