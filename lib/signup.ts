import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

const PER_HOUR = 5;

/**
 * Sign-up abuse guard: at most 5 new accounts an hour from one address. No extra table: each
 * allowed attempt claims a unique key in job_runs, and the sixth finds all five taken.
 */
export async function claimSignupSlot(): Promise<boolean> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "unknown").split(",")[0]?.trim() ?? "unknown";
  const who = createHash("sha256").update(`${ip}:${env().CRON_SECRET}`).digest("hex").slice(0, 24);
  const hour = new Date().toISOString().slice(0, 13);
  const admin = createAdminClient();
  for (let n = 1; n <= PER_HOUR; n++) {
    const { error } = await admin.from("job_runs").insert({ job_key: `signup:${who}:${hour}:${n}` });
    if (!error) return true;
  }
  return false;
}
