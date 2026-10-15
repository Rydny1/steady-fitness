// Every tunable number for the game lives here (GAME.md, PRODUCT.md > Game rules).
import type { DivisionT } from "@/lib/supabase/types";

export const CALLUS_START = 50;
export const CALLUS_MIN = 0;
export const CALLUS_MAX = 100;

/** Points per event (PRODUCT.md > Callus). */
export const POINTS = {
  dayLogged: 4,
  sessionDone: 3,
  sessionMissed: -4,
  fuelInRange: 2,
  overBudget: -2,
  protein: 1,
  habits: 1,
  dayNotLogged: -12,
  weekWon: 5,
  weekLost: -3,
  weekDrawn: 0,
  challengeDone: 6,
} as const;

/** Eaten at or under budget * (1 + this) and at or above BMR earns the fuel point. */
export const FUEL_TOLERANCE = 0.05;
/** Eaten at or over budget * (1 + this) costs points. */
export const OVER_BUDGET_LIMIT = 0.15;
/** Protein at this share of target earns the protein point. */
export const PROTEIN_SCORE_SHARE = 0.9;
/** Habits needed for the all-promises point. */
export const HABITS_REQUIRED = 5;

/** Form bands from Callus (GAME.md). Each entry is the lowest Callus of the band. */
export const FORM_BANDS = [
  { key: "off_form", name: "Off form", from: 0 },
  { key: "finding_form", name: "Finding form", from: 35 },
  { key: "in_form", name: "In form", from: 65 },
  { key: "peak_form", name: "Peak form", from: 90 },
] as const;

/** Callus under this counts as an off-form day for the drop rule. */
export const OFF_FORM_BELOW = 35;
/** Off-form days running that drop one division. */
export const DROP_AFTER_OFF_FORM_DAYS = 3;

export type DivisionRule = { division: DivisionT; days: number; bar: number };

/** Ordered lowest to highest (PRODUCT.md > Divisions). */
export const DIVISIONS: readonly DivisionRule[] = [
  { division: "starting_line", days: 0, bar: 0 },
  { division: "showing_up", days: 10, bar: 50 },
  { division: "building", days: 30, bar: 55 },
  { division: "consistent", days: 60, bar: 60 },
  { division: "strong", days: 100, bar: 65 },
  { division: "disciplined", days: 150, bar: 70 },
  { division: "proven", days: 220, bar: 75 },
  { division: "one_year", days: 365, bar: 80 },
];

/** Above 50, each point is harder to earn: gains shrink to this floor as Callus nears 100. */
export const GAIN_FLOOR = 0.5;

/** Streak freeze: spend Callus to keep a streak through a day you cannot log. */
export const FREEZE = { cost: 8, perMonth: 2 } as const;

/** Streak milestones (PRODUCT.md > Streak). */
export const STREAK_MILESTONES: readonly number[] = [7, 14, 30, 50, 100, 200, 365];

/** Rings (GAME.md). */
export const RINGS = {
  /** Fuel closes when eaten <= budget * (1 + this) at day end. Literal spec: 0. */
  fuelTolerance: 0,
  /** Minutes of stretch that close Train on a rest day. */
  restStretchMinutes: 10,
};

/** Weekly match (GAME.md > You vs last week). */
export const MATCH = {
  rounds: ["sessions", "days_logged", "fuel_closed", "protein_closed"] as const,
  /** Consecutive Win/Draw weeks before Sunday run_intervals is offered. */
  intervalsOfferWeeks: 4,
  /** Days left (after today) needed for the losing-round line. */
  losingRoundMinDaysLeft: 2,
};

/** Weekly challenges. */
export const CHALLENGES = {
  offered: 3,
  /** Threshold of 'later than' for early_kickoff. */
  lateTrainingHour: 18,
  lateTrainingCount: 3,
  proteinClosedBelow: 4,
  overBudgetDays: 2,
  lateLogHour: 22,
  lateLogCount: 2,
  walkRunBelowMinutes: 90,
  noPhotoDays: 14,
  weighInsBelow: 2,
  sleepBelowHours: 6.5,
  // Goals
  earlyKickoffSessions: 3,
  earlyKickoffBeforeMinutes: 7 * 60 + 30,
  proteinFiveDays: 5,
  cleanWeekOverLimit: 0.1,
  fullNinetyBeforeHour: 21,
  walkRunMinutes: 150,
  weighInDays: 3,
  sleepHours: 7,
  sleepNights: 5,
  /** Fill order when fewer than three challenges are triggered. */
  fillOrder: [
    "protein_five",
    "weigh_in_three",
    "ten_k_minutes",
    "full_ninety",
    "clean_week",
    "photo_day",
    "sleep_seven",
    "early_kickoff",
  ],
  /** Plain 'why' templates. {n} is the number from last week. */
  why: {
    early_kickoff: "Picked because you trained after 18:00 {n} times last week.",
    protein_five: "Picked because the protein ring closed on {n} days last week.",
    clean_week: "Picked because {n} days went over budget last week.",
    full_ninety: "Picked because {n} logs landed after 22:00 last week.",
    ten_k_minutes: "Picked because you walked or ran {n} minutes last week.",
    photo_day: "Picked because there are no progress photos in {n} days.",
    weigh_in_three: "Picked because you weighed in {n} times last week.",
    sleep_seven: "Picked because your sleep averaged {n} hours last week.",
  },
  whyFill: "Picked to round out your week.",
} as const;

export type ChallengeKey = keyof typeof CHALLENGES.why;

/** Answer back (GAME.md). */
export const ANSWER_BACK = {
  days: 3,
  /** Share of lost Callus that comes back. */
  returnShare: 0.5,
};

/** The nod. */
export const NOD = {
  chance: 1 / 3,
  /** Minimum days since the last nod ("never two days running"). */
  minDaysBetween: 2,
};

/** Trophies. */
export const TROPHIES = {
  sevenStraightDays: 7,
  hatTrickWeeks: 3,
  earlyRiserSessions: 10,
  earlyRiserBeforeMinutes: 8 * 60,
  challengerCount: 5,
  firstKiloKg: 1,
  fiveKilosKg: 5,
  waistDownCm: 5,
  tenBestsCount: 10,
  photoDiaryCount: 6,
};

/** Coach line rotation: lines per form band are picked by day number. */
export const FORM_LINES_ROTATE = true;
