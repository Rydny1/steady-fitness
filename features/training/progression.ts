// Progression hints: code, not AI (PRODUCT.md, CONTENT.md > Progression).
import { PROGRESSION } from "./config";

export type LoggedSet = { weightKg: number; reps: number };

export type ExerciseRule = {
  repMin: number;
  repMax: number;
  /** Prescribed number of sets. */
  sets: number;
  /** No external load: progress by reps. */
  bodyweight: boolean;
};

export type ProgressionHint =
  | { kind: "add_weight"; addKg: number; nextKg: number }
  | { kind: "add_reps"; addReps: number; nextRepMax: number }
  | { kind: "hold" }
  | { kind: "no_history" };

/**
 * What to show next session, from the last session's working sets.
 * Every prescribed set at the top of the rep range -> add weight (or a rep on bodyweight moves).
 * Anything less -> hold. The next weight builds on the heaviest set done.
 */
export function nextProgression(rule: ExerciseRule, lastSets: readonly LoggedSet[]): ProgressionHint {
  if (lastSets.length === 0) return { kind: "no_history" };
  const allTop =
    lastSets.length >= rule.sets && lastSets.every((s) => s.reps >= rule.repMax);
  if (!allTop) return { kind: "hold" };
  if (rule.bodyweight) {
    return {
      kind: "add_reps",
      addReps: PROGRESSION.stepBodyweightReps,
      nextRepMax: rule.repMax + PROGRESSION.stepBodyweightReps,
    };
  }
  const top = Math.max(...lastSets.map((s) => s.weightKg));
  return {
    kind: "add_weight",
    addKg: PROGRESSION.stepKg,
    nextKg: Math.round((top + PROGRESSION.stepKg) * 100) / 100,
  };
}

/** True when `candidate` beats `current`: heavier, or same weight with more reps. */
export function isBetterSet(current: LoggedSet, candidate: LoggedSet): boolean {
  if (candidate.weightKg !== current.weightKg) return candidate.weightKg > current.weightKg;
  return candidate.reps > current.reps;
}

/** Best set in a history (heavier, then more reps), or null. */
export function bestSet(history: readonly LoggedSet[]): LoggedSet | null {
  let best: LoggedSet | null = null;
  for (const s of history) if (!best || isBetterSet(best, s)) best = s;
  return best;
}

/**
 * New-best detection while logging. A first-ever set is a baseline, not a new best.
 * Bodyweight sets (weight 0) compare on reps alone.
 */
export function isNewBest(history: readonly LoggedSet[], candidate: LoggedSet): boolean {
  const best = bestSet(history);
  if (!best) return false;
  return isBetterSet(best, candidate);
}
