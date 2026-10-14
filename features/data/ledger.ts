import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DivisionT, Json } from "@/lib/supabase/types";
import {
  CALLUS_START,
  countLiftRecords,
  evaluateTrophies,
  TROPHY_KEYS,
  type TrophyInput,
  type TrophyKey,
  type WeekResult,
} from "@/features/game";

type Db = SupabaseClient<Database>;

/** Game state as of the last scored day. Before the first night it is the starting state. */
export type LedgerState = {
  day: string | null;
  callus: number;
  division: DivisionT;
  careerDays: number;
  streak: number;
  bestStreak: number;
  offFormDays: number;
};

export const START_STATE: LedgerState = {
  day: null,
  callus: CALLUS_START,
  division: "starting_line",
  careerDays: 0,
  streak: 0,
  bestStreak: 0,
  offFormDays: 0,
};

function readState(breakdown: Json): { bestStreak: number; offFormDays: number } {
  if (breakdown && typeof breakdown === "object" && !Array.isArray(breakdown)) {
    const s = breakdown.state;
    if (s && typeof s === "object" && !Array.isArray(s)) {
      return {
        bestStreak: typeof s.bestStreak === "number" ? s.bestStreak : 0,
        offFormDays: typeof s.offFormDays === "number" ? s.offFormDays : 0,
      };
    }
  }
  return { bestStreak: 0, offFormDays: 0 };
}

export async function latestLedger(supabase: Db, userId: string): Promise<LedgerState> {
  const { data } = await supabase
    .from("daily_scores")
    .select("day,callus,division,career_days,streak,breakdown")
    .eq("user_id", userId)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return START_STATE;
  const extra = readState(data.breakdown);
  return {
    day: data.day,
    callus: data.callus,
    division: data.division,
    careerDays: data.career_days,
    streak: data.streak,
    bestStreak: Math.max(extra.bestStreak, data.streak),
    offFormDays: extra.offFormDays,
  };
}

const RESULT_MAP: Record<string, WeekResult> = {
  W: "win",
  L: "loss",
  D: "draw",
  F: "no_ghost",
};

/** Week results, oldest first. */
export async function weekResults(supabase: Db, userId: string): Promise<WeekResult[]> {
  const { data } = await supabase
    .from("weekly_reviews")
    .select("week_start,result")
    .eq("user_id", userId)
    .order("week_start", { ascending: true });
  return (data ?? []).map((r) => RESULT_MAP[r.result] ?? "no_ghost");
}

export async function loadTrophyInput(supabase: Db, userId: string): Promise<TrophyInput> {
  const [logs, ledger, results, sessions, flags, trend, measures, sets, photos] =
    await Promise.all([
      supabase.from("logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("daily_scores").select("streak,breakdown").eq("user_id", userId),
      weekResults(supabase, userId),
      supabase.from("workout_sessions").select("id,day,session_key,started_at").eq("user_id", userId),
      supabase.from("user_flags").select("key").eq("user_id", userId),
      supabase
        .from("v_weight_trend")
        .select("measured_on,weight_kg,avg_7d")
        .eq("user_id", userId)
        .order("measured_on"),
      supabase
        .from("measurements")
        .select("measured_on,waist_cm")
        .eq("user_id", userId)
        .not("waist_cm", "is", null)
        .order("measured_on"),
      supabase
        .from("workout_sets")
        .select("session_id,exercise_slug,reps,weight_kg")
        .eq("user_id", userId),
      supabase
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("kind", "progress"),
    ]);

  const bestStreak = Math.max(
    0,
    ...(ledger.data ?? []).map((r) => Math.max(r.streak, readState(r.breakdown).bestStreak)),
  );

  const early = (sessions.data ?? []).filter((s) => {
    if (!s.session_key.startsWith("gym")) return false;
    const h = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Riga",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date(s.started_at)),
    );
    return h < 8;
  }).length;

  const flagKeys = (flags.data ?? []).map((f) => f.key);
  const weights = trend.data ?? [];
  const avgs = weights.map((w) => w.avg_7d).filter((v): v is number => v !== null);
  const waists = (measures.data ?? []).map((m) => m.waist_cm).filter((v): v is number => v !== null);

  const dayBySession = new Map((sessions.data ?? []).map((s) => [s.id, s.day] as const));
  const records = (sets.data ?? [])
    .filter((s) => s.reps !== null)
    .map((s) => ({
      exerciseId: s.exercise_slug,
      weightKg: s.weight_kg ?? 0,
      reps: s.reps ?? 0,
      day: dayBySession.get(s.session_id) ?? "",
    }));
  return {
    logCount: logs.count ?? 0,
    bestStreak,
    weekResults: results,
    gymStartsBefore08: early,
    answerBacksDone: flagKeys.filter((k) => k.startsWith("answer_back_done:")).length,
    challengesDone: flagKeys.filter((k) => k.startsWith("challenge_done:")).length,
    startWeightKg: weights[0]?.weight_kg ?? null,
    lowestAvg7Kg: avgs.length > 0 ? Math.min(...avgs) : null,
    firstWaistCm: waists[0] ?? null,
    lowestWaistCm: waists.length > 0 ? Math.min(...waists) : null,
    liftRecords: countLiftRecords(records),
    progressPhotos: photos.count ?? 0,
  };
}

export async function trophyState(supabase: Db, userId: string): Promise<Record<TrophyKey, boolean>> {
  return evaluateTrophies(await loadTrophyInput(supabase, userId));
}

export const TROPHY_TOTAL = TROPHY_KEYS.length;
