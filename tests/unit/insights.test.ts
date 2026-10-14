import { describe, expect, it } from "vitest";
import {
  computeFacts,
  pickFact,
  renderTemplate,
  type Fact,
  type FactDay,
  type FactInput,
} from "@/features/insights/facts";
import { checkGrounding, groundingProblems, groundWeekly, type FactValues } from "@/features/insights/grounding";
import { bestSet, isBetterSet, isNewBest, nextProgression } from "@/features/training/progression";
import { addDays } from "@/lib/dates";

const TODAY = "2026-10-21"; // Wednesday

function fday(day: string, o: Partial<FactDay> = {}): FactDay {
  return {
    day,
    logged: true,
    eatenKcal: 1900,
    budgetKcal: 2000,
    proteinG: 140,
    proteinTargetG: 156,
    plannedSession: "rest",
    sessionStatus: "rest",
    sleepHours: null,
    ...o,
  };
}

function input(o: Partial<FactInput> = {}): FactInput {
  return {
    today: TODAY,
    nowHour: 12,
    justLogged: false,
    justLoggedFood: false,
    todayStats: {
      eatenKcal: 1000,
      budgetKcal: 2000,
      proteinG: 100,
      proteinTargetG: 156,
      plannedSession: "rest",
      plannedSessionName: null,
      sessionDone: false,
    },
    history: [],
    weights: [],
    newBests: [],
    losingRound: null,
    ...o,
  };
}

const ids = (f: Fact[]) => f.map((x) => x.id);
const get = (f: Fact[], id: string) => f.find((x) => x.id === id);

