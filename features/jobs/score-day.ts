import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DivisionT, Json } from "@/lib/supabase/types";
import { addDays, isoWeekday, weekStart } from "@/lib/dates";
import {
  answerBackOffer,
  answerBackProgress,
  answerBackReward,
  callusLost,
  challengeProgress,
  clampCallus,
  compareWeeks,
  scoreDay,
  weeklyPoints,
  type ChallengeKey,
  type DayRecord,
} from "@/features/game";
import { dayBudget } from "@/features/nutrition/targets";
import { loadDayFacts, sessionStatusFor, toRecord } from "@/features/data/day-facts";
import { latestLedger } from "@/features/data/ledger";
import { toChallengeDay } from "@/features/data/progress";

type Db = SupabaseClient<Database>;

type AnswerBackState = { active: boolean; startDay: string; lost: number };

/**
 * Scores one finished day and writes the ledger row. Idempotency is the caller's job
 * (job_runs). Uses the secret-key client, so every read here filters by user id.
 * Sunday also freezes the week (weekly_reviews) and applies the week's points.
 */
export type ScoreEvent = { kind: "promoted" | "dropped"; division: DivisionT } | null;

export async function scoreUserDay(admin: Db, userId: string, day: string): Promise<ScoreEvent> {
  const prev = await latestLedger(admin, userId);
  if (prev.day !== null && prev.day >= day) return null;

  const ws = weekStart(day);
  const lastStart = addDays(ws, -7);
  const facts = await loadDayFacts(admin, userId, lastStart, day);
  const f = facts.find((x) => x.day === day);
  if (!f) return null;
  const afterDay = addDays(day, 1);
  const budget = dayBudget(f.budgetKcal, f.burnedKcal);

  // Week close on Sunday: result, rounds, challenge.
  let weeklyPts = 0;
  let weekResult: "win" | "loss" | "draw" | "none" = "none";
  let weekSummaryRow: {
    result: "W" | "D" | "L" | "F";
    rounds: Json;
    you: number;
    ghost: number;
  } | null = null;
  const thisWeek: DayRecord[] = facts.filter((x) => x.day >= ws).map((x) => toRecord(x, afterDay));
  const lastWeek: DayRecord[] = facts
    .filter((x) => x.day >= lastStart && x.day < ws)
    .map((x) => toRecord(x, afterDay));

  if (isoWeekday(day) === 7) {
    const hasGhost = lastWeek.some((r) => r.logged);
    const cmp = compareWeeks({
      weekStart: ws,
      through: day,
      thisWeek,
      lastWeek: hasGhost ? lastWeek : null,
    });
    weekResult = cmp.result === "no_ghost" ? "none" : cmp.result;

    let challengeDone = false;
    const { data: picked } = await admin
      .from("weekly_challenges")
      .select("challenge_key")
      .eq("user_id", userId)
      .eq("week_start", ws)
      .maybeSingle();
    if (picked) {
      const { data: photos } = await admin
        .from("photos")
        .select("pose")
        .eq("user_id", userId)
        .eq("kind", "progress")
        .gte("taken_on", ws)
        .lte("taken_on", day);
      const prog = challengeProgress({
        key: picked.challenge_key as ChallengeKey,
        weekStart: ws,
        today: afterDay,
        days: facts.filter((x) => x.day >= ws).map(toChallengeDay),
        photoPoses: (photos ?? []).flatMap((p) => (p.pose ? [p.pose] : [])),
      });
      challengeDone = prog.done;
      if (challengeDone) {
        await admin
          .from("user_flags")
          .upsert({ user_id: userId, key: `challenge_done:${ws}`, value: { day } }, { onConflict: "user_id,key" });
      }
    }
    weeklyPts = weeklyPoints(weekResult, challengeDone);

    weekSummaryRow = {
      result: cmp.result === "win" ? "W" : cmp.result === "loss" ? "L" : cmp.result === "draw" ? "D" : "F",
      rounds: Object.fromEntries(
        cmp.rounds.map((r) => [
          r.key === "sessions"
            ? "sessions"
            : r.key === "days_logged"
              ? "days_logged"
              : r.key === "fuel_closed"
                ? "fuel_closed"
                : "protein_closed",
          [r.you, r.ghost],
        ]),
      ) as Json,
      you: cmp.scoreYou,
      ghost: cmp.scoreGhost,
    };
  }

  const score = scoreDay({
    logged: f.anyEntry,
    loggedOnDay: f.loggedOnDay,
    session: sessionStatusFor(f, true),
    eatenKcal: f.eatenKcal,
    budgetKcal: budget,
    bmrKcal: f.bmrKcal,
    proteinG: f.proteinG,
    proteinTargetG: f.proteinTargetG,
    habitsDone: f.habitsDone,
    sick: f.sick,
    weeklyPoints: weeklyPts,
    prev: {
      callus: prev.callus,
      division: prev.division,
      careerDays: prev.careerDays,
      streak: prev.streak,
      bestStreak: prev.bestStreak,
      offFormDays: prev.offFormDays,
    },
  });

  // Answer back: half the Callus lost comes back after 3 clean days.
  let callus = score.callus;
  const { data: abRow } = await admin
    .from("user_flags")
    .select("value")
    .eq("user_id", userId)
    .eq("key", "answer_back")
    .maybeSingle();
  const ab = abRow?.value as AnswerBackState | null;
  let nextAb: AnswerBackState | null = ab && ab.active ? ab : null;
  if (ab?.active) {
    const prog = answerBackProgress({ startDay: ab.startDay, today: afterDay, days: thisWeekAndLast(facts, afterDay) });
    if (prog.state === "done") {
      callus = clampCallus(callus + answerBackReward(ab.lost));
      nextAb = null;
      await admin.from("user_flags").upsert(
        { user_id: userId, key: `answer_back_done:${ab.startDay}`, value: { day } },
        { onConflict: "user_id,key" },
      );
    } else if (prog.state === "failed") {
      nextAb = null;
    }
  } else {
    const trigger = answerBackOffer({
      active: false,
      lastWeekResult: weekResult === "none" ? null : weekResult,
      yesterday: { logged: f.loggedOnDay, session: sessionStatusFor(f, true) },
    });
    const lost = callusLost(prev.callus, score.callus);
    if (trigger && lost > 0) nextAb = { active: true, startDay: afterDay, lost };
  }
  if (ab?.active || nextAb) {
    await admin.from("user_flags").upsert(
      {
        user_id: userId,
        key: "answer_back",
        value: (nextAb ?? { active: false, startDay: "", lost: 0 }) as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" },
    );
  }

  const breakdown = {
    ...score.breakdown,
    state: { bestStreak: score.bestStreak, offFormDays: score.offFormDays },
    promoted: score.promoted,
    dropped: score.dropped,
    from: score.previousDivision,
    milestones: score.milestonesHit,
  } as unknown as Json;

  const { error } = await admin.from("daily_scores").upsert(
    {
      user_id: userId,
      day,
      logged: score.counted,
      session_status: sessionStatusFor(f, true),
      points: score.points,
      breakdown,
      callus,
      division: score.division,
      career_days: score.careerDays,
      streak: score.streak,
    },
    { onConflict: "user_id,day", ignoreDuplicates: true },
  );
  if (error) throw new Error("ledger write failed");

  if (score.promoted || score.dropped) {
    await admin.from("user_flags").upsert(
      {
        user_id: userId,
        key: "chapter_event",
        value: {
          kind: score.promoted ? "promoted" : "dropped",
          division: score.division,
          from: score.previousDivision,
          day,
          seen: false,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" },
    );
  }

  if (weekSummaryRow) {
    await admin.from("weekly_reviews").upsert(
      {
        user_id: userId,
        week_start: ws,
        result: weekSummaryRow.result,
        rounds: weekSummaryRow.rounds,
        score_you: weekSummaryRow.you,
        score_ghost: weekSummaryRow.ghost,
      },
      { onConflict: "user_id,week_start" },
    );
  }

  return score.promoted || score.dropped
    ? { kind: score.promoted ? "promoted" : "dropped", division: score.division }
    : null;
}

function thisWeekAndLast(facts: Awaited<ReturnType<typeof loadDayFacts>>, today: string): DayRecord[] {
  return facts.map((x) => toRecord(x, today));
}
