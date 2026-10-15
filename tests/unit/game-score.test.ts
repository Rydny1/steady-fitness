import { describe, expect, it } from "vitest";
import {
  applyDivision,
  clampCallus,
  computeRings,
  daysToNextDivision,
  divisionIndex,
  divisionMark,
  formFor,
  formLineIndex,
  nextDivision,
  nextDivisionBar,
  nextMilestone,
  pointsForDay,
  previewDay,
  previousDivision,
  scoreDay,
  sessionStatus,
  stepStreak,
  streakFromFlags,
  weeklyPoints,
  type DayScoreInput,
} from "@/features/game";

const base: DayScoreInput = {
  logged: true,
  loggedOnDay: true,
  session: "done",
  eatenKcal: 1900,
  budgetKcal: 2000,
  bmrKcal: 1830,
  proteinG: 150,
  proteinTargetG: 156,
  habitsDone: 5,
  sick: false,
  prev: {
    callus: 50,
    division: "starting_line",
    careerDays: 0,
    streak: 0,
    bestStreak: 0,
    offFormDays: 0,
  },
};

function day(over: Partial<DayScoreInput> = {}, prev: Partial<DayScoreInput["prev"]> = {}): DayScoreInput {
  return { ...base, ...over, prev: { ...base.prev, ...prev } };
}

describe("Callus daily points (PRODUCT.md table)", () => {
  it("a perfect day: +4 +3 +2 +1 +1 = 11", () => {
    const s = scoreDay(day());
    expect(s.breakdown).toEqual({
      logged: 4,
      notLogged: 0,
      session: 3,
      fuel: 2,
      overBudget: 0,
      protein: 1,
      habits: 1,
      freeze: 0,
      weekly: 0,
    });
    expect(s.points).toBe(11);
    expect(s.callus).toBe(61);
    expect(s.form.name).toBe("Finding form");
    expect(s.streak).toBe(1);
    expect(s.careerDays).toBe(1);
    expect(s.counted).toBe(true);
  });

  it("day not logged costs 12 and resets the streak, and a missed session adds nothing", () => {
    const s = scoreDay(
      day({ logged: false, loggedOnDay: false, session: "missed" }, { streak: 9, bestStreak: 12 }),
    );
    expect(s.points).toBe(-12);
    expect(s.breakdown.notLogged).toBe(-12);
    expect(s.breakdown.session).toBe(0);
    expect(s.callus).toBe(38);
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(12);
  });

  it("a log only created later does not count (no back-filling)", () => {
    const s = scoreDay(day({ logged: true, loggedOnDay: false }));
    expect(s.counted).toBe(false);
    expect(s.points).toBe(-12);
    expect(s.streak).toBe(0);
  });

  it("planned session missed on a logged day is -4", () => {
    const s = scoreDay(day({ session: "missed" }));
    expect(s.breakdown.session).toBe(-4);
    expect(s.points).toBe(4 - 4 + 2 + 1 + 1);
  });

  it("a logged rest day or an unplanned day is never punished", () => {
    expect(scoreDay(day({ session: "rest" })).breakdown.session).toBe(0);
    expect(scoreDay(day({ session: "none" })).breakdown.session).toBe(0);
  });

  it("fuel point: at or under budget +5 percent and at or above BMR", () => {
    const f = (eaten: number) => pointsForDay(day({ eatenKcal: eaten })).breakdown.fuel;
    expect(f(1830)).toBe(2); // exactly BMR
    expect(f(1829)).toBe(0); // under the floor
    expect(f(2100)).toBe(2); // exactly budget * 1.05
    expect(f(2101)).toBe(0);
  });

  it("over budget by 15 percent or more costs 2", () => {
    const o = (eaten: number) => pointsForDay(day({ eatenKcal: eaten })).breakdown.overBudget;
    expect(o(2299)).toBe(0);
    expect(o(2300)).toBe(-2);
    expect(o(3000)).toBe(-2);
  });

  it("protein at 90 percent or more of target is +1", () => {
    const p = (g: number) => pointsForDay(day({ proteinG: g })).breakdown.protein;
    expect(p(140.4)).toBe(1);
    expect(p(140)).toBe(0);
    expect(pointsForDay(day({ proteinTargetG: 0 })).breakdown.protein).toBe(0);
  });

  it("all five promises is +1, four is nothing", () => {
    expect(pointsForDay(day({ habitsDone: 5 })).breakdown.habits).toBe(1);
    expect(pointsForDay(day({ habitsDone: 4 })).breakdown.habits).toBe(0);
  });

  it("week result and challenge reward feed in as weekly points", () => {
    expect(weeklyPoints("win", false)).toBe(5);
    expect(weeklyPoints("loss", false)).toBe(-3);
    expect(weeklyPoints("draw", false)).toBe(0);
    expect(weeklyPoints("none", false)).toBe(0);
    expect(weeklyPoints("win", true)).toBe(11);
    const s = scoreDay(day({ weeklyPoints: 11 }));
    expect(s.breakdown.weekly).toBe(11);
    expect(s.points).toBe(22);
    expect(s.callus).toBe(72);
  });
});

