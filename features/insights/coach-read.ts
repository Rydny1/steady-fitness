// The Coach's read on the last two weeks: one thing going well, one thing to work on, one move.
// Plain rules over real numbers, so it is always true and never needs the AI.

export type CoachStats = {
  /** Days in the window (up to 14) and how many had anything logged. */
  days: number;
  daysLogged: number;
  /** Average sleep in hours, null when none was entered. */
  avgSleep: number | null;
  proteinDays: number;
  sessionsPlanned: number;
  sessionsDone: number;
  /** Average daily net, the target net, and the goal. Null when there is no data. */
  avgNet: number | null;
  targetNet: number;
  goal: "lose" | "gain" | "maintain";
  streak: number;
};

export type CoachLine = { kind: "good" | "work" | "do"; text: string };

type Candidate = { score: number; good?: string; work?: string; fix?: string };

/** 0 to 1: how well a thing went. Lower is weaker. */
const share = (a: number, b: number) => (b > 0 ? a / b : 1);

export function coachRead(s: CoachStats): CoachLine[] {
  if (s.days < 5 || s.daysLogged < 3) return [];
  const c: Candidate[] = [];

  const logged = share(s.daysLogged, s.days);
  c.push({
    score: logged,
    good: `Logged ${s.daysLogged} of ${s.days} days.`,
    work: `Logged only ${s.daysLogged} of ${s.days} days.`,
    fix: "Log right after you eat, not at night.",
  });

  const protein = share(s.proteinDays, s.daysLogged);
  c.push({
    score: protein,
    good: `Protein hit on ${s.proteinDays} days.`,
    work: `Protein hit on ${s.proteinDays} of ${s.daysLogged} days.`,
    fix: "Add a protein snack before dinner.",
  });

  if (s.sessionsPlanned > 0) {
    c.push({
      score: share(s.sessionsDone, s.sessionsPlanned),
      good: `Trained ${s.sessionsDone} of ${s.sessionsPlanned} sessions.`,
      work: `Trained ${s.sessionsDone} of ${s.sessionsPlanned} sessions.`,
      fix: "Pick the two sessions you won't skip.",
    });
  }

  if (s.avgSleep !== null) {
    c.push({
      score: Math.min(1, s.avgSleep / 7.5),
      good: `Sleep averages ${s.avgSleep.toFixed(1)} h.`,
      work: `Sleep averages ${s.avgSleep.toFixed(1)} h.`,
      fix: "Be in bed 30 minutes earlier.",
    });
  }

  if (s.avgNet !== null && s.goal !== "maintain" && s.targetNet !== 0) {
    const got = s.goal === "lose" ? -s.avgNet : s.avgNet;
    const want = Math.abs(s.targetNet);
    const n = (v: number) => Math.round(Math.abs(v)).toLocaleString("en-GB");
    c.push({
      score: Math.max(0, Math.min(1, got / want)),
      good: `${s.goal === "lose" ? "Deficit" : "Surplus"} on target: ${n(got)} a day.`,
      work: `${s.goal === "lose" ? "Deficit" : "Surplus"} is ${n(Math.max(0, got))} a day, target ${n(want)}.`,
      fix: s.goal === "lose" ? "Cut one snack or add a 30 minute walk." : "Add a shake or a bigger breakfast.",
    });
  }

  const best = [...c].sort((a, b) => b.score - a.score)[0];
  const worst = [...c].sort((a, b) => a.score - b.score)[0];
  const out: CoachLine[] = [];
  if (best?.good && best.score >= 0.7) out.push({ kind: "good", text: best.good });
  if (worst?.work && worst.score < 0.75) {
    out.push({ kind: "work", text: worst.work });
    if (worst.fix) out.push({ kind: "do", text: worst.fix });
  } else {
    out.push({ kind: "do", text: "Keep it boring. Same again." });
  }
  return out;
}
