// You vs last week: four rounds, same point in the week (GAME.md > Challenges).
import { addDays, diffDays, weekdayName } from "@/lib/dates";
import { MATCH, POINTS } from "./config";

export type RoundKey = (typeof MATCH.rounds)[number];
export type RoundOutcome = "win" | "draw" | "loss";
export type WeekResult = "win" | "loss" | "draw" | "no_ghost";

/** One day of facts, as read from the ledger and the day's entries. */
export type DayRecord = {
  day: string;
  /** A session (not a rest day) was planned. */
  planned: boolean;
  /** The planned session was completed. */
  sessionDone: boolean;
  logged: boolean;
  fuelClosed: boolean;
  proteinClosed: boolean;
};

export type RoundResult = {
  key: RoundKey;
  you: number;
  ghost: number;
  /** Most the ghost could have scored in the compared window. */
  max: number;
  outcome: RoundOutcome;
  /** Ghost was perfect and you matched it: counts as a win. */
  perfectCap: boolean;
};

export type WeekComparison = {
  noGhost: boolean;
  /** Days compared, 1-7. */
  daysCompared: number;
  /** True once the whole week is compared (Sunday). */
  final: boolean;
  rounds: RoundResult[];
  scoreYou: number;
  scoreGhost: number;
  result: WeekResult;
  perfect: boolean;
};

function tally(records: DayRecord[]) {
  return {
    sessions: records.filter((r) => r.planned && r.sessionDone).length,
    plannedSessions: records.filter((r) => r.planned).length,
    days_logged: records.filter((r) => r.logged).length,
    fuel_closed: records.filter((r) => r.fuelClosed).length,
    protein_closed: records.filter((r) => r.proteinClosed).length,
  };
}

/**
 * Compare this week with last week at the same point.
 * `through` is the last day to include (today live, Sunday for full time). Days after it
 * are ignored on both sides, so Wednesday is compared with last Wednesday.
 * `lastWeek` null or empty means week 1: no ghost.
 */
export function compareWeeks(input: {
  weekStart: string;
  through: string;
  thisWeek: DayRecord[];
  lastWeek: DayRecord[] | null;
}): WeekComparison {
  const n = Math.max(1, Math.min(7, diffDays(input.through, input.weekStart) + 1));
  if (!input.lastWeek || input.lastWeek.length === 0) {
    return {
      noGhost: true,
      daysCompared: n,
      final: n === 7,
      rounds: [],
      scoreYou: 0,
      scoreGhost: 0,
      result: "no_ghost",
      perfect: false,
    };
  }
  const lastStart = addDays(input.weekStart, -7);
  const mine = input.thisWeek.filter(
    (r) => r.day >= input.weekStart && diffDays(r.day, input.weekStart) < n,
  );
  const theirs = input.lastWeek.filter(
    (r) => r.day >= lastStart && diffDays(r.day, lastStart) < n,
  );
  const a = tally(mine);
  const g = tally(theirs);

  const rounds: RoundResult[] = MATCH.rounds.map((key) => {
    const you = key === "sessions" ? a.sessions : a[key];
    const ghost = key === "sessions" ? g.sessions : g[key];
    const max = key === "sessions" ? g.plannedSessions : n;
    const perfectCap = max > 0 && ghost === max && you === ghost;
    // Consistent is winning: matching last week wins the round. Only doing worse loses it.
    // A round where neither side did anything (0 against 0) is a draw, so nothing wins for free.
    const outcome: RoundOutcome =
      you > ghost || perfectCap || (you === ghost && ghost > 0) ? "win" : you < ghost ? "loss" : "draw";
    return { key, you, ghost, max, outcome, perfectCap };
  });

  const scoreYou = rounds.filter((r) => r.outcome === "win").length;
  const scoreGhost = rounds.filter((r) => r.outcome === "loss").length;
  const result: WeekResult =
    scoreYou > scoreGhost ? "win" : scoreYou < scoreGhost ? "loss" : "draw";
  return {
    noGhost: false,
    daysCompared: n,
    final: n === 7,
    rounds,
    scoreYou,
    scoreGhost,
    result,
    perfect: scoreYou === rounds.length && scoreGhost === 0,
  };
}

/** Callus points for a week result: win +5, loss -3, draw 0. */
export function weekOutcomePoints(result: WeekResult): number {
  if (result === "win") return POINTS.weekWon;
  if (result === "loss") return POINTS.weekLost;
  return POINTS.weekDrawn;
}

