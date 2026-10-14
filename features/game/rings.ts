// Rings: Fuel, Protein, Train (GAME.md > Rings). Closed from logged data, no AI.
import type { SessionKeyT, SessionStatusT } from "@/lib/supabase/types";
import { RINGS } from "./config";

export type FuelRing = {
  /** eaten / budget, can pass 1. */
  progress: number;
  /** Share beyond full, 0 when not over. Drawn in a darker shade. */
  overflow: number;
  over: boolean;
  /** Within budget and at or above the BMR floor right now. */
  inRange: boolean;
  /** Closed for the day: in range and the day has ended. */
  closed: boolean;
};

export type ProteinRing = {
  /** grams / target, can pass 1. */
  progress: number;
  overflow: number;
  closed: boolean;
};

export type TrainRing = {
  /** 0-1. */
  progress: number;
  closed: boolean;
  /** True when the planned day is a rest day, where a stretch closes the ring. */
  restDay: boolean;
};

export type Rings = {
  hidden: boolean;
  fuel: FuelRing;
  protein: ProteinRing;
  train: TrainRing;
};

export type RingsInput = {
  eatenKcal: number;
  budgetKcal: number;
  bmrKcal: number;
  proteinG: number;
  proteinTargetG: number;
  plannedSession: SessionKeyT | null;
  sessionDone: boolean;
  /** Minutes of stretch logged on the day. */
  stretchMinutes: number;
  /** The day is over (nightly scoring) so Fuel can close. */
  dayEnded: boolean;
  sick: boolean;
};

function ratio(a: number, b: number): number {
  return b > 0 ? Math.max(0, a / b) : 0;
}

export function computeRings(input: RingsInput): Rings {
  const fuelProgress = ratio(input.eatenKcal, input.budgetKcal);
  const inRange =
    input.eatenKcal >= input.bmrKcal &&
    input.eatenKcal <= input.budgetKcal * (1 + RINGS.fuelTolerance);
  const fuel: FuelRing = {
    progress: fuelProgress,
    overflow: Math.max(0, fuelProgress - 1),
    over: input.eatenKcal > input.budgetKcal * (1 + RINGS.fuelTolerance),
    inRange,
    closed: inRange && input.dayEnded,
  };

  const proteinProgress = ratio(input.proteinG, input.proteinTargetG);
  const protein: ProteinRing = {
    progress: proteinProgress,
    overflow: Math.max(0, proteinProgress - 1),
    closed: input.proteinTargetG > 0 && proteinProgress >= 1,
  };

  const planned = input.plannedSession;
  const restDay = planned === null || planned === "rest" || planned === "stretch";
  let train: TrainRing;
  if (restDay) {
    const stretchShare = Math.min(1, ratio(input.stretchMinutes, RINGS.restStretchMinutes));
    const closed = input.sessionDone || input.stretchMinutes >= RINGS.restStretchMinutes;
    train = { progress: closed ? 1 : stretchShare, closed, restDay: true };
  } else {
    train = {
      progress: input.sessionDone ? 1 : 0,
      closed: input.sessionDone,
      restDay: false,
    };
  }

  return { hidden: input.sick, fuel, protein, train };
}

/**
 * Session status stored on daily_scores.
 * Planned session done -> done. Planned session not done -> missed (only judged when the
 * day has ended). Rest and unplanned days -> rest, even with no stretch: a rest day is never punished.
 */
export function sessionStatus(
  planned: SessionKeyT | null,
  done: boolean,
  dayEnded: boolean,
): SessionStatusT {
  if (planned === null || planned === "rest" || planned === "stretch") return "rest";
  if (done) return "done";
  return dayEnded ? "missed" : "none";
}
