"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { overLimit } from "@/lib/rate-limit";
import { addDays, isDay, todayRiga } from "@/lib/dates";
import { estimateMealPhoto, parseLog } from "@/lib/ai/gemini";
import { activityKcal } from "@/features/nutrition/targets";
import { observe } from "@/features/insights/observer";
import { finalizeFood, type SavedLookup } from "./accuracy";
import { matchFood, nutrientsFor } from "@/features/nutrition/food-match";
import {
  saveEntriesSchema,
  type DraftItem,
  type ParsedItem,
  type SaveEntriesInput,
} from "./schema";

// Every action: get user, validate with zod, then write.

export type ParseOutcome =
  | { ok: true; logId: string; items: DraftItem[]; unclear: string[] }
  | { ok: false; reason: "signed_out" | "invalid" | "limit" | "ai_limit" | "failed"; logId?: string };

export type SaveOutcome =
  | { ok: true }
  | { ok: false; reason: "signed_out" | "invalid" | "failed" };

export type SaveEntriesOutcome =
  | { ok: true; foodIds: string[] }
  | { ok: false; reason: "signed_out" | "invalid" | "failed" };

const dayField = z
  .string()
  .refine(isDay)
  .refine((d) => d <= todayRiga() && d >= addDays(todayRiga(), -60));

const parseInput = z.object({
  text: z.string().trim().min(1).max(4000),
  source: z.enum(["voice", "text"]),
  day: dayField.optional(),
});

function toDraft(item: ParsedItem, saved: readonly SavedLookup[]): DraftItem | null {
  if (item.kind === "food") {
    // Name and grams from the model, numbers from the verified table (see accuracy.ts).
    return finalizeFood(
      {
        name: item.name,
        grams: item.grams,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        kcal: item.kcal,
        protein_g: item.protein_g,
        confidence: item.confidence,
      },
      saved,
    );
  }
  if (item.kind === "activity" && item.activity_type && item.duration_min) {
    return {
      kind: "activity",
      activity_type: item.activity_type,
      session_key: item.session_key,
      duration_min: Math.max(1, Math.min(600, Math.round(item.duration_min))),
      rpe: null,
    };
  }
  if (item.kind === "body" && item.body) {
    const b = item.body;
    const weight = b.weight_kg && b.weight_kg >= 35 && b.weight_kg <= 300 ? b.weight_kg : null;
    const waist = b.waist_cm && b.waist_cm >= 40 && b.waist_cm <= 200 ? b.waist_cm : null;
    const neck = b.neck_cm && b.neck_cm >= 20 && b.neck_cm <= 70 ? b.neck_cm : null;
    if (weight === null && waist === null && neck === null) return null;
    return { kind: "body", weight_kg: weight, waist_cm: waist, neck_cm: neck };
  }
  return null;
}

/** Voice or typed text in, draft items out. Nothing is saved to food or activity yet. */
export async function parseLogAction(input: unknown): Promise<ParseOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };

  const parsed = parseInput.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { text, source } = parsed.data;
  const day = parsed.data.day ?? todayRiga();

  if (await overLimit(supabase, "parse")) return { ok: false, reason: "limit" };

  // Keep the raw words first, so a failed parse never loses them.
  const { data: log, error: logError } = await supabase
    .from("logs")
    .insert({ day, raw_text: text, source })
    .select("id")
    .single();
  if (logError || !log) return { ok: false, reason: "failed" };

  const result = await parseLog(text, todayRiga());
  if (!result.ok) {
    return { ok: false, reason: result.reason === "limit" ? "ai_limit" : "failed", logId: log.id };
  }
  await supabase.from("logs").update({ model: result.model }).eq("id", log.id);

  const { data: savedRows } = await supabase.from("saved_foods").select("name,kcal,protein_g,quantity");
  const saved: SavedLookup[] = (savedRows ?? []).map((s) => ({
    name: s.name,
    kcal: s.kcal,
    protein_g: Number(s.protein_g),
    quantity: s.quantity === null ? null : Number(s.quantity),
  }));

  const items: DraftItem[] = [];
  const unclear = [...result.data.unclear];
  for (const it of result.data.items) {
    const draft = toDraft(it, saved);
    if (draft) items.push(draft);
    else if (it.name) unclear.push(it.name);
  }
  return { ok: true, logId: log.id, items, unclear };
}

const photoInput = z.object({
  base64: z.string().min(100).max(7_000_000),
  mime: z.enum(["image/jpeg", "image/webp"]),
  day: dayField.optional(),
});

