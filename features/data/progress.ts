import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DivisionT, PoseT, Row } from "@/lib/supabase/types";
import { addDays, diffDays, weekDays, weekStart } from "@/lib/dates";
import {
  bestLifts,
  CHALLENGES,
  challengeProgress,
  compareWeeks,
  lowestAverage,
  matchLine,
  offerChallenges,
  type ChallengeDay,
  type ChallengeKey,
  type ChallengeOffer,
  type ChallengeProgress,
  type MatchLine,
  type WeekComparison,
  winStreak,
} from "@/features/game";
import { dayBudget } from "@/features/nutrition/targets";
import { dayRings } from "@/features/game/day-rings";
import { coachRead, type CoachLine } from "@/features/insights/coach-read";
import { dayBurn, goalFor, netKcal, type Goal } from "@/features/nutrition/energy";
import { projectNet, type NetProjection } from "@/features/nutrition/projection";
import {
  bmi,
  bodyFatNavy,
  goalLine,
  projectGoalDate,
  trendSeries,
  waistToHeight,
  type WeightEntry,
} from "@/features/body/metrics";
import { loadDayFacts, ringsFor, toRecord, type DayFacts } from "./day-facts";
import { latestLedger, trophyState, weekResults } from "./ledger";

type Db = SupabaseClient<Database>;

export type Range = "week" | "month" | "3m" | "all";

export type NetBar = { label: string; net: number; today: boolean };

export type ProgressData = {
  range: Range;
  weekStart: string;
  comparison: WeekComparison;
  matchLine: MatchLine;
  winStreak: number;
  daysLeft: number;
  offers: ChallengeOffer[];
  picked: { key: ChallengeKey; progress: ChallengeProgress } | null;
  records: { benchBest: string | null; bestStreak: number; lowestAvg: number | null };
  weekRings: { day: string; letter: string; fuel: number; protein: number; train: number; today: boolean }[];
  weight: {
    daily: { day: string; kg: number }[];
    trend: { day: string; avgKg: number }[];
    latestAvg: number | null;
    changeKg: number | null;
    goalKg: number;
    goalText: string | null;
    entriesCount: number;
    weekKg: number | null;
    totalKg: number | null;
  };
  net: { bars: NetBar[]; goal: Goal; targetNet: number; projection: NetProjection; insightKey: string };
  body: {
    waistCm: number | null;
    waistDelta: number | null;
    waistToHeight: number | null;
    bodyFat: number | null;
    bodyFatDelta: number | null;
    bmi: number | null;
    history: Row<"measurements">[];
  };
  season: { w: number; d: number; l: number; weeks: { weekStart: string; result: "W" | "D" | "L" | "F" }[] };
  levels: { level: DivisionT; day: string }[];
  notes: { id: string; text: string; when: string }[];
  weeklySummary: string | null;
  trophies: Record<string, boolean>;
  photos: Row<"photos">[];
  answerBack: { active: boolean } | null;
  /** Callus now, for the "what does this get me" line on challenges. */
  /** The Coach's read on the last two weeks. Empty until there is enough data. */
  coachRead: CoachLine[];
  callus: number;
  careerDays: number;
  division: DivisionT;
};

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function lastWeekStats(facts: DayFacts[], photoDaysAgo: number | null) {
  const sleeps = facts.map((f) => f.sleepHours).filter((v): v is number => v !== null);
  return {
    trainedAfter18: facts.reduce((s, f) => s + f.gymStartMinutes.filter((m) => m >= 18 * 60).length, 0),
    proteinClosedDays: facts.filter((f) => ringsFor(f, true).protein.closed).length,
    daysOverBudget: facts.filter((f) => {
      const budget = dayBudget(f.budgetKcal, f.burnedKcal);
      return budget > 0 && f.eatenKcal >= budget * (1 + CHALLENGES.cleanWeekOverLimit);
    }).length,
    logsAfter22: facts.reduce((s, f) => s + f.logMinutes.filter((m) => m >= 22 * 60).length, 0),
    walkRunMinutes: facts.reduce((s, f) => s + f.walkRunMinutes, 0),
    daysSincePhoto: photoDaysAgo,
    weighIns: facts.filter((f) => f.weightLogged).length,
    avgSleepHours: sleeps.length > 0 ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null,
  };
}

export function toChallengeDay(f: DayFacts): ChallengeDay {
  return {
    day: f.day,
    gymStartMinutes: f.gymStartMinutes,
    proteinClosed: ringsFor(f, true).protein.closed,
    eatenKcal: f.eatenKcal,
    budgetKcal: dayBudget(f.budgetKcal, f.burnedKcal),
    firstLogMinutes: f.logMinutes.length > 0 ? Math.min(...f.logMinutes) : null,
    walkRunMinutes: f.walkRunMinutes,
    weightLogged: f.weightLogged,
    sleepHours: f.sleepHours,
  };
}

