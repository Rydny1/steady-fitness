// What your average net calories means for your weight, read against your goal.
// Pure numbers and plain sentences. The Coach (AI) may reword the sentence, never the numbers.
import type { Goal } from "./energy";

/** The most a day's deficit should be pushed. Past this the muscle pays for it. */
export const SAFE_DEFICIT = 1000;

export type NetProjection = {
  goal: Goal;
  avgNet: number | null;
  loggedDays: number;
  /** Signed: negative is weight coming off. */
  kgPerWeek: number | null;
  /** Goal minus current, signed. Negative means weight to lose. */
  remainingKg: number | null;
  weeksToGoal: number | null;
  /** Daily net that would reach the goal in 30 days, signed. */
  needPer30Days: number | null;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

export function projectNet(input: {
  goal: Goal;
  avgNet: number | null;
  loggedDays: number;
  currentKg: number | null;
  goalKg: number;
}): NetProjection {
  const { goal, avgNet, loggedDays, currentKg, goalKg } = input;
  const enough = avgNet !== null && loggedDays >= 3;
  const kgPerWeek = enough ? r1(((avgNet as number) * 7) / 7700) : null;
  const remainingKg = currentKg === null ? null : r1(goalKg - currentKg);
  let weeksToGoal: number | null = null;
  if (kgPerWeek !== null && remainingKg !== null && Math.abs(kgPerWeek) >= 0.05 && Math.sign(kgPerWeek) === Math.sign(remainingKg)) {
    weeksToGoal = Math.max(1, Math.round(Math.abs(remainingKg) / Math.abs(kgPerWeek)));
  }
  const needPer30Days = remainingKg === null || goal === "maintain" ? null : Math.round((remainingKg * 7700) / 30 / 10) * 10;
  return { goal, avgNet: enough ? Math.round(avgNet as number) : null, loggedDays, kgPerWeek, remainingKg, weeksToGoal, needPer30Days };
}

const n = (v: number) => Math.abs(Math.round(v)).toLocaleString("en-GB");

/** One plain sentence about the pace. Used as is, and as the facts the AI rewords. */
export function paceSentence(p: NetProjection): string {
  if (p.kgPerWeek === null) return "Log a few full days and your pace shows here.";
  const rate = Math.abs(p.kgPerWeek);
  if (p.goal === "lose") {
    if (p.kgPerWeek < 0) {
      return p.weeksToGoal
        ? `At this pace you lose about ${rate} kg a week. Goal in about ${p.weeksToGoal} weeks.`
        : `At this pace you lose about ${rate} kg a week.`;
    }
    return `At this pace you gain about ${rate} kg a week. To lose, eat less than you burn.`;
  }
  if (p.goal === "gain") {
    if (p.kgPerWeek > 0) {
      return p.weeksToGoal
        ? `At this pace you gain about ${rate} kg a week. Goal in about ${p.weeksToGoal} weeks.`
        : `At this pace you gain about ${rate} kg a week.`;
    }
    return `At this pace you lose about ${rate} kg a week. To gain, eat more than you burn.`;
  }
  return rate < 0.1 ? "Weight is holding steady at this pace." : `At this pace weight moves about ${rate} kg a week.`;
}

/** What it would take to reach the goal in a month, and whether that is safe. */
export function monthNeed(p: NetProjection): string | null {
  if (p.needPer30Days === null || p.goal === "maintain") return null;
  if (Math.abs(p.needPer30Days) < 50) return null;
  const sign = p.needPer30Days < 0 ? "-" : "+";
  const text = `To get there in 30 days: ${sign}${n(p.needPer30Days)} kcal net a day.`;
  if (p.goal === "lose" && -p.needPer30Days > SAFE_DEFICIT) return `${text} That is past the safe limit of -${n(SAFE_DEFICIT)}. Give it longer.`;
  return text;
}
