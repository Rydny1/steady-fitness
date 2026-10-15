import type { NotifyKindT, SessionKeyT } from "@/lib/supabase/types";

// Created for a new user by the onboarding action (needs a user id, so not seed data).

export const DEFAULT_PLAN: { weekday: number; session_key: SessionKeyT }[] = [
  { weekday: 1, session_key: "football" },
  { weekday: 2, session_key: "gym_a" },
  { weekday: 3, session_key: "run" },
  { weekday: 4, session_key: "football" },
  { weekday: 5, session_key: "gym_b" },
  { weekday: 6, session_key: "gym_c" },
  { weekday: 7, session_key: "rest" },
];

export const DEFAULT_NOTIFICATIONS: { kind: NotifyKindT; at_time: string }[] = [
  { kind: "wake_gym", at_time: "06:15" },
  { kind: "wake_run", at_time: "06:15" },
  { kind: "log_nudge", at_time: "21:30" },
  { kind: "last_call", at_time: "23:00" },
  { kind: "weekly", at_time: "21:00" },
  { kind: "photo_day", at_time: "08:30" },
];

export const DEFAULT_HABITS: { name: string; position: number }[] = [
  { name: "Walk 30 min", position: 1 },
  { name: "Stretch 10 min", position: 2 },
  { name: "Water 2.5 L", position: 3 },
  { name: "Hit protein", position: 4 },
  { name: "Asleep by 23:30", position: 5 },
];

export const SESSION_NAMES: Record<SessionKeyT, string> = {
  gym_a: "Legs",
  gym_b: "Chest and shoulders",
  gym_c: "Back and arms",
  run: "Easy run",
  run_intervals: "Intervals",
  football: "Football",
  stretch: "Stretch",
  rest: "Rest day",
};

/** Used when a person skips the questions the budget needs. Average numbers, replaced as soon as they add their details. */
export const GENERIC_TARGETS = { bmrKcal: 1500, budgetKcal: 1800, proteinG: 120 } as const;

/** Stand-ins stored for skipped profile answers (the columns are required). */
export const PROFILE_FALLBACK = {
  heightCm: 175,
  birthDate: "1996-01-01",
  sex: "male",
  goalKg: 75,
  wakeTime: "06:30",
} as const;

/** Most promises a person can keep active. */
export const MAX_PROMISES = 9;
