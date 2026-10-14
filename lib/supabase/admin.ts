import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./types";

// Secret-key client. Bypasses RLS. Imported only by api/cron/* and the
// delete-everything action. Never import from a client component.
export function createAdminClient() {
  const e = env();
  return createSupabaseClient<Database>(
    e.NEXT_PUBLIC_SUPABASE_URL,
    e.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
