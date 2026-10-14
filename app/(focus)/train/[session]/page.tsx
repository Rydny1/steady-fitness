import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { exercises, exercisesByMuscle, exercisesForSession, sessions } from "@/content/exercises";
import { loadHistory, lastLabel } from "@/features/training/data";
import { SessionScreen, type SessionExercise } from "@/features/training/components/session-screen";
import { startSession } from "@/features/training/actions";

export const metadata = { title: "Session" };

export default async function SessionPage({
  params,
}: {
  params: Promise<{ session: string }>;
}) {
  const { session } = await params;
  if (session !== "gym_a" && session !== "gym_b" && session !== "gym_c") {
    // Run, football and rest days have no set logger. Send them back to Train.
    if (["run", "run_intervals", "football", "stretch", "rest"].includes(session)) redirect("/train");
    notFound();
  }
  const { supabase } = await requireProfile();

  const started = await startSession({ sessionKey: session });
  if (!started.ok) redirect("/train");

  const list = exercisesForSession(session);
  const [history, sessionRow, doneSets] = await Promise.all([
    loadHistory(supabase, exercises, started.sessionId),
    supabase.from("workout_sessions").select("started_at").eq("id", started.sessionId).single(),
    supabase
      .from("workout_sets")
      .select("exercise_slug,set_no,reps,weight_kg")
      .eq("session_id", started.sessionId),
  ]);

  const items: SessionExercise[] = list.map((e) => {
    const h = history[e.slug];
    return {
      slug: e.slug,
      name: e.name,
      muscle: e.muscle,
      sets: e.sets,
      repMin: e.repMin ?? null,
      repMax: e.repMax ?? null,
      seconds: e.seconds ?? null,
      rest: e.rest,
      tip: e.tip,
      works: e.works,
      suggestedKg: h?.suggestedKg ?? null,
      lastLabel: h ? lastLabel(h.last) : null,
      history: h?.history ?? [],
      swaps: exercisesByMuscle(e.muscle)
        .filter((o) => o.slug !== e.slug && !list.some((l) => l.slug === o.slug))
        .map((o) => ({ slug: o.slug, name: o.name })),
    };
  });

  return (
    <SessionScreen
      sessionId={started.sessionId}
      title={sessions[session].name}
      startedAt={sessionRow.data?.started_at ?? new Date().toISOString()}
      exercises={items}
      doneSets={(doneSets.data ?? []).map((s) => ({
        slug: s.exercise_slug,
        setNo: s.set_no,
        reps: s.reps,
        weight: s.weight_kg,
      }))}
    />
  );
}
