// The three rings you see (deficit, protein, training) from one place, so Today, the day pages and
// the little week rings in Progress can never disagree. Pure.
import { dayBurn } from "@/features/nutrition/energy";
import type { SessionKeyT } from "@/lib/supabase/types";

/** Typical minutes for each planned session. A rest day asks for 10 minutes of anything. */
export const PLANNED_MINUTES: Record<SessionKeyT, number> = {
  gym_a: 45,
  gym_b: 45,
  gym_c: 45,
  run: 30,
  run_intervals: 40,
  football: 60,
  stretch: 10,
  rest: 10,
};

/** Minutes the day asks for: the planned sessions added up, or 10 on a rest day. */
export function plannedMinutes(keys: readonly SessionKeyT[]): number {
  const real = keys.filter((k) => k !== "rest" && k !== "stretch");
  if (real.length === 0) return PLANNED_MINUTES.rest;
  return Math.min(180, real.reduce((s, k) => s + PLANNED_MINUTES[k], 0));
}

export type DayRings = {
  /** Deficit (or surplus when gaining) reached, against the one you chose. Can pass 1. */
  deficit: number;
  /** Protein eaten against the target. Can pass 1. */
  protein: number;
  /** Minutes of any activity against the minutes the day asks for. Can pass 1. */
  train: number;
};

export type DayRingsInput = {
  anyEntry: boolean;
  eatenKcal: number;
  bmrKcal: number;
  /** Stored exercise burn (the add-back share). */
  burnedKcal: number;
  /** Rest-day eating limit. */
  budgetKcal: number;
  proteinG: number;
  proteinTargetG: number;
  /** Every minute of activity logged that day: walking, gym, football, anything. */
  activityMinutes: number;
  plannedMinutes: number;
};

const ratio = (a: number, b: number) => (b > 0 ? Math.max(0, a / b) : 0);

export function dayRings(i: DayRingsInput): DayRings {
  let deficit = 0;
  if (i.anyEntry && i.bmrKcal > 0) {
    const net = i.eatenKcal - dayBurn(i.bmrKcal, i.burnedKcal);
    const target = i.budgetKcal - dayBurn(i.bmrKcal, 0);
    // A day with nothing logged is not a full deficit: it is unknown.
    if (target !== 0) deficit = ratio(target < 0 ? -net : net, Math.abs(target));
  }
  return {
    deficit,
    protein: ratio(i.proteinG, i.proteinTargetG),
    train: ratio(i.activityMinutes, i.plannedMinutes),
  };
}
