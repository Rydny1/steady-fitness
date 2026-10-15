// How hard an activity is, as a MET (energy used compared with sitting still: 1 MET). A built-in
// table of common activities (standard compendium values, rounded) makes the answer the same
// every time. For anything it does not know, the AI's own estimate is used, held inside a
// believable range, so any activity can be logged and none can be absurd.

const TABLE: [RegExp, number][] = [
  [/\b(?:swim|swam|swimming|laps)\b/, 7],
  [/\b(?:skip|skipping|jump rope|jumping rope|rope)\b/, 11],
  [/\b(?:danc(?:e|ed|ing)|zumba)\b/, 5],
  [/\byoga\b/, 2.5],
  [/\bpilates\b/, 3],
  [/\b(?:stairs|stair climb|climbed stairs|stair master|stairmaster)\b/, 8],
  [/\b(?:basketball)\b/, 6.5],
  [/\b(?:tennis|squash)\b/, 7],
  [/\b(?:badminton|table tennis|ping pong)\b/, 5],
  [/\b(?:volleyball)\b/, 4],
  [/\b(?:boxing|kickboxing|muay thai|sparring)\b/, 9],
  [/\b(?:martial arts|karate|judo|taekwondo|bjj|jiu jitsu)\b/, 10],
  [/\b(?:rowing|rowed|row machine|erg)\b/, 7],
  [/\b(?:elliptical|cross trainer)\b/, 5],
  [/\b(?:jumping jacks|aerobics|step class)\b/, 7],
  [/\b(?:rock climbing|climbing|bouldering)\b/, 8],
  [/\b(?:ski|skiing|snowboard|snowboarding)\b/, 7],
  [/\b(?:skate|skating|rollerblad\w*)\b/, 7],
  [/\b(?:hik(?:e|ed|ing)|trek|trekking)\b/, 6],
  [/\b(?:cricket)\b/, 4.8],
  [/\b(?:golf)\b/, 4.8],
  [/\b(?:surf|surfing)\b/, 3],
  [/\b(?:cleaning|cleaned|housework|mopping|vacuuming)\b/, 3.3],
  [/\b(?:gardening|garden|mowing)\b/, 3.8],
  [/\b(?:moving house|carrying|lifting boxes)\b/, 6],
  [/\b(?:rugby|american football)\b/, 8],
  [/\b(?:handball|hockey|lacrosse)\b/, 8],
  [/\b(?:crossfit|hiit|boot camp|bootcamp)\b/, 8],
  [/\b(?:cardio)\b/, 6],
  [/\b(?:stretching|mobility)\b/, 2.3],
];

const MIN_MET = 1.5;
const MAX_MET = 15;

/** The MET for a named activity: the table first, then the AI's estimate (clamped), then a moderate default. */
export function metFor(name: string, aiMet: number | null | undefined): number {
  const n = name.toLowerCase();
  for (const [re, met] of TABLE) if (re.test(n)) return met;
  if (typeof aiMet === "number" && Number.isFinite(aiMet)) return Math.round(Math.max(MIN_MET, Math.min(MAX_MET, aiMet)) * 10) / 10;
  return 4;
}

/** Longest and shortest duration the AI may guess when none was said. */
export const GUESS_MINUTES = { min: 5, max: 240, fallback: 30 } as const;

export function clampGuess(minutes: number | null | undefined): number {
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) return GUESS_MINUTES.fallback;
  return Math.round(Math.max(GUESS_MINUTES.min, Math.min(GUESS_MINUTES.max, minutes)));
}