export function rangeStart(range: Range, today: string, earliest: string | null): string {
  if (range === "week") return weekStart(today);
  if (range === "month") return addDays(today, -29);
  if (range === "3m") return addDays(today, -89);
  const floor = addDays(today, -364);
  return earliest && earliest > floor ? earliest : floor;
}

export async function loadProgress(
  supabase: Db,
  profile: Row<"profiles">,
  today: string,
  range: Range,
): Promise<ProgressData> {
  const ws = weekStart(today);
  const lastStart = addDays(ws, -7);

  const { data: measureRows } = await supabase
    .from("measurements")
    .select("*")
    .order("measured_on", { ascending: true });
  const measures = measureRows ?? [];
  const earliest = measures[0]?.measured_on ?? null;
  const from = rangeStart(range, today, earliest);
  const factsFrom = from < lastStart ? from : lastStart;

  const [facts, ledger, results, trophies, challenge, notes, photos, sets, sessions, reviews, flags, allReviews, scores] =
    await Promise.all([
      loadDayFacts(supabase, profile.user_id, factsFrom, today),
      latestLedger(supabase, profile.user_id),
      weekResults(supabase, profile.user_id),
      trophyState(supabase, profile.user_id),
      supabase.from("weekly_challenges").select("challenge_key").eq("week_start", ws).maybeSingle(),
      supabase
        .from("observer_notes")
        .select("id,text,created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("photos").select("*").eq("kind", "progress").order("taken_on", { ascending: false }),
      supabase
        .from("workout_sets")
        .select("session_id,exercise_slug,reps,weight_kg")
        .eq("exercise_slug", "db_bench_press"),
      supabase.from("workout_sessions").select("id,day"),
      supabase
        .from("weekly_reviews")
        .select("summary,week_start")
        .not("summary", "is", null)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("user_flags").select("key,value").like("key", "answer_back%"),
      supabase
        .from("weekly_reviews")
        .select("week_start,result")
        .eq("user_id", profile.user_id)
        .order("week_start", { ascending: true }),
      supabase
        .from("daily_scores")
        .select("day,division")
        .eq("user_id", profile.user_id)
        .order("day", { ascending: true }),
    ]);

  const thisWeek = facts.filter((f) => f.day >= ws).map((f) => toRecord(f, today));
  const lastWeekFacts = facts.filter((f) => f.day >= lastStart && f.day < ws);
  const lastWeekRecords = lastWeekFacts.map((f) => toRecord(f, today));
  const hasGhost = lastWeekRecords.some((r) => r.logged);
  const comparison = compareWeeks({
    weekStart: ws,
    through: today,
    thisWeek,
    lastWeek: hasGhost ? lastWeekRecords : null,
  });
  const line = matchLine(comparison, {
    weekStart: ws,
    thisWeek,
    lastWeek: hasGhost ? lastWeekRecords : null,
  });

  // Weekly challenge: offers from last week's real numbers, progress from this week's days.
  const photoRows = photos.data ?? [];
  const newestPhoto = photoRows[0]?.taken_on ?? null;
  const offers = offerChallenges(
    lastWeekStats(lastWeekFacts, newestPhoto ? diffDays(today, newestPhoto) : null),
  );
  const weekFacts = facts.filter((f) => f.day >= ws);
  const pickedKey = (challenge.data?.challenge_key ?? null) as ChallengeKey | null;
  const poses: PoseT[] = photoRows
    .filter((p) => p.taken_on >= ws && p.pose)
    .map((p) => p.pose as PoseT);
  const picked = pickedKey
    ? {
        key: pickedKey,
        progress: challengeProgress({
          key: pickedKey,
          weekStart: ws,
          today,
          days: weekFacts.map(toChallengeDay),
          photoPoses: poses,
        }),
      }
    : null;

  // Records.
  const dayOfSession = new Map((sessions.data ?? []).map((s) => [s.id, s.day] as const));
  const bench = bestLifts(
    (sets.data ?? [])
      .filter((s) => s.reps !== null)
      .map((s) => ({
        exerciseId: s.exercise_slug,
        weightKg: s.weight_kg ?? 0,
        reps: s.reps ?? 0,
        day: dayOfSession.get(s.session_id) ?? "",
      })),
  )[0];

  const entries: WeightEntry[] = measures
    .filter((m) => m.weight_kg !== null)
    .map((m) => ({ day: m.measured_on, kg: Number(m.weight_kg) }));
  const trendAll = trendSeries(entries, entries[0]?.day ?? today, today);
  const low = lowestAverage(trendAll);
  const trend = trendAll.filter((t) => t.day >= from);
  const daily = entries.filter((e) => e.day >= from);
  const latestAvg = trendAll[trendAll.length - 1]?.avgKg ?? null;
  const first = trend[0];
  const change = first && latestAvg !== null ? Math.round((latestAvg - first.avgKg) * 10) / 10 : null;
  const projection = projectGoalDate({ entries, today, goalKg: Number(profile.goal_weight_kg) });

  // Net calories: eaten minus everything burned (resting, daily activity, exercise).
  const calFacts = facts.filter((f) => f.day >= from && f.day <= today);
  const netOf = (f: DayFacts) => netKcal(f.eatenKcal, dayBurn(f.bmrKcal, f.burnedKcal));
  // Any logged day counts, a fasting day included: a 2,500 deficit is a real deficit.
  const countable = (f: DayFacts) => f.bmrKcal > 0 && f.anyEntry;
  let bars: NetBar[];
  if (range === "week" || range === "month") {
    bars = calFacts.filter(countable).map((f) => ({
      label: range === "week" ? LETTERS[(diffDays(f.day, ws) + 7) % 7] ?? "" : String(Number(f.day.slice(8))),
      net: netOf(f),
      today: f.day === today,
    }));
  } else {
    const weeks = new Map<string, DayFacts[]>();
    for (const f of calFacts.filter(countable)) {
      const key = weekStart(f.day);
      const list = weeks.get(key);
      if (list) list.push(f);
      else weeks.set(key, [f]);
    }
    bars = [...weeks.entries()].slice(-26).map(([w, list]) => ({
      label: String(Number(w.slice(8))),
      net: Math.round(list.reduce((s, f) => s + netOf(f), 0) / list.length),
      today: w === ws,
    }));
  }
  const finishedNet = calFacts.filter((f) => f.day < today && countable(f)).map(netOf);
  const avgNet = finishedNet.length > 0 ? finishedNet.reduce((s, v) => s + v, 0) / finishedNet.length : null;
  const goalKind = goalFor(latestAvg, Number(profile.goal_weight_kg));
  const projectionNet = projectNet({
    goal: goalKind,
    avgNet,
    loggedDays: finishedNet.length,
    currentKg: latestAvg,
    goalKg: Number(profile.goal_weight_kg),
  });
  const targetRow = facts.find((f) => f.bmrKcal > 0 && f.day === today) ?? facts.find((f) => f.bmrKcal > 0);
  const targetNet = targetRow ? targetRow.budgetKcal - dayBurn(targetRow.bmrKcal, 0) : 0;
  // The Coach's read: the last 14 finished days.
  const recent = facts.filter((f) => f.day >= addDays(today, -14) && f.day < today);
  const recentNets = recent.filter(countable).map(netOf);
  const planned = recent.filter((f) => f.plannedKeys.length > 0);
  const sleeps = recent.map((f) => f.sleepHours).filter((v): v is number => v !== null);
  const coach = coachRead({
    days: recent.length,
    daysLogged: recent.filter((f) => f.anyEntry).length,
    avgSleep: sleeps.length >= 3 ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null,
    proteinDays: recent.filter((f) => ringsFor(f, true).protein.closed).length,
    sessionsPlanned: planned.length,
    sessionsDone: planned.filter((f) => f.sessionDone).length,
    avgNet: recentNets.length > 0 ? recentNets.reduce((a, b) => a + b, 0) / recentNets.length : null,
    targetNet,
    goal: goalKind,
    streak: ledger.streak,
  });
  const insightKey = `${today}|${range}|${projectionNet.avgNet}|${projectionNet.loggedDays}|${latestAvg}`;

  // Body.
  const waists = measures.filter((m) => m.waist_cm !== null);
  const lastWaist = waists[waists.length - 1] ?? null;
  const firstWaist = waists[0] ?? null;
  const height = Number(profile.height_cm);
  const latestWeight = entries[entries.length - 1]?.kg ?? null;
  const neckLatest = [...measures].reverse().find((m) => m.neck_cm !== null)?.neck_cm ?? null;
  const hipsLatest = [...measures].reverse().find((m) => m.hips_cm !== null)?.hips_cm ?? null;
  const fatNow =
    lastWaist && neckLatest !== null
      ? bodyFatNavy({
          sex: profile.sex,
          heightCm: height,
          waistCm: Number(lastWaist.waist_cm),
          neckCm: Number(neckLatest),
          hipsCm: hipsLatest === null ? null : Number(hipsLatest),
        })
      : null;
  const fatFirst =
    firstWaist && neckLatest !== null
      ? bodyFatNavy({
          sex: profile.sex,
          heightCm: height,
          waistCm: Number(firstWaist.waist_cm),
          neckCm: Number(neckLatest),
          hipsCm: hipsLatest === null ? null : Number(hipsLatest),
        })
      : null;

  const weekRings = weekDays(ws).map((d, i) => {
    const f = facts.find((x) => x.day === d);
    const rings = f && d <= today ? dayRings(f) : null;
    return {
      day: d,
      letter: LETTERS[i] ?? "",
      fuel: rings ? Math.min(1, rings.deficit) : 0,
      protein: rings ? Math.min(1, rings.protein) : 0,
      train: rings ? Math.min(1, rings.train) : 0,
      today: d === today,
    };
  });

  // Season record and level history.
  const weeks = (allReviews.data ?? []).map((r) => ({
    weekStart: r.week_start,
    result: (["W", "D", "L", "F"].includes(r.result) ? r.result : "F") as "W" | "D" | "L" | "F",
  }));
  const levels: { level: DivisionT; day: string }[] = [];
  for (const s of scores.data ?? []) {
    if (levels[levels.length - 1]?.level !== s.division) levels.push({ level: s.division, day: s.day });
  }
  if (levels.length === 0) levels.push({ level: "starting_line", day: profile.created_at.slice(0, 10) });

  // Weight movement lines: this week and since the start (7-day averages).
  const weekAgoAvg = trendAll.find((t) => t.day === addDays(today, -7))?.avgKg ?? null;
  const startKg = entries[0]?.kg ?? null;
  const weekKg =
    latestAvg !== null && weekAgoAvg !== null ? Math.round((latestAvg - weekAgoAvg) * 10) / 10 : null;
  const totalKg =
    latestAvg !== null && startKg !== null ? Math.round((latestAvg - startKg) * 10) / 10 : null;

  const answerFlag = (flags.data ?? []).find((f) => f.key === "answer_back");
  const answerActive = answerFlag
    ? Boolean((answerFlag.value as { active?: boolean } | null)?.active)
    : false;

  return {
    range,
    weekStart: ws,
    comparison,
    matchLine: line,
    winStreak: winStreak([...results].reverse()),
    daysLeft: 6 - diffDays(today, ws),
    offers,
    picked,
    records: {
      benchBest: bench ? `${bench.weightKg} kg x ${bench.reps}` : null,
      bestStreak: ledger.bestStreak,
      lowestAvg: low ? Math.round(low.avgKg * 10) / 10 : null,
    },
    weekRings,
    weight: {
      daily,
      trend,
      latestAvg: latestAvg === null ? null : Math.round(latestAvg * 10) / 10,
      changeKg: change,
      goalKg: Number(profile.goal_weight_kg),
      goalText: goalLine(projection),
      entriesCount: entries.length,
      weekKg,
      totalKg,
    },
    coachRead: coach,
    callus: ledger.callus,
    careerDays: ledger.careerDays,
    division: ledger.division,
    net: { bars, goal: goalKind, targetNet, projection: projectionNet, insightKey },
    body: {
      waistCm: lastWaist ? Number(lastWaist.waist_cm) : null,
      waistDelta:
        lastWaist && firstWaist && lastWaist.id !== firstWaist.id
          ? Math.round((Number(firstWaist.waist_cm) - Number(lastWaist.waist_cm)) * 10) / 10
          : null,
      waistToHeight: lastWaist ? Math.round(waistToHeight(Number(lastWaist.waist_cm), height) * 100) / 100 : null,
      bodyFat: fatNow === null ? null : Math.round(fatNow * 10) / 10,
      bodyFatDelta: fatNow !== null && fatFirst !== null ? Math.round((fatFirst - fatNow) * 10) / 10 : null,
      bmi: latestWeight === null ? null : Math.round(bmi(latestWeight, height) * 10) / 10,
      history: [...measures].reverse().slice(0, 12),
    },
    season: {
      w: weeks.filter((w) => w.result === "W").length,
      d: weeks.filter((w) => w.result === "D").length,
      l: weeks.filter((w) => w.result === "L").length,
      weeks,
    },
    levels,
    notes: (notes.data ?? []).map((n) => ({ id: n.id, text: n.text, when: n.created_at })),
    weeklySummary: reviews.data?.summary ?? null,
    trophies,
    photos: photoRows,
    answerBack: answerActive ? { active: true } : null,
  };
}

