import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { env } from "@/lib/env";

type Db = SupabaseClient<Database>;

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let configured = false;
function setup() {
  if (configured) return;
  const e = env();
  webpush.setVapidDetails(e.VAPID_SUBJECT, e.NEXT_PUBLIC_VAPID_PUBLIC_KEY, e.VAPID_PRIVATE_KEY);
  configured = true;
}

/** Sends to every phone the user subscribed. Dead subscriptions (404, 410) are removed. */
export async function sendToUser(admin: Db, userId: string, payload: PushPayload): Promise<number> {
  setup();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId);
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 },
      );
      sent += 1;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
      } else {
        console.error("push failed", { status });
      }
    }
  }
  return sent;
}
