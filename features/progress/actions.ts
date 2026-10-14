"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDay, todayRiga, weekStart } from "@/lib/dates";

export type ProgressOutcome = { ok: true } | { ok: false; reason: "signed_out" | "invalid" | "failed" };

const pickSchema = z.object({
  weekStart: z.string().refine(isDay),
  key: z.enum([
    "early_kickoff",
    "protein_five",
    "clean_week",
    "full_ninety",
    "ten_k_minutes",
    "photo_day",
    "weigh_in_three",
    "sleep_seven",
  ]),
});

/** Picks this week's challenge. One per week, chosen once. */
export async function pickChallenge(input: unknown): Promise<ProgressOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = pickSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  if (parsed.data.weekStart !== weekStart(todayRiga())) return { ok: false, reason: "invalid" };

  const { data: existing } = await supabase
    .from("weekly_challenges")
    .select("challenge_key")
    .eq("week_start", parsed.data.weekStart)
    .maybeSingle();
  if (existing) return { ok: true };

  const { error } = await supabase
    .from("weekly_challenges")
    .insert({ week_start: parsed.data.weekStart, challenge_key: parsed.data.key });
  if (error) return { ok: false, reason: "failed" };
  revalidatePath("/progress");
  return { ok: true };
}
