import { describe, expect, it } from "vitest";
import {
  answerBackOffer,
  answerBackProgress,
  answerBackReward,
  bestLifts,
  callusLost,
  challengeProgress,
  compareWeeks,
  countLiftRecords,
  evaluateTrophies,
  ghostShowedUpDay,
  longestWinRun,
  losingRoundHint,
  lowestAverage,
  matchLine,
  mostSessionsInWeek,
  newlyEarned,
  offerChallenges,
  offerIntervals,
  shouldNod,
  triggeredChallenges,
  weekOutcomePoints,
  winStreak,
  TROPHY_KEYS,
  type ChallengeDay,
  type DayRecord,
  type LastWeekStats,
  type TrophyInput,
} from "@/features/game";
import { addDays, dayOfTimestamp, diffDays, rangeDays, weekDays, weekStart } from "@/lib/dates";

function rec(day: string, o: Partial<DayRecord> = {}): DayRecord {
  return { day, planned: false, sessionDone: false, logged: false, fuelClosed: false, proteinClosed: false, ...o };
}

/** Build 7 records for a week from a per-index spec. */
function week(start: string, spec: (i: number) => Partial<DayRecord>): DayRecord[] {
  return weekDays(start).map((d, i) => rec(d, spec(i)));
}

const LAST = "2026-10-12";
const THIS = "2026-10-19"; // the week that ends on the Riga DST change, Sunday 2026-10-25

