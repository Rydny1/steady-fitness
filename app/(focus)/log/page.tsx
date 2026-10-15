import { requireProfile } from "@/lib/session";
import { addDays, isDay } from "@/lib/dates";
import { loadDayFacts } from "@/features/data/day-facts";
import { dayBurn, netKcal } from "@/features/nutrition/energy";
import { LogScreen } from "@/features/logging/components/log-screen";

export const metadata = { title: "Log" };

export default async function LogPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, today } = await requireProfile();
  // Logging for an earlier day (up to 60 days back) comes from the Day page.
  const day = sp.d && isDay(sp.d) && sp.d <= today && sp.d >= addDays(today, -60) ? sp.d : today;
  const [facts, saved, weight] = await Promise.all([
    loadDayFacts(supabase, user.id, day, day),
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
      day={day}
      netKcal={f && f.bmrKcal > 0 ? netKcal(f.eatenKcal, dayBurn(f.bmrKcal, f.burnedKcal)) : 0}
      targetNet={f && f.bmrKcal > 0 ? Math.round(f.budgetKcal - dayBurn(f.bmrKcal, 0)) : 0}
      weightKg={weight.data?.weight_kg ?? 80}
      saved={saved.data ?? []}
    />
  );
}
