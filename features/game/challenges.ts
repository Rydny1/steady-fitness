// Weekly challenges (offer rules, progress) and records (GAME.md > Challenges).
import { addDays, diffDays, weekDays } from "@/lib/dates";
import type { PoseT } from "@/lib/supabase/types";
import { CHALLENGES, type ChallengeKey } from "./config";
import { isBetterSet, type LoggedSet } from "@/features/training/progression";

/** What last week looked like. All counts are real counts from the ledger and entries. */
export type LastWeekStats = {
  /** Gym sessions started at or after 18:00. */
  trainedAfter18: number;
  /** Days the protein ring closed. */
  proteinClosedDays: number;
  /** Days over budget. */
  daysOverBudget: number;
  /** Logs created at or after 22:00. */
  logsAfter22: number;
  /** Walk plus run minutes. */
  walkRunMinutes: number;
  /** Days since the last progress photo, null when there is none ever. */
  daysSincePhoto: number | null;
  /** Days with a weight logged. */
  weighIns: number;
  /** Average sleep hours over logged nights, null when none logged. */
  avgSleepHours: number | null;
};

export type ChallengeOffer = {
  key: ChallengeKey;
  /** True when a real trigger fired. False cards fill the third slot. */
  triggered: boolean;
  /** The number the reason quotes. Null for filler cards. */
  count: number | null;
  /** Plain reason, ready to show. */
  why: string;
};

type Candidate = { key: ChallengeKey; severity: number; count: number };

const KEY_ORDER: readonly ChallengeKey[] = [
  "early_kickoff",
  "protein_five",
  "clean_week",
  "full_ninety",
  "ten_k_minutes",
  "photo_day",
  "weigh_in_three",
  "sleep_seven",
];

function fillWhy(template: string, n: number): string {
  return template.replace("{n}", String(n));
}