/** Consecutive wins, newest result first. A draw or a loss ends the run. */
export function winStreak(resultsNewestFirst: readonly WeekResult[]): number {
  let n = 0;
  for (const r of resultsNewestFirst) {
    if (r !== "win") break;
    n += 1;
  }
  return n;
}

/** Longest run of wins in a history, oldest first. */
export function longestWinRun(resultsOldestFirst: readonly WeekResult[]): number {
  let best = 0;
  let run = 0;
  for (const r of resultsOldestFirst) {
    run = r === "win" ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** After 4 weeks in a row of Win or Draw, Sunday run_intervals is offered (opt-in). */
export function offerIntervals(resultsNewestFirst: readonly WeekResult[]): boolean {
  const need = MATCH.intervalsOfferWeeks;
  if (resultsNewestFirst.length < need) return false;
  return resultsNewestFirst.slice(0, need).every((r) => r === "win" || r === "draw");
}

/**
 * The one losing round, when exactly one round is lost, at least 2 days remain, and the
 * gap can still be closed. `n` is the number of good days that flip it.
 */
export function losingRoundHint(
  comparison: WeekComparison,
): { round: RoundKey; n: number } | null {
  if (comparison.noGhost || comparison.final) return null;
  const daysLeft = 7 - comparison.daysCompared;
  if (daysLeft < MATCH.losingRoundMinDaysLeft) return null;
  const lost = comparison.rounds.filter((r) => r.outcome === "loss");
  const only = lost.length === 1 ? lost[0] : undefined;
  if (!only) return null;
  const capped = only.ghost === only.max && only.max > 0;
  const n = only.ghost - only.you + (capped ? 0 : 1);
  if (n < 1 || n > daysLeft) return null;
  return { round: only.key, n };
}

export type MatchLine =
  | { key: "no_ghost" }
  | { key: "winning" }
  | { key: "losing_round"; round: RoundKey; n: number }
  | { key: "full_time_win"; you: number; ghost: number }
  | { key: "draw"; you: number; ghost: number }
  | { key: "loss"; you: number; ghost: number; day: string }
  | { key: "perfect" }
  | { key: "none" };

/** First weekday where last week's you did something this week's you did not. */
export function ghostShowedUpDay(input: {
  weekStart: string;
  thisWeek: DayRecord[];
  lastWeek: DayRecord[];
}): string {
  const lastStart = addDays(input.weekStart, -7);
  for (let i = 0; i < 7; i += 1) {
    const g = input.lastWeek.find((r) => r.day === addDays(lastStart, i));
    const y = input.thisWeek.find((r) => r.day === addDays(input.weekStart, i));
    if (!g) continue;
    const ghostSession = g.planned && g.sessionDone;
    const yourSession = y ? y.planned && y.sessionDone : false;
    if (
      (g.logged && !y?.logged) ||
      (ghostSession && !yourSession) ||
      (g.fuelClosed && !y?.fuelClosed) ||
      (g.proteinClosed && !y?.proteinClosed)
    ) {
      return weekdayName(addDays(input.weekStart, i));
    }
  }
  return weekdayName(addDays(input.weekStart, 6));
}

/** Which Coach line to show for the match. The lead maps the key to content/copy.ts matchLines. */
export function matchLine(
  comparison: WeekComparison,
  ctx: { weekStart: string; thisWeek: DayRecord[]; lastWeek: DayRecord[] | null },
): MatchLine {
  if (comparison.noGhost) return { key: "no_ghost" };
  const y = comparison.scoreYou;
  const g = comparison.scoreGhost;
  if (comparison.final) {
    if (comparison.perfect) return { key: "perfect" };
    if (comparison.result === "win") return { key: "full_time_win", you: y, ghost: g };
    if (comparison.result === "draw") return { key: "draw", you: y, ghost: g };
    return {
      key: "loss",
      you: y,
      ghost: g,
      day: ghostShowedUpDay({
        weekStart: ctx.weekStart,
        thisWeek: ctx.thisWeek,
        lastWeek: ctx.lastWeek ?? [],
      }),
    };
  }
  const hint = losingRoundHint(comparison);
  if (hint) return { key: "losing_round", round: hint.round, n: hint.n };
  if (comparison.result === "win") return { key: "winning" };
  return { key: "none" };
}