describe("You vs last week", () => {
  it("week 1 has no ghost", () => {
    const thisWeek = week(THIS, () => ({ logged: true }));
    for (const lastWeek of [null, []]) {
      const c = compareWeeks({ weekStart: THIS, through: "2026-10-21", thisWeek, lastWeek });
      expect(c.noGhost).toBe(true);
      expect(c.rounds).toEqual([]);
      expect(c.result).toBe("no_ghost");
      expect(matchLine(c, { weekStart: THIS, thisWeek, lastWeek })).toEqual({ key: "no_ghost" });
    }
  });

  it("mid-week compares the same point: Wednesday against last Wednesday", () => {
    // Last week: planned Mon Tue Thu Fri Sat, all done, everything logged all week.
    const lastWeek = week(LAST, (i) => ({
      logged: true,
      planned: [0, 1, 3, 4, 5].includes(i),
      sessionDone: [0, 1, 3, 4, 5].includes(i),
    }));
    // This week up to Wednesday: logged Mon-Wed, sessions Mon Tue done.
    const thisWeek = week(THIS, (i) => ({
      logged: i < 3,
      planned: [0, 1, 3, 4, 5].includes(i),
      sessionDone: i < 2,
    }));
    const c = compareWeeks({ weekStart: THIS, through: "2026-10-21", thisWeek, lastWeek });
    expect(c.daysCompared).toBe(3);
    expect(c.final).toBe(false);
    const byKey = Object.fromEntries(c.rounds.map((r) => [r.key, r]));
    // Ghost counted only Mon-Wed: 3 logged, 2 sessions. Not 7 and 5.
    expect(byKey.days_logged).toMatchObject({ you: 3, ghost: 3, max: 3 });
    expect(byKey.sessions).toMatchObject({ you: 2, ghost: 2, max: 2 });
    // Ghost was perfect in both, matching counts as a win.
    expect(byKey.days_logged?.outcome).toBe("win");
    expect(byKey.sessions?.outcome).toBe("win");
    expect(byKey.fuel_closed?.outcome).toBe("draw");
    expect(c.scoreYou).toBe(2);
    expect(c.scoreGhost).toBe(0);
    expect(c.result).toBe("win");
  });

  it("days after the compare point are ignored on both sides", () => {
    const lastWeek = week(LAST, (i) => ({ logged: i < 2 }));
    const thisWeek = week(THIS, () => ({ logged: true }));
    const c = compareWeeks({ weekStart: THIS, through: "2026-10-20", thisWeek, lastWeek });
    expect(c.rounds.find((r) => r.key === "days_logged")).toMatchObject({ you: 2, ghost: 2 });
  });

  it("win a round with more or equal (consistent wins), lose with less, draw only at 0 against 0", () => {
    const lastWeek = week(LAST, (i) => ({
      logged: i < 5,
      fuelClosed: i < 4,
      proteinClosed: i < 3,
      planned: i < 3,
      sessionDone: i < 3,
    }));
    const thisWeek = week(THIS, (i) => ({
      logged: true, // 7 vs 5 win
      fuelClosed: i < 4, // 4 vs 4 matches, so it wins
      proteinClosed: i < 1, // 1 vs 3 loss
      planned: i < 3,
      sessionDone: i < 2, // 2 vs 3 loss
    }));
    const c = compareWeeks({ weekStart: THIS, through: "2026-10-25", thisWeek, lastWeek });
    expect(c.final).toBe(true);
    const o = Object.fromEntries(c.rounds.map((r) => [r.key, r.outcome]));
    expect(o).toEqual({ sessions: "loss", days_logged: "win", fuel_closed: "win", protein_closed: "loss" });
    expect(c.scoreYou).toBe(2);
    expect(c.scoreGhost).toBe(2);
    expect(c.result).toBe("draw");
    expect(weekOutcomePoints(c.result)).toBe(0);

    // Nothing done by either side is a draw, never a free win.
    const none = compareWeeks({ weekStart: THIS, through: "2026-10-25", thisWeek: week(THIS, () => ({})), lastWeek: week(LAST, () => ({})) });
    expect(none.rounds.every((r) => r.outcome === "draw")).toBe(true);
  });

  it("perfect last week can only be matched, and matching wins", () => {
    const perfect = (start: string) =>
      week(start, () => ({ logged: true, fuelClosed: true, proteinClosed: true, planned: true, sessionDone: true }));
    const c = compareWeeks({ weekStart: THIS, through: "2026-10-25", thisWeek: perfect(THIS), lastWeek: perfect(LAST) });
    expect(c.rounds.every((r) => r.perfectCap && r.outcome === "win")).toBe(true);
    expect(c.scoreYou).toBe(4);
    expect(c.scoreGhost).toBe(0);
    expect(c.perfect).toBe(true);
    expect(matchLine(c, { weekStart: THIS, thisWeek: perfect(THIS), lastWeek: perfect(LAST) })).toEqual({ key: "perfect" });
  });

  it("a ghost with nothing planned and nothing done is a draw, not a free win", () => {
    const empty = week(LAST, () => ({}));
    const mine = week(THIS, () => ({}));
    const c = compareWeeks({ weekStart: THIS, through: "2026-10-25", thisWeek: mine, lastWeek: empty });
    expect(c.rounds.every((r) => r.outcome === "draw")).toBe(true);
    expect(c.result).toBe("draw");
    expect(weekOutcomePoints("draw")).toBe(0);
    expect(weekOutcomePoints("win")).toBe(5);
    expect(weekOutcomePoints("no_ghost")).toBe(0);
  });

  it("a week that spans the Riga DST change (Sun 2026-10-25) still has 7 days and compares fully", () => {
    expect(weekDays(THIS)).toHaveLength(7);
    expect(weekDays(THIS)[6]).toBe("2026-10-25");
    expect(weekStart("2026-10-25")).toBe(THIS);
    expect(weekStart("2026-10-26")).toBe("2026-10-26");
    expect(diffDays("2026-10-26", THIS)).toBe(7);
    expect(rangeDays(THIS, "2026-10-25")).toHaveLength(7);
    // 25 hour day: a log at 00:30 EEST and one at 23:30 EET both land on Sunday.
    expect(dayOfTimestamp("2026-10-24T21:30:00Z")).toBe("2026-10-25");
    expect(dayOfTimestamp("2026-10-25T21:30:00Z")).toBe("2026-10-25");
    expect(dayOfTimestamp("2026-10-25T22:30:00Z")).toBe("2026-10-26");

    const days = [
      "2026-10-24T21:30:00Z", // Sun 00:30
      "2026-10-19T08:00:00Z",
      "2026-10-20T08:00:00Z",
      "2026-10-21T08:00:00Z",
      "2026-10-22T08:00:00Z",
      "2026-10-23T08:00:00Z",
      "2026-10-24T08:00:00Z",
    ].map(dayOfTimestamp);
    const logged = new Set(days);
    const thisWeek = weekDays(THIS).map((d) => rec(d, { logged: logged.has(d) }));
    const lastWeek = week(LAST, (i) => ({ logged: i < 6 }));
    const c = compareWeeks({ weekStart: THIS, through: "2026-10-25", thisWeek, lastWeek });
    expect(c.daysCompared).toBe(7);
    expect(c.rounds.find((r) => r.key === "days_logged")).toMatchObject({ you: 7, ghost: 6, outcome: "win" });
    // And the week after: its ghost is the DST week.
    const next = compareWeeks({ weekStart: "2026-10-26", through: "2026-10-26", thisWeek: [rec("2026-10-26", { logged: true })], lastWeek: thisWeek });
    expect(next.rounds.find((r) => r.key === "days_logged")).toMatchObject({ you: 1, ghost: 1 });
  });

  it("win streak and longest run", () => {
    expect(winStreak(["win", "win", "win", "draw", "win"])).toBe(3);
    expect(winStreak(["draw", "win"])).toBe(0);
    expect(winStreak([])).toBe(0);
    expect(longestWinRun(["win", "win", "loss", "win", "win", "win", "no_ghost", "win"])).toBe(3);
    expect(longestWinRun([])).toBe(0);
  });

  it("run_intervals is offered after 4 weeks of Win or Draw", () => {
    expect(offerIntervals(["win", "draw", "win", "win"])).toBe(true);
    expect(offerIntervals(["win", "loss", "win", "win"])).toBe(false);
    expect(offerIntervals(["win", "win", "win"])).toBe(false);
    expect(offerIntervals(["win", "win", "win", "win", "loss"])).toBe(true);
  });

  describe("losing round hint", () => {
    it("names the only lost round and the days that flip it", () => {
      const lastWeek = week(LAST, (i) => ({ logged: i < 3 }));
      const thisWeek = week(THIS, (i) => ({ logged: i < 1 }));
      const c = compareWeeks({ weekStart: THIS, through: "2026-10-20", thisWeek, lastWeek });
      // 2 days compared, ghost logged 2 of 2 (perfect), you 1: one more day matches it.
      expect(losingRoundHint(c)).toEqual({ round: "days_logged", n: 1 });
      expect(matchLine(c, { weekStart: THIS, thisWeek, lastWeek })).toEqual({
        key: "losing_round",
        round: "days_logged",
        n: 1,
      });
    });

    it("beating a ghost that is not perfect takes one more good day than the gap", () => {
      const lastWeek = week(LAST, (i) => ({ logged: i === 0 || i === 1 })); // 2 of 3 by Wed
      const thisWeek = week(THIS, () => ({}));
      const c = compareWeeks({ weekStart: THIS, through: "2026-10-21", thisWeek, lastWeek });
      expect(losingRoundHint(c)).toEqual({ round: "days_logged", n: 3 });
    });

    it("is silent with fewer than 2 days left, at full time, with no ghost, with 2 lost rounds, or when it cannot be flipped", () => {
      const lastWeek = week(LAST, () => ({ logged: true, fuelClosed: true }));
      const thisWeek = week(THIS, () => ({}));
      const late = compareWeeks({ weekStart: THIS, through: "2026-10-24", thisWeek, lastWeek });
      expect(losingRoundHint(late)).toBeNull();
      const final = compareWeeks({ weekStart: THIS, through: "2026-10-25", thisWeek, lastWeek });
      expect(losingRoundHint(final)).toBeNull();
      const none = compareWeeks({ weekStart: THIS, through: "2026-10-20", thisWeek, lastWeek: null });
      expect(losingRoundHint(none)).toBeNull();
      const two = compareWeeks({ weekStart: THIS, through: "2026-10-20", thisWeek, lastWeek });
      expect(two.rounds.filter((r) => r.outcome === "loss")).toHaveLength(2);
      expect(losingRoundHint(two)).toBeNull();
      // One lost round but too many good days needed for the days left.
      const big = week(LAST, () => ({ logged: true }));
      const cant = compareWeeks({ weekStart: THIS, through: "2026-10-22", thisWeek: week(THIS, () => ({})), lastWeek: big });
      expect(cant.rounds.filter((r) => r.outcome === "loss")).toHaveLength(1);
      expect(losingRoundHint(cant)).toBeNull();
    });
  });

  describe("match lines", () => {
    const lastWeek = week(LAST, (i) => ({ logged: true, fuelClosed: i < 4, proteinClosed: i < 4, planned: i < 3, sessionDone: i < 3 }));

    it("winning live", () => {
      const thisWeek = week(THIS, () => ({ logged: true, fuelClosed: true, proteinClosed: true, planned: true, sessionDone: true }));
      const c = compareWeeks({ weekStart: THIS, through: "2026-10-21", thisWeek, lastWeek });
      expect(c.result).toBe("win");
      expect(matchLine(c, { weekStart: THIS, thisWeek, lastWeek })).toEqual({ key: "winning" });
    });

    it("level or behind live with no clear hint is silent", () => {
      const thisWeek = week(THIS, () => ({}));
      const c = compareWeeks({ weekStart: THIS, through: "2026-10-24", thisWeek, lastWeek });
      expect(matchLine(c, { weekStart: THIS, thisWeek, lastWeek })).toEqual({ key: "none" });
    });

    it("full time win, draw and loss", () => {
      const winWeek = week(THIS, (i) => ({ logged: true, fuelClosed: i < 6, proteinClosed: i < 4, planned: i < 3, sessionDone: i < 3 }));
      const win = compareWeeks({ weekStart: THIS, through: "2026-10-25", thisWeek: winWeek, lastWeek });
      expect(["full_time_win", "perfect"]).toContain(matchLine(win, { weekStart: THIS, thisWeek: winWeek, lastWeek }).key);
      // Two rounds matched (wins) and two worse (losses) is a 2 - 2 draw.
      const all = (i: number) => ({ logged: true, fuelClosed: true, proteinClosed: true, planned: i < 3, sessionDone: i < 3 });
      const drawLast = week(LAST, all);
      const drawWeek = week(THIS, (i) => ({ ...all(i), fuelClosed: i < 3, proteinClosed: i < 3 }));
      const draw = compareWeeks({ weekStart: THIS, through: "2026-10-25", thisWeek: drawWeek, lastWeek: drawLast });
      expect(draw.result).toBe("draw");
      expect(matchLine(draw, { weekStart: THIS, thisWeek: drawWeek, lastWeek: drawLast })).toMatchObject({ key: "draw", you: 2, ghost: 2 });
      const lossWeek = week(THIS, (i) => ({ logged: i !== 2, fuelClosed: false, proteinClosed: false, planned: i < 3, sessionDone: false }));
      const loss = compareWeeks({ weekStart: THIS, through: "2026-10-25", thisWeek: lossWeek, lastWeek });
      expect(loss.result).toBe("loss");
      const line = matchLine(loss, { weekStart: THIS, thisWeek: lossWeek, lastWeek });
      expect(line).toMatchObject({ key: "loss", day: "Monday" });
    });

    it("which day the ghost showed up", () => {
      const thisWeek = week(THIS, (i) => ({ logged: i < 2 }));
      expect(ghostShowedUpDay({ weekStart: THIS, thisWeek, lastWeek: week(LAST, () => ({ logged: true })) })).toBe("Wednesday");
      // Falls through on a session, a fuel ring and a protein ring too.
      const l2 = week(LAST, (i) => ({ planned: i === 1, sessionDone: i === 1 }));
      expect(ghostShowedUpDay({ weekStart: THIS, thisWeek: week(THIS, () => ({})), lastWeek: l2 })).toBe("Tuesday");
      const l3 = week(LAST, (i) => ({ fuelClosed: i === 3 }));
      expect(ghostShowedUpDay({ weekStart: THIS, thisWeek: week(THIS, () => ({})), lastWeek: l3 })).toBe("Thursday");
      const l4 = week(LAST, (i) => ({ proteinClosed: i === 4 }));
      expect(ghostShowedUpDay({ weekStart: THIS, thisWeek: week(THIS, () => ({})), lastWeek: l4 })).toBe("Friday");
      // Nothing found: falls back to the last day. Missing ghost days are skipped.
      expect(ghostShowedUpDay({ weekStart: THIS, thisWeek: [], lastWeek: [rec(addDays(LAST, 0))] })).toBe("Sunday");
    });
  });
});

