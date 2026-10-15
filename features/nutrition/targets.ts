// Targets: BMR, budget, protein, exercise add-back, safety lines (PRODUCT.md > Targets).
import type { ActivityT, SexT } from "@/lib/supabase/types";
import { MET, MET_FAST_RUN, SAFETY, TARGETS, type SafetyKey } from "./config";
import { limitForNet, suggestNet } from "./plan";
import { speedMet } from "./activity";

export type TargetsInput = {
  sex: SexT;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  goalWeightKg: number;
  /** Weeks the person gives themselves to reach the goal. Optional. */
  weeks?: number | null;
  /** The daily net they chose (negative is a deficit). Wins over weeks. */
  netKcal?: number | null;
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
  // The plan sets the limit: base burn plus the deficit or surplus the person chose, or the
  // one suggested from their goal and timeframe (see plan.ts).
  const net = input.netKcal ?? suggestNet(input.weightKg, input.goalWeightKg, input.weeks ?? null);
  const budget = limitForNet(base, net);
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
  options: { fastRun?: boolean; speedKmh?: number | null } = {},
): number {
  if (minutes <= 0 || weightKg <= 0) return 0;
  const bySpeed = options.speedKmh ? speedMet(activity, options.speedKmh) : null;
  const met = bySpeed ?? (activity === "run" && options.fastRun ? MET_FAST_RUN : MET[activity]);
  return Math.round(TARGETS.exerciseAddBackShare * met * weightKg * (minutes / 60));
}

/**
 * What you can eat today and still hit your net target: the rest-day amount plus everything
 * the exercise burned. `burnedKcal` is stored as an add-back share, so it is scaled back to the full burn.
 */
export function dayBudget(budgetKcal: number, burnedKcal: number): number {
  return Math.round(budgetKcal + Math.max(0, burnedKcal) / TARGETS.exerciseAddBackShare);
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
