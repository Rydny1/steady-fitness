import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { addDays } from "@/lib/dates";
import { adaptiveBudget, adaptiveLine, type AdaptiveDay } from "@/features/nutrition/adaptive-budget";
import { trendAt } from "@/features/body/metrics";
import { loadDayFacts } from "@/features/data/day-facts";
import { budgetFactorFor, fullBurn, goalFor } from "@/features/nutrition/energy";

type Db = SupabaseClient<Database>;

const WINDOW_DAYS = 14;

/**
 * Monday job (PRODUCT.md #19): learn the real daily burn from what was eaten and how the
 * 7-day weight average moved, then move the budget by at most 150 kcal. Code only, no AI.
 * Skipped when the user turned it off (they set their own targets by hand).
 */
export async function runAdaptiveBudget(admin: Db, userId: string, today: string): Promise<string | null> {
  const { data: flag } = await admin
    .from("user_flags")
    .select("value")
    .eq("user_id", userId)
    .eq("key", "adaptive_budget")
    .maybeSingle();
  if ((flag?.value as { enabled?: boolean } | null)?.enabled === false) return null;

  const from = addDays(today, -WINDOW_DAYS);
  const to = addDays(today, -1);
  const [facts, weights, target, profile] = await Promise.all([
    loadDayFacts(admin, userId, from, to),
    admin
      .from("measurements")
      .select("measured_on,weight_kg")
      .eq("user_id", userId)
      .not("weight_kg", "is", null),
    admin
      .from("targets")
      .select("bmr_kcal,budget_kcal,protein_g")
      .eq("user_id", userId)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("profiles").select("goal_weight_kg").eq("user_id", userId).maybeSingle(),
  ]);
  if (!target.data) return null;

  const entries = (weights.data ?? []).map((w) => ({ day: w.measured_on, kg: Number(w.weight_kg) }));
  const start = trendAt(entries, from);
  const end = trendAt(entries, to);
  if (start === null || end === null) return null;

  const days: AdaptiveDay[] = facts.map((f) => ({ day: f.day, kcal: f.eatenKcal > 0 ? f.eatenKcal : null }));
  const result = adaptiveBudget({
    days,
    trendStartKg: start,
    trendEndKg: end,
    currentBudgetKcal: target.data.budget_kcal,
    bmrKcal: target.data.bmr_kcal,
    budgetFactor: budgetFactorFor(goalFor(end, Number(profile.data?.goal_weight_kg ?? end))),
    avgExerciseKcal: facts.length > 0 ? facts.reduce((s, f) => s + fullBurn(f.burnedKcal), 0) / facts.length : 0,
  });
  const line = adaptiveLine(result);
  if (result.status !== "ok" || !line) return null;

  if (result.changeKcal !== 0) {
    await admin.from("targets").upsert(
      {
        user_id: userId,
        effective_from: today,
        bmr_kcal: target.data.bmr_kcal,
        budget_kcal: result.newBudgetKcal,
        protein_g: target.data.protein_g,
      },
      { onConflict: "user_id,effective_from" },
    );
  }
  await admin.from("user_flags").upsert(
    { user_id: userId, key: "adaptive_note", value: { text: line, seen: false, day: today } },
    { onConflict: "user_id,key" },
  );
  return line;
}