describe("fact engine", () => {
  it("returns nothing when nothing is true", () => {
    expect(computeFacts(input())).toEqual([]);
  });

  it("protein gap: after 18:00 with protein under 70 percent", () => {
    const t = { ...input().todayStats, proteinG: 100 }; // 64 percent
    const f = computeFacts(input({ nowHour: 18.5, todayStats: t }));
    expect(get(f, "protein_gap")?.values).toEqual({ gap: 56, hours: 5 });
    expect(renderTemplate(get(f, "protein_gap") as Fact)).toBe("56 g protein short and 5 hours left.");
    expect(ids(computeFacts(input({ nowHour: 17.9, todayStats: t })))).not.toContain("protein_gap");
    expect(ids(computeFacts(input({ nowHour: 19, todayStats: { ...t, proteinG: 110 } })))).not.toContain("protein_gap"); // 70.5 percent
    expect(ids(computeFacts(input({ nowHour: 23.5, todayStats: t })))).not.toContain("protein_gap"); // under an hour left
  });

  it("budget left: after a food log only", () => {
    const f = computeFacts(input({ justLoggedFood: true, justLogged: true }));
    expect(renderTemplate(get(f, "budget_left") as Fact)).toBe("1,000 kcal left today.");
    expect(ids(computeFacts(input({ justLogged: true })))).not.toContain("budget_left");
    const empty = { ...input().todayStats, eatenKcal: 0 };
    expect(ids(computeFacts(input({ justLoggedFood: true, todayStats: empty })))).not.toContain("budget_left");
    const over = { ...input().todayStats, eatenKcal: 2100 };
    expect(ids(computeFacts(input({ justLoggedFood: true, todayStats: over })))).not.toContain("budget_left");
  });

  it("over budget: 15 percent or more over", () => {
    const at = (eaten: number) => computeFacts(input({ todayStats: { ...input().todayStats, eatenKcal: eaten } }));
    expect(ids(at(2299))).not.toContain("over_budget");
    expect(renderTemplate(get(at(2400), "over_budget") as Fact)).toBe("400 kcal over. Tomorrow's breakfast fixes half of it.");
  });

  it("session pending: planned session not done by 19:00", () => {
    const t = { ...input().todayStats, plannedSession: "gym_a" as const, plannedSessionName: "Legs" };
    const f = computeFacts(input({ nowHour: 19.2, todayStats: t }));
    expect(renderTemplate(get(f, "session_pending") as Fact)).toBe("Legs not done. 4 hours left.");
    expect(ids(computeFacts(input({ nowHour: 18.9, todayStats: t })))).not.toContain("session_pending");
    expect(ids(computeFacts(input({ nowHour: 20, todayStats: { ...t, sessionDone: true } })))).not.toContain("session_pending");
    expect(ids(computeFacts(input({ nowHour: 20, todayStats: { ...t, plannedSession: "rest" } })))).not.toContain("session_pending");
    expect(ids(computeFacts(input({ nowHour: 20, todayStats: { ...t, plannedSession: "stretch" } })))).not.toContain("session_pending");
    expect(ids(computeFacts(input({ nowHour: 20, todayStats: { ...t, plannedSession: null } })))).not.toContain("session_pending");
    expect(ids(computeFacts(input({ nowHour: 20, todayStats: { ...t, plannedSessionName: null } })))).not.toContain("session_pending");
  });

  it("same-day compare: best protein for this weekday in n weeks", () => {
    const history = [7, 14, 21].map((k) => fday(addDays(TODAY, -k), { proteinG: 120 + k }));
    const t = { ...input().todayStats, proteinG: 150 };
    const f = computeFacts(input({ justLogged: true, todayStats: t, history }));
    expect(renderTemplate(get(f, "same_day_best") as Fact)).toBe("Best Wednesday for protein in 3 weeks.");
    // Beaten by an earlier Wednesday.
    const beaten = [...history, fday(addDays(TODAY, -28), { proteinG: 160 })];
    expect(ids(computeFacts(input({ justLogged: true, todayStats: t, history: beaten })))).not.toContain("same_day_best");
    // Not enough weeks, no log, or no protein.
    expect(ids(computeFacts(input({ justLogged: true, todayStats: t, history: history.slice(0, 2) })))).not.toContain("same_day_best");
    expect(ids(computeFacts(input({ todayStats: t, history })))).not.toContain("same_day_best");
    expect(ids(computeFacts(input({ justLogged: true, history })))).not.toContain("same_day_best");
    // Other weekdays and old weeks do not count.
    const other = [1, 2, 3].map((k) => fday(addDays(TODAY, -k), { proteinG: 10 }));
    expect(ids(computeFacts(input({ justLogged: true, todayStats: t, history: other })))).not.toContain("same_day_best");
    const old = [70, 77, 84].map((k) => fday(addDays(TODAY, -k), { proteinG: 10 }));
    expect(ids(computeFacts(input({ justLogged: true, todayStats: t, history: old })))).not.toContain("same_day_best");
  });

  it("weak weekday: missed or over on 3 of the last 4", () => {
    const week = (k: number, o: Partial<FactDay>) => fday(addDays(TODAY, -7 * k), o);
    const miss = { logged: false };
    const hist = [week(1, miss), week(2, { sessionStatus: "missed" }), week(3, { eatenKcal: 2400 }), week(4, {})];
    const f = computeFacts(input({ history: hist }));
    expect(renderTemplate(get(f, "weak_weekday") as Fact)).toBe("You miss Wednesdays. 3 of the last 4.");
    const four = [week(1, miss), week(2, miss), week(3, miss), week(4, miss)];
    expect(renderTemplate(get(computeFacts(input({ history: four })), "weak_weekday") as Fact)).toBe("You miss Wednesdays. 4 of the last 4.");
    const two = [week(1, miss), week(2, miss), week(3, {}), week(4, {})];
    expect(ids(computeFacts(input({ history: two })))).not.toContain("weak_weekday");
    // Not enough history: no fact, no guessing.
    expect(ids(computeFacts(input({ history: hist.slice(0, 3) })))).not.toContain("weak_weekday");
  });

  it("protein by day type: 40 point gap between gym and football days", () => {
    const gymHit = [1, 2, 3].map((k) => fday(addDays(TODAY, -k * 2), { plannedSession: "gym_a", proteinG: 160 }));
    const fbMiss = [3, 5, 7].map((k) => fday(addDays(TODAY, -k * 2 - 1), { plannedSession: "football", proteinG: 100 }));
    const f = computeFacts(input({ history: [...gymHit, ...fbMiss] }));
    const fact = get(f, "protein_by_day_type") as Fact;
    expect(renderTemplate(fact)).toBe("Protein hit on gym days, missed on football days.");
    expect(fact.values).toEqual({ gymPct: 100, footballPct: 0 });
    const flipped = [
      ...[1, 2, 3].map((k) => fday(addDays(TODAY, -k * 2), { plannedSession: "gym_b", proteinG: 100 })),
      ...[3, 5, 7].map((k) => fday(addDays(TODAY, -k * 2 - 1), { plannedSession: "football", proteinG: 160 })),
    ];
    expect(renderTemplate(get(computeFacts(input({ history: flipped })), "protein_by_day_type") as Fact)).toBe(
      "Protein hit on football days, missed on gym days.",
    );
    // Gap under 40 points, or too few days of one type.
    const close = [
      ...gymHit,
      fday(addDays(TODAY, -1), { plannedSession: "football", proteinG: 160 }),
      fday(addDays(TODAY, -3), { plannedSession: "football", proteinG: 160 }),
      fday(addDays(TODAY, -5), { plannedSession: "football", proteinG: 100 }),
    ];
    expect(ids(computeFacts(input({ history: close })))).not.toContain("protein_by_day_type");
    expect(ids(computeFacts(input({ history: [...gymHit, ...fbMiss.slice(0, 2)] })))).not.toContain("protein_by_day_type");
  });

  it("sleep and food: 250 kcal more after short sleep", () => {
    const hist: FactDay[] = [];
    // short-sleep nights on days -10, -8, -6, followed by big days
    for (const k of [10, 8, 6]) {
      hist.push(fday(addDays(TODAY, -k), { sleepHours: 5.5 }));
      hist.push(fday(addDays(TODAY, -k + 1), { eatenKcal: 2400 }));
    }
    for (const k of [20, 18, 16]) {
      hist.push(fday(addDays(TODAY, -k), { sleepHours: 7.5 }));
      hist.push(fday(addDays(TODAY, -k + 1), { eatenKcal: 2000 }));
    }
    const fact = get(computeFacts(input({ history: hist })), "sleep_food") as Fact;
    expect(renderTemplate(fact)).toBe("Short sleep, 400 kcal more the next day.");
    // Same data with a small gap, a day not logged, and a missing next day.
    const small = hist.map((d) => (d.eatenKcal === 2400 ? { ...d, eatenKcal: 2200 } : d));
    expect(ids(computeFacts(input({ history: small })))).not.toContain("sleep_food");
    const unlogged = hist.map((d) => (d.eatenKcal === 2400 ? { ...d, logged: false } : d));
    expect(ids(computeFacts(input({ history: unlogged })))).not.toContain("sleep_food");
    const old = hist.map((d) => ({ ...d, day: addDays(d.day, -60) }));
    expect(ids(computeFacts(input({ history: old })))).not.toContain("sleep_food");
  });

  it("weigh-in gap: 7 days or more", () => {
    const w = (day: string) => [{ day, kg: 85 }];
    expect(renderTemplate(get(computeFacts(input({ weights: w("2026-10-14") })), "weigh_in_gap") as Fact)).toBe("No weigh-in for 7 days.");
    expect(ids(computeFacts(input({ weights: w("2026-10-15") })))).not.toContain("weigh_in_gap");
    expect(ids(computeFacts(input({ weights: [] })))).not.toContain("weigh_in_gap");
    const many = [{ day: "2026-09-01", kg: 90 }, { day: "2026-10-10", kg: 85 }, { day: "2026-10-05", kg: 86 }];
    expect(get(computeFacts(input({ weights: many })), "weigh_in_gap")?.values).toEqual({ n: 11 });
  });

  it("stalled trend: flat within 0.2 kg for 14 days", () => {
    const flat = Array.from({ length: 21 }, (_, i) => ({ day: addDays(TODAY, -20 + i), kg: 85 + (i % 2 ? 0.05 : -0.05) }));
    const f = computeFacts(input({ weights: flat }));
    expect(renderTemplate(get(f, "stalled_trend") as Fact)).toBe("Weight flat 2 weeks. Cut 150 kcal or add a walk.");
    const falling = Array.from({ length: 21 }, (_, i) => ({ day: addDays(TODAY, -20 + i), kg: 90 - i * 0.2 }));
    expect(ids(computeFacts(input({ weights: falling })))).not.toContain("stalled_trend");
    // Sparse data does not count.
    expect(ids(computeFacts(input({ weights: flat.slice(-4) })))).not.toContain("stalled_trend");
    // Data that stopped a week ago does not count either.
    expect(ids(computeFacts(input({ weights: flat.slice(0, 12) })))).not.toContain("stalled_trend");
    // Data that starts late in the window does not count.
    const late = Array.from({ length: 9 }, (_, i) => ({ day: addDays(TODAY, -8 + i), kg: 85 }));
    expect(ids(computeFacts(input({ weights: late })))).not.toContain("stalled_trend");
  });

  it("new low: lowest 7-day average yet, on a weigh-in day", () => {
    const fall = Array.from({ length: 12 }, (_, i) => ({ day: addDays(TODAY, -11 + i), kg: 84 - i * 0.2 }));
    const f = computeFacts(input({ weights: fall }));
    const fact = get(f, "new_low") as Fact;
    expect(fact.kind).toBe("record");
    expect(renderTemplate(fact)).toMatch(/^\d{2}(\.\d)? kg\. Lowest average yet\.$/);
    // No weigh-in today, or the average went up, or too little history.
    expect(ids(computeFacts(input({ weights: fall.slice(0, 11) })))).not.toContain("new_low");
    const up = [...fall.slice(0, 11), { day: TODAY, kg: 90 }];
    expect(ids(computeFacts(input({ weights: up })))).not.toContain("new_low");
    expect(ids(computeFacts(input({ weights: fall.slice(-5) })))).not.toContain("new_low");
  });

  it("new best lift and losing round come from the inputs", () => {
    const f = computeFacts(
      input({
        newBests: [{ exerciseId: "goblet_squat", exercise: "Goblet squat", weightKg: 22.5, reps: 10 }],
        losingRound: { round: "Days logged", n: 2 },
      }),
    );
    const best = get(f, "new_best:goblet_squat") as Fact;
    expect(renderTemplate(best)).toBe("Goblet squat: 22.5 kg x 10. New best.");
    expect(best.kind).toBe("record");
    expect(renderTemplate(get(f, "losing_round") as Fact)).toBe("Days logged is the only round you're losing. 2 good days flip it.");
  });
});

