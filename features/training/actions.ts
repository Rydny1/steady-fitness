"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUserFast } from "@/lib/supabase/server";
import { todayRiga } from "@/lib/dates";
import { activityKcal } from "@/features/nutrition/targets";
import { getExercise } from "@/content/exercises";

export type TrainOutcome<T = object> =
  | ({ ok: true } & T)
  | { ok: false; reason: "signed_out" | "invalid" | "failed" };

const startSchema = z.object({ sessionKey: z.enum(["gym_a", "gym_b", "gym_c"]) });

/** Starts today's gym session, or returns the unfinished one so a reload never loses sets. */
export async function startSession(input: unknown): Promise<TrainOutcome<{ sessionId: string }>> {
  const supabase = await createClient();
  const { data: auth } = await getUserFast(supabase);
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const day = todayRiga();
  const { data: open } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("day", day)
    .eq("session_key", parsed.data.sessionKey)
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) return { ok: true, sessionId: open.id };

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({ day, session_key: parsed.data.sessionKey })
    .select("id")
    .single();
  if (error || !data) return { ok: false, reason: "failed" };
  return { ok: true, sessionId: data.id };
}

const setSchema = z.object({
  sessionId: z.uuid(),
  exerciseSlug: z.string().regex(/^[a-z0-9_]+$/).max(60),
  setNo: z.number().int().min(1).max(10),
  reps: z.number().int().min(0).max(100).nullable(),
  weightKg: z.number().min(0).max(300).nullable(),
  seconds: z.number().int().min(0).max(600).nullable(),
});

export async function saveSet(input: unknown): Promise<TrainOutcome> {
  const supabase = await createClient();
  const { data: auth } = await getUserFast(supabase);
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const v = parsed.data;
  if (v.reps === null && v.seconds === null) return { ok: false, reason: "invalid" };
  if (!getExercise(v.exerciseSlug)) return { ok: false, reason: "invalid" };

  const { error } = await supabase.from("workout_sets").upsert(
    {
      session_id: v.sessionId,
      exercise_slug: v.exerciseSlug,
      set_no: v.setNo,
      reps: v.reps,
      weight_kg: v.weightKg,
      seconds: v.seconds,
    },
    { onConflict: "session_id,exercise_slug,set_no" },
  );
  if (error) return { ok: false, reason: "failed" };
  return { ok: true };
}

export async function undoSet(input: unknown): Promise<TrainOutcome> {
  const supabase = await createClient();
  const { data: auth } = await getUserFast(supabase);
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = z
    .object({
      sessionId: z.uuid(),
      exerciseSlug: z.string().regex(/^[a-z0-9_]+$/).max(60),
      setNo: z.number().int().min(1).max(10),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { error } = await supabase
    .from("workout_sets")
    .delete()
    .eq("session_id", parsed.data.sessionId)
    .eq("exercise_slug", parsed.data.exerciseSlug)
    .eq("set_no", parsed.data.setNo);
  return error ? { ok: false, reason: "failed" } : { ok: true };
}

const finishSchema = z.object({
  sessionId: z.uuid(),
  rpe: z.number().int().min(1).max(10).nullable(),
});

/** Finishes the session and records it as a gym activity, so rings and Callus see it. */
export async function finishSession(input: unknown): Promise<TrainOutcome> {
  const supabase = await createClient();
  const { data: auth } = await getUserFast(supabase);
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id,day,session_key,started_at,finished_at")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!session) return { ok: false, reason: "invalid" };
  if (session.finished_at) return { ok: true };

  const { count } = await supabase
    .from("workout_sets")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session.id);
  if ((count ?? 0) === 0) return { ok: false, reason: "invalid" };

  const finishedAt = new Date();
  const minutes = Math.max(
    1,
    Math.min(240, Math.round((finishedAt.getTime() - new Date(session.started_at).getTime()) / 60_000)),
  );

  const { error } = await supabase
    .from("workout_sessions")
    .update({ finished_at: finishedAt.toISOString(), rpe: parsed.data.rpe })
    .eq("id", session.id);
  if (error) return { ok: false, reason: "failed" };

  const { data: weightRow } = await supabase
    .from("measurements")
    .select("weight_kg")
    .not("weight_kg", "is", null)
    .lte("measured_on", session.day)
    .order("measured_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  const weight = weightRow?.weight_kg ?? 80;

  const { data: log } = await supabase
    .from("logs")
    .insert({ day: session.day, raw_text: `Gym session ${session.session_key}`, source: "tap" })
    .select("id")
    .single();

  await supabase.from("activity_entries").insert({
    log_id: log?.id ?? null,
    day: session.day,
    activity_type: "gym",
    session_key: session.session_key,
    duration_min: minutes,
    kcal_burned: activityKcal("gym", minutes, weight),
    rpe: parsed.data.rpe,
    source: "tap",
  });

  revalidatePath("/today");
  revalidatePath("/train");
  revalidatePath("/progress");
  return { ok: true };
}