describe("weekly challenges", () => {
  const calm: LastWeekStats = {
    trainedAfter18: 0,
    proteinClosedDays: 6,
    daysOverBudget: 0,
    logsAfter22: 0,
    walkRunMinutes: 200,
    daysSincePhoto: 3,
    weighIns: 4,
    avgSleepHours: 7.5,
  };

  it("each key triggers on its own rule only", () => {
    expect(triggeredChallenges(calm)).toEqual([]);
    const keys = (o: Partial<LastWeekStats>) => triggeredChallenges({ ...calm, ...o }).map((c) => c.key);
    expect(keys({ trainedAfter18: 3 })).toEqual(["early_kickoff"]);
    expect(keys({ trainedAfter18: 2 })).toEqual([]);
    expect(keys({ proteinClosedDays: 3 })).toEqual(["protein_five"]);
    expect(keys({ proteinClosedDays: 4 })).toEqual([]);
    expect(keys({ daysOverBudget: 2 })).toEqual(["clean_week"]);
    expect(keys({ daysOverBudget: 1 })).toEqual([]);
    expect(keys({ logsAfter22: 2 })).toEqual(["full_ninety"]);
    expect(keys({ logsAfter22: 1 })).toEqual([]);
    expect(keys({ walkRunMinutes: 89 })).toEqual(["ten_k_minutes"]);
    expect(keys({ walkRunMinutes: 90 })).toEqual([]);
    expect(keys({ daysSincePhoto: 14 })).toEqual(["photo_day"]);
    expect(keys({ daysSincePhoto: 13 })).toEqual([]);
    expect(keys({ daysSincePhoto: null })).toEqual(["photo_day"]);
    expect(keys({ weighIns: 1 })).toEqual(["weigh_in_three"]);
    expect(keys({ weighIns: 2 })).toEqual([]);
    expect(keys({ avgSleepHours: 6.4 })).toEqual(["sleep_seven"]);
    expect(keys({ avgSleepHours: 6.5 })).toEqual([]);
    expect(keys({ avgSleepHours: null })).toEqual([]);
  });

  it("offers three, worst area first, with a plain reason that quotes the number", () => {
    const offers = offerChallenges({
      ...calm,
      trainedAfter18: 4,
      proteinClosedDays: 1,
      daysOverBudget: 3,
      logsAfter22: 2,
      weighIns: 0,
    });
    expect(offers).toHaveLength(3);
    expect(offers.every((o) => o.triggered)).toBe(true);
    expect(offers[0]?.key).toBe("weigh_in_three");
    expect(offers[0]?.why).toBe("Picked because you weighed in 0 times last week.");
    expect(offers.map((o) => o.key)).toEqual(["weigh_in_three", "protein_five", "early_kickoff"]);
    expect(offers[2]?.why).toBe("Picked because you trained after 18:00 4 times last week.");
  });

  it("fills with untriggered cards when fewer than three fire, never repeating", () => {
    const offers = offerChallenges({ ...calm, proteinClosedDays: 2 });
    expect(offers.map((o) => o.key)).toEqual(["protein_five", "weigh_in_three", "ten_k_minutes"]);
    expect(offers.map((o) => o.triggered)).toEqual([true, false, false]);
    expect(offers[1]?.count).toBeNull();
    expect(offers[1]?.why).toBe("Picked to round out your week.");
    const none = offerChallenges(calm);
    expect(new Set(none.map((o) => o.key)).size).toBe(3);
    expect(none[0]?.why).toBe("Picked to round out your week.");
    // Sleep reason rounds the quoted hours.
    const sleep = offerChallenges({ ...calm, avgSleepHours: 5.46 });
    expect(sleep[0]?.why).toBe("Picked because your sleep averaged 5.5 hours last week.");
  });

  it("ties break by key order", () => {
    const offers = offerChallenges({ ...calm, trainedAfter18: 7, daysOverBudget: 7 });
    expect(offers.slice(0, 2).map((o) => o.key)).toEqual(["early_kickoff", "clean_week"]);
  });

  describe("progress", () => {
    const WS = THIS;
    const cd = (i: number, o: Partial<ChallengeDay> = {}): ChallengeDay => ({
      day: addDays(WS, i),
      gymStartMinutes: [],
      proteinClosed: false,
      eatenKcal: 2000,
      budgetKcal: 2000,
      firstLogMinutes: 600,
      walkRunMinutes: 0,
      weightLogged: false,
      sleepHours: null,
      ...o,
    });
    const run = (key: Parameters<typeof challengeProgress>[0]["key"], days: ChallengeDay[], today: string, poses: ("front" | "side" | "back")[] = []) =>
      challengeProgress({ key, weekStart: WS, today, days, photoPoses: poses });

    it("early kickoff: 3 gym sessions started before 07:30", () => {
      const days = [cd(0, { gymStartMinutes: [6 * 60 + 45] }), cd(1, { gymStartMinutes: [7 * 60 + 30] }), cd(3, { gymStartMinutes: [7 * 60 + 29] })];
      expect(run("early_kickoff", days, "2026-10-23")).toMatchObject({ current: 2, goal: 3, done: false, failed: false });
      const done = [...days, cd(4, { gymStartMinutes: [6 * 60] })];
      expect(run("early_kickoff", done, "2026-10-23")).toMatchObject({ current: 3, done: true });
      expect(run("early_kickoff", days, "2026-10-26")).toMatchObject({ done: false, failed: true });
    });

    it("protein five: ring closed 5 of 7 days, fails when it cannot be reached", () => {
      const days = [0, 1, 2, 3, 4].map((i) => cd(i, { proteinClosed: true }));
      expect(run("protein_five", days, "2026-10-23")).toMatchObject({ current: 5, done: true, failed: false });
      const few = [cd(0, { proteinClosed: true })];
      expect(run("protein_five", few, "2026-10-21")).toMatchObject({ current: 1, done: false, failed: false });
      expect(run("protein_five", few, "2026-10-24")).toMatchObject({ failed: true });
    });

    it("clean week: no day over by 10 percent, complete only when the week is over", () => {
      const ok = [0, 1, 2].map((i) => cd(i, { eatenKcal: 2199 }));
      expect(run("clean_week", ok, "2026-10-22")).toMatchObject({ done: false, failed: false });
      expect(run("clean_week", ok, "2026-10-26")).toMatchObject({ done: true, failed: false });
      const bad = [...ok, cd(3, { eatenKcal: 2200 })];
      expect(run("clean_week", bad, "2026-10-22")).toMatchObject({ failed: true, done: false, current: 6 });
      expect(run("clean_week", bad, "2026-10-26")).toMatchObject({ failed: true, done: false });
      const nobudget = [cd(0, { budgetKcal: 0, eatenKcal: 5000 })];
      expect(run("clean_week", nobudget, "2026-10-26").failed).toBe(false);
    });

    it("full ninety: log before 21:00 every day", () => {
      const all = [0, 1, 2, 3, 4, 5, 6].map((i) => cd(i, { firstLogMinutes: 20 * 60 + 59 }));
      expect(run("full_ninety", all, "2026-10-25")).toMatchObject({ current: 7, goal: 7, done: true, failed: false });
      const late = all.map((d, i) => (i === 1 ? { ...d, firstLogMinutes: 21 * 60 } : d));
      expect(run("full_ninety", late, "2026-10-23")).toMatchObject({ failed: true, done: false, current: 6 });
      // The late day is still ahead: not failed.
      expect(run("full_ninety", all.slice(0, 2), "2026-10-20")).toMatchObject({ failed: false, current: 2 });
      // A past day with no row at all fails it.
      expect(run("full_ninety", [all[0] as ChallengeDay], "2026-10-22")).toMatchObject({ failed: true });
      const none = [cd(0, { firstLogMinutes: null })];
      expect(run("full_ninety", none, "2026-10-21").failed).toBe(true);
    });

    it("long legs: 150 walk or run minutes", () => {
      const days = [cd(0, { walkRunMinutes: 60 }), cd(1, { walkRunMinutes: 89 })];
      expect(run("ten_k_minutes", days, "2026-10-22")).toMatchObject({ current: 149, done: false, failed: false });
      expect(run("ten_k_minutes", [...days, cd(2, { walkRunMinutes: 1 })], "2026-10-22")).toMatchObject({ done: true });
      expect(run("ten_k_minutes", days, "2026-10-26")).toMatchObject({ failed: true });
    });

    it("photo day: all three poses", () => {
      expect(run("photo_day", [], "2026-10-22", ["front", "side"])).toMatchObject({ current: 2, goal: 3, done: false });
      expect(run("photo_day", [], "2026-10-22", ["front", "side", "back", "front"])).toMatchObject({ current: 3, done: true });
      expect(run("photo_day", [], "2026-10-26", ["front"])).toMatchObject({ failed: true });
    });

    it("three weigh-ins", () => {
      const days = [0, 2, 4].map((i) => cd(i, { weightLogged: true }));
      expect(run("weigh_in_three", days, "2026-10-23")).toMatchObject({ current: 3, done: true });
      expect(run("weigh_in_three", days.slice(0, 2), "2026-10-23")).toMatchObject({ current: 2, done: false, failed: false });
      expect(run("weigh_in_three", days.slice(0, 1), "2026-10-25")).toMatchObject({ failed: true });
    });

    it("seven hours: 7 or more on 5 nights", () => {
      const days = [0, 1, 2, 3, 4].map((i) => cd(i, { sleepHours: 7 }));
      expect(run("sleep_seven", days, "2026-10-24")).toMatchObject({ current: 5, done: true });
      const mixed = days.map((d, i) => (i === 0 ? { ...d, sleepHours: 6.9 } : i === 1 ? { ...d, sleepHours: null } : d));
      expect(run("sleep_seven", mixed, "2026-10-24")).toMatchObject({ current: 3, done: false });
    });
  });
});

