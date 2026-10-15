// One-line explanations behind the small (?) next to anything a new user wouldn't know.
// Shown in a bottom sheet. Plain words, no jargon.

export const tooltips = {
  callus: {
    title: "Callus",
    text: "Consistency, 0 to 100. Up when you log and train. Down when you skip.",
  },
  form: {
    title: "Form",
    text: "Off form 0 to 34: bad. Finding form 35 to 64: medium. In form 65 to 89: good. Peak form 90 to 100: best.",
  },
  rings: {
    title: "Rings",
    text: "Green: your deficit. Blue: protein. Red: training.",
  },
  waistToHeight: {
    title: "Waist to height",
    text: "Waist divided by height. Under 0.50 is healthy.",
  },
  bodyFat: {
    title: "Body fat estimate",
    text: "Estimated from waist, neck and height. Tracks the trend.",
  },
  adaptiveBudget: {
    title: "Adaptive limit",
    text: "Learns your real burn from what you ate and how your weight moved. Keeps your deficit.",
  },
  vsLastWeek: {
    title: "You vs last week",
    text: "Your own numbers from last week. Match them to win a round.",
  },
  bmi: {
    title: "BMI",
    text: "Weight over height squared. Ignores muscle.",
  },
  sevenDay: {
    title: "7-day average",
    text: "Average of your last 7 weigh-ins. Smooths daily noise.",
  },
  weeklyChallenge: {
    title: "Weekly challenge",
    text: "One extra goal a week. Finish it for +6 Callus. Callus sets your form (Finding 35, In form 65, Peak 90) and your level.",
  },
  seasonRecord: {
    title: "Season record",
    text: "Each week against the one before. Green win, grey draw, red loss.",
  },
  energyBalance: {
    title: "Net calories",
    text: "Eaten minus burned. Each bar is one day; below the line is a deficit and weight goes down. The dashed line is your target. Gaining? Aim above the line. Exercise raises what you can eat.",
  },
  streak: {
    title: "Day streak",
    text: "Days in a row you logged. Miss one and it restarts.",
  },
  career: {
    title: "Days in",
    text: "Days since you started. Counts toward your next level.",
  },
  trophies: {
    title: "Trophies",
    text: "Awards for milestones. Tap one in Progress to see how.",
  },
  level: {
    title: "Level",
    text: "Your long-term rank. Needs enough days and a high Callus.",
  },
} as const;

export type TipKey = keyof typeof tooltips;
