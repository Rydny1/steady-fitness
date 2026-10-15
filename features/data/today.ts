import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DivisionT, Row, SessionKeyT } from "@/lib/supabase/types";
import { addDays, diffDays, formatTimeRiga, rigaParts, weekStart } from "@/lib/dates";
import {
  compareWeeks,
  daysToNextDivision,
  formFor,
  formLineIndex,
  clampCallus,
  nextDivision,
  previewDay,
  winStreak,
  type WeekComparison,
} from "@/features/game";
import { dayBudget } from "@/features/nutrition/targets";
import { dayBurn, fullBurn, goalFor, netKcal, readBalance, type BalanceRead, type Goal } from "@/features/nutrition/energy";
import { chapters, coachForm, matchLines, trophies as trophyCopy, type FormName } from "@/content/copy";
import { comebackQuotes, quotes } from "@/content/lines";
import { SESSION_NAMES } from "@/features/settings/defaults";
import { loadDayFacts, ringsFor, sessionStatusFor, toRecord, type DayFacts } from "./day-facts";
import { latestLedger, trophyState, weekResults, TROPHY_TOTAL } from "./ledger";

type Db = SupabaseClient<Database>;

export type TodayLine = { text: string; byline: string };

export type FoodItem = {
  id: string;
  name: string;
  detail: string;
  kcal: number;
  protein_g: number;
  /** Amount as saved, in grams when the unit is g. */
  quantity: number | null;
  unit: string | null;
  photoPath: string | null;
};

export type ActivityItem = {
  id: string;
  name: string;
  detail: string;
  burned: number;
};

export type TodayData = {
  day: string;
  hour: number;
  profileName: string;
  facts: DayFacts;
  rings: ReturnType<typeof ringsFor>;
  budgetKcal: number;
  leftKcal: number;
  trainDone: number;
  trainPlanned: number;
  sessionKey: SessionKeyT | null;
  sessionName: string;
  line: TodayLine;
  form: { name: FormName; callus: number; livePoints: number; coachLine: string };
  chapter: { n: number; name: string; toNext: { days: number; name: string } | null };
  match: { comparison: WeekComparison; line: string | null; winStreak: number };
  streak: number;
  careerDays: number;
  trophiesEarned: number;
  trophiesTotal: number;
  habits: { id: string; name: string; checked: boolean }[];
  foods: FoodItem[];
  activities: ActivityItem[];
  logCount: number;
  checkin: Row<"day_checkins"> | null;
  sickUsedThisMonth: number;
  /** The last progress photo is 14 or more days old, or there is none. */
  photoDue: boolean;
  /** Net energy against the goal: yesterday, and what eating the budget would give. */
  energy: { goal: Goal; todayNet: number | null; yesterdayNet: number | null; plannedNet: number; read: BalanceRead | null };
  /** Trophies earned since the last visit: a celebration popup shows them once. */
  celebrate: { key: string; name: string; line: string }[];
  /** The name on your profile: the latest trophy you have earned. */
  title: string | null;
  /** One level change not yet seen: a full-screen card shows it once. */
  levelEvent: { kind: "promoted" | "dropped"; division: DivisionT; from: DivisionT } | null;
  /** The Coach's latest true line today, from the Observer. */
  observer: string | null;
  /** This Monday's adaptive budget note, shown once. */
  adaptiveNote: string | null;
};

const PLANNED_MINUTES: Record<SessionKeyT, number> = {
  gym_a: 45,
  gym_b: 45,
  gym_c: 45,
  run: 30,
  run_intervals: 40,
  football: 60,
  stretch: 10,
  rest: 10,
};

const ACTIVITY_NAMES: Record<Row<"activity_entries">["activity_type"], string> = {
  football: "Football",
  run: "Run",
  gym: "Gym",
  circuit: "Circuit",
  walk: "Walk",
  stretch: "Stretch",
  cycling: "Cycling",
  other: "Activity",
};

/**
 * Today's line: one real quote a day, the person's name under it. Rotates daily, so nothing
 * repeats inside the bank length (60 or more). On Off form days it draws from the gentler set.
 */
export function lineFor(day: string, formName: FormName): TodayLine {
  const n = diffDays(day, "2026-01-01");
  const pool = formName === "Off form" && comebackQuotes.length >= 15 ? comebackQuotes : quotes;
  const q = pool[((n % pool.length) + pool.length) % pool.length];
  return { text: q?.text ?? "", byline: q?.author ?? "" };
}