describe("records", () => {
  const s = (exerciseId: string, day: string, weightKg: number, reps: number) => ({ exerciseId, day, weightKg, reps });

  it("best lift per exercise: heavier, then more reps", () => {
    const best = bestLifts([
      s("squat", "2026-10-01", 20, 12),
      s("squat", "2026-10-08", 22, 8),
      s("squat", "2026-10-15", 22, 10),
      s("press", "2026-10-01", 10, 10),
      s("squat", "2026-10-20", 20, 15),
    ]);
    expect(best).toContainEqual({ exerciseId: "squat", weightKg: 22, reps: 10, day: "2026-10-15" });
    expect(best).toContainEqual({ exerciseId: "press", weightKg: 10, reps: 10, day: "2026-10-01" });
    expect(best).toHaveLength(2);
  });

  it("counts records, not baselines", () => {
    expect(
      countLiftRecords([
        s("squat", "2026-10-01", 20, 12),
        s("squat", "2026-10-08", 22, 8),
        s("squat", "2026-10-15", 22, 8),
        s("squat", "2026-10-16", 22, 9),
        s("press", "2026-10-01", 10, 10),
      ]),
    ).toBe(2);
    expect(countLiftRecords([])).toBe(0);
  });

  it("lowest average and most sessions in a week", () => {
    expect(lowestAverage([])).toBeNull();
    expect(lowestAverage([{ day: "a", avgKg: 82 }, { day: "b", avgKg: 81.2 }, { day: "c", avgKg: 81.9 }])).toEqual({ day: "b", avgKg: 81.2 });
    expect(mostSessionsInWeek([])).toBeNull();
    expect(mostSessionsInWeek([{ weekStart: "a", sessions: 3 }, { weekStart: "b", sessions: 5 }, { weekStart: "c", sessions: 4 }])).toEqual({ weekStart: "b", sessions: 5 });
  });
});

