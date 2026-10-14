import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { addDays, rigaParts } from "@/lib/dates";
import { voiceFact } from "@/lib/ai/gemini";
import { dayBudget } from "@/features/nutrition/targets";
import { loadDayFacts, sessionStatusFor } from "@/features/data/day-facts";
import { SESSION_NAMES } from "@/features/settings/defaults";
import { computeFacts, pickFact, renderTemplate, type FactDay } from "./facts";
import { checkGrounding } from "./grounding";

type Db = SupabaseClient<Database>;

// The Observer (PRODUCT.md): after every save the Coach says one true thing.
// Facts come from code. Gemini only rewrites one fact as one line, and the line
// must pass the grounding check (no number or date that is not in the fact),
// otherwise the plain template line is used. Max 8 Gemini calls a day.

const MAX_AI_PER_DAY = 8;
const HISTORY_DAYS = 28;

export type ObserverContext = {
  justLogged: boolean;
  justLoggedFood: boolean;
  newBests?: { exerciseId: string; exercise: string; weightKg: number; reps: number }[];
  losingRound?: { round: string; n: number } | null;
};

export async function observe(
  supabase: Db,
  userId: string,
  now: Date,
  ctx: ObserverContext,
): Promise<string | null> {
  const parts = rigaParts(now);
  const today = parts.date;
  const from = addDays(today, -HISTORY_DAYS);

  const [days, weights, recent, aiToday] = await Promise.all([
    loadDayFacts(supabase, userId, from, today),
    supabase
      .from("measurements")
      .select("measured_on,weight_kg")
      .eq("user_id", userId)
      .not("weight_kg", "is", null)
      .order("measured_on"),
    supabase
      .from("observer_notes")
      .select("fact_id")
      .eq("user_id", userId)
      .gte("day", addDays(today, -3)),
    supabase
      .from("observer_notes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("day", today)
      .eq("ai", true),
  ]);

  const t = days[days.length - 1];
  if (!t) return null;
  const history: FactDay[] = days
    .filter((d) => d.day < today)
    .map((d) => ({
      day: d.day,
      logged: d.loggedOnDay,
      eatenKcal: d.eatenKcal,
      budgetKcal: dayBudget(d.budgetKcal, d.burnedKcal),
      proteinG: d.proteinG,
      proteinTargetG: d.proteinTargetG,
      plannedSession: d.plannedKey,
      sessionStatus: sessionStatusFor(d, true),
      sleepHours: d.sleepHours,
    }));

  const facts = computeFacts({
    today,
    nowHour: parts.hour + parts.minute / 60,
    justLogged: ctx.justLogged,
    justLoggedFood: ctx.justLoggedFood,
    todayStats: {
      eatenKcal: t.eatenKcal,
      budgetKcal: dayBudget(t.budgetKcal, t.burnedKcal),
      proteinG: t.proteinG,
      proteinTargetG: t.proteinTargetG,
      plannedSession: t.plannedKey,
      plannedSessionName: t.plannedKey ? SESSION_NAMES[t.plannedKey] : null,
      sessionDone: t.sessionDone,
    },
    history,
    weights: (weights.data ?? []).map((w) => ({ day: w.measured_on, kg: Number(w.weight_kg) })),
    newBests: ctx.newBests ?? [],
    losingRound: ctx.losingRound ?? null,
  });

  const shown = (recent.data ?? []).map((r) => r.fact_id);
  const fact = pickFact(facts, shown, parts.hour + parts.minute / 60);
  if (!fact) return null;

  let text = renderTemplate(fact);
  let ai = false;
  if ((aiToday.count ?? 0) < MAX_AI_PER_DAY) {
    const res = await voiceFact(JSON.stringify({ template: fact.template, values: fact.values }));
    if (res.ok && checkGrounding(res.data, fact.values)) {
      text = res.data;
      ai = true;
    }
  }

  const { error } = await supabase
    .from("observer_notes")
    .insert({ user_id: userId, day: today, fact_id: fact.id, text: text.slice(0, 300), ai });
  return error ? null : text;
}
