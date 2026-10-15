// Small wins. A streak is a row of days you showed up; these words and milestones make each one
// feel like something. Pure, so it is tested.

export const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365] as const;

/** The next streak milestone above the current streak, or null past the last. */
export function nextMilestone(streak: number): number | null {
  return MILESTONES.find((m) => m > streak) ?? null;
}

const MILESTONE_LINE: Record<number, string> = {
  3: "Three days. A habit is forming.",
  7: "A full week. Most people quit before this.",
  14: "Two weeks. This is who you are now.",
  21: "Three weeks. It's routine.",
  30: "A month. Real change.",
  50: "Fifty days. Few get here.",
  75: "Seventy-five days. Steady.",
  100: "One hundred days. Rare.",
  150: "150 days. Unshakeable.",
  200: "200 days. Different league.",
  365: "A year. Remarkable.",
};

const SMALL_LINES = [
  "Showing up beats everything.",
  "Small days add up.",
  "Another one banked.",
  "Keep it boring.",
  "Stack it.",
];

export type StreakCopy = { title: string; line: string; milestone: boolean };

export function streakCopy(streak: number): StreakCopy {
  if (streak <= 1) return { title: "Day one", line: "You're in. Most people never start.", milestone: false };
  const m = MILESTONE_LINE[streak];
  if (m) return { title: `${streak} day streak`, line: m, milestone: true };
  return { title: `${streak} day streak`, line: SMALL_LINES[streak % SMALL_LINES.length] ?? "Stack it.", milestone: false };
}

/** "2 days to a week streak" style pointer to the next milestone. */
export function toMilestone(streak: number): { target: number; left: number; from: number } | null {
  const target = nextMilestone(streak);
  if (target === null) return null;
  const prev = [...MILESTONES].reverse().find((m) => m <= streak) ?? 0;
  return { target, left: target - streak, from: prev };
}

/** How much body fat a deficit is, in kg (7,700 kcal is a kilo). */
export function fatKg(deficitKcal: number): number {
  return Math.round((Math.max(0, deficitKcal) / 7700) * 100) / 100;
}

/** One small fact under the deficit. True arithmetic, nothing invented. */
export function deficitFact(deficitKcal: number): string | null {
  const kg = fatKg(deficitKcal);
  if (kg < 0.01) return null;
  const week = Math.round(kg * 7 * 10) / 10;
  return `About ${kg} kg of body fat. Repeat it for a week: ${week} kg.`;
}
