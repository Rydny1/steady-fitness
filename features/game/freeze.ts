// Streak freeze: spend Callus to keep a streak through a day you cannot log.
// It only costs Callus if the day ends with nothing logged. Two a month.
import { addDays } from "@/lib/dates";
import { FREEZE } from "./config";

/** Freezes still available: the limit minus those set in the last 30 days. */
export function freezesLeft(frozenDays: readonly string[], today: string): number {
  const since = addDays(today, -30);
  const used = frozenDays.filter((d) => d > since && d <= today).length;
  return Math.max(0, FREEZE.perMonth - used);
}

export type FreezeCheck = { ok: true } | { ok: false; reason: "already" | "none_left" | "low_callus" };

export function canFreeze(frozenDays: readonly string[], today: string, callus: number): FreezeCheck {
  if (frozenDays.includes(today)) return { ok: false, reason: "already" };
  if (freezesLeft(frozenDays, today) <= 0) return { ok: false, reason: "none_left" };
  if (callus < FREEZE.cost) return { ok: false, reason: "low_callus" };
  return { ok: true };
}
