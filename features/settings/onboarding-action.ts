"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ageOn, todayRiga } from "@/lib/dates";
import { computeTargets } from "@/features/nutrition/targets";
import { DEFAULT_HABITS, DEFAULT_NOTIFICATIONS, DEFAULT_PLAN } from "./defaults";

export type OnboardingOutcome =
  | { ok: true }
  | { ok: false; reason: "signed_out" | "invalid" | "failed" | "exists" };

const schema = z.object({
  name: z.string().trim().min(1).max(40),
  heightCm: z.number().min(120).max(230),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: z.enum(["male", "female"]),
  weightKg: z.number().min(35).max(300),
  goalKg: z.number().min(35).max(250),
  waistCm: z.number().min(40).max(200).nullable(),
  neckCm: z.number().min(20).max(70).nullable(),
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export type OnboardingInput = z.infer<typeof schema>;

export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const v = parsed.data;

  const { data: existing } = await supabase.from("profiles").select("user_id").maybeSingle();
  if (existing) return { ok: false, reason: "exists" };

  const today = todayRiga();
  const age = ageOn(v.birthDate, today);
  if (age < 13 || age > 100) return { ok: false, reason: "invalid" };

  const targets = computeTargets({
    sex: v.sex,
    weightKg: v.weightKg,
    heightCm: v.heightCm,
    ageYears: age,
    goalWeightKg: v.goalKg,
  });

  const { error: pErr } = await supabase.from("profiles").insert({
    display_name: v.name,
    height_cm: v.heightCm,
    birth_date: v.birthDate,
    sex: v.sex,
    goal_weight_kg: v.goalKg,
    wake_time: v.wakeTime,
  });
  if (pErr) return { ok: false, reason: "failed" };

  const results = await Promise.all([
    supabase.from("targets").insert({
      effective_from: today,
      bmr_kcal: targets.bmrKcal,
      budget_kcal: targets.budgetKcal,
      protein_g: targets.proteinG,
    }),
    supabase.from("measurements").insert({
      measured_on: today,
      weight_kg: v.weightKg,
      waist_cm: v.waistCm,
      neck_cm: v.neckCm,
    }),
    supabase.from("weekly_plan").insert(DEFAULT_PLAN),
    supabase.from("notification_prefs").insert(DEFAULT_NOTIFICATIONS),
    supabase.from("habits").insert(DEFAULT_HABITS),
  ]);
  if (results.some((r) => r.error)) return { ok: false, reason: "failed" };
  return { ok: true };
}
