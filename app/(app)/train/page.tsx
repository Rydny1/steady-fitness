import Link from "next/link";
import { Check, Repeat } from "lucide-react";
import { requireProfile } from "@/lib/session";
import { addDays, isDay, isoWeekday, weekDays, weekStart, weekdayShort } from "@/lib/dates";
import { loadDayFacts, planKeys, toPlanMap, type PlanMap } from "@/features/data/day-facts";
import { exercises, exercisesForSession, sessions, type Exercise } from "@/content/exercises";
import { stretchRoutine } from "@/content/stretch";
import { loadHistory, hintLabel, lastLabel } from "@/features/training/data";
import { ExerciseCards, type CardExercise } from "@/features/training/components/exercise-cards";
import { Library } from "@/features/training/components/library";
import { QuickDone } from "@/features/training/components/quick-done";
import { SESSION_NAMES } from "@/features/settings/defaults";
import { ExerciseImage } from "@/components/exercise-image";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";
import type { SessionKeyT } from "@/lib/supabase/types";

export const metadata = { title: "Train" };


const MUSCLES = ["chest", "back", "shoulders", "arms", "legs", "core"] as const;

const TAGS: Partial<Record<SessionKeyT, string[]>> = {
  gym_a: ["Legs", "Core"],
  gym_b: ["Chest", "Shoulders", "Triceps", "Core"],
  gym_c: ["Back", "Biceps", "Rear shoulders", "Core"],
};

const QUICK: Partial<
  Record<SessionKeyT, { activity: "football" | "run" | "stretch"; minutes: number; desc: string }>
> = {
  football: { activity: "football", minutes: 60, desc: "Log the minutes. Do the stretch routine after." },
  run: { activity: "run", minutes: 30, desc: "30 min at a pace where you can talk in full sentences. Football gives you the sprints. This builds the engine underneath." },
  run_intervals: { activity: "run", minutes: 40, desc: copy.train.intervalsDesc },
  stretch: { activity: "stretch", minutes: 10, desc: "10 min, daily, after football or before bed." },
};

function toCard(e: Exercise, history: Awaited<ReturnType<typeof loadHistory>>): CardExercise {
  const h = history[e.slug];
  const reps = e.toFailure
    ? "max"
    : e.seconds
      ? `${e.seconds} s${e.perSide ? " a side" : ""}`
      : `${e.repMin}${e.repMax && e.repMax !== e.repMin ? `-${e.repMax}` : ""}${e.perSide ? " a side" : ""}`;
  return {
    slug: e.slug,
    name: e.name,
    prescription: `${e.sets} x ${reps}, rest ${e.rest} s`,
    lastLabel: h ? lastLabel(h.last) : null,
    hint: h ? hintLabel(h.hint) : null,
    how: e.how,
    tip: e.tip,
    works: e.works,
    altNote: e.altNote,
  };
}

