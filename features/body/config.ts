// Body metric tunables (PRODUCT.md > Metrics, Goal date).
export const BODY = {
  trendWindowDays: 7,
  /** Goal date: linear fit over this many days of 7-day averages. */
  goalFitDays: 21,
  /** Fewest trend points a fit needs. */
  goalFitMinPoints: 7,
  /** Fit must span at least this many days. */
  goalFitMinSpanDays: 10,
  /** A slope flatter than this (kg per day, falling) counts as no fall. */
  goalMinFallPerDay: 0.005,
  /** Longest projection shown, in days. */
  goalMaxDays: 730,
  waistToHeightLimit: 0.5,
  goalTemplate: "Goal {kg} kg around {date} at this pace.",
  goalNone: "At this pace there's no goal date. The trend has to fall first.",
} as const;
