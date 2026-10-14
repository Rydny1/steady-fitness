"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { addDays, isDay, todayRiga } from "@/lib/dates";

export type SimpleOutcome = { ok: true } | { ok: false; reason: "signed_out" | "invalid" | "failed" | "limit" };

const dayField = z
  .string()
  .refine(isDay)
  .refine((d) => d <= todayRiga() && d >= addDays(todayRiga(), -60));

const toggleSchema = z.object({ habitId: z.uuid(), day: dayField });

export async function toggleHabit(input: unknown): Promise<SimpleOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { habitId, day } = parsed.data;

  const { data: existing } = await supabase
    .from("habit_checks")
    .select("habit_id")
    .eq("habit_id", habitId)
    .eq("day", day)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("habit_checks")
      .delete()
      .eq("habit_id", habitId)
      .eq("day", day);
    if (error) return { ok: false, reason: "failed" };
  } else {
    const { error } = await supabase.from("habit_checks").insert({ habit_id: habitId, day });
    if (error) return { ok: false, reason: "failed" };
  }
  revalidatePath("/today");
  return { ok: true };
}

const checkinSchema = z.object({
  day: dayField,
  sleepHours: z.number().min(0).max(16).nullable(),
  energy: z.number().int().min(1).max(5).nullable(),
  waterL: z.number().min(0).max(8).nullable(),
  cravings: z.string().trim().max(1000).nullable(),
  sick: z.boolean(),
});

const SICK_PER_MONTH = 3;

export async function saveCheckin(input: unknown): Promise<SimpleOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = checkinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const v = parsed.data;

  if (v.sick) {
    // Max 3 sick days a month, enforced here.
    const monthStart = `${v.day.slice(0, 7)}-01`;
    const { data: sickDays } = await supabase
      .from("day_checkins")
      .select("day")
      .eq("sick", true)
      .gte("day", monthStart)
      .neq("day", v.day);
    if ((sickDays?.length ?? 0) >= SICK_PER_MONTH) return { ok: false, reason: "limit" };
  }

  const { error } = await supabase.from("day_checkins").upsert(
    {
      day: v.day,
      sleep_hours: v.sleepHours,
      energy: v.energy,
      water_ml: v.waterL === null ? null : Math.round(v.waterL * 1000),
      cravings: v.cravings && v.cravings.length > 0 ? v.cravings : null,
      sick: v.sick,
    },
    { onConflict: "user_id,day" },
  );
  if (error) return { ok: false, reason: "failed" };
  revalidatePath("/today");
  revalidatePath("/progress");
  return { ok: true };
}

const seenSchema = z.object({ key: z.enum(["chapter_event", "adaptive_note"]) });

/** The level card and the adaptive budget note each show once. */
export async function markSeen(input: unknown): Promise<SimpleOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = seenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const { data: row } = await supabase
    .from("user_flags")
    .select("value")
    .eq("key", parsed.data.key)
    .maybeSingle();
  if (!row) return { ok: true };
  const value = { ...(row.value as Record<string, unknown>), seen: true };
  const { error } = await supabase
    .from("user_flags")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", parsed.data.key);
  if (error) return { ok: false, reason: "failed" };
  revalidatePath("/today");
  return { ok: true };
}
