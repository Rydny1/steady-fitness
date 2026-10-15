import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { requireProfile } from "@/lib/session";
import { capitalize } from "@/lib/utils";
import { loadToday } from "@/features/data/today";
import { formatDayLong, greeting } from "@/lib/dates";
import { RingsCard } from "@/features/today/components/rings-card";
import { FormCard } from "@/features/today/components/form-card";
import { Promises } from "@/features/today/components/promises";
import { LogList } from "@/features/today/components/log-list";
import { CheckinCard } from "@/features/today/components/checkin-sheet";
import { LevelCard } from "@/features/today/components/level-card";
import { AdaptiveNote } from "@/features/today/components/adaptive-note";
import { EnergyLine } from "@/features/today/components/energy-line";
import { CoachNote } from "@/components/coach-note";
import { signedUrls } from "@/features/photos/signed-urls";
import { copy } from "@/content/copy";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const { supabase, profile, today } = await requireProfile();
  const d = await loadToday(supabase, profile, today, new Date());

  const photoPaths = d.foods.map((f) => f.photoPath).filter((p): p is string => p !== null);
  const photoUrls = await signedUrls(supabase, "meal-photos", photoPaths);

  const footerParts = [
    d.leftKcal >= 0 ? copy.today.left(d.leftKcal.toLocaleString("en-GB")) : copy.today.over((-d.leftKcal).toLocaleString("en-GB")),
    d.sessionKey && !d.facts.sessionDone ? copy.today.sessionToDo(d.sessionName) : null,
  ].filter(Boolean);

  return (
    <main>
      {d.levelEvent ? (
        <LevelCard kind={d.levelEvent.kind} division={d.levelEvent.division} callus={d.form.callus} />
      ) : null}
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

      <RingsCard
        rings={d.rings}
        fuel={{ eaten: d.facts.eatenKcal, budget: d.budgetKcal }}
        protein={{ eaten: d.facts.proteinG, target: d.facts.proteinTargetG }}
        train={{ done: d.trainDone, planned: d.trainPlanned }}
        footer={footerParts.join(" ")}
      />
      <EnergyLine
        goal={d.energy.goal}
        yesterdayNet={d.energy.yesterdayNet}
        plannedNet={d.energy.plannedNet}
        read={d.energy.read}
      />
      {d.observer ? <CoachNote className="mx-4 mt-4">{d.observer}</CoachNote> : null}

      <section
        className="mx-4 mt-5 rounded-hero bg-ink px-4 pb-6 pt-7 text-white"
        aria-label={copy.today.todaysLine}
      >
        <div className="text-caption text-muted-dark">{copy.today.todaysLine}</div>
        <p className="mt-3 text-[clamp(22px,6.67vw,25px)] font-semibold leading-[1.22] tracking-[-0.4px]">
          {d.line.text}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[clamp(12px,3.59vw,13px)] text-muted-dark">{d.line.byline}</span>
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
      <Promises habits={d.habits} day={today} />
      <LogList foods={d.foods} activities={d.activities} photoUrls={photoUrls} />
    </main>
  );
}
