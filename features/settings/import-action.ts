"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUserFast } from "@/lib/supabase/server";
import { todayRiga } from "@/lib/dates";
import { activityKcal } from "@/features/nutrition/targets";
import type { ActivityT } from "@/lib/supabase/types";

// One-time import of the backup file from the old Steady (plain HTML app).
// Shape: { startDate, logs: { 'YYYY-MM-DD': { habits: bool[5], activity, minutes, notes } },
//          checkins: [{ date, weight, waist, chest, hips, thigh, arm }] }
// Imported days do not count for streak or Callus: only logs made on the day itself do.

export type ImportOutcome =
  | { ok: true; days: number }
  | { ok: false; reason: "signed_out" | "invalid" | "failed" };

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optNum = z.union([z.number(), z.string(), z.null()]).optional();

const oldSchema = z.object({
  logs: z
    .record(
      day,
      z.object({
        habits: z.array(z.unknown()).max(10),
        activity: z.string().max(200).optional(),
        minutes: optNum,
        notes: z.string().max(2000).optional(),
      }),
    )
    .default({}),
  checkins: z
    .array(
      z.object({
        date: day,
        weight: z.number().min(30).max(300),
        waist: optNum,
        chest: optNum,
        hips: optNum,
        thigh: optNum,
        arm: optNum,
      }),
    )
    .default([]),
});

const input = z.object({ json: z.string().min(2).max(2_000_000) });

function guessActivity(text: string): ActivityT {
  const t = text.toLowerCase();
  if (/foot|soccer|ball/.test(t)) return "football";
  if (/run|jog/.test(t)) return "run";
  if (/gym|lift|weight|strength/.test(t)) return "gym";
  if (/circuit|hiit/.test(t)) return "circuit";
  if (/walk|hike/.test(t)) return "walk";
  if (/stretch|yoga|mobility/.test(t)) return "stretch";
  if (/cycl|bike/.test(t)) return "cycling";
  return "other";
}

function inRange(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export async function importOldSteady(raw: unknown): Promise<ImportOutcome> {
  const supabase = await createClient();
  const { data: auth } = await getUserFast(supabase);
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const wrapper = input.safeParse(raw);
  if (!wrapper.success) return { ok: false, reason: "invalid" };

  let json: unknown;
  try {
    json = JSON.parse(wrapper.data.json);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const parsed = oldSchema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const old = parsed.data;

  const [habits, existingActs, existingFood] = await Promise.all([
    supabase.from("habits").select("id,position").is("archived_at", null).order("position"),
    supabase.from("activity_entries").select("day"),
    supabase.from("food_entries").select("day"),
  ]);
  const busyDays = new Set([
    ...(existingActs.data ?? []).map((r) => r.day),
    ...(existingFood.data ?? []).map((r) => r.day),
  ]);
  const habitIds = (habits.data ?? []).map((h) => h.id);

  // Weight per day for the calorie maths: the old check-ins, else a sensible fallback.
  const weights = [...old.checkins].sort((a, b) => a.date.localeCompare(b.date));
  const weightOn = (d: string) =>
    [...weights].reverse().find((w) => w.date <= d)?.weight ?? weights[0]?.weight ?? 80;

  let days = 0;
  const today = todayRiga();

  // Measurements (never overwrite a day that already has one).
  if (old.checkins.length > 0) {
    await supabase.from("measurements").upsert(
      old.checkins
        .filter((c) => c.date <= today)
        .map((c) => ({
          measured_on: c.date,
          weight_kg: c.weight,
          waist_cm: inRange(c.waist, 40, 200),
          chest_cm: inRange(c.chest, 50, 200),
          hips_cm: inRange(c.hips, 50, 200),
          thigh_cm: inRange(c.thigh, 25, 120),
          arm_cm: inRange(c.arm, 15, 70),
        })),
      { onConflict: "user_id,measured_on", ignoreDuplicates: true },
    );
  }

  for (const [d, v] of Object.entries(old.logs)) {
    if (d > today) continue;
    days += 1;

    const checks = habitIds.flatMap((id, i) => (v.habits[i] ? [{ habit_id: id, day: d }] : []));
    if (checks.length > 0) {
      await supabase
        .from("habit_checks")
        .upsert(checks, { onConflict: "habit_id,day", ignoreDuplicates: true });
    }

    if (v.notes && v.notes.trim() !== "") {
      await supabase.from("day_checkins").upsert(
        { day: d, cravings: v.notes.trim().slice(0, 1000) },
        { onConflict: "user_id,day", ignoreDuplicates: true },
      );
    }

    const minutes = inRange(v.minutes, 1, 600);
    if (v.activity && v.activity.trim() !== "" && minutes !== null && !busyDays.has(d)) {
      const type = guessActivity(v.activity);
      const mins = Math.round(minutes);
      const { data: log } = await supabase
        .from("logs")
        .insert({ day: d, raw_text: `Imported: ${v.activity.trim()}`.slice(0, 400), source: "text" })
        .select("id")
        .single();
      await supabase.from("activity_entries").insert({
        log_id: log?.id ?? null,
        day: d,
        activity_type: type,
        duration_min: mins,
        kcal_burned: activityKcal(type, mins, weightOn(d)),
        source: "text",
      });
    }
  }

  revalidatePath("/today");
  revalidatePath("/progress");
  return { ok: true, days };
}
