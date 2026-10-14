"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDay, todayRiga, weekStart } from "@/lib/dates";
import { batchMeals } from "@/content/meals";

export type FuelOutcome = { ok: true } | { ok: false; reason: "signed_out" | "invalid" | "failed" };

const slugs = new Set(batchMeals.map((m) => m.slug));
const MAX_PICKS = 3;

const picksSchema = z.object({
  weekStart: z.string().refine(isDay),
  slugs: z.array(z.string()).max(MAX_PICKS),
});

/** Remembers which recipes were picked for the week (user_flags, one row per week). */
export async function savePicks(input: unknown): Promise<FuelOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = picksSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  if (parsed.data.weekStart !== weekStart(todayRiga())) return { ok: false, reason: "invalid" };
  const picked = [...new Set(parsed.data.slugs)].filter((s) => slugs.has(s));

  const { error } = await supabase.from("user_flags").upsert(
    {
      key: `fuel_picks:${parsed.data.weekStart}`,
      value: { slugs: picked },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,key" },
  );
  if (error) return { ok: false, reason: "failed" };
  revalidatePath("/fuel");
  return { ok: true };
}

const checkSchema = z.object({
  weekStart: z.string().refine(isDay),
  checked: z.array(z.string().max(120)).max(80),
});

export async function saveShoppingChecks(input: unknown): Promise<FuelOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = checkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const { error } = await supabase.from("user_flags").upsert(
    {
      key: `shop:${parsed.data.weekStart}`,
      value: { checked: parsed.data.checked },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,key" },
  );
  if (error) return { ok: false, reason: "failed" };
  return { ok: true };
}

const recipeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kcal: z.number().int().min(0).max(5000),
  proteinG: z.number().min(0).max(300),
});

export type RecipeOutcome =
  | { ok: true }
  | { ok: false; reason: "signed_out" | "invalid" | "duplicate" | "failed" };

/** Your own recipe: name, kcal and protein per portion. It joins the saved foods, one tap to log. */
export async function saveRecipe(input: unknown): Promise<RecipeOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const { error } = await supabase.from("saved_foods").insert({
    name: parsed.data.name,
    quantity: 1,
    unit: "portion",
    kcal: parsed.data.kcal,
    protein_g: parsed.data.proteinG,
    use_count: 0,
  });
  if (error) return { ok: false, reason: error.code === "23505" ? "duplicate" : "failed" };
  revalidatePath("/fuel");
  revalidatePath("/log");
  return { ok: true };
}

export async function deleteRecipe(input: unknown): Promise<RecipeOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { error } = await supabase.from("saved_foods").delete().eq("id", parsed.data.id);
  if (error) return { ok: false, reason: "failed" };
  revalidatePath("/fuel");
  revalidatePath("/log");
  return { ok: true };
}
