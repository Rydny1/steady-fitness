// Adaptive budget, learned from what you ate and how your weight trend moved (PRODUCT.md #19).
import { ADAPTIVE } from "./config";
import { MIN_LIMIT } from "./plan";

export type AdaptiveDay = {
  day: string;
  /** Calories eaten that day, null when nothing was logged. */
  kcal: number | null;
};

export type AdaptiveInput = {
  /** The window, oldest first. At least 14 days to qualify. */
  days: readonly AdaptiveDay[];
  /** 7-day weight average at the start and end of the window. */
  trendStartKg: number;
  trendEndKg: number;
  currentBudgetKcal: number;
  bmrKcal: number;
  /** Share of real burn to eat. Below 1 loses, 1 holds, above 1 gains. Defaults to the loss share. */
  budgetFactor?: number;
  /** Average full exercise burn per day in the window. The measured burn already contains it. */
  avgExerciseKcal?: number;
  /** The daily net the person chose (negative is a deficit). When set, the limit keeps this deficit and only the burn is relearned. */
  targetNetKcal?: number;
};

export type AdaptiveResult =
  | { status: "not_enough_data"; reason: "too_few_days" | "too_few_logged" }
  | {
      status: "ok";
      realBurnKcal: number;
      avgEatenKcal: number;
      newBudgetKcal: number;
      /** newBudget - currentBudget, within +/-150. */
      changeKcal: number;
      /** Floor at BMR applied. */
      atFloor: boolean;
      /** Weekly change cap applied. */
      capped: boolean;
    };

/** 2780 -> "2,780". */
export function groupThousands(n: number): string {
  const s = String(Math.round(n));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * real_burn = avg_kcal_in - (trend_change_kg * 7700 / days)
 * new budget = real_burn * 0.75, never below BMR, max change 150 kcal a week.
 * Needs 14+ days with 80 percent or more logged. Code only.
 */
export function adaptiveBudget(input: AdaptiveInput): AdaptiveResult {
  const n = input.days.length;
  if (n < ADAPTIVE.minDays) return { status: "not_enough_data", reason: "too_few_days" };
  const logged = input.days.filter((d) => d.kcal !== null) as { day: string; kcal: number }[];
  if (logged.length / n < ADAPTIVE.minLoggedShare) {
    return { status: "not_enough_data", reason: "too_few_logged" };
  }
  const avgIn = logged.reduce((sum, d) => sum + d.kcal, 0) / logged.length;
  const trendChange = input.trendEndKg - input.trendStartKg;
  const realBurn = avgIn - (trendChange * ADAPTIVE.kcalPerKg) / n;

  const factor = input.budgetFactor ?? ADAPTIVE.budgetFactor;
  // The limit is for a rest day: today's exercise is added on top, so take the average out here.
  const restBurn = Math.max(0, realBurn - (input.avgExerciseKcal ?? 0));
  const target = input.targetNetKcal !== undefined ? restBurn + input.targetNetKcal : restBurn * factor;
  const delta = target - input.currentBudgetKcal;
  const clampedDelta = Math.max(-ADAPTIVE.maxWeeklyChange, Math.min(ADAPTIVE.maxWeeklyChange, delta));
  const capped = clampedDelta !== delta;
  let next = Math.round(input.currentBudgetKcal + clampedDelta);
  let atFloor = false;
  // With a chosen deficit the person is in charge: only the absolute floor applies. Without one, a loss never goes under resting burn.
  const floor = input.targetNetKcal !== undefined ? MIN_LIMIT : factor < 1 ? input.bmrKcal : 0;
  if (floor > 0 && next < floor) {
    next = Math.round(floor);
    atFloor = true;
  }
  return {
    status: "ok",
    realBurnKcal: Math.round(realBurn),
    avgEatenKcal: Math.round(avgIn),
    newBudgetKcal: next,
    changeKcal: next - input.currentBudgetKcal,
    atFloor,
    capped,
  };
}

/** "Your real burn is 2,780 kcal. Budget moved to 2,085." */
export function adaptiveLine(result: AdaptiveResult): string | null {
  if (result.status !== "ok") return null;
  const template = result.changeKcal === 0 ? ADAPTIVE.templateUnchanged : ADAPTIVE.template;
  return template
    .replace("{burn}", groupThousands(result.realBurnKcal))
    .replace("{budget}", groupThousands(result.newBudgetKcal));
}
