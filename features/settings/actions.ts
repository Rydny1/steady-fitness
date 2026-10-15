"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ageOn, todayRiga } from "@/lib/dates";
import { MAX_PROMISES } from "./defaults";
import { computeTargets } from "@/features/nutrition/targets";

export type SettingsOutcome =
  | { ok: true }
  | { ok: false; reason: "signed_out" | "invalid" | "failed" };

async function userOrNull() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

const targetsSchema = z.object({
  adaptive: z.boolean().optional(),
  budgetKcal: z.number().int().min(1000).max(5000),
  proteinG: z.number().int().min(40).max(350),
  goalKg: z.number().min(35).max(250),
});

/** A new targets row from today, so history stays. The person picks the deficit; the limit is never set under 1,000. */
export async function saveTargets(input: unknown): Promise<SettingsOutcome> {
  const { supabase, user } = await userOrNull();
  if (!user) return { ok: false, reason: "signed_out" };
  const parsed = targetsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const v = parsed.data;

  const { data: current } = await supabase
    .from("targets")
    .select("bmr_kcal")
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!current) return { ok: false, reason: "failed" };

  const [t, p] = await Promise.all([
    supabase.from("targets").upsert(
      {
        effective_from: todayRiga(),
        bmr_kcal: current.bmr_kcal,
        budget_kcal: v.budgetKcal,
        protein_g: v.proteinG,
      },
      { onConflict: "user_id,effective_from" },
    ),
    supabase.from("profiles").update({ goal_weight_kg: v.goalKg }).eq("user_id", user.id),
  ]);
  if (t.error || p.error) return { ok: false, reason: "failed" };
  if (v.adaptive !== undefined) {
    await supabase
      .from("user_flags")
      .upsert(
        { key: "adaptive_budget", value: { enabled: v.adaptive }, updated_at: new Date().toISOString() },
        { onConflict: "user_id,key" },
      );
  }
  revalidatePath("/settings");
  revalidatePath("/today");
  return { ok: true };
}

const planSchema = z.object({
  days: z
    .array(
      z.object({
        weekday: z.number().int().min(1).max(7),
        sessionKey: z.enum([
          "gym_a",
          "gym_b",
          "gym_c",
          "run",
          "run_intervals",
          "football",
          "stretch",
          "rest",
        ]),
      }),
    )
    .length(7),
});

export async function savePlan(input: unknown): Promise<SettingsOutcome> {
  const { supabase, user } = await userOrNull();
  if (!user) return { ok: false, reason: "signed_out" };
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const { error } = await supabase.from("weekly_plan").upsert(
    parsed.data.days.map((d) => ({ weekday: d.weekday, session_key: d.sessionKey })),
    { onConflict: "user_id,weekday" },
  );
  if (error) return { ok: false, reason: "failed" };
  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/train");
  return { ok: true };
}

const habitsSchema = z.object({
  habits: z
    .array(z.object({ id: z.uuid().nullable(), name: z.string().trim().min(1).max(40) }))
    .max(MAX_PROMISES),
});

/**
 * The person's promises, in order: existing ones keep their history, new ones are added, ones left
 * out are archived (never deleted, so past days still add up). Zero is allowed.
 */
export async function saveHabits(input: unknown): Promise<SettingsOutcome> {
  const { supabase, user } = await userOrNull();
  if (!user) return { ok: false, reason: "signed_out" };
  const parsed = habitsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const { data: all, error: readError } = await supabase.from("habits").select("id,position,archived_at");
  if (readError) return { ok: false, reason: "failed" };
  const known = new Set((all ?? []).map((h) => h.id));
  const keep = parsed.data.habits.filter((h): h is { id: string; name: string } => h.id !== null && known.has(h.id));
  const keepIds = new Set(keep.map((h) => h.id));
  const maxPos = Math.max(0, ...(all ?? []).map((h) => h.position));
  let park = maxPos + 1;

  // 1. Retire what was removed, parked out of the way.
  for (const h of (all ?? []).filter((x) => x.archived_at === null && !keepIds.has(x.id))) {
    const { error } = await supabase
      .from("habits")
      .update({ archived_at: new Date().toISOString(), position: park })
      .eq("id", h.id);
    park += 1;
    if (error) return { ok: false, reason: "failed" };
  }
  // 2. Move the kept ones out of 1..9 first, so reordering never collides.
  for (const h of keep) {
    const { error } = await supabase.from("habits").update({ position: park }).eq("id", h.id);
    park += 1;
    if (error) return { ok: false, reason: "failed" };
  }
  // 3. Final names and positions, then the new ones.
  let pos = 1;
  for (const h of parsed.data.habits) {
    if (h.id !== null && keepIds.has(h.id)) {
      const { error } = await supabase.from("habits").update({ name: h.name, position: pos }).eq("id", h.id);
      if (error) return { ok: false, reason: "failed" };
    } else {
      const { error } = await supabase.from("habits").insert({ name: h.name, position: pos });
      if (error) return { ok: false, reason: "failed" };
    }
    pos += 1;
  }
  revalidatePath("/today");
  revalidatePath("/settings");
  return { ok: true };
}

