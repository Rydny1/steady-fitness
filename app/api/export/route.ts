import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { todayRiga } from "@/lib/dates";
import { pageAll } from "@/lib/page-all";

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

// Stable paging needs a unique order. Tables without an id page by their key.
const ORDER: Record<string, string[]> = {
  profiles: ["user_id"],
  weekly_plan: ["weekday"],
  notification_prefs: ["kind"],
  habit_checks: ["day", "habit_id"],
  day_checkins: ["day"],
  daily_scores: ["day"],
  weekly_reviews: ["week_start"],
  weekly_challenges: ["week_start"],
  user_flags: ["key"],
};

export async function GET(req: NextRequest) {
  // Downloads start from our own pages. Refuse requests that began on another site.
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const out: Record<string, unknown> = { exported_on: todayRiga(), app: "steady" };
  for (const t of TABLES) {
    const cols = ORDER[t] ?? ["id"];
    const rows = await pageAll((a, b) => {
      let q = supabase.from(t).select("*");
      for (const c of cols) q = q.order(c);
      return q.range(a, b);
    });
    out[t] = rows;
  }

  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="steady-export-${todayRiga()}.json"`,
      "cache-control": "no-store",
    },
  });
}