describe("Callus clamping", () => {
  it("clamps at 0", () => {
    const s = scoreDay(day({ logged: false, loggedOnDay: false }, { callus: 5 }));
    expect(s.callus).toBe(0);
    expect(s.form.name).toBe("Off form");
  });

  it("clamps at 100", () => {
    const s = scoreDay(day({}, { callus: 97 }));
    expect(s.callus).toBe(100);
    expect(s.form.name).toBe("Peak form");
  });

  it("clampCallus rounds and bounds", () => {
    expect(clampCallus(-5)).toBe(0);
    expect(clampCallus(104)).toBe(100);
    expect(clampCallus(49.6)).toBe(50);
  });
});

describe("sick day", () => {
  it("pauses the streak, changes nothing in Callus, career days or division", () => {
    const s = scoreDay(
      day(
        { sick: true, logged: false, loggedOnDay: false },
        { streak: 8, bestStreak: 10, callus: 44, careerDays: 20, division: "showing_up", offFormDays: 2 },
      ),
    );
    expect(s.sick).toBe(true);
    expect(s.points).toBe(0);
    expect(s.callus).toBe(44);
    expect(s.streak).toBe(8);
    expect(s.bestStreak).toBe(10);
    expect(s.careerDays).toBe(20);
    expect(s.division).toBe("showing_up");
    expect(s.offFormDays).toBe(2);
    expect(s.promoted || s.dropped).toBe(false);
    expect(pointsForDay(day({ sick: true })).points).toBe(0);
  });
});

describe("streak", () => {
  it("counts consecutive logged days and tracks the best", () => {
    const a = stepStreak({ streak: 3, bestStreak: 5 }, { loggedOnDay: true, sick: false });
    expect(a).toMatchObject({ streak: 4, bestStreak: 5, milestonesHit: [] });
    const b = stepStreak({ streak: 5, bestStreak: 5 }, { loggedOnDay: true, sick: false });
    expect(b).toMatchObject({ streak: 6, bestStreak: 6 });
  });

  it("hits every milestone exactly once", () => {
    for (const m of [7, 14, 30, 50, 100, 200, 365]) {
      const r = stepStreak({ streak: m - 1, bestStreak: m - 1 }, { loggedOnDay: true, sick: false });
      expect(r.milestonesHit).toEqual([m]);
      const after = stepStreak({ streak: m, bestStreak: m }, { loggedOnDay: true, sick: false });
      expect(after.milestonesHit).toEqual([]);
    }
  });

  it("a miss resets to zero and flags the break, sick pauses", () => {
    expect(stepStreak({ streak: 9, bestStreak: 9 }, { loggedOnDay: false, sick: false })).toEqual({
      streak: 0,
      bestStreak: 9,
      milestonesHit: [],
      broken: true,
    });
    expect(stepStreak({ streak: 0, bestStreak: 9 }, { loggedOnDay: false, sick: false }).broken).toBe(false);
    expect(stepStreak({ streak: 9, bestStreak: 9 }, { loggedOnDay: false, sick: true })).toEqual({
      streak: 9,
      bestStreak: 9,
      milestonesHit: [],
      broken: false,
    });
  });

  it("helpers", () => {
    expect(nextMilestone(0)).toBe(7);
    expect(nextMilestone(7)).toBe(14);
    expect(nextMilestone(365)).toBeNull();
    expect(streakFromFlags([true, false, true, true])).toBe(2);
    expect(streakFromFlags([])).toBe(0);
    expect(streakFromFlags([false])).toBe(0);
  });

  it("scoreDay reports the milestone", () => {
    const s = scoreDay(day({}, { streak: 6, bestStreak: 6 }));
    expect(s.milestonesHit).toEqual([7]);
    expect(s.bestStreak).toBe(7);
  });
});

