// Answer back: the way home after a lost week or a missed day (GAME.md).
import { addDays, diffDays } from "@/lib/dates";
import type { SessionStatusT } from "@/lib/supabase/types";
import { ANSWER_BACK } from "./config";
import type { DayRecord, WeekResult } from "./weekly-match";

export type AnswerBackTrigger = "lost_week" | "missed_day";

/** Whether to offer Answer back today. Never offered while one is already running. */
export function answerBackOffer(input: {
  active: boolean;
  lastWeekResult: WeekResult | null;
  yesterday: { logged: boolean; session: SessionStatusT } | null;
}): AnswerBackTrigger | null {
  if (input.active) return null;
  if (input.lastWeekResult === "loss") return "lost_week";
  const y = input.yesterday;
  if (y && (!y.logged || y.session === "missed")) return "missed_day";
  return null;
}

export type AnswerBackProgress = {
  state: "active" | "done" | "failed";
  /** Days completed in a row from the start day. */
  daysDone: number;
  needed: number;
  /** First day that broke it, when failed. */
  failedOn: string | null;
};

function dayOk(r: DayRecord | undefined): boolean {
  return Boolean(r && r.logged && (!r.planned || r.sessionDone));
}

/**
 * Log every day and do every planned session for 3 days in a row, starting on `startDay`.
 * A past day that is not ok fails it. Today is still open until it is ok.
 */
export function answerBackProgress(input: {
  startDay: string;
  today: string;
  days: DayRecord[];
}): AnswerBackProgress {
  const needed = ANSWER_BACK.days;
  let daysDone = 0;
  for (let i = 0; i < needed; i += 1) {
    const day = addDays(input.startDay, i);
    if (diffDays(input.today, day) < 0) break;
    const rec = input.days.find((r) => r.day === day);
    if (dayOk(rec)) {
      daysDone += 1;
      continue;
    }
    if (diffDays(input.today, day) > 0) {
      return { state: "failed", daysDone, needed, failedOn: day };
    }
    break;
  }
  return {
    state: daysDone >= needed ? "done" : "active",
    daysDone,
    needed,
    failedOn: null,
  };
}

/** Callus lost between two readings (never negative). */
export function callusLost(before: number, after: number): number {
  return Math.max(0, before - after);
}

/** Half of the Callus you lost comes back. A failed Answer back costs nothing extra. */
export function answerBackReward(lost: number): number {
  if (lost <= 0) return 0;
  return Math.round(lost * ANSWER_BACK.returnShare);
}
