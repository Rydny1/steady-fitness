import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Row, SessionKeyT } from "@/lib/supabase/types";
import { dayOfTimestamp, isoWeekday, rangeDays } from "@/lib/dates";
import { computeRings, sessionStatus, type DayRecord } from "@/features/game";
import { dayBudget } from "@/features/nutrition/targets";

type Db = SupabaseClient<Database>;

/** Everything the game and the dashboard need to know about one day. */
export type DayFacts = {
  day: string;
  plannedKey: SessionKeyT | null;
  /** A log row was created on the day itself. Only these count for score and streak. */
  loggedOnDay: boolean;
  /** Any entry exists for the day (including back-filled ones). */
  anyEntry: boolean;
  eatenKcal: number;
  proteinG: number;
  burnedKcal: number;
  stretchMinutes: number;
  walkRunMinutes: number;
  sessionDone: boolean;
  bmrKcal: number;
  budgetKcal: number; // base budget, before add-back
  proteinTargetG: number;
  habitsDone: number;
  sick: boolean;
  sleepHours: number | null;
  firstSessionStartHour: number | null;
  /** Minutes after midnight (Riga) of logs created on the day itself. */
  logMinutes: number[];
  /** Minutes after midnight of gym session starts. */
  gymStartMinutes: number[];
  weightLogged: boolean;
};

export type Targets = Pick<Row<"targets">, "effective_from" | "bmr_kcal" | "budget_kcal" | "protein_g">;

export function targetsFor(day: string, all: Targets[]): Targets | null {
  const sorted = [...all].sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  let found: Targets | null = null;
  for (const t of sorted) {
    if (t.effective_from <= day) found = t;
  }
  return found ?? sorted[0] ?? null;
}

export type PlanMap = Map<number, SessionKeyT>;

export function planKey(plan: PlanMap, day: string): SessionKeyT | null {
  const key = plan.get(isoWeekday(day));
  return !key || key === "rest" || key === "stretch" ? null : key;
}

/** Loads the facts for each day in [from, to], in order. Every query filters by user id, so the same
 * code is safe with the user's session (RLS) and with the cron secret-key client. */
