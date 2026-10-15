"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { addDays, isDay, todayRiga } from "@/lib/dates";

export type PhotoOutcome =
  | { ok: true }
  | { ok: false; reason: "signed_out" | "invalid" | "failed" };

const takenOn = z
  .string()
  .refine(isDay)
  .refine((d) => d <= todayRiga() && d >= addDays(todayRiga(), -400));

const pathField = z
  .string()
  .max(200)
  .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);

const progressSchema = z.object({
  path: pathField,
  takenOn,
  pose: z.enum(["front", "side", "back"]),
});

/** The file is already in Storage (client upload, RLS checks the folder). This records it. */
export async function recordProgressPhoto(input: unknown): Promise<PhotoOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = progressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  if (!parsed.data.path.startsWith(`${auth.user.id}/`)) return { ok: false, reason: "invalid" };

  const { error } = await supabase.from("photos").insert({
    kind: "progress",
    storage_path: parsed.data.path,
    taken_on: parsed.data.takenOn,
    pose: parsed.data.pose,
  });
  if (error) return { ok: false, reason: "failed" };
  revalidatePath("/progress");
  return { ok: true };
}

const deleteSchema = z.object({ id: z.uuid() });

export async function deletePhoto(input: unknown): Promise<PhotoOutcome> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, reason: "signed_out" };
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const { data: row } = await supabase
    .from("photos")
    .select("storage_path,kind")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!row) return { ok: false, reason: "invalid" };

  await supabase.storage
    .from(row.kind === "meal" ? "meal-photos" : "progress-photos")
    .remove([row.storage_path]);
  const { error } = await supabase.from("photos").delete().eq("id", parsed.data.id);
  if (error) return { ok: false, reason: "failed" };
  revalidatePath("/today");
  revalidatePath("/progress");
  return { ok: true };
}
