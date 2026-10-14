// Nutrition tunables (PRODUCT.md > Targets, Adaptive budget, Shopping list).
import type { ActivityT } from "@/lib/supabase/types";

export const TARGETS = {
  /** Base burn = BMR * this. Exercise is added separately. */
  activityFactor: 1.3,
  /** Budget = base burn * this (25 percent deficit). */
  budgetFactor: 0.75,
  /** Protein per kg of goal weight. */
  proteinPerGoalKg: 2.0,
  /** Protein floor per kg of current weight. */
  proteinMinPerCurrentKg: 1.6,
  /** Share of MET * kg * hours added back for exercise. */
  exerciseAddBackShare: 0.5,
  /** New targets row when the 7-day average moves this many kg. */
  retargetKg: 1,
} as const;

/** METs by activity (PRODUCT.md). Running has an easy and a fast value. */
export const MET: Record<ActivityT, number> = {
  football: 7.0,
  run: 8.0,
  gym: 5.0,
  circuit: 6.0,
  walk: 3.5,
  stretch: 2.3,
  cycling: 7.5,
  other: 4.0,
};
/** Run over 10 km/h. */
export const MET_FAST_RUN = 9.8;

export const ADAPTIVE = {
  minDays: 14,
  minLoggedShare: 0.8,
  kcalPerKg: 7700,
  /** New budget = real burn * this. */
  budgetFactor: 0.75,
  /** Largest weekly change in budget, kcal. */
  maxWeeklyChange: 150,
  /** Plain line, numbers grouped with commas. */
  template: "Your real burn is {burn} kcal. Budget moved to {budget}.",
  templateUnchanged: "Your real burn is {burn} kcal. Budget stays at {budget}.",
} as const;

/** Safety lines, exact text from PRODUCT.md. */
export const SAFETY = {
  fastLossPctPerWeek: 1.2,
  fastLossWeeks: 2,
  underBmrDays: 3,
  lines: {
    too_fast: "Too fast. You are losing muscle with the fat. Add 200 kcal a day.",
    under_floor: "Under your floor 3 days. Eat. Hunger is not the goal.",
    back_pain:
      "Skip loaded hinges today. If pain runs down a leg or lasts over 2 weeks, see a physio.",
  },
  /** Words in a note that count as back pain. */
  backPainPattern:
    "\\b(back pain|sore back|backache|back ache|lower back|back hurts|back is sore|sciatica|slipped disc)\\b",
} as const;

export type SafetyKey = keyof typeof SAFETY.lines;

/** Shopping list: aisle groups in display order (PRODUCT.md > Shopping list). */
export const SHOPPING_GROUPS = [
  "Meat and fish",
  "Fruit and veg",
  "Dairy",
  "Tins and dry",
  "Spices",
] as const;

export type ShoppingGroup = (typeof SHOPPING_GROUPS)[number];

export const SHOPPING = {
  /** Recipes picked for the week, and one more for Thursday. */
  picksWeekend: 2,
  picksThursday: 1,
  /** Decimal places kept when scaling amounts. */
  decimals: 1,
} as const;
