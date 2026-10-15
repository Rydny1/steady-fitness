"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { netInsight } from "@/lib/ai/gemini";
import { monthNeed, paceSentence, type NetProjection } from "@/features/nutrition/projection";

const num = z.number().finite().nullable();
const input = z.object({
  key: z.string().min(1).max(160),
  goal: z.enum(["lose", "gain", "maintain"]),
  avgNet: num,
  loggedDays: z.number().int().min(0).max(400),
  kgPerWeek: num,
  remainingKg: num,
  weeksToGoal: z.number().int().min(0).max(1000).nullable(),
  needPer30Days: num,
});

const ALWAYS = new Set(["7", "30", "1000", "7700"]);

/** Every number in the sentence must come from the facts, or the plain sentence is used instead. */
function grounded(text: string, p: NetProjection): boolean {
  const allowed = new Set(ALWAYS);
  for (const v of [p.avgNet, p.kgPerWeek, p.remainingKg, p.weeksToGoal, p.needPer30Days, p.loggedDays]) {
    if (v === null) continue;
    const a = Math.abs(v);
    allowed.add(String(Math.round(a)));
    allowed.add(String(Math.round(a * 10) / 10));
    allowed.add(a.toFixed(1));
  }
  const found = text.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) ?? [];
  return found.every((n) => allowed.has(n) || allowed.has(String(Number(n))));
}

/**
 * The line under the net-calorie card. The plain sentence is built from the numbers; Gemini
 * rewords it with advice. Cached per day so a refresh never calls the model again.
 */
export async function getNetInsight(raw: unknown): Promise<{ text: string; ai: boolean }> {
  const parsed = input.safeParse(raw);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!parsed.success || !auth.user) return { text: "", ai: false };
  const p = parsed.data;
  const projection: NetProjection = { ...p, avgNet: p.avgNet };
  const plain = [paceSentence(projection), monthNeed(projection)].filter(Boolean).join(" ");
  if (p.avgNet === null) return { text: plain, ai: false };

  const { data: rows } = await supabase.from("user_flags").select("key,value").in("key", ["net_insight", "net_insight_count"]);
  const cached = rows?.find((r) => r.key === "net_insight")?.value as { key?: string; text?: string; ai?: boolean } | undefined;
  if (cached?.key === p.key && cached.text) return { text: cached.text, ai: cached.ai !== false };
  // The free AI quota is shared, so each person gets a few of these a day.
  const counter = rows?.find((r) => r.key === "net_insight_count")?.value as { day?: string; n?: number } | undefined;
  const todayKey = p.key.split("|")[0] ?? "";
  const used = counter?.day === todayKey ? (counter.n ?? 0) : 0;
  if (used >= 5) return { text: plain, ai: false };
  await supabase
    .from("user_flags")
    .upsert({ user_id: auth.user.id, key: "net_insight_count", value: { day: todayKey, n: used + 1 } }, { onConflict: "user_id,key" });

  const res = await netInsight(JSON.stringify({ goal: p.goal, avgDailyNet: p.avgNet, daysCounted: p.loggedDays, kgPerWeek: p.kgPerWeek, kgToGoal: p.remainingKg, weeksToGoal: p.weeksToGoal, netNeededToHitGoalIn30Days: p.needPer30Days }));
  if (!res.ok || !grounded(res.data, projection)) {
    await supabase
      .from("user_flags")
      .upsert({ user_id: auth.user.id, key: "net_insight", value: { key: p.key, text: plain, ai: false } }, { onConflict: "user_id,key" });
    return { text: plain, ai: false };
  }
  await supabase
    .from("user_flags")
    .upsert({ user_id: auth.user.id, key: "net_insight", value: { key: p.key, text: res.data, ai: true } }, { onConflict: "user_id,key" });
  return { text: res.data, ai: true };
}