export async function loadToday(
  supabase: Db,
  profile: Row<"profiles">,
  today: string,
  now: Date,
): Promise<TodayData> {
  const ws = weekStart(today);
  const lastStart = addDays(ws, -7);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [days, ledger, habits, checks, foods, acts, photos, checkin, sickMonth, results, trophies, lastPhoto, flagRows, observerRow, weightRow] =
    await Promise.all([
      loadDayFacts(supabase, profile.user_id, lastStart, today),
      latestLedger(supabase, profile.user_id),
      supabase.from("habits").select("id,name,position").is("archived_at", null).order("position"),
      supabase.from("habit_checks").select("habit_id").eq("day", today),
      supabase
        .from("food_entries")
        .select("id,name,quantity,unit,kcal,protein_g,created_at")
        .eq("day", today)
        .order("created_at"),
      supabase
        .from("activity_entries")
        .select("id,activity_type,duration_min,kcal_burned,created_at")
        .eq("day", today)
        .order("created_at"),
      supabase.from("photos").select("food_entry_id,storage_path").eq("kind", "meal").eq("taken_on", today),
      supabase.from("day_checkins").select("*").eq("day", today).maybeSingle(),
      supabase
        .from("day_checkins")
        .select("day", { count: "exact", head: true })
        .eq("sick", true)
        .gte("day", monthStart),
      weekResults(supabase, profile.user_id),
      trophyState(supabase, profile.user_id),
      supabase
        .from("photos")
        .select("taken_on")
        .eq("kind", "progress")
        .order("taken_on", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("user_flags").select("key,value").in("key", ["chapter_event", "adaptive_note", "trophies_seen"]),
      supabase
        .from("observer_notes")
        .select("text")
        .eq("day", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("measurements")
        .select("weight_kg")
        .not("weight_kg", "is", null)
        .order("measured_on", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const facts = days.find((d) => d.day === today) ?? days[days.length - 1];
  if (!facts) throw new Error("No day facts");

  const rings = ringsFor(facts, false);
  const budget = dayBudget(facts.budgetKcal, facts.burnedKcal);
  const left = budget - facts.eatenKcal;

  const planned = facts.plannedKey;
  const trainPlanned = planned ? PLANNED_MINUTES[planned] : PLANNED_MINUTES.rest;
  const trainMinutes = planned
    ? (acts.data ?? [])
        .filter((a) => a.activity_type !== "stretch")
        .reduce((sum, a) => sum + a.duration_min, 0)
    : facts.stretchMinutes;

  const prev = ledger;
  const preview = previewDay({
    logged: facts.anyEntry,
    loggedOnDay: facts.loggedOnDay,
    session: sessionStatusFor(facts, false),
    eatenKcal: facts.eatenKcal,
    budgetKcal: budget,
    bmrKcal: facts.bmrKcal,
    proteinG: facts.proteinG,
    proteinTargetG: facts.proteinTargetG,
    habitsDone: facts.habitsDone,
    sick: facts.sick,
    prev: {
      callus: prev.callus,
      division: prev.division,
      careerDays: prev.careerDays,
      streak: prev.streak,
      bestStreak: prev.bestStreak,
      offFormDays: prev.offFormDays,
    },
  });
  const callusLive = clampCallus(prev.callus + preview.points);
  const form = formFor(callusLive);
  const formName = form.name as FormName;
  const lines = coachForm[formName];
  const coach =
    lines[formLineIndex(lines.length, diffDays(today, "2026-01-01"))] ?? lines[0] ?? "";

  const thisWeek = days.filter((d) => d.day >= ws).map((d) => toRecord(d, today));
  const lastWeekRecords = days.filter((d) => d.day < ws).map((d) => toRecord(d, today));
  const hasGhost = lastWeekRecords.some((r) => r.logged);
  const comparison = compareWeeks({
    weekStart: ws,
    through: today,
    thisWeek,
    lastWeek: hasGhost ? lastWeekRecords : null,
  });

  const nextDiv = nextDivision(prev.division);
  const toNext = daysToNextDivision({ division: prev.division, careerDays: prev.careerDays });
  const chapter = chapters[prev.division];

  const evFlag = (flagRows.data ?? []).find((f) => f.key === "chapter_event")?.value as
    | { kind?: string; division?: DivisionT; from?: DivisionT; seen?: boolean }
    | undefined;
  let levelEvent: TodayData["levelEvent"] = null;
  if (evFlag && evFlag.seen === false && evFlag.division && evFlag.from) {
    if (evFlag.kind === "promoted" || evFlag.kind === "dropped") {
      levelEvent = { kind: evFlag.kind, division: evFlag.division, from: evFlag.from };
    }
  }
  const seenKeys =
    ((flagRows.data ?? []).find((f) => f.key === "trophies_seen")?.value as { keys?: string[] } | undefined)?.keys ?? [];
  const earned = trophyCopy.filter((t) => trophies[t.key as keyof typeof trophies]);
  const celebrate = earned
    .filter((t) => !seenKeys.includes(t.key))
    .map((t) => ({ key: t.key, name: t.name, line: t.line }));
  const title = earned.length > 0 ? (earned[earned.length - 1]?.name ?? null) : null;
  const adFlag = (flagRows.data ?? []).find((f) => f.key === "adaptive_note")?.value as
    | { text?: string; seen?: boolean }
    | undefined;
  const adaptive = adFlag && adFlag.seen === false && adFlag.text ? adFlag.text : null;

  // Net energy against the goal. Yesterday is the last full day.
  const goal = goalFor(weightRow.data ? Number(weightRow.data.weight_kg) : null, Number(profile.goal_weight_kg));
  const yFacts = days.find((x) => x.day === addDays(today, -1));
  const yesterdayNet =
    yFacts && yFacts.loggedOnDay && yFacts.bmrKcal > 0
      ? netKcal(yFacts.eatenKcal, dayBurn(yFacts.bmrKcal, yFacts.burnedKcal))
      : null;
  const energy: TodayData["energy"] = {
    goal,
    todayNet: facts.eatenKcal > 0 && facts.bmrKcal > 0 ? netKcal(facts.eatenKcal, dayBurn(facts.bmrKcal, facts.burnedKcal)) : null,
    yesterdayNet,
    plannedNet: facts.budgetKcal - dayBurn(facts.bmrKcal, 0),
    read: yesterdayNet === null ? null : readBalance(goal, yesterdayNet),
  };

  const checked = new Set((checks.data ?? []).map((c) => c.habit_id));
  const photoByFood = new Map(
    (photos.data ?? []).map((p) => [p.food_entry_id ?? "", p.storage_path] as const),
  );

  return {
    day: today,
    hour: rigaParts(now).hour,
    profileName: profile.display_name,
    facts,
    rings,
    budgetKcal: budget,
    leftKcal: left,
    trainDone: trainMinutes,
    trainPlanned,
    sessionKey: planned,
    sessionName: planned ? SESSION_NAMES[planned] : SESSION_NAMES.rest,
    line: lineFor(today, formName),
    form: { name: formName, callus: callusLive, livePoints: preview.points, coachLine: coach },
    chapter: {
      n: chapter.n,
      name: chapter.name,
      toNext: nextDiv && toNext !== null ? { days: toNext, name: chapters[nextDiv].name } : null,
    },
    match: {
      comparison,
      line: comparison.noGhost ? matchLines.noGhost : null,
      winStreak: winStreak([...results].reverse()),
    },
    streak: prev.streak + (facts.loggedOnDay && !facts.sick ? 1 : 0),
    careerDays: prev.careerDays,
    celebrate,
    title,
    trophiesEarned: Object.values(trophies).filter(Boolean).length,
    trophiesTotal: TROPHY_TOTAL,
    habits: (habits.data ?? []).map((h) => ({ id: h.id, name: h.name, checked: checked.has(h.id) })),
    foods: (foods.data ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      detail: [
        formatTimeRiga(f.created_at),
        f.quantity ? `${f.quantity}${f.unit ? ` ${f.unit}` : ""}` : null,
        f.protein_g > 0 ? `${Math.round(f.protein_g)} g protein` : null,
      ]
        .filter(Boolean)
        .join(", "),
      kcal: f.kcal,
      protein_g: Number(f.protein_g),
      quantity: f.quantity === null ? null : Number(f.quantity),
      unit: f.unit,
      photoPath: photoByFood.get(f.id) ?? null,
    })),
    activities: (acts.data ?? []).map((a) => ({
      id: a.id,
      name: ACTIVITY_NAMES[a.activity_type],
      detail: `${formatTimeRiga(a.created_at)}, ${a.duration_min} min`,
      burned: fullBurn(a.kcal_burned),
    })),
    logCount: (foods.data?.length ?? 0) + (acts.data?.length ?? 0),
    checkin: checkin.data ?? null,
    sickUsedThisMonth: sickMonth.count ?? 0,
    photoDue: !lastPhoto.data || diffDays(today, lastPhoto.data.taken_on) >= 14,
    energy,
    levelEvent: levelEvent,
    observer: observerRow.data?.text ?? null,
    adaptiveNote: adaptive,
  };
}