/** Meal photo estimate. Only a meal photo the user just tapped Estimate on is sent. */
export async function estimateMealAction(input: unknown): Promise<ParseOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };

  const parsed = photoInput.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  if (await overLimit(supabase, "photo")) return { ok: false, reason: "limit" };

  const day = parsed.data.day ?? todayRiga();
  const { data: log, error } = await supabase
    .from("logs")
    .insert({ day, raw_text: "Meal photo", source: "photo" })
    .select("id")
    .single();
  if (error || !log) return { ok: false, reason: "failed" };

  const res = await estimateMealPhoto(parsed.data.base64, parsed.data.mime);
  if (!res.ok) {
    return { ok: false, reason: res.reason === "limit" ? "ai_limit" : "failed", logId: log.id };
  }
  await supabase.from("logs").update({ model: res.model }).eq("id", log.id);
  const items: DraftItem[] = res.data.items.map((c) =>
    finalizeFood({
      name: c.name,
      grams: c.grams,
      quantity: null,
      unit: null,
      category: c.category,
      kcal: c.kcal,
      protein_g: c.protein_g,
      confidence: res.data.confidence,
    }),
  );
  return { ok: true, logId: log.id, unclear: [], items };
}

/** Confirmed items in: food, activity (calories computed here), body measurements. */
export async function saveEntries(input: SaveEntriesInput): Promise<SaveEntriesOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };

  const parsed = saveEntriesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { day, source, items } = parsed.data;
  if (!dayField.safeParse(day).success) return { ok: false, reason: "invalid" };

  let logId = parsed.data.logId;
  let createdLogId: string | null = null;
  if (!logId) {
    const summary = items
      .map((i) =>
        i.kind === "food" ? i.name : i.kind === "activity" ? i.activity_type : "body",
      )
      .join(", ")
      .slice(0, 400);
    const { data: log, error } = await supabase
      .from("logs")
      .insert({ day, raw_text: summary || "Log", source })
      .select("id")
      .single();
    if (error || !log) return { ok: false, reason: "failed" };
    logId = log.id;
    createdLogId = log.id;
  }

  // A save is all or nothing: if a later step fails, what this call already wrote is removed,
  // so a retry cannot double the foods.
  let actIds: string[] = [];
  const rollback = async (foodIds: string[]) => {
    if (foodIds.length > 0) await supabase.from("food_entries").delete().in("id", foodIds);
    if (actIds.length > 0) await supabase.from("activity_entries").delete().in("id", actIds);
    if (createdLogId) await supabase.from("logs").delete().eq("id", createdLogId);
  };

  const foods = items.filter((i): i is Extract<DraftItem, { kind: "food" }> => i.kind === "food");
  const acts = items.filter((i): i is Extract<DraftItem, { kind: "activity" }> => i.kind === "activity");
  const bodies = items.filter((i): i is Extract<DraftItem, { kind: "body" }> => i.kind === "body");

  let foodIds: string[] = [];
  if (foods.length > 0) {
    const { data: inserted, error } = await supabase.from("food_entries").insert(
      foods.map((f) => ({
        log_id: logId,
        day,
        name: f.name,
        quantity: f.quantity,
        unit: f.unit,
        kcal: f.kcal,
        protein_g: f.protein_g,
        source,
        confidence: f.confidence,
      })),
    ).select("id");
    if (error) return { ok: false, reason: "failed" };
    foodIds = (inserted ?? []).map((r) => r.id);
  }

  if (acts.length > 0) {
    const weight = await weightOn(supabase, day);
    const { data: insertedActs, error } = await supabase.from("activity_entries").insert(
      acts.map((a) => ({
        log_id: logId,
        day,
        activity_type: a.activity_type,
        session_key: a.session_key,
        duration_min: a.duration_min,
        // Frozen at save: it depends on the weight of that day.
        kcal_burned: activityKcal(a.activity_type, a.duration_min, weight),
        rpe: a.rpe,
        source,
      })),
    ).select("id");
    actIds = (insertedActs ?? []).map((r) => r.id);
    if (error) {
      await rollback(foodIds);
      return { ok: false, reason: "failed" };
    }
  }

  for (const b of bodies) {
    const ok = await upsertMeasurement(supabase, day, b);
    if (!ok) {
      await rollback(foodIds);
      return { ok: false, reason: "failed" };
    }
  }

  // Saved foods are bookkeeping: touched only once everything else is safely written.
  if (foods.length > 0) await touchSavedFoods(supabase, foods);

  revalidatePath("/today");
  revalidatePath("/progress");
  revalidatePath("/train");

  // The Coach notices one true thing, after the response so logging stays fast.
  const userId = auth.user.id;
  const hasFood = foods.length > 0;
  after(async () => {
    try {
      await observe(supabase, userId, new Date(), { justLogged: true, justLoggedFood: hasFood });
    } catch (err) {
      console.error("observer failed", err instanceof Error ? err.message : "unknown");
    }
  });
  return { ok: true, foodIds };
}