describe("pickFact", () => {
  const f = (id: string, priority: number, extra: Partial<Fact> = {}): Fact => ({
    id,
    priority,
    template: "{x}",
    values: { x: 1 },
    kind: "live",
    ...extra,
  });

  it("takes the top priority", () => {
    expect(pickFact([f("a", 10), f("b", 50), f("c", 30)], [], 12)?.id).toBe("b");
  });

  it("skips facts shown in the last 3 days", () => {
    expect(pickFact([f("a", 10), f("b", 50), f("c", 30)], ["b"], 12)?.id).toBe("c");
    expect(pickFact([f("a", 10)], ["a"], 12)).toBeNull();
    expect(pickFact([], [], 12)).toBeNull();
  });

  it("honours the time window and breaks ties by id", () => {
    expect(pickFact([f("late", 90, { fromHour: 18 }), f("a", 10)], [], 12)?.id).toBe("a");
    expect(pickFact([f("late", 90, { fromHour: 18 }), f("a", 10)], [], 18)?.id).toBe("late");
    expect(pickFact([f("b", 10), f("a", 10)], [], 12)?.id).toBe("a");
  });
});

describe("renderTemplate", () => {
  it("fills placeholders with plain numbers", () => {
    expect(renderTemplate({ template: "{a} and {b} and {c} and {d}", values: { a: 1200, b: 81.25, c: "Sunday", d: 3 } })).toBe(
      "1,200 and 81.25 and Sunday and 3",
    );
    expect(renderTemplate({ template: "{missing}.", values: {} })).toBe(".");
  });
});