const prefsSchema = z.object({
  prefs: z
    .array(
      z.object({
        kind: z.enum(["wake_gym", "wake_run", "log_nudge", "last_call", "weekly", "photo_day"]),
        atTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        enabled: z.boolean(),
      }),
    )
    .max(6),
  wakeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export async function saveNotificationPrefs(input: unknown): Promise<SettingsOutcome> {
  const { supabase, user } = await userOrNull();
  if (!user) return { ok: false, reason: "signed_out" };
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const { error } = await supabase.from("notification_prefs").upsert(
    parsed.data.prefs.map((p) => ({ kind: p.kind, at_time: p.atTime, enabled: p.enabled })),
    { onConflict: "user_id,kind" },
  );
  if (error) return { ok: false, reason: "failed" };
  await supabase.from("profiles").update({ wake_time: parsed.data.wakeTime }).eq("user_id", user.id);
  revalidatePath("/settings");
  return { ok: true };
}

const detailsSchema = z.object({
  name: z.string().trim().min(1).max(40),
  heightCm: z.number().min(120).max(230),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: z.enum(["male", "female"]),
  goalKg: z.number().min(35).max(250),
  recalc: z.boolean(),
});

/** "About you": the details onboarding may have skipped. Optionally recalculates the budget. */
export async function saveProfileDetails(input: unknown): Promise<SettingsOutcome> {
  const { supabase, user } = await userOrNull();
  if (!user) return { ok: false, reason: "signed_out" };
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const v = parsed.data;

  const today = todayRiga();
  const age = ageOn(v.birthDate, today);
  if (age < 13 || age > 100) return { ok: false, reason: "invalid" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: v.name,
      height_cm: v.heightCm,
      birth_date: v.birthDate,
      sex: v.sex,
      goal_weight_kg: v.goalKg,
    })
    .eq("user_id", user.id);
  if (error) return { ok: false, reason: "failed" };

  // Everything is real now, so the "skipped" reminder goes away.
  await supabase.from("user_flags").delete().eq("key", "profile_skipped");

  if (v.recalc) {
    const { data: w } = await supabase
      .from("measurements")
      .select("weight_kg")
      .not("weight_kg", "is", null)
      .order("measured_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (w?.weight_kg) {
      const t = computeTargets({
        sex: v.sex,
        weightKg: Number(w.weight_kg),
        heightCm: v.heightCm,
        ageYears: age,
        goalWeightKg: v.goalKg,
      });
      await supabase.from("targets").upsert(
        {
          effective_from: today,
          bmr_kcal: t.bmrKcal,
          budget_kcal: t.budgetKcal,
          protein_g: t.proteinG,
        },
        { onConflict: "user_id,effective_from" },
      );
    }
  }
  revalidatePath("/settings");
  revalidatePath("/today");
  return { ok: true };
}

const deleteSchema = z.object({ confirm: z.literal("DELETE") });

/** Delete everything: all rows, all photos, then the account itself. Needs the typed word. */
export async function deleteEverything(input: unknown): Promise<SettingsOutcome> {
  const { supabase, user } = await userOrNull();
  if (!user) return { ok: false, reason: "signed_out" };
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  // Photos first (user RLS lets the owner list and remove their own folder).
  for (const bucket of ["meal-photos", "progress-photos"] as const) {
    const { data: files } = await supabase.storage.from(bucket).list(user.id, { limit: 1000 });
    const paths = (files ?? []).map((f) => `${user.id}/${f.name}`);
    if (paths.length > 0) await supabase.storage.from(bucket).remove(paths);
  }

  // Deleting the auth user cascades every table (all user_id columns reference auth.users).
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, reason: "failed" };
  await supabase.auth.signOut();
  return { ok: true };
}
