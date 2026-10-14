// One-line explanations behind the small (?) next to anything a new user wouldn't know.
// Shown in a bottom sheet. Plain words, no jargon.

export const tooltips = {
  callus: {
    title: "Callus",
    text: "Your consistency score from 0 to 100. Goes up when you log and train, down when you skip.",
  },
  form: {
    title: "Form",
    text: "How consistent you've been lately. Based on your Callus score.",
  },
  rings: {
    title: "Rings",
    text: "Three daily goals. Green = calories, blue = protein, red = training.",
  },
  waistToHeight: {
    title: "Waist to height",
    text: "Your waist divided by your height. Under 0.50 is the healthy target.",
  },
  bodyFat: {
    title: "Body fat estimate",
    text: "Estimated from your waist, neck and height. Not exact, but tracks the trend.",
  },
  adaptiveBudget: {
    title: "Adaptive budget",
    text: "Your calorie budget adjusted to your real body, based on what you ate and how your weight moved.",
  },
  vsLastWeek: {
    title: "You vs last week",
    text: "You're racing your own numbers from last week. Match or beat them to win.",
  },
  bmi: {
    title: "BMI",
    text: "Weight divided by height squared. A rough number that ignores muscle.",
  },
  sevenDay: {
    title: "7-day average",
    text: "The average of your last 7 weigh-ins. Daily weight is noise, this smooths it out.",
  },
  weeklyChallenge: {
    title: "Weekly challenge",
    text: "One extra goal for the week. Pick one, finish it, earn 6 Callus.",
  },
  seasonRecord: {
    title: "Season record",
    text: "Every week against the week before, since you started. Green is a win, grey a draw, red a loss.",
  },
  level: {
    title: "Level",
    text: "Your long-term rank. You move up with enough days on the clock and a high enough Callus.",
  },
} as const;

export type TipKey = keyof typeof tooltips;