describe("form bands", () => {
  it("covers the boundaries", () => {
    expect(formFor(0).name).toBe("Off form");
    expect(formFor(34).name).toBe("Off form");
    expect(formFor(35).name).toBe("Finding form");
    expect(formFor(64).name).toBe("Finding form");
    expect(formFor(65).name).toBe("In form");
    expect(formFor(89).name).toBe("In form");
    expect(formFor(90).name).toBe("Peak form");
    expect(formFor(100).name).toBe("Peak form");
    expect(formFor(-4).key).toBe("off_form");
    expect(formFor(140).key).toBe("peak_form");
  });

  it("rotates Coach lines by day", () => {
    expect(formLineIndex(3, 0)).toBe(0);
    expect(formLineIndex(3, 4)).toBe(1);
    expect(formLineIndex(3, -1)).toBe(2);
    expect(formLineIndex(0, 5)).toBe(0);
  });
});

describe("divisions", () => {
  it("promotes when career days reach the mark and Callus clears the bar", () => {
    const r = applyDivision({ division: "starting_line", careerDays: 10, offFormDays: 0 }, 50);
    expect(r).toMatchObject({ division: "showing_up", promoted: true, dropped: false, from: "starting_line", careerDays: 10 });
  });

  it("does not promote under the Callus bar or before the mark", () => {
    expect(applyDivision({ division: "starting_line", careerDays: 10, offFormDays: 0 }, 49).promoted).toBe(false);
    expect(applyDivision({ division: "starting_line", careerDays: 9, offFormDays: 0 }, 90).promoted).toBe(false);
  });

  it("uses the higher bars further up", () => {
    expect(applyDivision({ division: "strong", careerDays: 150, offFormDays: 0 }, 69).promoted).toBe(false);
    expect(applyDivision({ division: "strong", careerDays: 150, offFormDays: 0 }, 70).division).toBe("disciplined");
    expect(applyDivision({ division: "disciplined", careerDays: 220, offFormDays: 0 }, 74).promoted).toBe(false);
    expect(applyDivision({ division: "disciplined", careerDays: 220, offFormDays: 0 }, 75).division).toBe("proven");
    expect(applyDivision({ division: "proven", careerDays: 365, offFormDays: 0 }, 79).promoted).toBe(false);
    expect(applyDivision({ division: "proven", careerDays: 365, offFormDays: 0 }, 80).division).toBe("one_year");
  });

  it("promotes one step a day at most", () => {
    const r = applyDivision({ division: "showing_up", careerDays: 100, offFormDays: 0 }, 70);
    expect(r.division).toBe("building");
    const r2 = applyDivision({ division: r.division, careerDays: r.careerDays, offFormDays: 0 }, 70);
    expect(r2.division).toBe("consistent");
    expect(r2.from).toBe("building");
  });

  it("no promotion past the top", () => {
    const r = applyDivision({ division: "one_year", careerDays: 900, offFormDays: 0 }, 100);
    expect(r.promoted).toBe(false);
    expect(r.division).toBe("one_year");
  });

  it("off form 3 days running drops one division and resets career days to its mark", () => {
    const two = applyDivision({ division: "building", careerDays: 30, offFormDays: 1 }, 20);
    expect(two).toMatchObject({ dropped: false, offFormDays: 2, division: "building" });
    const three = applyDivision({ division: "building", careerDays: 30, offFormDays: 2 }, 20);
    expect(three).toMatchObject({ dropped: true, division: "showing_up", careerDays: 10, offFormDays: 0, from: "building" });
  });

  it("a good day resets the off-form counter", () => {
    expect(applyDivision({ division: "building", careerDays: 30, offFormDays: 2 }, 40).offFormDays).toBe(0);
    expect(applyDivision({ division: "building", careerDays: 30, offFormDays: 1 }, 34).offFormDays).toBe(2);
  });

  it("nothing to drop at Sunday League, the counter keeps running", () => {
    const r = applyDivision({ division: "starting_line", careerDays: 4, offFormDays: 5 }, 10);
    expect(r).toMatchObject({ dropped: false, division: "starting_line", careerDays: 4, offFormDays: 6 });
  });

  it("promotion and drop on the same day: the drop wins, promotion never fires with Callus under 30", () => {
    const r = applyDivision({ division: "showing_up", careerDays: 21, offFormDays: 2 }, 10);
    expect(r.dropped).toBe(true);
    expect(r.promoted).toBe(false);
    expect(r.division).toBe("starting_line");
    expect(r.careerDays).toBe(0);
  });

  it("scoreDay drives a drop end to end", () => {
    const s = scoreDay(
      day(
        { logged: false, loggedOnDay: false },
        { callus: 30, division: "building", careerDays: 30, offFormDays: 2 },
      ),
    );
    expect(s.callus).toBe(18);
    expect(s.dropped).toBe(true);
    expect(s.division).toBe("showing_up");
    expect(s.careerDays).toBe(10);
    expect(s.previousDivision).toBe("building");
  });

  it("scoreDay drives a promotion end to end, and a sub-bar day holds back", () => {
    const up = scoreDay(day({}, { callus: 55, careerDays: 9 }));
    expect(up.callus).toBe(66);
    expect(up.careerDays).toBe(10);
    expect(up.promoted).toBe(true);
    expect(up.division).toBe("showing_up");
    const held = scoreDay(day({ eatenKcal: 1700, proteinG: 0, habitsDone: 0 }, { callus: 30, careerDays: 9 }));
    expect(held.callus).toBeLessThan(50);
    expect(held.promoted).toBe(false);
  });

  it("helpers", () => {
    expect(divisionIndex("starting_line")).toBe(0);
    expect(divisionIndex("one_year")).toBe(7);
    expect(divisionMark("disciplined")).toBe(150);
    expect(nextDivision("showing_up")).toBe("building");
    expect(nextDivision("one_year")).toBeNull();
    expect(previousDivision("showing_up")).toBe("starting_line");
    expect(previousDivision("starting_line")).toBeNull();
    expect(daysToNextDivision({ division: "showing_up", careerDays: 10 })).toBe(20);
    expect(daysToNextDivision({ division: "showing_up", careerDays: 40 })).toBe(0);
    expect(daysToNextDivision({ division: "one_year", careerDays: 400 })).toBeNull();
    expect(nextDivisionBar("strong")).toBe(70);
    expect(nextDivisionBar("one_year")).toBeNull();
  });
});

