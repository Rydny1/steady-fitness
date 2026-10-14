// Fact engine: computes true facts from plain data. No AI here (PRODUCT.md > The Observer).
import { addDays, diffDays, isoWeekday, weekdayName } from "@/lib/dates";
import type { SessionKeyT, SessionStatusT } from "@/lib/supabase/types";
import { trendAt, trendSeries, type WeightEntry } from "@/features/body/metrics";
import { FACT_PRIORITY, FACT_TEMPLATES, FACTS } from "./config";
import type { FactValues } from "./grounding";

export type FactKind = "live" | "pattern" | "record" | "trend";

export type Fact = {
  /** Stable id. Records add a suffix, for example "new_best:goblet_squat". */
  id: string;
  priority: number;
  /** Plain template with {placeholders}. Filled by renderTemplate. */
  template: string;
  values: FactValues;
  kind: FactKind;
  /** The fact is only true from this hour of the day. */
  fromHour?: number;
};

/** One past day, from the daily ledger and entries. */
export type FactDay = {
  day: string;
  logged: boolean;
  eatenKcal: number;
  budgetKcal: number;
  proteinG: number;
  proteinTargetG: number;
  plannedSession: SessionKeyT | null;
  sessionStatus: SessionStatusT;
  /** Sleep hours from the evening check-in of this day, null when not given. */
  sleepHours: number | null;
};

