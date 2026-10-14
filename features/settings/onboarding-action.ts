"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ageOn, todayRiga } from "@/lib/dates";
import { computeTargets } from "@/features/nutrition/targets";
import {
  DEFAULT_HABITS,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_PLAN,
  GENERIC_TARGETS,
  PROFILE_FALLBACK,
} from "./defaults";

export type OnboardingOutcome =
  | { ok: true }
  | { ok: false; reason: "signed_out" | "invalid" | "failed" | "exists"; fields?: string[] };

// Every question can be skipped (null). Skipped answers get safe defaults, and the list is
// remembered so Profile can ask again.
const schema = z.object({
  name: z.string().trim().max(40).nullable(),
  heightCm: z.number().min(120).max(230).nullable(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  sex: z.enum(["male", "female"]).nullable(),
  weightKg: z.number().min(35).max(300).nullable(),
  goalKg: z.number().min(35).max(250).nullable(),
  waistCm: z.number().min(40).max(200).nullable(),
  neckCm: z.number().min(20).max(70).nullable(),
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
});

export type OnboardingInput = z.infer<typeof schema>;

function nameFromEmail(email: string | undefined): string {
  const local = (email ?? "").split("@")[0] ?? "";
  const clean = local.replace(/[^a-zA-Z]/g, "").slice(0, 20);
  return clean ? clean.slice(0, 1).toLocaleUpperCase("en") + clean.slice(1).toLowerCase() : "Friend";
}

export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    // Field names only, never the values.
    return {
      ok: false,
      reason: "invalid",
      fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? "")))],
    };
  }
  const v = parsed.data;

  const { data: existing } = await supabase.from("profiles").select("user_id").maybeSingle();
  if (existing) return { ok: false, reason: "exists" };

  const today = todayRiga();
  if (v.birthDate) {
    const age = ageOn(v.birthDate, today);
    if (age < 13 || age > 100) return { ok: false, reason: "invalid", fields: ["birthDate"] };
  }

  const skipped = (
    [
      ["name", v.name],
      ["heightCm", v.heightCm],
      ["birthDate", v.birthDate],
      ["sex", v.sex],
      ["weightKg", v.weightKg],
      ["goalKg", v.goalKg],
    ] as const
  )
    .filter(([, val]) => val === null || val === "")
    .map(([k]) => k);

  // With height, birth date, sex and weight the budget is calculated. Without them it is a
  // plain average until the person adds their details.
  const complete = v.heightCm !== null && v.birthDate !== null && v.sex !== null && v.weightKg !== null;
  const targets =
    complete && v.heightCm !== null && v.birthDate !== null && v.sex !== null && v.weightKg !== null
      ? computeTargets({
          sex: v.sex,
          weightKg: v.weightKg,
          heightCm: v.heightCm,
          ageYears: ageOn(v.birthDate, today),
          goalWeightKg: v.goalKg ?? v.weightKg,
        })
      : GENERIC_TARGETS;

  const { error: pErr } = await supabase.from("profiles").insert({
    display_name: v.name && v.name.length > 0 ? v.name : nameFromEmail(auth.user.email),
    height_cm: v.heightCm ?? PROFILE_FALLBACK.heightCm,
    birth_date: v.birthDate ?? PROFILE_FALLBACK.birthDate,
    sex: v.sex ?? PROFILE_FALLBACK.sex,
    goal_weight_kg: v.goalKg ?? v.weightKg ?? PROFILE_FALLBACK.goalKg,
    wake_time: v.wakeTime ?? PROFILE_FALLBACK.wakeTime,
  });
  if (pErr) {
    console.error("onboarding profile insert failed", pErr.code);
    return { ok: false, reason: "failed" };
  }

  const hasBody = v.weightKg !== null || v.waistCm !== null || v.neckCm !== null;
  const results = await Promise.all([
    supabase.from("targets").insert({
      effective_from: today,
      bmr_kcal: targets.bmrKcal,
      budget_kcal: targets.budgetKcal,
      protein_g: targets.proteinG,
    }),
    hasBody
      ? supabase.from("measurements").insert({
          measured_on: today,
          weight_kg: v.weightKg,
          waist_cm: v.waistCm,
          neck_cm: v.neckCm,
        })
      : Promise.resolve({ error: null }),
    supabase.from("weekly_plan").insert(DEFAULT_PLAN),
    supabase.from("notification_prefs").insert(DEFAULT_NOTIFICATIONS),
    supabase.from("habits").insert(DEFAULT_HABITS),
    skipped.length > 0
      ? supabase.from("user_flags").insert({ key: "profile_skipped", value: { fields: skipped } })
      : Promise.resolve({ error: null }),
  ]);
  const broken = results.find((r) => r.error);
  if (broken) {
    console.error("onboarding setup insert failed", broken.error?.code);
    return { ok: false, reason: "failed" };
  }
  return { ok: true };
}