describe("live preview", () => {
  it("shows 0 for an unlogged day instead of -12, and a pending session as nothing", () => {
    expect(previewDay(day({ logged: false, loggedOnDay: false })).points).toBe(0);
    const p = previewDay(day({ session: "missed" }));
    expect(p.breakdown.session).toBe(0);
    expect(p.points).toBe(4 + 2 + 1 + 1);
    expect(previewDay(day()).points).toBe(11);
  });
});

describe("rings", () => {
  const ring = (o: Partial<Parameters<typeof computeRings>[0]> = {}) =>
    computeRings({
      eatenKcal: 1900,
      budgetKcal: 2000,
      bmrKcal: 1830,
      proteinG: 156,
      proteinTargetG: 156,
      plannedSession: "gym_a",
      sessionDone: true,
      stretchMinutes: 0,
      dayEnded: true,
      sick: false,
      ...o,
    });

  it("closes Fuel at day end within budget and above the floor", () => {
    expect(ring().fuel).toMatchObject({ inRange: true, closed: true, over: false, overflow: 0 });
    expect(ring({ dayEnded: false }).fuel).toMatchObject({ inRange: true, closed: false });
    expect(ring({ eatenKcal: 1700 }).fuel).toMatchObject({ inRange: false, closed: false });
  });

  it("going over shows the ring past full", () => {
    const f = ring({ eatenKcal: 2400 }).fuel;
    expect(f.over).toBe(true);
    expect(f.closed).toBe(false);
    expect(f.progress).toBeCloseTo(1.2, 5);
    expect(f.overflow).toBeCloseTo(0.2, 5);
  });

  it("Protein closes at 100 percent and can pass it", () => {
    expect(ring({ proteinG: 155 }).protein.closed).toBe(false);
    const p = ring({ proteinG: 187.2 }).protein;
    expect(p.closed).toBe(true);
    expect(p.overflow).toBeCloseTo(0.2, 5);
    expect(ring({ proteinTargetG: 0 }).protein).toMatchObject({ closed: false, progress: 0 });
  });

  it("Train closes when the planned session is done", () => {
    expect(ring().train).toMatchObject({ closed: true, restDay: false, progress: 1 });
    expect(ring({ sessionDone: false }).train).toMatchObject({ closed: false, progress: 0 });
  });

  it("rest day: a 10 minute stretch closes Train", () => {
    const rest = (min: number) =>
      ring({ plannedSession: "rest", sessionDone: false, stretchMinutes: min }).train;
    expect(rest(10)).toMatchObject({ closed: true, restDay: true, progress: 1 });
    expect(rest(9).closed).toBe(false);
    expect(rest(5).progress).toBeCloseTo(0.5, 5);
    expect(ring({ plannedSession: null, sessionDone: false, stretchMinutes: 12 }).train.closed).toBe(true);
    expect(ring({ plannedSession: "stretch", sessionDone: true, stretchMinutes: 0 }).train.closed).toBe(true);
  });

  it("sick day hides the rings", () => {
    expect(ring({ sick: true }).hidden).toBe(true);
    expect(ring().hidden).toBe(false);
  });

  it("zero budget does not divide by zero", () => {
    expect(ring({ budgetKcal: 0, eatenKcal: 0, bmrKcal: 0 }).fuel.progress).toBe(0);
  });

  it("session status for the ledger", () => {
    expect(sessionStatus("gym_a", true, true)).toBe("done");
    expect(sessionStatus("gym_a", false, true)).toBe("missed");
    expect(sessionStatus("gym_a", false, false)).toBe("none");
    expect(sessionStatus("rest", false, true)).toBe("rest");
    expect(sessionStatus(null, false, true)).toBe("rest");
    expect(sessionStatus("stretch", true, true)).toBe("rest");
  });
});