type Db = Awaited<ReturnType<typeof createClient>>;

async function weightOn(supabase: Db, day: string): Promise<number> {
  const { data } = await supabase
    .from("measurements")
    .select("weight_kg")
    .not("weight_kg", "is", null)
    .lte("measured_on", day)
    .order("measured_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.weight_kg ?? 80;
}

async function upsertMeasurement(
  supabase: Db,
  day: string,
  b: Extract<DraftItem, { kind: "body" }>,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("measurements")
    .select("id")
    .eq("measured_on", day)
    .maybeSingle();
  const patch = {
    ...(b.weight_kg !== null ? { weight_kg: b.weight_kg } : {}),
    ...(b.waist_cm !== null ? { waist_cm: b.waist_cm } : {}),
    ...(b.neck_cm !== null ? { neck_cm: b.neck_cm } : {}),
  };
  if (existing) {
    const { error } = await supabase.from("measurements").update(patch).eq("id", existing.id);
    return !error;
  }
  const { error } = await supabase.from("measurements").insert({ measured_on: day, ...patch });
  return !error;
}

/** A food logged twice becomes a one-tap saved food. */
async function touchSavedFoods(
  supabase: Db,
  foods: Extract<DraftItem, { kind: "food" }>[],
) {
  for (const f of foods) {
    const { data: saved } = await supabase
      .from("saved_foods")
      .select("id,use_count")
      .ilike("name", f.name.replace(/[%_]/g, (c) => `\\${c}`))
      .limit(1)
      .then((r) => ({ data: r.data?.[0] ?? null }));
    if (saved) {
      await supabase
        .from("saved_foods")
        .update({
          use_count: saved.use_count + 1,
          kcal: f.kcal,
          protein_g: f.protein_g,
          quantity: f.quantity,
          unit: f.unit,
        })
        .eq("id", saved.id);
      continue;
    }
    const { count } = await supabase
      .from("food_entries")
      .select("id", { count: "exact", head: true })
      .ilike("name", f.name.replace(/[%_]/g, (c) => `\\${c}`));
    if ((count ?? 0) >= 2) {
      await supabase.from("saved_foods").insert({
        name: f.name,
        quantity: f.quantity,
        unit: f.unit,
        kcal: f.kcal,
        protein_g: f.protein_g,
        use_count: count ?? 2,
      });
    }
  }
}

const deleteInput = z.object({ kind: z.enum(["food", "activity"]), id: z.uuid() });

export async function deleteEntry(input: unknown): Promise<SaveOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = deleteInput.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const table = parsed.data.kind === "food" ? "food_entries" : "activity_entries";
  const { error } = await supabase.from(table).delete().eq("id", parsed.data.id);
  if (error) return { ok: false, reason: "failed" };
  revalidatePath("/today");
  return { ok: true };
}

const updateInput = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  quantity: z.number().positive().max(99999).nullable(),
  /** Null means: work it out again from the new amount. */
  kcal: z.number().int().min(0).max(5000).nullable(),
  protein_g: z.number().min(0).max(300).nullable(),
});

/** Edit a saved food entry. Changing only the amount recalculates the numbers. */
export async function updateFoodEntry(input: unknown): Promise<SaveOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = updateInput.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const p = parsed.data;

  const { data: before } = await supabase
    .from("food_entries")
    .select("quantity,unit,kcal,protein_g")
    .eq("id", p.id)
    .maybeSingle();
  if (!before) return { ok: false, reason: "failed" };

  let kcal = p.kcal;
  let protein = p.protein_g;
  if (kcal === null || protein === null) {
    const m = matchFood(p.name);
    const grams = p.quantity;
    if (m && grams !== null && (before.unit === "g" || before.unit === "ml")) {
      const n = nutrientsFor(m.food, grams);
      kcal = n.kcal;
      protein = n.protein_g;
    } else {
      // No table match: scale the old numbers by the change in amount.
      const was = before.quantity === null ? null : Number(before.quantity);
      const ratio = was && grams ? grams / was : 1;
      kcal = Math.max(0, Math.min(5000, Math.round(before.kcal * ratio)));
      protein = Math.max(0, Math.min(300, Math.round(Number(before.protein_g) * ratio * 10) / 10));
    }
  }

  const { error } = await supabase
    .from("food_entries")
    .update({ name: p.name, quantity: p.quantity, kcal, protein_g: protein, confidence: 1 })
    .eq("id", p.id);
  if (error) return { ok: false, reason: "failed" };
  revalidatePath("/today");
  return { ok: true };
}
