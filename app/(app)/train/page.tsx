import Link from "next/link";
import { Check, Repeat } from "lucide-react";
import { requireProfile } from "@/lib/session";
import { addDays, isDay, isoWeekday, weekDays, weekStart, weekdayShort } from "@/lib/dates";
import { loadDayFacts, planKey, type PlanMap } from "@/features/data/day-facts";
import { exercises, exercisesForSession, sessions, type Exercise } from "@/content/exercises";
import { stretchRoutine } from "@/content/stretch";
import { loadHistory, hintLabel, lastLabel } from "@/features/training/data";
import { ExerciseCards, type CardExercise } from "@/features/training/components/exercise-cards";
import { Library } from "@/features/training/components/library";
import { QuickDone } from "@/features/training/components/quick-done";
import { SESSION_NAMES } from "@/features/settings/defaults";
import { ExerciseImage } from "@/components/exercise-image";
import { copy } from "@/content/copy";
import { capitalize, cn } from "@/lib/utils";
import type { SessionKeyT } from "@/lib/supabase/types";

export const metadata = { title: "Train" };

const SHORT: Record<SessionKeyT, string> = {
  gym_a: "Legs",
  gym_b: "Chest",
  gym_c: "Back",
  run: "Run",
  run_intervals: "Run",
  football: "Ball",
  stretch: "Rest",
  rest: "Rest",
};

const MUSCLES = ["chest", "back", "shoulders", "arms", "legs", "core"] as const;
const COVERAGE: Partial<Record<SessionKeyT, (typeof MUSCLES)[number][]>> = {
  gym_a: ["legs", "core"],
  gym_b: ["chest", "shoulders", "arms", "core"],
  gym_c: ["back", "arms", "shoulders", "core"],
};

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
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const { supabase, user, today } = await requireProfile();
  const ws = weekStart(today);
  const days = weekDays(ws);
  const selected = d && isDay(d) && days.includes(d) ? d : today;

  const [facts, planRows, sessionsRows, activityRows] = await Promise.all([
    loadDayFacts(supabase, user.id, ws, addDays(ws, 6)),
    supabase.from("weekly_plan").select("weekday,session_key"),
    supabase
      .from("workout_sessions")
      .select("session_key,finished_at")
      .gte("day", ws)
      .lte("day", addDays(ws, 6))
      .not("finished_at", "is", null),
    supabase
      .from("activity_entries")
      .select("session_key")
      .gte("day", ws)
      .lte("day", addDays(ws, 6)),
  ]);

  const plan: PlanMap = new Map((planRows.data ?? []).map((p) => [p.weekday, p.session_key] as const));
  const keyOn = (day: string): SessionKeyT => plan.get(isoWeekday(day)) ?? "rest";
  const key = keyOn(selected);
  const playable = planKey(plan, selected);

  const done = new Set<string>([
    ...(sessionsRows.data ?? []).map((s) => s.session_key),
    ...(activityRows.data ?? []).flatMap((a) => (a.session_key ? [a.session_key] : [])),
  ]);
  const covered = new Set<string>();
  for (const k of done) for (const m of COVERAGE[k as SessionKeyT] ?? []) covered.add(m);

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
      <h1 className="px-6 pt-[60px] text-title font-bold tracking-[-0.8px]">{copy.train.title}</h1>

      <nav aria-label="Week" className="mx-4 mt-5 grid grid-cols-7 gap-[5px]">
        {days.map((day) => {
          const k = keyOn(day);
          const isSel = day === selected;
          const isToday = day === today;
          const finished = day <= today && done.has(k) && k !== "rest";
          const fact = facts.find((f) => f.day === day);
          const doneDay = finished && fact?.sessionDone;
          return (
            <Link
              key={day}
              href={`/train?d=${day}`}
              aria-current={isSel ? "date" : undefined}
              aria-label={`${weekdayShort(day)} ${Number(day.slice(8))}, ${SESSION_NAMES[k]}`}
              className={cn(
                "flex h-[72px] flex-col items-center justify-center gap-1 rounded-ctl text-nav",
                isSel ? "bg-ink text-white" : "bg-card text-muted",
                !isSel && isToday && "bg-bg ring-2 ring-inset ring-ink",
              )}
            >
              <span>{weekdayShort(day)}</span>
              {doneDay ? (
                <Check size={18} strokeWidth={2.6} aria-hidden="true" className="text-fuel" />
              ) : (
                <span className={cn("num text-[18px]", !isSel && "text-muted")}>
                  {Number(day.slice(8))}
                </span>
              )}
              <span className="text-[11px]">{SHORT[k]}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mx-6 mt-4 flex items-center justify-between gap-[10px]">
        <span className="flex-none text-small text-muted">{copy.train.coverage}</span>
        <div className="flex flex-wrap justify-end gap-[5px]">
          {MUSCLES.map((m) => (
            <span
              key={m}
              className={cn(
                "rounded-full px-[10px] py-[5px] text-caption",
                covered.has(m) ? "bg-fuel-soft font-semibold text-fuel-ink" : "bg-card text-muted",
              )}
            >
              {capitalize(m)}
            </span>
          ))}
        </div>
      </div>

      <section
        aria-label={SESSION_NAMES[key]}
        className="relative mx-4 mt-4 h-[200px] overflow-hidden rounded-hero bg-line"
      >
        {heroSlug ? <ExerciseImage slug={heroSlug} name={SESSION_NAMES[key]} className="h-full w-full" /> : null}
        <span className="absolute left-4 top-4 rounded-full bg-bg px-3 py-[6px] text-caption font-semibold text-ink">
          {new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(
            new Date(`${selected}T12:00:00Z`),
          )}
        </span>
      </section>
      <div className="mx-6 mt-[18px]">
        <div className="text-sub font-bold tracking-[-0.5px]">{SESSION_NAMES[key]}</div>
        <div className="mt-[2px] text-[16px] text-muted">
          {gymKey ? `5 exercises and a core finisher. ${minutes} min` : (quick?.desc ?? "No session planned. Stretch if you like.")}
        </div>
        {TAGS[key] ? (
          <div className="mt-3 flex flex-wrap gap-[6px]">
            {TAGS[key]?.map((t) => (
              <span key={t} className="rounded-full bg-card px-3 py-[6px] text-[14px]">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {gymKey ? (
        <div className="mx-6 mt-[18px] flex gap-[10px]">
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
        <p className="mx-6 mt-5 text-small text-muted">{sessions.gym_a.name} on Tuesday. {sessions.gym_b.name} on Friday. {sessions.gym_c.name} on Saturday.</p>
      )}

      <section className="mt-8" aria-labelledby="stretch-h">
        <h2 id="stretch-h" className="mx-6 text-section font-bold tracking-[-0.3px]">
          {copy.train.stretch}
        </h2>
        <ExerciseCards items={stretchCards} startOpen={false} numbered={false} />
      </section>

      <Library byMuscle={byMuscle} />
    </main>
  );
}
