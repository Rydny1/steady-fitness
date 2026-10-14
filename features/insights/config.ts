// Observer tunables and the exact template lines (PRODUCT.md > The Observer).
export type FactId =
  | "protein_gap"
  | "budget_left"
  | "over_budget"
  | "session_pending"
  | "same_day_best"
  | "weak_weekday"
  | "protein_by_day_type"
  | "sleep_food"
  | "weigh_in_gap"
  | "stalled_trend"
  | "new_low"
  | "new_best"
  | "losing_round";

export const FACT_TEMPLATES = {
  protein_gap: "{gap} g protein short and {hours} hours left.",
  budget_left: "{left} kcal left today.",
  over_budget: "{over} kcal over. Tomorrow's breakfast fixes half of it.",
  session_pending: "{session} not done. {hours} hours left.",
  same_day_best: "Best {weekday} for protein in {n} weeks.",
  weak_weekday: "You miss {weekday}s. {n} of the last {of}.",
  protein_by_day_type_gym: "Protein hit on gym days, missed on football days.",
  protein_by_day_type_football: "Protein hit on football days, missed on gym days.",
  sleep_food: "Short sleep, {n} kcal more the next day.",
  weigh_in_gap: "No weigh-in for {n} days.",
  stalled_trend: "Weight flat {weeks} weeks. Cut {cut} kcal or add a walk.",
  new_low: "{kg} kg. Lowest average yet.",
  new_best: "{exercise}: {weight} kg x {reps}. New best.",
  losing_round: "{round} is the only round you're losing. {n} good days flip it.",
} as const;

/** Higher wins. Time-bound and record facts outrank patterns. */
export const FACT_PRIORITY: Record<FactId, number> = {
  new_best: 90,
  protein_gap: 80,
  session_pending: 75,
  over_budget: 70,
  losing_round: 65,
  new_low: 60,
  weigh_in_gap: 55,
  stalled_trend: 50,
  weak_weekday: 45,
  protein_by_day_type: 40,
  sleep_food: 35,
  same_day_best: 30,
  budget_left: 20,
};

export const FACTS = {
  /** Protein gap: after this hour, with protein under this share of target. */
  proteinGapFromHour: 18,
  proteinGapBelowShare: 0.7,
  /** Over budget: eaten at least budget * (1 + this). The 'over' value is eaten - budget. */
  overBudgetShare: 0.15,
  /** Session pending after this hour. */
  sessionPendingFromHour: 19,
  /** Same-day compare: earliest weeks of same-weekday history needed. */
  sameDayMinWeeks: 3,
  sameDayLookbackWeeks: 8,
  /** Weak weekday: look at this many last same weekdays, flag at this many. */
  weakWeekdayWindow: 4,
  weakWeekdayHits: 3,
  /** Protein by day type: hit-rate gap in points, and the fewest days of each type. */
  dayTypeGapPoints: 40,
  dayTypeMinDays: 3,
  dayTypeLookbackDays: 42,
  /** Sleep and food: short sleep under this many hours, kcal gap, fewest nights per side. */
  shortSleepHours: 6,
  sleepFoodGapKcal: 250,
  sleepFoodMinNights: 3,
  /** Weigh-in gap in days. */
  weighInGapDays: 7,
  /** Stalled trend: window, band (kg) and fewest trend points. */
  stalledDays: 14,
  stalledBandKg: 0.2,
  stalledMinPoints: 10,
  stalledWeeks: 2,
  stalledCutKcal: 150,
  /** New low: fewest earlier trend points needed. */
  newLowMinPoints: 7,
  /** Hours (of 24) at which 'hours left' is computed against midnight. */
  dayHours: 24,
  /** Observer shows a fact not shown in this many days. */
  recentDays: 3,
  /** Gemini calls a day for the Observer. */
  maxAiCallsPerDay: 8,
} as const;
