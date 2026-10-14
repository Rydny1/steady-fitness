import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { nextProgression, type ExerciseRule, type LoggedSet, type ProgressionHint } from "./progression";
import type { Exercise } from "@/content/exercises";

type Db = SupabaseClient<Database>;

export type ExerciseHistory = {
  last: { sets: LoggedSet[]; day: string } | null;
  hint: ProgressionHint;
  /** Weight to pre-fill for the next session. */
  suggestedKg: number | null;
  /** Best set ever (heaviest, then most reps), for new-best detection. */
  best: LoggedSet | null;
  /** All historic sets of this exercise, for new-best detection while logging. */
  history: LoggedSet[];
};

export function ruleFor(e: Exercise): ExerciseRule {
  return {
    repMin: e.repMin ?? 1,
    repMax: e.repMax ?? (e.toFailure ? 99 : 1),
    sets: e.sets,
    bodyweight: e.slug === "pull_up" || e.slug === "push_up" || e.muscle === "core",
  };
}

/** Last session's sets per exercise, plus progression hint and history. Reads only. */
export async function loadHistory(
  supabase: Db,
  exercises: Exercise[],
  beforeSessionId: string | null,
): Promise<Record<string, ExerciseHistory>> {
  const slugs = exercises.map((e) => e.slug);
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id,day")
    .not("finished_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(40);
  const finished = (sessions ?? []).filter((s) => s.id !== beforeSessionId);
  const dayOf = new Map(finished.map((s) => [s.id, s.day] as const));
  const order = finished.map((s) => s.id);

  const { data: sets } =
    order.length > 0
      ? await supabase
          .from("workout_sets")
          .select("session_id,exercise_slug,set_no,reps,weight_kg")
          .in("session_id", order)
          .in("exercise_slug", slugs)
      : { data: [] };

  const out: Record<string, ExerciseHistory> = {};
  for (const e of exercises) {
    const mine = (sets ?? []).filter((s) => s.exercise_slug === e.slug && s.reps !== null);
    const history: LoggedSet[] = mine.map((s) => ({ weightKg: s.weight_kg ?? 0, reps: s.reps ?? 0 }));
    const lastSessionId = order.find((id) => mine.some((s) => s.session_id === id)) ?? null;
    const lastSets: LoggedSet[] = lastSessionId
      ? mine
          .filter((s) => s.session_id === lastSessionId)
          .sort((a, b) => a.set_no - b.set_no)
          .map((s) => ({ weightKg: s.weight_kg ?? 0, reps: s.reps ?? 0 }))
      : [];
    const hint = nextProgression(ruleFor(e), lastSets);
    const topWeight = lastSets.length > 0 ? Math.max(...lastSets.map((s) => s.weightKg)) : null;
    let best: LoggedSet | null = null;
    for (const h of history) {
      if (!best || h.weightKg > best.weightKg || (h.weightKg === best.weightKg && h.reps > best.reps)) {
        best = h;
      }
    }
    out[e.slug] = {
      last: lastSessionId ? { sets: lastSets, day: dayOf.get(lastSessionId) ?? "" } : null,
      hint,
      suggestedKg: hint.kind === "add_weight" ? hint.nextKg : topWeight,
      best,
      history,
    };
  }
  return out;
}

export function hintLabel(h: ProgressionHint): string | null {
  if (h.kind === "add_weight") return `+${h.addKg} kg`;
  if (h.kind === "add_reps") return `+${h.addReps} rep`;
  return null;
}

export function lastLabel(last: ExerciseHistory["last"]): string | null {
  if (!last || last.sets.length === 0) return null;
  const top = last.sets.reduce((a, b) => (b.weightKg >= a.weightKg ? b : a));
  const reps = last.sets.map((s) => s.reps).join(", ");
  return top.weightKg > 0 ? `${top.weightKg} kg x ${reps}` : `${reps} reps`;
}