export type FactInput = {
  today: string;
  /** Hour of day in Riga, 0 to 23.99. */
  nowHour: number;
  /** A log was just saved. */
  justLogged: boolean;
  /** The log just saved included food. */
  justLoggedFood: boolean;
  todayStats: {
    eatenKcal: number;
    budgetKcal: number;
    proteinG: number;
    proteinTargetG: number;
    plannedSession: SessionKeyT | null;
    /** Display name of the planned session, for example "Legs". */
    plannedSessionName: string | null;
    sessionDone: boolean;
  };
  /** Days before today, any order. */
  history: readonly FactDay[];
  weights: readonly WeightEntry[];
  /** Lift personal bests set in the log just saved. */
  newBests: readonly { exerciseId: string; exercise: string; weightKg: number; reps: number }[];
  /** From the weekly match, when exactly one round is lost. */
  losingRound: { round: string; n: number } | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function hoursLeft(nowHour: number): number {
  return Math.max(0, Math.floor(FACTS.dayHours - nowHour));
}

function isGym(s: SessionKeyT | null): boolean {
  return s === "gym_a" || s === "gym_b" || s === "gym_c";
}

function badDay(d: FactDay | undefined): boolean {
  if (!d) return false;
  return (
    !d.logged ||
    d.sessionStatus === "missed" ||
    (d.budgetKcal > 0 && d.eatenKcal >= d.budgetKcal * (1 + FACTS.overBudgetShare))
  );
}

/** Every fact that is true right now. */
export function computeFacts(input: FactInput): Fact[] {
  const facts: Fact[] = [];
  const t = input.todayStats;
  const left = hoursLeft(input.nowHour);
  const push = (
    id: keyof typeof FACT_PRIORITY,
    template: string,
    values: FactValues,
    kind: FactKind,
    extra: Partial<Fact> & { idSuffix?: string } = {},
  ) => {
    const { idSuffix, ...rest } = extra;
    facts.push({
      id: idSuffix ? `${id}:${idSuffix}` : id,
      priority: FACT_PRIORITY[id],
      template,
      values,
      kind,
      ...rest,
    });
  };

  // Protein gap
  if (
    input.nowHour >= FACTS.proteinGapFromHour &&
    t.proteinTargetG > 0 &&
    t.proteinG < t.proteinTargetG * FACTS.proteinGapBelowShare &&
    left >= 1
  ) {
    push(
      "protein_gap",
      FACT_TEMPLATES.protein_gap,
      { gap: Math.round(t.proteinTargetG - t.proteinG), hours: left },
      "live",
      { fromHour: FACTS.proteinGapFromHour },
    );
  }

  // Budget left, after a food log
  if (input.justLoggedFood && t.eatenKcal > 0 && t.budgetKcal - t.eatenKcal >= 0) {
    push("budget_left", FACT_TEMPLATES.budget_left, { left: Math.round(t.budgetKcal - t.eatenKcal) }, "live");
  }

  // Over budget
  if (t.budgetKcal > 0 && t.eatenKcal >= t.budgetKcal * (1 + FACTS.overBudgetShare)) {
    push("over_budget", FACT_TEMPLATES.over_budget, { over: Math.round(t.eatenKcal - t.budgetKcal) }, "live");
  }

  // Session pending
  const planned = t.plannedSession;
  if (
    planned !== null &&
    planned !== "rest" &&
    planned !== "stretch" &&
    !t.sessionDone &&
    input.nowHour >= FACTS.sessionPendingFromHour &&
    left >= 1 &&
    t.plannedSessionName
  ) {
    push(
      "session_pending",
      FACT_TEMPLATES.session_pending,
      { session: t.plannedSessionName, hours: left },
      "live",
      { fromHour: FACTS.sessionPendingFromHour },
    );
  }

  // Same-day compare: best protein for this weekday
  if (input.justLogged && t.proteinG > 0) {
    const wd = isoWeekday(input.today);
    const same = input.history.filter(
      (d) =>
        d.logged &&
        d.proteinG > 0 &&
        isoWeekday(d.day) === wd &&
        diffDays(input.today, d.day) > 0 &&
        diffDays(input.today, d.day) <= FACTS.sameDayLookbackWeeks * 7,
    );
    if (same.length >= FACTS.sameDayMinWeeks && same.every((d) => t.proteinG > d.proteinG)) {
      push(
        "same_day_best",
        FACT_TEMPLATES.same_day_best,
        { weekday: weekdayName(input.today), n: same.length },
        "pattern",
      );
    }
  }

  // Weak weekday: this weekday missed or over in 3 of the last 4
  {
    const recs: (FactDay | undefined)[] = [];
    for (let k = 1; k <= FACTS.weakWeekdayWindow; k += 1) {
      recs.push(input.history.find((d) => d.day === addDays(input.today, -7 * k)));
    }
    if (recs.every((r) => r !== undefined)) {
      const n = recs.filter((r) => badDay(r)).length;
      if (n >= FACTS.weakWeekdayHits) {
        push(
          "weak_weekday",
          FACT_TEMPLATES.weak_weekday,
          { weekday: weekdayName(input.today), n, of: FACTS.weakWeekdayWindow },
          "pattern",
        );
      }
    }
  }

  // Protein by day type: gym days against football days
  {
    const recent = input.history.filter(
      (d) =>
        d.logged &&
        d.proteinTargetG > 0 &&
        diffDays(input.today, d.day) > 0 &&
        diffDays(input.today, d.day) <= FACTS.dayTypeLookbackDays,
    );
    const gym = recent.filter((d) => isGym(d.plannedSession));
    const fb = recent.filter((d) => d.plannedSession === "football");
    if (gym.length >= FACTS.dayTypeMinDays && fb.length >= FACTS.dayTypeMinDays) {
      const rate = (days: FactDay[]) =>
        (days.filter((d) => d.proteinG >= d.proteinTargetG).length / days.length) * 100;
      const g = rate(gym);
      const f = rate(fb);
      if (Math.abs(g - f) >= FACTS.dayTypeGapPoints) {
        push(
          "protein_by_day_type",
          g > f ? FACT_TEMPLATES.protein_by_day_type_gym : FACT_TEMPLATES.protein_by_day_type_football,
          { gymPct: Math.round(g), footballPct: Math.round(f) },
          "pattern",
        );
      }
    }
  }

  // Sleep and food
  {
    const byDay = new Map(input.history.map((d) => [d.day, d] as const));
    const short: number[] = [];
    const other: number[] = [];
    for (const d of input.history) {
      if (d.sleepHours === null) continue;
      if (diffDays(input.today, d.day) > FACTS.dayTypeLookbackDays) continue;
      const next = byDay.get(addDays(d.day, 1));
      if (!next || !next.logged) continue;
      (d.sleepHours < FACTS.shortSleepHours ? short : other).push(next.eatenKcal);
    }
    if (short.length >= FACTS.sleepFoodMinNights && other.length >= FACTS.sleepFoodMinNights) {
      const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      const diff = avg(short) - avg(other);
      if (diff >= FACTS.sleepFoodGapKcal) {
        push("sleep_food", FACT_TEMPLATES.sleep_food, { n: Math.round(diff) }, "pattern");
      }
    }
  }

  // Weigh-in gap
  if (input.weights.length > 0) {
    const last = input.weights.reduce((m, w) => (w.day > m ? w.day : m), "0000-00-00");
    const gap = diffDays(input.today, last);
    if (gap >= FACTS.weighInGapDays) {
      push("weigh_in_gap", FACT_TEMPLATES.weigh_in_gap, { n: gap }, "trend");
    }
  }

  // Stalled trend: 7-day average within 0.2 kg for 14 days
  {
    const from = addDays(input.today, -(FACTS.stalledDays - 1));
    const pts = trendSeries(input.weights, from, input.today);
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (first && last && pts.length >= FACTS.stalledMinPoints) {
      const startsEarly = diffDays(first.day, from) <= 3;
      const endsLate = last.day === input.today;
      const kgs = pts.map((p) => p.avgKg);
      if (startsEarly && endsLate && Math.max(...kgs) - Math.min(...kgs) <= FACTS.stalledBandKg) {
        push(
          "stalled_trend",
          FACT_TEMPLATES.stalled_trend,
          { weeks: FACTS.stalledWeeks, cut: FACTS.stalledCutKcal },
          "trend",
        );
      }
    }
  }

  // New low: lowest 7-day average yet, on a day with a weigh-in
  if (input.weights.some((w) => w.day === input.today)) {
    const cur = trendAt(input.weights, input.today);
    const firstDay = input.weights.reduce((m, w) => (w.day < m ? w.day : m), input.today);
    const before = trendSeries(input.weights, firstDay, addDays(input.today, -1));
    if (cur !== null && before.length >= FACTS.newLowMinPoints) {
      const min = Math.min(...before.map((p) => p.avgKg));
      if (cur < min) {
        push("new_low", FACT_TEMPLATES.new_low, { kg: round1(cur) }, "record");
      }
    }
  }

  // New best lifts
  for (const b of input.newBests) {
    push(
      "new_best",
      FACT_TEMPLATES.new_best,
      { exercise: b.exercise, weight: b.weightKg, reps: b.reps },
      "record",
      { idSuffix: b.exerciseId },
    );
  }

  // Losing a round
  if (input.losingRound) {
    push(
      "losing_round",
      FACT_TEMPLATES.losing_round,
      { round: input.losingRound.round, n: input.losingRound.n },
      "live",
    );
  }

  return facts;
}

/**
 * Top fact by priority that was not shown recently (ids from the last 3 days) and is
 * still in its time window. Ties break by id so the pick is stable.
 */
export function pickFact(
  facts: readonly Fact[],
  recentlyShownIds: readonly string[],
  nowHour: number,
): Fact | null {
  const ok = facts.filter(
    (f) => !recentlyShownIds.includes(f.id) && (f.fromHour === undefined || nowHour >= f.fromHour),
  );
  ok.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  return ok[0] ?? null;
}

function formatValue(v: number | string | undefined): string {
  if (v === undefined) return "";
  if (typeof v === "string") return v;
  if (Number.isInteger(v)) return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return String(Math.round(v * 100) / 100);
}

/** The plain line: the template with its values filled in. Always works, AI off or on. */
export function renderTemplate(fact: Pick<Fact, "template" | "values">): string {
  return fact.template.replace(/\{(\w+)\}/g, (_m, key: string) => formatValue(fact.values[key]));
}
