import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { runTick } from "@/features/jobs/tick";

// Called every 15 minutes by Supabase pg_cron (pg_net). Bearer CRON_SECRET, compared in
// constant time. Idempotent through job_runs, so a retried or doubled call does nothing twice.
export const maxDuration = 60;

function authorised(req: NextRequest): boolean {
  const header = req.headers.get("authorization") ?? "";
  const given = createHash("sha256").update(header).digest();
  const expected = createHash("sha256").update(`Bearer ${env().CRON_SECRET}`).digest();
  return timingSafeEqual(given, expected);
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const result = await runTick(createAdminClient(), new Date());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("tick failed", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
