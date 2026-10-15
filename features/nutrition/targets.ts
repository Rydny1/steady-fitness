// Targets: BMR, budget, protein, exercise add-back, safety lines (PRODUCT.md > Targets).
import type { ActivityT, SexT } from "@/lib/supabase/types";
import { MET, MET_FAST_RUN, SAFETY, TARGETS, type SafetyKey } from "./config";
import { budgetFactorFor, goalFor } from "./energy";

export type TargetsInput = {
  sex: SexT;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  goalWeightKg: number;
};

export type Targets = {
  bmrKcal: number;
  baseBurnKcal: number;
  budgetKcal: number;
  proteinG: number;
};

/** Mifflin-St Jeor. */
export function bmr(input: Pick<TargetsInput, "sex" | "weightKg" | "heightCm" | "ageYears">): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears;
  return base + (input.sex === "male" ? 5 : -161);
}

/** Daily targets. Budget is 75 percent of base burn, never below BMR. Protein has a floor on current weight. */
export function computeTargets(input: TargetsInput): Targets {
  const rawBmr = bmr(input);
  const base = rawBmr * TARGETS.activityFactor;
  // The goal sets the budget: under base burn to lose, at it to hold, over it to gain.
  // Only a loss goal is held at or above resting burn.
  const goal = goalFor(input.weightKg, input.goalWeightKg);
  const scaled = base * budgetFactorFor(goal);
  const budget = goal === "lose" ? Math.max(scaled, rawBmr) : scaled;
  const protein = Math.max(
    TARGETS.proteinPerGoalKg * input.goalWeightKg,
    TARGETS.proteinMinPerCurrentKg * input.weightKg,
  );
  return {
    bmrKcal: Math.round(rawBmr),
    baseBurnKcal: Math.round(base),
    budgetKcal: Math.round(budget),
    proteinG: Math.round(protein),
  };
}

/**
 * Calories burned that are added back to the budget: 50 percent of MET * kg * hours,
 * rounded to a whole number. This is the value stored in activity_entries.kcal_burned.
 * `fastRun` uses the 9.8 MET for running over 10 km/h.
 */
export function activityKcal(
  activity: ActivityT,
  minutes: number,
  weightKg: number,
  options: { fastRun?: boolean } = {},
): number {
  if (minutes <= 0 || weightKg <= 0) return 0;
  const met = activity === "run" && options.fastRun ? MET_FAST_RUN : MET[activity];
  return Math.round(TARGETS.exerciseAddBackShare * met * weightKg * (minutes / 60));
}

/** Budget for a day: the targets budget plus the exercise add-back. */
export function dayBudget(budgetKcal: number, burnedKcal: number): number {
  return Math.round(budgetKcal + Math.max(0, burnedKcal));
}

/** New targets row needed when the 7-day average moved 1 kg since the row was made. */
export function needsRetarget(avgAtTargets: number, avgNow: number): boolean {
  return Math.abs(avgNow - avgAtTargets) >= TARGETS.retargetKg;
}

export type SafetyInput = {
  /** Weekly change in percent for the last weeks, newest last (negative = loss). */
  weeklyChangePct: readonly number[];
  /** Calories eaten on the most recent logged days, oldest first. */
  recentEatenKcal: readonly number[];
  bmrKcal: number;
  /** Text of the notes just saved, if any. */
  noteText?: string;
};

/**
 * Safety lines that apply right now. Each key shows once; the caller tracks what was shown.
 * - loss over 1.2 percent a week for 2 weeks
 * - eaten under BMR 3 days running
 * - back pain mentioned in a note
 */
export function safetyKeys(input: SafetyInput): SafetyKey[] {
  const out: SafetyKey[] = [];
  const weeks = input.weeklyChangePct.slice(-SAFETY.fastLossWeeks);
  if (
    weeks.length === SAFETY.fastLossWeeks &&
    weeks.every((c) => -c > SAFETY.fastLossPctPerWeek)
  ) {
    out.push("too_fast");
  }
  const days = input.recentEatenKcal.slice(-SAFETY.underBmrDays);
  if (days.length === SAFETY.underBmrDays && days.every((k) => k < input.bmrKcal)) {
    out.push("under_floor");
  }
  if (input.noteText && new RegExp(SAFETY.backPainPattern, "i").test(input.noteText)) {
    out.push("back_pain");
  }
  return out;
}

/** The exact PRODUCT.md line for a safety key. */
export function safetyLine(key: SafetyKey): string {
  return SAFETY.lines[key];
}
