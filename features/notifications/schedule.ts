// Notification schedule (PRODUCT.md > Notifications). Pure: decides what is due and what to say.
import { notificationPools } from "@/content/copy";
import type { NotifyKindT, SessionKeyT } from "@/lib/supabase/types";

export type PrefRow = { kind: NotifyKindT; atTime: string; enabled: boolean };

/** A tick runs every 15 minutes. A message is still sent up to this long after its time. */
export const CATCH_UP_MINUTES = 90;

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

/** Kinds whose time has come (not yet sent today is checked by the caller through job_runs). */
export function dueKinds(
  prefs: readonly PrefRow[],
  nowMinutes: number,
  weekday: number,
): NotifyKindT[] {
  return prefs
    .filter((p) => p.enabled)
    .filter((p) => {
      const at = minutesOf(p.atTime);
      return nowMinutes >= at && nowMinutes < at + CATCH_UP_MINUTES;
    })
    .filter((p) => p.kind !== "weekly" || weekday === 7)
    .map((p) => p.kind);
}

export type SendContext = {
  planned: SessionKeyT | null;
  loggedToday: boolean;
  streak: number;
  /** Last progress photo is 14 or more days old, or there is none. */
  photoDue: boolean;
  /** ISO weekday, 1 = Monday. */
  weekday: number;
};

/** Whether the condition for this kind holds right now. */
export function shouldSend(kind: NotifyKindT, ctx: SendContext): boolean {
  switch (kind) {
    case "wake_gym":
      return ctx.planned === "gym_a" || ctx.planned === "gym_b" || ctx.planned === "gym_c";
    case "wake_run":
      return ctx.planned === "run" || ctx.planned === "run_intervals";
    case "log_nudge":
      return !ctx.loggedToday;
    case "last_call":
      return !ctx.loggedToday;
    case "weekly":
      return true;
    case "photo_day":
      // Fortnightly nudge: due when the last photo is 14+ days old, asked on Saturdays only.
      return ctx.photoDue && ctx.weekday === 6;
  }
}

/** One line from the pool, rotating by day so it is never the same two days running. */
export function pickLine(kind: NotifyKindT, dayNumber: number, streak: number): string {
  const lines = notificationPools[kind].lines;
  if (lines.length === 0) return "";
  const line = lines[((dayNumber % lines.length) + lines.length) % lines.length] ?? lines[0] ?? "";
  return line.replace("{streak}", String(streak));
}

export function titleFor(kind: NotifyKindT): string {
  return notificationPools[kind].title;
}
