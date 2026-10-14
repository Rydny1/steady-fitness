// Trophies: twelve conditions (GAME.md > Trophies). Pure checks over plain totals.
import { TROPHIES } from "./config";
import { longestWinRun, type WeekResult } from "./weekly-match";

export const TROPHY_KEYS = [
  "first_whistle",
  "seven_straight",
  "beat_yourself",
  "hat_trick",
  "early_riser",
  "answer_back",
  "challenger",
  "first_kilo",
  "five_kilos",
  "waist_down_5",
  "ten_bests",
  "photo_diary",
] as const;

export type TrophyKey = (typeof TROPHY_KEYS)[number];

export type TrophyInput = {
  /** Any log ever. */
  logCount: number;
  bestStreak: number;
  /** Week results, oldest first. */
  weekResults: readonly WeekResult[];
  /** Gym sessions started before 08:00, all time. */
  gymStartsBefore08: number;
  answerBacksDone: number;
  challengesDone: number;
  /** First weight and the lowest 7-day average so far. Null when unknown. */
  startWeightKg: number | null;
  lowestAvg7Kg: number | null;
  /** First waist and the lowest waist so far. */
  firstWaistCm: number | null;
  lowestWaistCm: number | null;
  liftRecords: number;
  progressPhotos: number;
};

/** True or false for every trophy right now. Callers store the first time one turns true. */
export function evaluateTrophies(i: TrophyInput): Record<TrophyKey, boolean> {
  const kilosDown =
    i.startWeightKg !== null && i.lowestAvg7Kg !== null ? i.startWeightKg - i.lowestAvg7Kg : 0;
  const waistDown =
    i.firstWaistCm !== null && i.lowestWaistCm !== null ? i.firstWaistCm - i.lowestWaistCm : 0;
  return {
    first_whistle: i.logCount >= 1,
    seven_straight: i.bestStreak >= TROPHIES.sevenStraightDays,
    beat_yourself: i.weekResults.some((r) => r === "win"),
    hat_trick: longestWinRun(i.weekResults) >= TROPHIES.hatTrickWeeks,
    early_riser: i.gymStartsBefore08 >= TROPHIES.earlyRiserSessions,
    answer_back: i.answerBacksDone >= 1,
    challenger: i.challengesDone >= TROPHIES.challengerCount,
    first_kilo: kilosDown >= TROPHIES.firstKiloKg,
    five_kilos: kilosDown >= TROPHIES.fiveKilosKg,
    waist_down_5: waistDown >= TROPHIES.waistDownCm,
    ten_bests: i.liftRecords >= TROPHIES.tenBestsCount,
    photo_diary: i.progressPhotos >= TROPHIES.photoDiaryCount,
  };
}

/** Trophies that are earned now and were not before. */
export function newlyEarned(
  input: TrophyInput,
  alreadyEarned: readonly string[],
): TrophyKey[] {
  const state = evaluateTrophies(input);
  return TROPHY_KEYS.filter((k) => state[k] && !alreadyEarned.includes(k));
}