describe("grounding check", () => {
  const values = { gap: 56, hours: 5, kcal: 2780, kg: 81.2, weekday: "Sunday", date: "2026-10-14" };

  it("accepts a line that uses only numbers from the values", () => {
    expect(checkGrounding("56 g protein short and 5 hours left.", values)).toBe(true);
    expect(checkGrounding("Your real burn is 2,780 kcal.", values)).toBe(true);
    expect(checkGrounding("2780 kcal", values)).toBe(true);
    expect(checkGrounding("81.2 kg. Lowest average yet.", values)).toBe(true);
    expect(checkGrounding("Nothing numeric here, just a nod.", values)).toBe(true);
  });

  it("rejects invented numbers", () => {
    expect(checkGrounding("57 g protein short and 5 hours left.", values)).toBe(false);
    expect(checkGrounding("56 g short and 6 hours left.", values)).toBe(false);
    expect(checkGrounding("81.3 kg.", values)).toBe(false);
    expect(checkGrounding("81 kg.", values)).toBe(false);
    expect(checkGrounding("Down 3 kg this month.", values)).toBe(false);
    expect(checkGrounding("That is 12% better.", values)).toBe(false);
    expect(checkGrounding("2,781 kcal", values)).toBe(false);
    expect(checkGrounding("1st place", values)).toBe(false);
    expect(groundingProblems("57 g and 99 kg", values)).toEqual(["number 57", "number 99"]);
  });

  it("rejects spelled-out invented numbers but not the pronoun one or the verb may", () => {
    expect(checkGrounding("Five hours left.", values)).toBe(true);
    expect(checkGrounding("Seven hours left.", values)).toBe(false);
    expect(checkGrounding("Thirty kg gone.", values)).toBe(false);
    expect(checkGrounding("One more push. It may help.", values)).toBe(true);
  });

  it("dates: only dates in the values, in any format", () => {
    expect(checkGrounding("Back on 2026-10-14.", values)).toBe(true);
    expect(checkGrounding("Back on 14 Oct.", values)).toBe(true);
    expect(checkGrounding("Back on October 14.", values)).toBe(true);
    expect(checkGrounding("Back on 14th October 2026.", values)).toBe(true);
    expect(checkGrounding("Back on 15 Oct.", values)).toBe(false);
    expect(checkGrounding("Back on 2026-10-15.", values)).toBe(false);
    expect(checkGrounding("Back on 14 November.", values)).toBe(false);
    expect(checkGrounding("Back on 14 Oct 2025.", values)).toBe(false);
    expect(checkGrounding("Back on Sept 3.", values)).toBe(false);
    expect(checkGrounding("The 14 is not a date.", values)).toBe(false);
  });

  it("textual dates in values are understood", () => {
    expect(checkGrounding("On 3 Mar.", { d: "3 March" })).toBe(true);
    expect(checkGrounding("On March 3rd.", { d: "3 March" })).toBe(true);
    expect(checkGrounding("On 2026-03-03.", { d: "3 March 2026" })).toBe(true);
    expect(checkGrounding("On 4 Mar.", { d: "3 March" })).toBe(false);
  });

  it("clock times must be in the values", () => {
    expect(checkGrounding("After 18:00.", { t: "18:00" })).toBe(true);
    expect(checkGrounding("After 9:30.", { t: "09:30" })).toBe(true);
    expect(checkGrounding("After 19:00.", { t: "18:00" })).toBe(false);
    expect(checkGrounding("After 18:00.", {})).toBe(false);
  });

  it("weekday and month names only when they are in the values", () => {
    expect(checkGrounding("You miss Sundays.", values)).toBe(true);
    expect(checkGrounding("You miss sunday.", values)).toBe(true);
    expect(checkGrounding("You miss Mondays.", values)).toBe(false);
    expect(checkGrounding("Wednesday again.", values)).toBe(false);
    expect(checkGrounding("In October you did well.", { when: "October" })).toBe(true);
    expect(checkGrounding("In November you did well.", { when: "October" })).toBe(false);
    expect(checkGrounding("In March you did well.", values)).toBe(false);
  });

  it("empty text is not grounded", () => {
    expect(checkGrounding("   ", values)).toBe(false);
    expect(groundingProblems("", values)).toEqual(["empty line"]);
  });

  it("ignores non-finite values and negative signs", () => {
    expect(checkGrounding("Down 2 kg.", { delta: -2 })).toBe(true);
    expect(checkGrounding("Down 2 kg.", { delta: Number.NaN })).toBe(false);
  });

  it("weekly report can use values from any fact of the week", () => {
    const week: FactValues[] = [{ protein: 142 }, { kg: 81.2 }, { weekday: "Friday" }];
    expect(groundWeekly("Protein hit 142 g on Friday and the average fell to 81.2 kg.", week)).toBe(true);
    expect(groundWeekly("Protein hit 150 g on Friday.", week)).toBe(false);
    expect(groundWeekly("Friday and Saturday.", week)).toBe(false);
    expect(groundingProblems("142", [{ a: 142 }, { b: "x" }])).toEqual([]);
  });

  it("every plain template line passes its own check", () => {
    const facts = computeFacts(
      input({
        nowHour: 19.5,
        todayStats: { eatenKcal: 2500, budgetKcal: 2000, proteinG: 50, proteinTargetG: 156, plannedSession: "gym_a", plannedSessionName: "Legs", sessionDone: false },
        newBests: [{ exerciseId: "x", exercise: "Goblet squat", weightKg: 22.5, reps: 10 }],
        losingRound: { round: "Days logged", n: 2 },
        justLoggedFood: true,
      }),
    );
    expect(facts.length).toBeGreaterThan(3);
    for (const fact of facts) expect(checkGrounding(renderTemplate(fact), fact.values)).toBe(true);
  });
});

