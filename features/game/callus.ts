// Callus: the daily scoring engine (PRODUCT.md > Callus). Pure, plain data in, plain data out.
import type { DivisionT, SessionStatusT } from "@/lib/supabase/types";
import {
  CALLUS_MAX,
  CALLUS_MIN,
  FREEZE,
  FUEL_TOLERANCE,
  GAIN_FLOOR,
  HABITS_REQUIRED,
  OVER_BUDGET_LIMIT,
  POINTS,
  PROTEIN_SCORE_SHARE,
} from "./config";
import { applyDivision } from "./divisions";
import { formFor, type Form } from "./form";
import { stepStreak } from "./streak";

export type ScoreBreakdown = {
  logged: number;
  notLogged: number;
  session: number;
  fuel: number;
  overBudget: number;
  protein: number;
  habits: number;
  /** A used streak freeze: the price of keeping the streak. */
  freeze: number;
  /** Weekly match result and challenge reward, applied on the day they land. */
  weekly: number;
};

export type DayScoreInput = {
  /** Any entry exists for the day (even edited later). */
  logged: boolean;
  /** At least one entry was created on the day itself. Only these count. */
  loggedOnDay: boolean;
  /** Planned session status for the day. 'rest' and 'none' never cost points. */
  session: SessionStatusT;
  /** Calories eaten, from entries created on the day. */
  eatenKcal: number;
  /** Budget for the day including exercise add-back. */
  budgetKcal: number;
  bmrKcal: number;
  proteinG: number;
  proteinTargetG: number;
  /** Promises ticked on the day. */
  habitsDone: number;
  /** How many promises the person has. Defaults to five. The point needs all of them. */
  habitsTotal?: number;
  sick: boolean;
  /** A streak freeze was set for this day. Costs Callus only if nothing gets logged. */
  frozen?: boolean;
  /** Weekly points to add today (week result and challenge reward). */
  weeklyPoints?: number;
  prev: {
    callus: number;
    division: DivisionT;
    careerDays: number;
    streak: number;
    bestStreak: number;
    /** Consecutive days under the off-form line before today. */
    offFormDays: number;
  };
};

export type DayScore = {
  points: number;
  breakdown: ScoreBreakdown;
  callus: number;
  form: Form;
  division: DivisionT;
  careerDays: number;
  streak: number;
  bestStreak: number;
  milestonesHit: number[];
  offFormDays: number;
  promoted: boolean;
  dropped: boolean;
  previousDivision: DivisionT;
  sick: boolean;
  /** Counted as logged for scoring: created on the day itself. */
  counted: boolean;
};

/** 1 up to 50 Callus, then falling to the floor at 100. */
export function gainFactor(callus: number): number {
  return Math.max(GAIN_FLOOR, Math.min(1, 1 - (callus - 50) / 100));
}

export function clampCallus(value: number): number {
  return Math.max(CALLUS_MIN, Math.min(CALLUS_MAX, Math.round(value)));
}

const ZERO: ScoreBreakdown = {
  logged: 0,
  notLogged: 0,
  session: 0,
  fuel: 0,
  overBudget: 0,
  protein: 0,
  habits: 0,
  freeze: 0,
  weekly: 0,
};

