import Link from "next/link";
import { Award, Dumbbell } from "lucide-react";
import { requireProfile } from "@/lib/session";
import { capitalize } from "@/lib/utils";
import { loadToday } from "@/features/data/today";
import { deficitStatus } from "@/features/nutrition/energy";
import { deficitFact } from "@/features/game/streak-moments";
import { formatDayLong, greeting } from "@/lib/dates";
import { RingsCard } from "@/features/today/components/rings-card";
import { FormCard } from "@/features/today/components/form-card";
import { Promises } from "@/features/today/components/promises";
import { LogList } from "@/features/today/components/log-list";
import { CheckinCard } from "@/features/today/components/checkin-sheet";
import { Moments } from "@/features/today/components/moments";
import { Celebration } from "@/features/today/components/celebration";
import { LevelCard } from "@/features/today/components/level-card";
import { AdaptiveNote } from "@/features/today/components/adaptive-note";
import { CoachNote } from "@/components/coach-note";
import { copy } from "@/content/copy";

export const metadata = { title: "Today" };

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile, today } = await requireProfile();
  const d = await loadToday(supabase, profile, today, new Date());


  const net = d.energy.todayNet ?? 0;
  const status = deficitStatus(net, d.energy.plannedNet, d.energy.goal, d.facts.eatenKcal, d.budgetKcal, d.hour);
  const fact = d.energy.goal === "lose" ? deficitFact(-net) : null;
  const footerParts = [status.text, fact].filter(Boolean);

  return (
    <main>
      {d.levelEvent ? (
        <LevelCard kind={d.levelEvent.kind} division={d.levelEvent.division} callus={d.form.callus} />
      ) : null}
      <Moments
        name={capitalize(profile.display_name)}
        day={today}
        streak={d.streak}
        week={d.weekDots}
        loggedToday={d.loggedToday}
        saved={sp.saved === "1"}
        status={status.text}
        proteinHit={d.proteinHit}
        trained={d.trainDone > 0}
        quiet={Boolean(d.levelEvent) || d.celebrate.length > 0}
      />
      {!d.levelEvent && d.celebrate.length > 0 ? <Celebration trophies={d.celebrate} /> : null}
      <div className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <span className="text-small text-muted">{formatDayLong(today)}</span>
        <Link
          href="/settings"
          aria-label="Profile"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-body font-semibold"
        >
          {capitalize(profile.display_name.slice(0, 1))}
        </Link>
      </div>
      <h1 className="mx-4 mt-1 text-title font-bold tracking-[-0.8px]">
        {greeting(d.hour, profile.display_name)}
      </h1>
      {d.title ? (
        <span className="neon-chip mx-4 mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold">
          <Award size={14} strokeWidth={2} aria-hidden="true" />
          {d.title}
        </span>
      ) : null}

      <RingsCard
        rings={d.rings}
        fuel={{ net, target: d.energy.plannedNet, goal: d.energy.goal }}
        protein={{ eaten: d.facts.proteinG, target: d.facts.proteinTargetG }}
        train={{ done: d.trainDone, planned: d.trainPlanned }}
        footer={footerParts.join(" ")}
      />
      {d.observer ? <CoachNote className="mx-4 mt-4">{d.observer}</CoachNote> : null}

      <Promises habits={d.habits} day={today} streak={d.streak} week={d.weekDots} />

      <section
        className="mx-4 mt-5 rounded-hero bg-ink px-4 pb-6 pt-7 text-white"
        aria-label={copy.today.todaysLine}
      >
        <div className="text-caption text-muted-dark">{copy.today.todaysLine}</div>
        <p className="mt-3 text-[clamp(22px,6.67vw,25px)] font-semibold leading-[1.22] tracking-[-0.4px]">
          {d.line.text}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[clamp(13px,3.8vw,14px)] text-muted-dark">{d.line.byline}</span>
          <span className="h-1 w-7 rounded-full bg-amber" />
        </div>
      </section>

      <FormCard d={d} />
      {d.adaptiveNote ? <AdaptiveNote text={d.adaptiveNote} /> : null}

      <Link
        href={d.sessionKey ? `/train/${d.sessionKey}` : "/train"}
        prefetch={false}
        className="mx-4 mt-4 flex items-center gap-[14px] rounded-list bg-card p-4"
      >
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] bg-train-soft">
          <Dumbbell size={24} strokeWidth={1.9} className="text-train" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[clamp(15px,4.62vw,17px)] font-semibold">{d.sessionName}</span>
          <span className="block text-small text-muted">
            {d.sessionKey ? `About ${d.trainPlanned} min` : copy.today.restDay}
          </span>
        </span>
        <span className="rounded-full bg-ink px-[18px] py-3 text-small font-semibold text-white">
          {d.facts.sessionDone ? "Done" : copy.today.start}
        </span>
      </Link>

      <CheckinCard
        day={today}
        checkin={d.checkin}
        sickUsed={d.sickUsedThisMonth}
        show={d.hour >= 18}
      />
      <LogList foods={d.foods} activities={d.activities} photoUrls={{}} />
    </main>
  );
}
