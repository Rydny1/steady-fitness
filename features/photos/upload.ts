"use client";

import { createClient } from "@/lib/supabase/client";

// Browser upload straight to private Storage. The path starts with the user id,
// which is what the storage policy checks. No other client-side writes exist.

export async function uploadPhoto(
  bucket: "meal-photos" | "progress-photos",
  blob: Blob,
): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const path = `${data.user.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  return error ? null : path;
}
