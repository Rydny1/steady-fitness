import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { todayRiga } from "@/lib/dates";

// Everything the user owns, as one JSON file. Read-only, through RLS.
const TABLES = [
  "profiles",
  "targets",
  "weekly_plan",
  "notification_prefs",
  "habits",
  "habit_checks",
  "logs",
  "food_entries",
  "activity_entries",
  "saved_foods",
  "day_checkins",
  "measurements",
  "photos",
  "workout_sessions",
  "workout_sets",
  "daily_scores",
  "weekly_reviews",
  "weekly_challenges",
  "user_flags",
  "observer_notes",
] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const out: Record<string, unknown> = { exported_on: todayRiga(), app: "steady" };
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select("*").limit(50_000);
    if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
    out[t] = data ?? [];
  }

  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="steady-export-${todayRiga()}.json"`,
      "cache-control": "no-store",
    },
  });
}
