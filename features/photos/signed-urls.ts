import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/** Signed URLs, 1 hour. Buckets are private; paths start with the user id (RLS checks it). */
export async function signedUrls(
  supabase: SupabaseClient<Database>,
  bucket: "meal-photos" | "progress-photos",
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}