function roundHalf(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Candidates whose trigger fired, each with a severity used to rank them. */
export function triggeredChallenges(s: LastWeekStats): Candidate[] {
  const out: Candidate[] = [];
  const c = CHALLENGES;
  if (s.trainedAfter18 >= c.lateTrainingCount) {
    out.push({ key: "early_kickoff", severity: s.trainedAfter18 / 7, count: s.trainedAfter18 });
  }
  if (s.proteinClosedDays < c.proteinClosedBelow) {
    out.push({
      key: "protein_five",
      severity: (c.proteinClosedBelow - s.proteinClosedDays) / c.proteinClosedBelow,
      count: s.proteinClosedDays,
    });
  }
  if (s.daysOverBudget >= c.overBudgetDays) {
    out.push({ key: "clean_week", severity: s.daysOverBudget / 7, count: s.daysOverBudget });
  }
  if (s.logsAfter22 >= c.lateLogCount) {
    out.push({ key: "full_ninety", severity: s.logsAfter22 / 7, count: s.logsAfter22 });
  }
  if (s.walkRunMinutes < c.walkRunBelowMinutes) {
    out.push({
      key: "ten_k_minutes",
      severity: (c.walkRunBelowMinutes - s.walkRunMinutes) / c.walkRunBelowMinutes,
      count: s.walkRunMinutes,
    });
  }
  if (s.daysSincePhoto === null || s.daysSincePhoto >= c.noPhotoDays) {
    out.push({
      key: "photo_day",
      severity: 0.5,
      count: s.daysSincePhoto ?? c.noPhotoDays,
    });
  }
  if (s.weighIns < c.weighInsBelow) {
    out.push({
      key: "weigh_in_three",
      severity: (c.weighInsBelow - s.weighIns) / c.weighInsBelow,
      count: s.weighIns,
    });
  }
  if (s.avgSleepHours !== null && s.avgSleepHours < c.sleepBelowHours) {
    out.push({
      key: "sleep_seven",
      severity: (c.sleepBelowHours - s.avgSleepHours) / c.sleepBelowHours,
      count: roundHalf(s.avgSleepHours),
    });
  }
  return out;
}

/**
 * Three challenges for Monday morning: the triggered ones, weakest area first, then
 * filler cards in a fixed order if fewer than three fired. Ties break by key order.
 */
export function offerChallenges(stats: LastWeekStats): ChallengeOffer[] {
  const triggered = triggeredChallenges(stats).sort(
    (a, b) => b.severity - a.severity || KEY_ORDER.indexOf(a.key) - KEY_ORDER.indexOf(b.key),
  );
  const offers: ChallengeOffer[] = triggered.slice(0, CHALLENGES.offered).map((t) => ({
    key: t.key,
    triggered: true,
    count: t.count,
    why: fillWhy(CHALLENGES.why[t.key], t.count),
  }));
  for (const key of CHALLENGES.fillOrder) {
    if (offers.length >= CHALLENGES.offered) break;
    if (offers.some((o) => o.key === key)) continue;
    offers.push({ key: key as ChallengeKey, triggered: false, count: null, why: CHALLENGES.whyFill });
  }
  return offers;
}

/** One day of the challenge week. */
export type ChallengeDay = {
  day: string;
  /** Start times of gym sessions, minutes after midnight. */
  gymStartMinutes: number[];
  proteinClosed: boolean;
  eatenKcal: number;
  budgetKcal: number;
  /** Minutes after midnight of the first log created that day, null when none. */
  firstLogMinutes: number | null;
  walkRunMinutes: number;
  weightLogged: boolean;
  sleepHours: number | null;
};

export type ChallengeProgress = {
  key: ChallengeKey;
  current: number;
  goal: number;
  done: boolean;
  /** Can no longer be completed this week. */
  failed: boolean;
};

/**
 * Progress for the picked challenge.
 * `photoPoses` are the poses taken during the week. `today` decides which days are still open.
 * Avoid-style challenges (clean_week) complete only once the week is over.
 */
export function challengeProgress(input: {
  key: ChallengeKey;
  weekStart: string;
  today: string;
  days: ChallengeDay[];
  photoPoses: readonly PoseT[];
}): ChallengeProgress {
  const { key, days } = input;
  const weekEnd = addDays(input.weekStart, 6);
  const weekOver = diffDays(input.today, weekEnd) > 0;
  const c = CHALLENGES;
  const daysLeftIncludingToday = Math.max(0, diffDays(weekEnd, input.today) + 1);

  const finish = (current: number, goal: number, failedOverride?: boolean): ChallengeProgress => {
    const done = current >= goal;
    const failed = failedOverride ?? (!done && goal - current > daysLeftIncludingToday);
    return { key, current, goal, done, failed: done ? false : failed };
  };

  switch (key) {
    case "early_kickoff": {
      const n = days.reduce(
        (sum, d) => sum + d.gymStartMinutes.filter((m) => m < c.earlyKickoffBeforeMinutes).length,
        0,
      );
      return { key, current: n, goal: c.earlyKickoffSessions, done: n >= c.earlyKickoffSessions, failed: weekOver && n < c.earlyKickoffSessions };
    }
    case "protein_five": {
      const n = days.filter((d) => d.proteinClosed).length;
      return finish(n, c.proteinFiveDays);
    }
    case "clean_week": {
      const over = days.filter(
        (d) => d.budgetKcal > 0 && d.eatenKcal >= d.budgetKcal * (1 + c.cleanWeekOverLimit),
      ).length;
      const clean = 7 - over;
      const failed = over > 0;
      return { key, current: clean, goal: 7, done: weekOver && !failed, failed };
    }
    case "full_ninety": {
      const okDays = new Set(
        days
          .filter(
            (d) => d.firstLogMinutes !== null && d.firstLogMinutes < c.fullNinetyBeforeHour * 60,
          )
          .map((d) => d.day),
      );
      const failed = weekDays(input.weekStart).some(
        (d) => diffDays(input.today, d) > 0 && !okDays.has(d),
      );
      const ok = okDays.size;
      return { key, current: ok, goal: 7, done: ok >= 7, failed: ok >= 7 ? false : failed };
    }
    case "ten_k_minutes": {
      const n = days.reduce((sum, d) => sum + d.walkRunMinutes, 0);
      return finish(n, c.walkRunMinutes, weekOver && n < c.walkRunMinutes);
    }
    case "photo_day": {
      const have = new Set(input.photoPoses);
      const n = (["front", "side", "back"] as const).filter((p) => have.has(p)).length;
      return finish(n, 3, weekOver && n < 3);
    }
    case "weigh_in_three": {
      const n = days.filter((d) => d.weightLogged).length;
      return finish(n, c.weighInDays);
    }
    case "sleep_seven": {
      const n = days.filter((d) => d.sleepHours !== null && d.sleepHours >= c.sleepHours).length;
      return finish(n, c.sleepNights);
    }
  }
}

// ---- Records ----

export type RecordSet = LoggedSet & { exerciseId: string; day: string };

export type LiftBest = { exerciseId: string; weightKg: number; reps: number; day: string };

/** Best set per exercise: heavier wins, then more reps, then the earlier day. */
export function bestLifts(sets: readonly RecordSet[]): LiftBest[] {
  const best = new Map<string, RecordSet>();
  for (const s of [...sets].sort((a, b) => a.day.localeCompare(b.day))) {
    const cur = best.get(s.exerciseId);
    if (!cur || isBetterSet(cur, s)) best.set(s.exerciseId, s);
  }
  return [...best.values()].map((s) => ({
    exerciseId: s.exerciseId,
    weightKg: s.weightKg,
    reps: s.reps,
    day: s.day,
  }));
}

/**
 * Number of lift records: every time a set beat the best so far for its exercise.
 * The first set ever for an exercise is the baseline, not a record.
 */
export function countLiftRecords(sets: readonly RecordSet[]): number {
  const best = new Map<string, RecordSet>();
  let count = 0;
  for (const s of [...sets].sort((a, b) => a.day.localeCompare(b.day))) {
    const cur = best.get(s.exerciseId);
    if (!cur) {
      best.set(s.exerciseId, s);
    } else if (isBetterSet(cur, s)) {
      best.set(s.exerciseId, s);
      count += 1;
    }
  }
  return count;
}

/** Lowest 7-day weight average and the day it happened. */
export function lowestAverage(
  series: readonly { day: string; avgKg: number }[],
): { day: string; avgKg: number } | null {
  let low: { day: string; avgKg: number } | null = null;
  for (const p of series) if (!low || p.avgKg < low.avgKg) low = p;
  return low;
}

/** Most planned sessions completed in one week. weeklyCounts: [{ weekStart, sessions }]. */
export function mostSessionsInWeek(
  weeklyCounts: readonly { weekStart: string; sessions: number }[],
): { weekStart: string; sessions: number } | null {
  let top: { weekStart: string; sessions: number } | null = null;
  for (const w of weeklyCounts) if (!top || w.sessions > top.sessions) top = w;
  return top;
}
