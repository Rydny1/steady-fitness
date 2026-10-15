// Turns what a person says about exercise into minutes and speed. The AI only reads the words
// ("ran 4 km", "walked 5000 steps", "45 minutes at 6:00 pace"); this file does the arithmetic,
// so the same words always give the same calories.
import type { ActivityT } from "@/lib/supabase/types";

export type RawActivity = {
  type: ActivityT;
  durationMin: number | null;
  distanceKm: number | null;
  steps: number | null;
  paceMinPerKm: number | null;
  /** A hike: slow on foot over rough ground. Typical speed 4 km/h, and it burns like a MET of 6. */
  hike?: boolean;
};

export type ResolvedActivity = {
  durationMin: number;
  /** Known speed in km/h, or null when only a time was given. */
  speedKmh: number | null;
  /** How the minutes were worked out, shown under the item. */
  note: string | null;
};

/** Typical speeds when only a distance (or steps) is given. */
const DEFAULT_KMH: Partial<Record<ActivityT, number>> = { run: 9, walk: 5, cycling: 18 };
const HIKE_KMH = 4;
export const HIKE_MET = 6;
/** Believable speed range per activity. Outside it the figure is ignored. */
const SPEED_RANGE: Partial<Record<ActivityT, [number, number]>> = {
  run: [5, 24],
  walk: [2, 8],
  cycling: [8, 45],
};
/** Average step length. */
const KM_PER_STEP = 0.00075;

const fmt = (n: number, dp = 1) => (Math.round(n * 10 ** dp) / 10 ** dp).toString();
const pace = (kmh: number) => {
  const m = 60 / kmh;
  const mm = Math.floor(m);
  const ss = Math.round((m - mm) * 60);
  return `${mm}:${String(ss === 60 ? 0 : ss).padStart(2, "0")}/km`;
};

function inRange(type: ActivityT, kmh: number): boolean {
  const r = SPEED_RANGE[type];
  return r ? kmh >= r[0] && kmh <= r[1] : kmh > 0;
}

export function resolveActivity(raw: RawActivity): ResolvedActivity | null {
  const type = raw.type;
  const dur = raw.durationMin !== null && raw.durationMin > 0 ? raw.durationMin : null;
  let km = raw.distanceKm !== null && raw.distanceKm > 0 ? raw.distanceKm : null;
  let stepsNote: string | null = null;
  if (km === null && raw.steps !== null && raw.steps > 0) {
    km = raw.steps * KM_PER_STEP;
    stepsNote = `${Math.round(raw.steps).toLocaleString("en-GB")} steps, about ${fmt(km)} km`;
  }
  let kmh = raw.paceMinPerKm !== null && raw.paceMinPerKm > 0 ? 60 / raw.paceMinPerKm : null;
  if (kmh !== null && !inRange(type, kmh)) kmh = null;

  // Time and distance: the speed follows from them.
  if (dur !== null && km !== null) {
    const v = km / (dur / 60);
    return {
      durationMin: Math.round(dur),
      speedKmh: inRange(type, v) ? Math.round(v * 10) / 10 : null,
      note: stepsNote ?? `${fmt(km)} km in ${Math.round(dur)} min`,
    };
  }
  if (dur !== null) {
    return { durationMin: Math.round(dur), speedKmh: kmh === null ? null : Math.round(kmh * 10) / 10, note: kmh === null ? null : `at ${pace(kmh)}` };
  }
  // Distance (or steps) without a time: use the stated pace, or a typical one.
  if (km !== null) {
    const v = kmh ?? (raw.hike ? HIKE_KMH : (DEFAULT_KMH[type] ?? null));
    if (v === null) return null;
    const minutes = Math.max(1, Math.round((km / v) * 60));
    const how = kmh !== null ? `at ${pace(v)}` : `at a typical ${pace(v)}`;
    return { durationMin: minutes, speedKmh: Math.round(v * 10) / 10, note: stepsNote ? `${stepsNote}, ${how}` : `${fmt(km)} km ${how}` };
  }
  return null;
}

/** MET by speed, from the standard compendium bands. Null when the activity has no speed model. */
export function speedMet(type: ActivityT, kmh: number): number | null {
  if (type === "run") return Math.max(6, Math.round(kmh * 1.03 * 10) / 10);
  if (type === "walk") {
    if (kmh <= 3.2) return 2.5;
    if (kmh <= 4.0) return 2.9;
    if (kmh <= 4.8) return 3.3;
    if (kmh <= 5.6) return 3.8;
    if (kmh <= 6.4) return 5.0;
    return 6.5;
  }
  if (type === "cycling") {
    if (kmh < 16) return 4.0;
    if (kmh < 19) return 6.8;
    if (kmh < 22) return 8.0;
    if (kmh < 25) return 10.0;
    return 12.0;
  }
  return null;
}

// ---- strength: sets and reps become minutes ----

/** Seconds a rep takes, and the rest between sets. A set of 8 is about 24 s of work and a minute and a bit of rest. */
const SEC_PER_REP = 3;
const REST_SEC = 75;

export type Exercise = { name: string; sets: number; reps: number; loadKg: number | null; assumed: boolean };

/** Minutes for a set scheme. Never less than a minute. */
export function strengthMinutes(sets: number, reps: number): number {
  return Math.max(1, Math.round((sets * (reps * SEC_PER_REP + REST_SEC)) / 60));
}

/** "bench press 4x8 at 60 kg" */
export function exerciseNote(e: Exercise): string {
  return `${e.name} ${e.sets}x${e.reps}${e.loadKg ? ` at ${e.loadKg} kg` : ""}${e.assumed ? " (assumed)" : ""}`;
}
