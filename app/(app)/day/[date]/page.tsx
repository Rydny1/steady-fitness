import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { requireProfile } from "@/lib/session";
import { loadToday } from "@/features/data/today";
import { addDays, formatDayLong, isDay } from "@/lib/dates";
import { deficitStatus } from "@/features/nutrition/energy";
import { moveLine } from "@/features/game/streak-moments";
import { RingsCard } from "@/features/today/components/rings-card";
import { LogList } from "@/features/today/components/log-list";

export const metadata = { title: "Day" };

const BACK_DAYS = 60;

// Any recent day: see how it went and fix what you logged. Same list, same edit sheet as Today.
export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const { supabase, profile, today } = await requireProfile();
  if (!isDay(date) || date > today || date < addDays(today, -BACK_DAYS)) redirect("/today");
  if (date === today) redirect("/today");

  // The day is over: read it as if it is late evening.
  const d = await loadToday(supabase, profile, date, new Date(`${date}T19:30:00Z`));
  const net = d.energy.todayNet ?? 0;
  const status = deficitStatus(net, d.energy.plannedNet, d.energy.goal, d.facts.eatenKcal, d.budgetKcal, 23);
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const canPrev = prev >= addDays(today, -BACK_DAYS);

  return (
    <main>
      <div className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <Link href="/today" aria-label="Back to Today" className="flex h-11 w-11 items-center justify-center rounded-full bg-card">
          <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        </Link>
        <div className="flex items-center gap-1">
          {canPrev ? (
            <Link href={`/day/${prev}`} prefetch={false} aria-label="Previous day" className="flex h-11 w-11 items-center justify-center rounded-full bg-card">
              <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
            </Link>
          ) : null}
          <Link href={next === today ? "/today" : `/day/${next}`} prefetch={false} aria-label="Next day" className="flex h-11 w-11 items-center justify-center rounded-full bg-card">
            <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <h1 className="mx-4 mt-2 text-title font-bold tracking-[-0.8px]">{formatDayLong(date)}</h1>

      <RingsCard
        rings={d.rings}
        fuel={{ net, target: d.energy.plannedNet, goal: d.energy.goal }}
        protein={{ eaten: d.facts.proteinG, target: d.facts.proteinTargetG }}
        train={{ done: d.trainDone, planned: d.trainPlanned }}
        footer={[status.text, moveLine(net)].filter(Boolean).join(" ")}
      />

      <Link
        href={`/log?d=${date}`}
        prefetch={false}
        className="mx-4 mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink text-small font-semibold text-white"
      >
        <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
        Add to this day
      </Link>
      <LogList foods={d.foods} activities={d.activities} photoUrls={{}} />
    </main>
  );
}
