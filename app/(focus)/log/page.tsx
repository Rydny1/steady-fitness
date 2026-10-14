import { requireProfile } from "@/lib/session";
import { loadDayFacts } from "@/features/data/day-facts";
import { dayBudget } from "@/features/nutrition/targets";
import { LogScreen } from "@/features/logging/components/log-screen";

export const metadata = { title: "Log" };

export default async function LogPage() {
  const { supabase, user, today } = await requireProfile();
  const [facts, saved, weight] = await Promise.all([
    loadDayFacts(supabase, user.id, today, today),
    supabase
      .from("saved_foods")
      .select("id,name,quantity,unit,kcal,protein_g")
      .order("use_count", { ascending: false })
      .limit(12),
    supabase
      .from("measurements")
      .select("weight_kg")
      .not("weight_kg", "is", null)
      .order("measured_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const f = facts[0];
  return (
    <LogScreen
      day={today}
      eatenKcal={f?.eatenKcal ?? 0}
      budgetKcal={f ? dayBudget(f.budgetKcal, f.burnedKcal) : 0}
      weightKg={weight.data?.weight_kg ?? 80}
      saved={saved.data ?? []}
    />
  );
}