export default async function TrainPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; s?: string }>;
}) {
  const { d, s } = await searchParams;
  const { supabase, user, today } = await requireProfile();
  const ws = weekStart(today);
  const days = weekDays(ws);
  const selected = d && isDay(d) && days.includes(d) ? d : today;

  const [facts, planRows] = await Promise.all([
    loadDayFacts(supabase, user.id, ws, addDays(ws, 6)),
    supabase.from("weekly_plan").select("weekday,session_key"),
  ]);

  const plan: PlanMap = toPlanMap(planRows.data ?? []);
  // A day can hold up to three sessions. Real ones first; a day with none is a rest day.
  const keysOn = (day: string): SessionKeyT[] => {
    const real = planKeys(plan, day);
    return real.length > 0 ? real : [(plan.get(isoWeekday(day)) ?? ["rest"]).includes("stretch") ? "stretch" : "rest"];
  };
  const dayKeys = keysOn(selected);
  const key: SessionKeyT = s && (dayKeys as string[]).includes(s) ? (s as SessionKeyT) : (dayKeys[0] ?? "rest");
  const playable = key !== "rest" && key !== "stretch" ? key : null;

  const gymKey = key === "gym_a" || key === "gym_b" || key === "gym_c" ? key : null;
  const gymExercises = gymKey ? exercisesForSession(gymKey) : [];
  const history = await loadHistory(supabase, [...gymExercises, ...exercises], null);
  const cards = gymExercises.map((e) => toCard(e, history));
  const quick = QUICK[key];

  const byMuscle: Record<string, CardExercise[]> = {};
  for (const m of MUSCLES) {
    byMuscle[m] = exercises.filter((e) => e.muscle === m).map((e) => toCard(e, history));
  }
  const stretchCards: CardExercise[] = stretchRoutine.map((s) => {
    const ex = exercises.find((e) => e.slug === s.slug);
    return {
      slug: s.slug,
      name: s.name,
      prescription: s.prescription,
      lastLabel: null,
      hint: null,
      how: ex?.how ?? "",
      tip: ex?.tip ?? "",
      works: s.why,
    };
  });

  const heroSlug = gymExercises[0]?.slug ?? null;
  const minutes = gymKey ? 45 : (quick?.minutes ?? 0);

  return (
    <main>
      <h1 className="px-4 pt-[max(16px,env(safe-area-inset-top))] text-title font-bold tracking-[-0.8px]">{copy.train.title}</h1>

      <nav aria-label="Week" className="mx-4 mt-4 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const ks = keysOn(day);
          const isSel = day === selected;
          const isToday = day === today;
          const fact = facts.find((f) => f.day === day);
          const planned = ks.filter((k) => k !== "rest" && k !== "stretch");
          const doneDay = Boolean(fact?.sessionDone) && day <= today;
          return (
            <Link
              key={day}
              href={`/train?d=${day}`}
              aria-current={isSel ? "date" : undefined}
              aria-label={`${weekdayShort(day)} ${Number(day.slice(8))}, ${ks.map((k) => SESSION_NAMES[k]).join(" and ")}`}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-0.5 rounded-ctl text-nav",
                isSel ? "bg-ink text-white" : "bg-card text-muted",
                !isSel && isToday && "ring-2 ring-inset ring-ink",
              )}
            >
              <span className="text-[11px] leading-none">{weekdayShort(day)}</span>
              <span className={cn("num text-[clamp(16px,4.6vw,18px)] leading-none", !isSel && "text-ink")}>
                {Number(day.slice(8))}
              </span>
              <span className="flex h-3 items-center">
                {doneDay ? (
                  <Check size={12} strokeWidth={3} aria-hidden="true" className={isSel ? "text-white" : "text-fuel"} />
                ) : planned.length > 0 ? (
                  <span className="flex gap-[3px]">
                    {planned.map((k) => (
                      <span key={k} className={cn("h-1.5 w-1.5 rounded-full", isSel ? "bg-white" : "bg-train")} />
                    ))}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
      </nav>


      {dayKeys.length > 1 ? (
        <div className="mx-4 mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Sessions today">
          {dayKeys.map((k) => (
            <Link
              key={k}
              href={`/train?d=${selected}&s=${k}`}
              role="tab"
              aria-selected={k === key}
              className={cn("min-h-11 rounded-full px-4 py-2.5 text-small font-semibold", k === key ? "bg-ink text-white" : "bg-card text-muted")}
            >
              {SESSION_NAMES[k]}
            </Link>
          ))}
        </div>
      ) : null}

      {heroSlug ? (
        <section
          aria-label={SESSION_NAMES[key]}
          className="relative mx-4 mt-3 h-[150px] overflow-hidden rounded-hero bg-line"
        >
          <ExerciseImage slug={heroSlug} name={SESSION_NAMES[key]} className="h-full w-full" />
          <span className="absolute left-3 top-3 rounded-full bg-surface px-3 py-1 text-caption font-semibold text-ink">
            {new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(
              new Date(`${selected}T12:00:00Z`),
            )}
          </span>
        </section>
      ) : null}
      <div className="mx-4 mt-4">
        {!heroSlug ? (
          <div className="text-small text-muted">
            {new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(
              new Date(`${selected}T12:00:00Z`),
            )}
          </div>
        ) : null}
        <div className="text-sub font-bold tracking-[-0.5px]">{SESSION_NAMES[key]}</div>
        <div className="mt-[2px] text-[clamp(13px,4.10vw,15px)] text-muted">
          {gymKey ? `5 exercises and a core finisher. ${minutes} min` : (quick?.desc ?? "No session planned. Stretch if you like.")}
        </div>
        {TAGS[key] ? (
          <div className="mt-3 flex flex-wrap gap-[6px]">
            {TAGS[key]?.map((t) => (
              <span key={t} className="rounded-full bg-card px-3 py-[6px] text-[clamp(13px,3.8vw,14px)]">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {gymKey ? (
        <div className="mx-4 mt-[18px] flex gap-[10px]">
          {selected === today ? (
            <Link
              href={`/train/${gymKey}`}
              prefetch={false}
              className="flex h-[54px] flex-1 items-center justify-center rounded-full bg-ink text-body font-semibold text-white"
            >
              {copy.train.startSession}
            </Link>
          ) : (
            <span className="flex h-[54px] flex-1 items-center justify-center rounded-full bg-card text-body font-semibold text-muted">
              Planned for {weekdayShort(selected)}
            </span>
          )}
          <span
            aria-hidden="true"
            className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-card"
          >
            <Repeat size={20} strokeWidth={1.9} />
          </span>
        </div>
      ) : null}

      {quick && selected === today && playable ? (
        <QuickDone
          day={today}
          sessionKey={key}
          activity={quick.activity}
          minutes={quick.minutes}
        />
      ) : null}

      {gymKey ? (
        <ExerciseCards key={gymKey} items={cards} />
      ) : (
        <p className="mx-4 mt-5 text-small text-muted">{sessions.gym_a.name} on Tuesday. {sessions.gym_b.name} on Friday. {sessions.gym_c.name} on Saturday.</p>
      )}

      <section className="mt-8" aria-labelledby="stretch-h">
        <h2 id="stretch-h" className="mx-4 text-section font-bold tracking-[-0.3px]">
          {copy.train.stretch}
        </h2>
        <ExerciseCards items={stretchCards} startOpen={false} numbered={false} />
      </section>

      <Library byMuscle={byMuscle} />
    </main>
  );
}