describe("Answer back", () => {
  it("is offered after a lost week or a missed day, never while one is running", () => {
    expect(answerBackOffer({ active: false, lastWeekResult: "loss", yesterday: null })).toBe("lost_week");
    expect(answerBackOffer({ active: false, lastWeekResult: "win", yesterday: { logged: false, session: "none" } })).toBe("missed_day");
    expect(answerBackOffer({ active: false, lastWeekResult: "win", yesterday: { logged: true, session: "missed" } })).toBe("missed_day");
    expect(answerBackOffer({ active: false, lastWeekResult: "win", yesterday: { logged: true, session: "done" } })).toBeNull();
    expect(answerBackOffer({ active: false, lastWeekResult: null, yesterday: null })).toBeNull();
    expect(answerBackOffer({ active: true, lastWeekResult: "loss", yesterday: null })).toBeNull();
  });

  const start = "2026-10-20";
  const ok = (d: string) => rec(d, { logged: true, planned: true, sessionDone: true });
  const restOk = (d: string) => rec(d, { logged: true });

  it("log every day and do every planned session for 3 days", () => {
    const days = [ok("2026-10-20"), restOk("2026-10-21"), ok("2026-10-22")];
    expect(answerBackProgress({ startDay: start, today: "2026-10-22", days })).toEqual({ state: "done", daysDone: 3, needed: 3, failedOn: null });
    expect(answerBackProgress({ startDay: start, today: "2026-10-21", days: days.slice(0, 2) })).toMatchObject({ state: "active", daysDone: 2 });
    // Today is not done yet: still active.
    expect(answerBackProgress({ startDay: start, today: "2026-10-21", days: [ok("2026-10-20")] })).toMatchObject({ state: "active", daysDone: 1 });
    // Not started yet.
    expect(answerBackProgress({ startDay: start, today: "2026-10-19", days: [] })).toMatchObject({ state: "active", daysDone: 0 });
  });

  it("a missed day or session fails it, and a failure costs nothing extra", () => {
    const logged = rec("2026-10-21", { logged: true, planned: true, sessionDone: false });
    expect(answerBackProgress({ startDay: start, today: "2026-10-22", days: [ok("2026-10-20"), logged] })).toEqual({
      state: "failed",
      daysDone: 1,
      needed: 3,
      failedOn: "2026-10-21",
    });
    expect(answerBackProgress({ startDay: start, today: "2026-10-22", days: [] })).toMatchObject({ state: "failed", failedOn: "2026-10-20" });
    expect(answerBackReward(0)).toBe(0);
  });

  it("half the Callus you lost comes back", () => {
    expect(callusLost(60, 45)).toBe(15);
    expect(callusLost(45, 60)).toBe(0);
    expect(answerBackReward(15)).toBe(8);
    expect(answerBackReward(12)).toBe(6);
    expect(answerBackReward(-3)).toBe(0);
  });
});

