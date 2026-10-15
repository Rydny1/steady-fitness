import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SourceT } from "@/lib/supabase/types";
import { addDays, todayRiga } from "@/lib/dates";

// AI endpoints are limited per user per day by counting rows in `logs`
// (SECURITY.md section 2): 60 parses, 20 photo estimates. No extra table.
// Failed calls count too (the row is written before Gemini is called), so retries cannot burn the key.
export const LIMITS = { parse: 60, photo: 20 } as const;

type Db = SupabaseClient<Database>;

/** Start of today in Riga as an ISO instant, close enough for a daily count. */
function sinceIso(): string {
  // Riga is UTC+2 or UTC+3. Going back 3 hours from the UTC date of the Riga day
  // start covers both, and the day filter below is on logs.day anyway.
  return `${addDays(todayRiga(), -1)}T21:00:00.000Z`;
}

export async function aiCallsToday(
  supabase: Db,
  kind: keyof typeof LIMITS,
): Promise<number> {
  const sources: SourceT[] = kind === "photo" ? ["photo"] : ["voice", "text"];
  const { count } = await supabase
    .from("logs")
    .select("id", { count: "exact", head: true })
    .in("source", sources)
    // Logs read by plain rules never touched the AI.
    .or("model.is.null,model.neq.rules")
    .gte("created_at", sinceIso());
  return count ?? 0;
}

export async function overLimit(supabase: Db, kind: keyof typeof LIMITS): Promise<boolean> {
  return (await aiCallsToday(supabase, kind)) >= LIMITS[kind];
}