/** Points for one day, by rule. Pure and used by both the nightly job and the live preview. */
export function pointsForDay(input: DayScoreInput): {
  points: number;
  breakdown: ScoreBreakdown;
  counted: boolean;
} {
  if (input.sick) return { points: 0, breakdown: { ...ZERO }, counted: false };

  const counted = input.logged && input.loggedOnDay;
  const b: ScoreBreakdown = { ...ZERO };

  if (!counted && input.frozen) {
    // The freeze keeps the streak and takes the place of the missed-day penalty.
    b.freeze = -FREEZE.cost;
  } else if (!counted) {
    b.notLogged = POINTS.dayNotLogged;
  } else {
    b.logged = POINTS.dayLogged;
    if (input.session === "done") b.session = POINTS.sessionDone;
    else if (input.session === "missed") b.session = POINTS.sessionMissed;

    const budget = input.budgetKcal;
    if (
      input.eatenKcal <= budget * (1 + FUEL_TOLERANCE) &&
      input.eatenKcal >= input.bmrKcal
    ) {
      b.fuel = POINTS.fuelInRange;
    }
    if (input.eatenKcal >= budget * (1 + OVER_BUDGET_LIMIT)) {
      b.overBudget = POINTS.overBudget;
    }
    if (
      input.proteinTargetG > 0 &&
      input.proteinG >= input.proteinTargetG * PROTEIN_SCORE_SHARE
    ) {
      b.protein = POINTS.protein;
    }
    const total = input.habitsTotal ?? HABITS_REQUIRED;
    if (total > 0 && input.habitsDone >= total) b.habits = POINTS.habits;
    // The higher your Callus, the harder it climbs: gains shrink toward the floor.
    const k = gainFactor(input.prev.callus);
    const soften = (n: number) => (n > 0 ? Math.max(1, Math.round(n * k)) : n);
    b.logged = soften(b.logged);
    b.session = soften(b.session);
    b.fuel = soften(b.fuel);
    b.protein = soften(b.protein);
    b.habits = soften(b.habits);
  }
  b.weekly = input.weeklyPoints ?? 0;

  const points =
    b.logged + b.notLogged + b.session + b.fuel + b.overBudget + b.protein + b.habits + b.freeze + b.weekly;
  return { points, breakdown: b, counted };
}

/**
 * Score one day. Sick day: streak paused, no Callus change, no career day, nothing else moves.
 * Otherwise: points, clamp 0-100, streak step, career day +1, then the division check
 * (drop first, then promotion).
 */
export function scoreDay(input: DayScoreInput): DayScore {
  const { prev } = input;

  if (input.sick) {
    return {
      points: 0,
      breakdown: { ...ZERO },
      callus: clampCallus(prev.callus),
      form: formFor(prev.callus),
      division: prev.division,
      careerDays: prev.careerDays,
      streak: prev.streak,
      bestStreak: prev.bestStreak,
      milestonesHit: [],
      offFormDays: prev.offFormDays,
      promoted: false,
      dropped: false,
      previousDivision: prev.division,
      sick: true,
      counted: false,
    };
  }

  const { points, breakdown, counted } = pointsForDay(input);
  const callus = clampCallus(prev.callus + points);
  // A freeze pauses the streak, like a sick day, but costs Callus.
  const streakResult = stepStreak(
    { streak: prev.streak, bestStreak: prev.bestStreak },
    { loggedOnDay: counted, sick: Boolean(input.frozen) && !counted },
  );
  const div = applyDivision(
    {
      division: prev.division,
      careerDays: prev.careerDays + 1,
      offFormDays: prev.offFormDays,
    },
    callus,
  );

  return {
    points,
    breakdown,
    callus,
    form: formFor(callus),
    division: div.division,
    careerDays: div.careerDays,
    streak: streakResult.streak,
    bestStreak: streakResult.bestStreak,
    milestonesHit: streakResult.milestonesHit,
    offFormDays: div.offFormDays,
    promoted: div.promoted,
    dropped: div.dropped,
    previousDivision: div.from,
    sick: false,
    counted,
  };
}

/** Weekly points to feed `scoreDay.weeklyPoints`: match result plus challenge reward. */
export function weeklyPoints(
  result: "win" | "loss" | "draw" | "none",
  challengeDone: boolean,
): number {
  const match =
    result === "win" ? POINTS.weekWon : result === "loss" ? POINTS.weekLost : POINTS.weekDrawn;
  return match + (challengeDone ? POINTS.challengeDone : 0);
}

/**
 * Live preview of today's points. Same rules as the nightly score, except the day is
 * not over, so an unlogged day shows 0 instead of the -12 it would earn at midnight,
 * and a pending planned session shows nothing yet.
 */
export function previewDay(input: DayScoreInput): { points: number; breakdown: ScoreBreakdown } {
  const open: DayScoreInput = {
    ...input,
    session: input.session === "missed" ? "none" : input.session,
  };
  const scored = pointsForDay(open);
  if (!scored.counted) return { points: 0, breakdown: { ...ZERO } };
  return { points: scored.points, breakdown: scored.breakdown };
}
