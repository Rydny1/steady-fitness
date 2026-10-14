// Divisions: promotion and drop rules (PRODUCT.md > Divisions).
import type { DivisionT } from "@/lib/supabase/types";
import { DIVISIONS, DROP_AFTER_OFF_FORM_DAYS, OFF_FORM_BELOW } from "./config";

export type DivisionState = {
  division: DivisionT;
  careerDays: number;
  /** Consecutive days with Callus under the off-form line, before today. */
  offFormDays: number;
};

export type DivisionResult = DivisionState & {
  promoted: boolean;
  dropped: boolean;
  /** Division before today's change, for the chapter card. */
  from: DivisionT;
};

export function divisionIndex(division: DivisionT): number {
  const i = DIVISIONS.findIndex((d) => d.division === division);
  return i < 0 ? 0 : i;
}

/** Career-day mark of a division. */
export function divisionMark(division: DivisionT): number {
  return DIVISIONS[divisionIndex(division)]?.days ?? 0;
}

/** The division above, or null at the top. */
export function nextDivision(division: DivisionT): DivisionT | null {
  return DIVISIONS[divisionIndex(division) + 1]?.division ?? null;
}

/** The division below, or null at the bottom. */
export function previousDivision(division: DivisionT): DivisionT | null {
  const i = divisionIndex(division);
  return i === 0 ? null : (DIVISIONS[i - 1]?.division ?? null);
}

/**
 * Apply one scored day to the division state.
 * Order: the off-form counter updates, a drop (3 days running) is checked first and
 * blocks promotion the same day, then promotion (one step at most per day).
 * `callus` is today's Callus after clamping.
 */
export function applyDivision(state: DivisionState, callus: number): DivisionResult {
  const from = state.division;
  const offFormDays = callus < OFF_FORM_BELOW ? state.offFormDays + 1 : 0;

  if (offFormDays >= DROP_AFTER_OFF_FORM_DAYS) {
    const below = previousDivision(state.division);
    if (below) {
      return {
        division: below,
        careerDays: divisionMark(below),
        offFormDays: 0,
        promoted: false,
        dropped: true,
        from,
      };
    }
    // Already at the bottom: nothing to drop, the counter keeps running.
    return { ...state, offFormDays, promoted: false, dropped: false, from };
  }

  const nextRule = DIVISIONS[divisionIndex(state.division) + 1];
  if (nextRule && state.careerDays >= nextRule.days && callus >= nextRule.bar) {
    return {
      division: nextRule.division,
      careerDays: state.careerDays,
      offFormDays,
      promoted: true,
      dropped: false,
      from,
    };
  }
  return { ...state, offFormDays, promoted: false, dropped: false, from };
}

/** Days still needed to reach the next division, or null at the top. */
export function daysToNextDivision(state: {
  division: DivisionT;
  careerDays: number;
}): number | null {
  const rule = DIVISIONS[divisionIndex(state.division) + 1];
  if (!rule) return null;
  return Math.max(0, rule.days - state.careerDays);
}

/** Callus bar for the next division, or null at the top. */
export function nextDivisionBar(division: DivisionT): number | null {
  return DIVISIONS[divisionIndex(division) + 1]?.bar ?? null;
}
