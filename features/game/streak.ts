// Streak: consecutive logged days. Only logs created on the day itself count.
import { STREAK_MILESTONES } from "./config";

export type StreakState = { streak: number; bestStreak: number };

export type StreakResult = StreakState & {
  /** Milestones reached today (at most one). */
  milestonesHit: number[];
  /** True when today's log or miss changed the current streak. */
  broken: boolean;
};

/**
 * Step the streak by one day.
 * - counted log on the day: +1
 * - no counted log: back to 0
 * - sick day: paused, nothing changes
 */
export function stepStreak(
  prev: StreakState,
  input: { loggedOnDay: boolean; sick: boolean },
): StreakResult {
  if (input.sick) {
    return { ...prev, milestonesHit: [], broken: false };
  }
  if (!input.loggedOnDay) {
    return { streak: 0, bestStreak: prev.bestStreak, milestonesHit: [], broken: prev.streak > 0 };
  }
  const streak = prev.streak + 1;
  const bestStreak = Math.max(prev.bestStreak, streak);
  const milestonesHit = STREAK_MILESTONES.filter((m) => m === streak);
  return { streak, bestStreak, milestonesHit, broken: false };
}

/** Next milestone above the current streak, or null past the last one. */
export function nextMilestone(streak: number): number | null {
  return STREAK_MILESTONES.find((m) => m > streak) ?? null;
}

/** Count of consecutive logged days ending at the last item (days oldest first). */
export function streakFromFlags(flags: readonly boolean[]): number {
  let n = 0;
  for (let i = flags.length - 1; i >= 0; i -= 1) {
    if (!flags[i]) break;
    n += 1;
  }
  return n;
}
