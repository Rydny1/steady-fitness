import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { addDays, weekStart } from "@/lib/dates";
import { compareWeeks, type DayRecord, type WeekComparison } from "@/features/game";
import { loadDayFacts, toRecord } from "@/features/data/day-facts";
import { groundWeekly, type FactValues } from "@/features/insights/grounding";
import { weeklyReport } from "@/lib/ai/gemini";
import { matchLines, roundNames } from "@/content/copy";

type Db = SupabaseClient<Database>;

const lower = (s: string) => s.slice(0, 1).toLowerCase() + s.slice(1);

/** Plain 3-sentence report, built from the same numbers. Always works, AI off or on. */
export function templateReport(cmp: WeekComparison, loggedDays: number, sessions: number): string {
  if (cmp.noGhost) {
    return `Week one. You logged ${loggedDays} days and did ${sessions} sessions. Next week this is the bar.`;
  }
  const wins = cmp.rounds.filter((r) => r.outcome === "win").sort((a, b) => b.you - b.ghost - (a.you - a.ghost));
  const losses = cmp.rounds.filter((r) => r.outcome === "loss").sort((a, b) => a.you - a.ghost - (b.you - b.ghost));
  const good = wins[0];
  const bad = losses[0];
  return [
    good ? `${roundNames[good.key]}: ${good.you} against ${good.ghost}.` : `You logged ${loggedDays} days.`,
    bad ? `${roundNames[bad.key]}: ${bad.you} against ${bad.ghost}.` : "No round lost.",
    bad ? `Next week, win the ${lower(roundNames[bad.key])} round.` : "Next week, repeat it.",
  ].join(" ");
}

/**
 * Builds the week's report (Sunday 21:00) and stores it on weekly_reviews.
 * Gemini writes 3 sentences in the Coach's voice from the week's numbers only, and the
 * grounding check must pass or the template report is used instead.
 */
export async function writeWeeklyReport(
  admin: Db,
  userId: string,
  sunday: string,
): Promise<string> {
  const ws = weekStart(sunday);
  const lastStart = addDays(ws, -7);
  const facts = await loadDayFacts(admin, userId, lastStart, sunday);
  const afterDay = addDays(sunday, 1);
  const thisWeek: DayRecord[] = facts.filter((x) => x.day >= ws).map((x) => toRecord(x, afterDay));
  const lastWeek: DayRecord[] = facts
    .filter((x) => x.day < ws)
    .map((x) => toRecord(x, afterDay));
  const hasGhost = lastWeek.some((r) => r.logged);
  const cmp = compareWeeks({ weekStart: ws, through: sunday, thisWeek, lastWeek: hasGhost ? lastWeek : null });

  const loggedDays = thisWeek.filter((r) => r.logged).length;
  const sessions = thisWeek.filter((r) => r.planned && r.sessionDone).length;

  const values: FactValues = { logged_days: loggedDays, sessions };
  for (const r of cmp.rounds) {
    values[`${r.key}_you`] = r.you;
    values[`${r.key}_ghost`] = r.ghost;
  }
  values.score_you = cmp.scoreYou;
  values.score_ghost = cmp.scoreGhost;

  let summary = templateReport(cmp, loggedDays, sessions);
  const res = await weeklyReport(JSON.stringify({ week: values, rounds: roundNames }));
  if (res.ok && groundWeekly(res.data, [values])) summary = res.data;

  const code = cmp.result === "win" ? "W" : cmp.result === "loss" ? "L" : cmp.result === "draw" ? "D" : "F";
  await admin.from("weekly_reviews").upsert(
    {
      user_id: userId,
      week_start: ws,
      result: code,
      rounds: Object.fromEntries(cmp.rounds.map((r) => [r.key, [r.you, r.ghost]])) as Json,
      score_you: cmp.scoreYou,
      score_ghost: cmp.scoreGhost,
      summary: summary.slice(0, 800),
    },
    { onConflict: "user_id,week_start" },
  );
  return fullTimeLine(cmp);
}

/** The week-done line for the Sunday push. */
export function fullTimeLine(cmp: WeekComparison): string {
  if (cmp.noGhost) return matchLines.noGhost;
  if (cmp.perfect) return matchLines.perfect;
  if (cmp.result === "win") return matchLines.fullTimeWin(cmp.scoreYou, cmp.scoreGhost);
  if (cmp.result === "draw") return matchLines.draw(cmp.scoreYou, cmp.scoreGhost);
  return `Week done. ${cmp.scoreYou} - ${cmp.scoreGhost}.`;
}