describe("trophies", () => {
  const none: TrophyInput = {
    logCount: 0,
    bestStreak: 0,
    careerDays: 0,
    weekResults: [],
    gymStartsBefore08: 0,
    answerBacksDone: 0,
    challengesDone: 0,
    startWeightKg: null,
    lowestAvg7Kg: null,
    firstWaistCm: null,
    lowestWaistCm: null,
    liftRecords: 0,
    progressPhotos: 0,
  };

  it("nothing is earned from nothing, and there are twelve", () => {
    expect(TROPHY_KEYS).toHaveLength(43);
    expect(Object.values(evaluateTrophies(none)).some(Boolean)).toBe(false);
  });

  it("each of the twelve conditions, at and just under its bar", () => {
    const t = (o: Partial<TrophyInput>) => evaluateTrophies({ ...none, ...o });
    expect(t({ logCount: 1 }).first_whistle).toBe(true);
    expect(t({ bestStreak: 6 }).seven_straight).toBe(false);
    expect(t({ bestStreak: 7 }).seven_straight).toBe(true);
    expect(t({ weekResults: ["loss", "draw", "no_ghost"] }).beat_yourself).toBe(false);
    expect(t({ weekResults: ["loss", "win"] }).beat_yourself).toBe(true);
    expect(t({ weekResults: ["win", "win", "draw", "win"] }).hat_trick).toBe(false);
    expect(t({ weekResults: ["loss", "win", "win", "win"] }).hat_trick).toBe(true);
    expect(t({ gymStartsBefore08: 9 }).early_riser).toBe(false);
    expect(t({ gymStartsBefore08: 10 }).early_riser).toBe(true);
    expect(t({ answerBacksDone: 1 }).answer_back).toBe(true);
    expect(t({ challengesDone: 4 }).challenger).toBe(false);
    expect(t({ challengesDone: 5 }).challenger).toBe(true);
    expect(t({ startWeightKg: 90, lowestAvg7Kg: 89.1 }).first_kilo).toBe(false);
    expect(t({ startWeightKg: 90, lowestAvg7Kg: 89 }).first_kilo).toBe(true);
    expect(t({ startWeightKg: 90, lowestAvg7Kg: 85.1 }).five_kilos).toBe(false);
    expect(t({ startWeightKg: 90, lowestAvg7Kg: 85 }).five_kilos).toBe(true);
    expect(t({ firstWaistCm: 100, lowestWaistCm: 95.5 }).waist_down_5).toBe(false);
    expect(t({ firstWaistCm: 100, lowestWaistCm: 95 }).waist_down_5).toBe(true);
    expect(t({ liftRecords: 9 }).ten_bests).toBe(false);
    expect(t({ liftRecords: 10 }).ten_bests).toBe(true);
    expect(t({ progressPhotos: 5 }).photo_diary).toBe(false);
    expect(t({ progressPhotos: 6 }).photo_diary).toBe(true);
  });

  it("lists only newly earned trophies", () => {
    const input = { ...none, logCount: 3, bestStreak: 8 };
    expect(newlyEarned(input, [])).toEqual(["first_whistle", "streak_3", "seven_straight"]);
    expect(newlyEarned(input, ["first_whistle"])).toEqual(["streak_3", "seven_straight"]);
    expect(newlyEarned(input, ["first_whistle", "streak_3", "seven_straight"])).toEqual([]);
  });
});

describe("the nod", () => {
  const today = "2026-10-21";
  it("needs a real event", () => {
    expect(shouldNod({ events: [], random: 0, today, lastNodDay: null })).toBe(false);
  });

  it("one in three: random under 1/3 nods", () => {
    expect(shouldNod({ events: ["record"], random: 0.33, today, lastNodDay: null })).toBe(true);
    expect(shouldNod({ events: ["record"], random: 0.34, today, lastNodDay: null })).toBe(false);
    expect(shouldNod({ events: ["lowest_average", "perfect_week"], random: 0, today, lastNodDay: null })).toBe(true);
  });

  it("never two days running", () => {
    expect(shouldNod({ events: ["record"], random: 0, today, lastNodDay: today })).toBe(false);
    expect(shouldNod({ events: ["record"], random: 0, today, lastNodDay: "2026-10-20" })).toBe(false);
    expect(shouldNod({ events: ["record"], random: 0, today, lastNodDay: "2026-10-19" })).toBe(true);
  });
});
