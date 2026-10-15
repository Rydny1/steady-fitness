// Energy balance: what you ate against what you burned, read through the goal.
// Estimates only: burn is BMR x activity factor plus the exercise burn, so round and call it "about".
import { TARGETS } from "./config";

export type Goal = "lose" | "maintain" | "gain";

/** Weight goal from where you are and where you want to be (within 1 kg counts as maintain). */
export function goalFor(currentKg: number | null, goalKg: number): Goal {
  if (currentKg === null) return "lose";
  const diff = goalKg - currentKg;
  if (diff < -1) return "lose";
  if (diff > 1) return "gain";
  return "maintain";
}

/** Budget share of base burn by goal. Lose eats under, gain eats over. */
export function budgetFactorFor(goal: Goal): number {
  if (goal === "gain") return 1.12;
  if (goal === "maintain") return 1.0;
  return TARGETS.budgetFactor;
}

/** Total burn for a day: resting x activity factor, plus the full exercise burn.
 * `kcal_burned` in the database is the 50 percent add-back, so the full burn is double it. */
export function dayBurn(bmrKcal: number, exerciseAddBackKcal: number): number {
  return Math.round(bmrKcal * TARGETS.activityFactor + exerciseAddBackKcal / TARGETS.exerciseAddBackShare);
}

/** What an exercise really burned. The database stores only the add-back share of it. */
export function fullBurn(addBackKcal: number): number {
  return Math.round(addBackKcal / TARGETS.exerciseAddBackShare);
}

export type BudgetStatus = { tone: "good" | "low" | "over"; text: string };

/**
 * The budget is a ceiling, not a target: you aim to stay under it.
 * Under: say how much more fits. Over: say by how much. Far under late in the day: say it is too little.
 */
export function budgetStatus(eatenKcal: number, budgetKcal: number, hour: number): BudgetStatus {
  const eaten = Math.round(eatenKcal);
  const left = Math.round(budgetKcal - eatenKcal);
  const n = (v: number) => v.toLocaleString("en-GB");
  if (left < 0) return { tone: "over", text: `Over by ${n(-left)} kcal. Keep the rest of today light.` };
  if (hour >= 18 && eaten < budgetKcal * 0.6) {
    return {
      tone: "low",
      text: `Too little so far: ${n(eaten)} of ${n(Math.round(budgetKcal))} kcal. Eating this low costs muscle and energy. Have a proper meal with protein.`,
    };
  }
  if (left <= 0) return { tone: "good", text: "Right on budget. Nothing more today." };
  return { tone: "good", text: `Good. You can eat ${n(left)} kcal more, no more than that.` };
}

/** Net calories: negative is a deficit. */
export function netKcal(eatenKcal: number, burnKcal: number): number {
  return Math.round(eatenKcal - burnKcal);
}

/** Roughly how much body weight a net energy total moves, in kg (7700 kcal per kg). */
export function kgFromNet(netTotal: number): number {
  return Math.round((netTotal / 7700) * 10) / 10;
}

export type BalanceTone = "good" | "okay" | "off";
export type BalanceRead = { tone: BalanceTone; label: string };

/**
 * Reads an average daily net against the goal.
 * Lose: the bigger the deficit the better, up to a point (past 1,000 a day the muscle pays).
 * Gain: a steady surplus is the goal. Maintain: stay near zero.
 */
export function readBalance(goal: Goal, avgNet: number): BalanceRead {
  const n = Math.round(avgNet);
  if (goal === "lose") {
    if (n <= -1000) return { tone: "okay", label: "Very large deficit. Keep protein high so muscle stays." };
    if (n <= -400) return { tone: "good", label: "Strong deficit. This is the work that drops weight." };
    if (n <= -150) return { tone: "okay", label: "A small deficit. A bigger one drops weight faster." };
    return { tone: "off", label: "No deficit. Weight will not fall at this level." };
  }
  if (goal === "gain") {
    if (n >= 150 && n <= 600) return { tone: "good", label: "A steady surplus. This is what builds weight." };
    if (n > 600) return { tone: "okay", label: "Large surplus. Weight will rise fast, some of it fat." };
    return { tone: "off", label: "No surplus. Weight will not rise at this level." };
  }
  if (Math.abs(n) <= 150) return { tone: "good", label: "Balanced. Weight should hold steady." };
  return { tone: "okay", label: n < 0 ? "Running a deficit while maintaining." : "Running a surplus while maintaining." };
}

/** "-420" style with a real minus sign avoided: plain hyphen, grouped thousands. */
export function signed(n: number): string {
  const r = Math.round(n);
  const s = Math.abs(r).toLocaleString("en-GB");
  return r < 0 ? `-${s}` : r > 0 ? `+${s}` : "0";
}