export async function loadDayFacts(
  supabase: Db,
  userId: string,
  from: string,
  to: string,
): Promise<DayFacts[]> {
  const [targets, plan, food, acts, sessions, logs, checks, checkins, weights] = await Promise.all([
    supabase
      .from("targets")
      .select("effective_from,bmr_kcal,budget_kcal,protein_g")
      .eq("user_id", userId),
    supabase.from("weekly_plan").select("weekday,session_key").eq("user_id", userId),
    supabase
      .from("v_day_food")
      .select("day,kcal_in,protein_g")
      .eq("user_id", userId)
      .gte("day", from)
      .lte("day", to),
    supabase
      .from("activity_entries")
      .select("day,activity_type,session_key,duration_min,kcal_burned")
      .eq("user_id", userId)
      .gte("day", from)
      .lte("day", to),
    supabase
      .from("workout_sessions")
      .select("day,session_key,started_at,finished_at")
      .eq("user_id", userId)
      .gte("day", from)
      .lte("day", to)
      .not("finished_at", "is", null),
    supabase
      .from("logs")
      .select("day,created_at")
      .eq("user_id", userId)
      .gte("day", from)
      .lte("day", to),
    supabase
      .from("habit_checks")
      .select("day")
      .eq("user_id", userId)
      .gte("day", from)
      .lte("day", to),
    supabase
      .from("day_checkins")
      .select("day,sick,sleep_hours")
      .eq("user_id", userId)
      .gte("day", from)
      .lte("day", to),
    supabase
      .from("measurements")
      .select("measured_on")
      .eq("user_id", userId)
      .not("weight_kg", "is", null)
      .gte("measured_on", from)
      .lte("measured_on", to),
  ]);

  const planMap: PlanMap = new Map(
    (plan.data ?? []).map((p) => [p.weekday, p.session_key] as const),
  );
  const targetRows = targets.data ?? [];

  const foodBy = new Map((food.data ?? []).map((r) => [r.day ?? "", r] as const));
  const actsBy = groupBy(acts.data ?? [], (r) => r.day);
  const sessBy = groupBy(sessions.data ?? [], (r) => r.day);
  const logsBy = groupBy(logs.data ?? [], (r) => r.day);
  const checkCount = new Map<string, number>();
  for (const c of checks.data ?? []) checkCount.set(c.day, (checkCount.get(c.day) ?? 0) + 1);
  const weighed = new Set((weights.data ?? []).map((w) => w.measured_on));
  const checkinBy = new Map((checkins.data ?? []).map((c) => [c.day, c] as const));

  return rangeDays(from, to).map((day): DayFacts => {
    const t = targetsFor(day, targetRows);
    const key = planKey(planMap, day);
    const dayActs = actsBy.get(day) ?? [];
    const daySess = sessBy.get(day) ?? [];
    const dayLogs = logsBy.get(day) ?? [];
    const f = foodBy.get(day);
    const ck = checkinBy.get(day);

    const sessionDone =
      key !== null &&
      (daySess.some((s) => s.session_key === key) ||
        dayActs.some((a) => a.session_key === key) ||
        (key.startsWith("gym") && dayActs.some((a) => a.activity_type === "gym")));

    const starts = daySess.map((s) => hourRiga(s.started_at));
    return {
      day,
      plannedKey: key,
      loggedOnDay: dayLogs.some((l) => dayOfTimestamp(l.created_at) === day),
      anyEntry: Boolean(f) || dayActs.length > 0 || dayLogs.length > 0,
      eatenKcal: f?.kcal_in ?? 0,
      proteinG: Number(f?.protein_g ?? 0),
      burnedKcal: dayActs.reduce((s, a) => s + a.kcal_burned, 0),
      stretchMinutes: dayActs
        .filter((a) => a.activity_type === "stretch")
        .reduce((s, a) => s + a.duration_min, 0),
      walkRunMinutes: dayActs
        .filter((a) => a.activity_type === "walk" || a.activity_type === "run")
        .reduce((s, a) => s + a.duration_min, 0),
      sessionDone,
      bmrKcal: t?.bmr_kcal ?? 0,
      budgetKcal: t?.budget_kcal ?? 0,
      proteinTargetG: t?.protein_g ?? 0,
      habitsDone: checkCount.get(day) ?? 0,
      sick: ck?.sick ?? false,
      sleepHours: ck?.sleep_hours ?? null,
      firstSessionStartHour: starts.length > 0 ? Math.min(...starts) : null,
      logMinutes: dayLogs
        .filter((l) => dayOfTimestamp(l.created_at) === day)
        .map((l) => Math.round(hourRiga(l.created_at) * 60)),
      gymStartMinutes: daySess
        .filter((s) => s.session_key.startsWith("gym"))
        .map((s) => Math.round(hourRiga(s.started_at) * 60)),
      weightLogged: weighed.has(day),
    };
  });
}

function hourRiga(iso: string): number {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Riga",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h + m / 60;
}

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return m;
}

/** Rings for a day from its facts. `ended` closes the Fuel ring. */
export function ringsFor(f: DayFacts, ended: boolean) {
  return computeRings({
    eatenKcal: f.eatenKcal,
    budgetKcal: dayBudget(f.budgetKcal, f.burnedKcal),
    bmrKcal: f.bmrKcal,
    proteinG: f.proteinG,
    proteinTargetG: f.proteinTargetG,
    plannedSession: f.plannedKey,
    sessionDone: f.sessionDone,
    stretchMinutes: f.stretchMinutes,
    dayEnded: ended,
    sick: f.sick,
  });
}

/** DayRecord for the weekly match. Today uses the live ring state so the comparison is fair. */
export function toRecord(f: DayFacts, today: string): DayRecord {
  const ended = f.day < today;
  const rings = ringsFor(f, ended);
  const live = f.day === today;
  return {
    day: f.day,
    planned: f.plannedKey !== null,
    sessionDone: f.sessionDone,
    logged: f.loggedOnDay,
    fuelClosed: live ? rings.fuel.inRange && f.loggedOnDay : rings.fuel.closed && f.loggedOnDay,
    proteinClosed: rings.protein.closed,
  };
}

export function sessionStatusFor(f: DayFacts, ended: boolean) {
  return sessionStatus(f.plannedKey, f.sessionDone, ended);
}
