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

function toDraft(item: ParsedItem): DraftItem | null {
  const round = (n: number | null, max: number) =>
    n === null ? 0 : Math.max(0, Math.min(max, Math.round(n)));
  if (item.kind === "food") {
    return {
      kind: "food",
      name: item.name.trim().slice(0, 80) || "Food",
      quantity: item.quantity && item.quantity > 0 ? Math.min(item.quantity, 99999) : null,
      unit: item.unit ? item.unit.slice(0, 16) : null,
      kcal: round(item.kcal, 5000),
      protein_g: Math.max(0, Math.min(300, Math.round((item.protein_g ?? 0) * 10) / 10)),
      confidence: item.confidence,
    };
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

  const items: DraftItem[] = [];
  const unclear = [...result.data.unclear];
  for (const it of result.data.items) {
    const draft = toDraft(it);
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
  const e = res.data;
  return {
    ok: true,
    logId: log.id,
    unclear: [],
    items: [
      {
        kind: "food",
        name: e.name.trim().slice(0, 80) || "Meal",
        quantity: e.quantity && e.quantity > 0 ? Math.min(e.quantity, 99999) : null,
        unit: e.unit ? e.unit.slice(0, 16) : null,
        kcal: Math.max(0, Math.min(5000, Math.round(e.kcal))),
        protein_g: Math.max(0, Math.min(300, Math.round(e.protein_g * 10) / 10)),
        confidence: e.confidence,
      },
    ],
  };
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
  const rollback = async (foodIds: string[]) => {
    if (foodIds.length > 0) await supabase.from("food_entries").delete().in("id", foodIds);
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
    const { error } = await supabase.from("activity_entries").insert(
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
    );
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
      .maybeSingle();
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