describe("progression", () => {
  const rule = { repMin: 10, repMax: 12, sets: 3, bodyweight: false };

  it("every set at the top of the range adds 2 kg", () => {
    const sets = [{ weightKg: 20, reps: 12 }, { weightKg: 20, reps: 12 }, { weightKg: 20, reps: 12 }];
    expect(nextProgression(rule, sets)).toEqual({ kind: "add_weight", addKg: 2, nextKg: 22 });
  });

  it("builds on the heaviest set", () => {
    const sets = [{ weightKg: 20, reps: 12 }, { weightKg: 22.5, reps: 13 }, { weightKg: 20, reps: 12 }];
    expect(nextProgression(rule, sets)).toEqual({ kind: "add_weight", addKg: 2, nextKg: 24.5 });
  });

  it("holds when any set falls short or a set is missing", () => {
    expect(nextProgression(rule, [{ weightKg: 20, reps: 12 }, { weightKg: 20, reps: 11 }, { weightKg: 20, reps: 12 }])).toEqual({ kind: "hold" });
    expect(nextProgression(rule, [{ weightKg: 20, reps: 12 }, { weightKg: 20, reps: 12 }])).toEqual({ kind: "hold" });
  });

  it("bodyweight moves add a rep instead", () => {
    const bw = { repMin: 8, repMax: 12, sets: 3, bodyweight: true };
    const sets = [{ weightKg: 0, reps: 12 }, { weightKg: 0, reps: 12 }, { weightKg: 0, reps: 12 }];
    expect(nextProgression(bw, sets)).toEqual({ kind: "add_reps", addReps: 1, nextRepMax: 13 });
  });

  it("no history gives no hint", () => {
    expect(nextProgression(rule, [])).toEqual({ kind: "no_history" });
  });

  it("new best: heavier, or same weight with more reps; a first set is a baseline", () => {
    const hist = [{ weightKg: 20, reps: 10 }, { weightKg: 22, reps: 8 }];
    expect(isNewBest(hist, { weightKg: 22, reps: 9 })).toBe(true);
    expect(isNewBest(hist, { weightKg: 24, reps: 1 })).toBe(true);
    expect(isNewBest(hist, { weightKg: 22, reps: 8 })).toBe(false);
    expect(isNewBest(hist, { weightKg: 20, reps: 20 })).toBe(false);
    expect(isNewBest([], { weightKg: 20, reps: 10 })).toBe(false);
    expect(isNewBest([{ weightKg: 0, reps: 10 }], { weightKg: 0, reps: 11 })).toBe(true);
    expect(isBetterSet({ weightKg: 5, reps: 5 }, { weightKg: 5, reps: 6 })).toBe(true);
    expect(bestSet(hist)).toEqual({ weightKg: 22, reps: 8 });
    expect(bestSet([])).toBeNull();
  });
});
