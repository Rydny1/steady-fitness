// The nod: rare, only when something real happened (GAME.md).
import { diffDays } from "@/lib/dates";
import { NOD } from "./config";

export type NodEvent = "record" | "lowest_average" | "perfect_week";

/**
 * Decide whether the Coach nods. `random` is a number in [0, 1) passed in by the caller.
 * One in three, never two days running (a nod yesterday or today blocks it), and never
 * without a real event.
 */
export function shouldNod(input: {
  events: readonly NodEvent[];
  random: number;
  today: string;
  lastNodDay: string | null;
}): boolean {
  if (input.events.length === 0) return false;
  if (input.lastNodDay !== null && diffDays(input.today, input.lastNodDay) < NOD.minDaysBetween) {
    return false;
  }
  return input.random < NOD.chance;
}