describe("Callus gets harder as it climbs, and a freeze keeps the streak", () => {
  it("the same perfect day earns less near the top", () => {
    const low = scoreDay(day({}, { callus: 50 })).points;
    const high = scoreDay(day({}, { callus: 90 })).points;
    expect(low).toBe(11);
    expect(high).toBeLessThan(low);
    expect(high).toBeGreaterThanOrEqual(5);
  });
  it("a frozen, unlogged day costs 8 Callus, keeps the streak and counts as a day", () => {
    const s = scoreDay(day({ logged: false, loggedOnDay: false, frozen: true }, { callus: 60, streak: 12, careerDays: 20 }));
    expect(s.points).toBe(-8);
    expect(s.callus).toBe(52);
    expect(s.streak).toBe(12);
    expect(s.counted).toBe(false);
  });
  it("an unfrozen miss still breaks the streak", () => {
    const s = scoreDay(day({ logged: false, loggedOnDay: false }, { callus: 60, streak: 12 }));
    expect(s.streak).toBe(0);
    expect(s.points).toBe(-12);
  });
  it("a freeze costs nothing if you end up logging", () => {
    const s = scoreDay(day({ frozen: true }, { callus: 60, streak: 12 }));
    expect(s.points).toBeGreaterThan(0);
    expect(s.streak).toBe(13);
  });
  it("the all-promises point needs all of them, whatever the count", () => {
    expect(pointsForDay(day({ habitsDone: 3, habitsTotal: 3 })).breakdown.habits).toBe(1);
    expect(pointsForDay(day({ habitsDone: 2, habitsTotal: 3 })).breakdown.habits).toBe(0);
    expect(pointsForDay(day({ habitsDone: 0, habitsTotal: 0 })).breakdown.habits).toBe(0);
  });
});
