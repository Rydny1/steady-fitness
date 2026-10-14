import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotifyKindT } from "@/lib/supabase/types";
import { addDays, diffDays, isoWeekday, rigaParts } from "@/lib/dates";
import { sendToUser } from "@/lib/push";
import { loadDayFacts } from "@/features/data/day-facts";
import { latestLedger } from "@/features/data/ledger";
import { scoreUserDay } from "./score-day";
import { writeWeeklyReport } from "./weekly-report";
import { dueKinds, pickLine, shouldSend, titleFor, type PrefRow } from "@/features/notifications/schedule";
import { chapters } from "@/content/copy";
import { runAdaptiveBudget } from "./adaptive";

type Db = SupabaseClient<Database>;

export type TickResult = { users: number; scored: number; pushed: number; reports: number };

/** Inserts the job key. True only for the one tick that gets to run the job (no double sends). */
async function claim(admin: Db, key: string): Promise<boolean> {
  const { error } = await admin.from("job_runs").insert({ job_key: key });
  return !error;
}

/**
 * Runs every 15 minutes. Idempotent through job_runs: each job key can run once.
 * Nightly scoring (yesterday, after 00:05), push notifications, Sunday week report.
 */
export async function runTick(admin: Db, now: Date): Promise<TickResult> {
  const parts = rigaParts(now);
  const result: TickResult = { users: 0, scored: 0, pushed: 0, reports: 0 };

  const { data: profiles } = await admin.from("profiles").select("user_id,created_at");
  for (const p of profiles ?? []) {
    result.users += 1;
    const userId = p.user_id;

    // 1. Nightly scoring, catching up any missed nights (at most 14).
    const nowMinutes = parts.hour * 60 + parts.minute;
    const lastScorable = nowMinutes >= 5 ? addDays(parts.date, -1) : addDays(parts.date, -2);
    const ledger = await latestLedger(admin, userId);
    const first = ledger.day ? addDays(ledger.day, 1) : p.created_at.slice(0, 10);
    const startDay = diffDays(lastScorable, first) > 13 ? addDays(lastScorable, -13) : first;
    for (let d = startDay; d <= lastScorable; d = addDays(d, 1)) {
      if (!(await claim(admin, `score:${userId}:${d}`))) continue;
      try {
        const event = await scoreUserDay(admin, userId, d);
        result.scored += 1;
        if (event) {
          const level = chapters[event.division];
          result.pushed += await sendToUser(admin, userId, {
            title: event.kind === "promoted" ? `Level ${level.n}: ${level.name}` : `Back to ${level.name}`,
            body: level.story,
            url: "/today",
            tag: "level",
          });
        }
      } catch (err) {
        // Free the key so the next tick retries this night.
        await admin.from("job_runs").delete().eq("job_key", `score:${userId}:${d}`);
        console.error("score failed", d, err instanceof Error ? err.message : "unknown");
      }
    }

    let reportDone = false;

    // 2. Notifications that are due now.
    const { data: prefRows } = await admin
      .from("notification_prefs")
      .select("kind,at_time,enabled")
      .eq("user_id", userId);
    const prefs: PrefRow[] = (prefRows ?? []).map((r) => ({
      kind: r.kind,
      atTime: r.at_time.slice(0, 5),
      enabled: r.enabled,
    }));
    const due = dueKinds(prefs, nowMinutes, parts.weekday);
    if (due.length > 0) {
      const facts = await loadDayFacts(admin, userId, addDays(parts.date, -1), parts.date);
      const t = facts[facts.length - 1];
      const { data: lastPhoto } = await admin
        .from("photos")
        .select("taken_on")
        .eq("user_id", userId)
        .eq("kind", "progress")
        .order("taken_on", { ascending: false })
        .limit(1)
        .maybeSingle();
      const streak = (ledger.streak ?? 0) + (t?.loggedOnDay ? 1 : 0);
      const dayNumber = diffDays(parts.date, "2026-01-01");

      for (const kind of due as NotifyKindT[]) {
        const ok = shouldSend(kind, {
          planned: t?.plannedKey ?? null,
          loggedToday: t?.loggedOnDay ?? false,
          streak,
          photoDue: !lastPhoto || diffDays(parts.date, lastPhoto.taken_on) >= 14,
          weekday: parts.weekday,
        });
        if (!ok) continue;
        if (!(await claim(admin, `push:${userId}:${kind}:${parts.date}`))) continue;

        let body = pickLine(kind, dayNumber, streak);
        if (kind === "weekly") {
          body = await writeWeeklyReport(admin, userId, parts.date);
          reportDone = true;
        }
        if (!body) continue;
        result.pushed += await sendToUser(admin, userId, {
          title: titleFor(kind),
          body,
          url: kind === "photo_day" ? "/progress#photos" : kind === "weekly" ? "/progress" : "/today",
          tag: kind,
        });
      }
    }

    // 3a. Monday: adaptive budget from the last 14 days (code only).
    if (parts.weekday === 1 && nowMinutes >= 15) {
      if (await claim(admin, `adaptive:${userId}:${parts.date}`)) {
        try {
          await runAdaptiveBudget(admin, userId, parts.date);
        } catch (err) {
          await admin.from("job_runs").delete().eq("job_key", `adaptive:${userId}:${parts.date}`);
          console.error("adaptive failed", err instanceof Error ? err.message : "unknown");
        }
      }
    }

    // 3. Sunday week report, when the weekly push is off or already past (idempotent).
    if (!reportDone && isoWeekday(parts.date) === 7 && nowMinutes >= 21 * 60) {
      if (await claim(admin, `report:${userId}:${parts.date}`)) {
        try {
          await writeWeeklyReport(admin, userId, parts.date);
          result.reports += 1;
        } catch (err) {
          await admin.from("job_runs").delete().eq("job_key", `report:${userId}:${parts.date}`);
          console.error("report failed", err instanceof Error ? err.message : "unknown");
        }
      }
    }
  }
  return result;
}
