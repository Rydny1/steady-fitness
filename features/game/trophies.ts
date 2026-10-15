// Trophies: twelve conditions (GAME.md > Trophies). Pure checks over plain totals.
import { TROPHIES } from "./config";
import { longestWinRun, type WeekResult } from "./weekly-match";

export const TROPHY_KEYS = [
  "first_whistle",
  "streak_3",
  "seven_straight",
  "streak_14",
  "streak_30",
  "streak_60",
  "streak_100",
  "streak_200",
  "days_10",
  "days_30",
  "days_100",
  "days_180",
  "days_365",
  "beat_yourself",
  "hat_trick",
  "wins_5",
  "wins_10",
  "wins_25",
  "challenges_1",
  "challenger",
  "challenges_10",
  "challenges_25",
  "first_kilo",
  "kilos_2_5",
  "five_kilos",
  "kilos_7_5",
  "kilos_10",
  "kilos_15",
  "kilos_20",
  "waist_2",
  "waist_down_5",
  "waist_10",
  "lifts_1",
  "ten_bests",
  "lifts_25",
  "lifts_50",
  "photos_1",
  "photo_diary",
  "photos_12",
  "early_riser",
  "early_30",
  "answer_back",
  "answer_5",
] as const;

export type TrophyKey = (typeof TROPHY_KEYS)[number];

export type TrophyInput = {
  /** Any log ever. */
  logCount: number;
  bestStreak: number;
  /** Days on Steady (career days). */
  careerDays: number;
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

type Derived = TrophyInput & { kilosDown: number; waistDown: number; wins: number; winRun: number };

/** One rule per trophy. Exhaustive: adding a key without a rule will not compile. */
const RULES: Record<TrophyKey, (d: Derived) => boolean> = {
  first_whistle: (d) => d.logCount >= 1,
  streak_3: (d) => d.bestStreak >= 3,
  seven_straight: (d) => d.bestStreak >= TROPHIES.sevenStraightDays,
  streak_14: (d) => d.bestStreak >= 14,
  streak_30: (d) => d.bestStreak >= 30,
  streak_60: (d) => d.bestStreak >= 60,
  streak_100: (d) => d.bestStreak >= 100,
  streak_200: (d) => d.bestStreak >= 200,
  days_10: (d) => d.careerDays >= 10,
  days_30: (d) => d.careerDays >= 30,
  days_100: (d) => d.careerDays >= 100,
  days_180: (d) => d.careerDays >= 180,
  days_365: (d) => d.careerDays >= 365,
  beat_yourself: (d) => d.wins >= 1,
  hat_trick: (d) => d.winRun >= TROPHIES.hatTrickWeeks,
  wins_5: (d) => d.wins >= 5,
  wins_10: (d) => d.wins >= 10,
  wins_25: (d) => d.wins >= 25,
  challenges_1: (d) => d.challengesDone >= 1,
  challenger: (d) => d.challengesDone >= TROPHIES.challengerCount,
  challenges_10: (d) => d.challengesDone >= 10,
  challenges_25: (d) => d.challengesDone >= 25,
  first_kilo: (d) => d.kilosDown >= TROPHIES.firstKiloKg,
  kilos_2_5: (d) => d.kilosDown >= 2.5,
  five_kilos: (d) => d.kilosDown >= TROPHIES.fiveKilosKg,
  kilos_7_5: (d) => d.kilosDown >= 7.5,
  kilos_10: (d) => d.kilosDown >= 10,
  kilos_15: (d) => d.kilosDown >= 15,
  kilos_20: (d) => d.kilosDown >= 20,
  waist_2: (d) => d.waistDown >= 2,
  waist_down_5: (d) => d.waistDown >= TROPHIES.waistDownCm,
  waist_10: (d) => d.waistDown >= 10,
  lifts_1: (d) => d.liftRecords >= 1,
  ten_bests: (d) => d.liftRecords >= TROPHIES.tenBestsCount,
  lifts_25: (d) => d.liftRecords >= 25,
  lifts_50: (d) => d.liftRecords >= 50,
  photos_1: (d) => d.progressPhotos >= 1,
  photo_diary: (d) => d.progressPhotos >= TROPHIES.photoDiaryCount,
  photos_12: (d) => d.progressPhotos >= 12,
  early_riser: (d) => d.gymStartsBefore08 >= TROPHIES.earlyRiserSessions,
  early_30: (d) => d.gymStartsBefore08 >= 30,
  answer_back: (d) => d.answerBacksDone >= 1,
  answer_5: (d) => d.answerBacksDone >= 5,
};

/** True or false for every trophy right now. Callers store the first time one turns true. */
export function evaluateTrophies(i: TrophyInput): Record<TrophyKey, boolean> {
  const d: Derived = {
    ...i,
    kilosDown: i.startWeightKg !== null && i.lowestAvg7Kg !== null ? i.startWeightKg - i.lowestAvg7Kg : 0,
    waistDown: i.firstWaistCm !== null && i.lowestWaistCm !== null ? i.firstWaistCm - i.lowestWaistCm : 0,
    wins: i.weekResults.filter((r) => r === "win").length,
    winRun: longestWinRun(i.weekResults),
  };
  return Object.fromEntries(TROPHY_KEYS.map((k) => [k, RULES[k](d)])) as Record<TrophyKey, boolean>;
}

/** Trophies that are earned now and were not before. */
export function newlyEarned(
  input: TrophyInput,
  alreadyEarned: readonly string[],
): TrophyKey[] {
  const state = evaluateTrophies(input);
  return TROPHY_KEYS.filter((k) => state[k] && !alreadyEarned.includes(k));
}
