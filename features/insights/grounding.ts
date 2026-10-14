// Grounding check: every number, date and weekday in an AI line must exist in the fact values.
// Pure. A line that fails is replaced by the plain template line.

export type FactValue = number | string;
export type FactValues = Record<string, FactValue>;

const WEEKDAY_NAMES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

/** Month words that may follow or precede a day number. "may" is only a date next to a number. */
const MONTH_ALTERNATION =
  "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec";

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
};

const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const DAY_MONTH = new RegExp(
  `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_ALTERNATION})\\b\\.?(?:,?\\s+(\\d{4})\\b)?`,
  "gi",
);
const MONTH_DAY = new RegExp(
  `\\b(${MONTH_ALTERNATION})\\b\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4})\\b)?`,
  "gi",
);
const CLOCK = /\b\d{1,2}:\d{2}\b/g;
const NUMBER = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;

type ParsedDate = { key: string; year: string | null };

function monthIndex(word: string): number {
  const w = word.toLowerCase();
  const i = MONTH_NAMES.findIndex((m) => m === w || (w.length >= 3 && m.startsWith(w.slice(0, 3))));
  return i + 1;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Pull dates out of a string. Returns them and the string with the dates blanked. */
function takeDates(text: string): { dates: ParsedDate[]; rest: string } {
  const dates: ParsedDate[] = [];
  let rest = text.replace(ISO_DATE, (_m, y: string, mo: string, d: string) => {
    dates.push({ key: `${mo}-${d}`, year: y });
    return " ";
  });
  rest = rest.replace(DAY_MONTH, (_m, d: string, mo: string, y?: string) => {
    dates.push({ key: `${pad(monthIndex(mo))}-${pad(Number(d))}`, year: y ?? null });
    return " ";
  });
  rest = rest.replace(MONTH_DAY, (_m, mo: string, d: string, y?: string) => {
    dates.push({ key: `${pad(monthIndex(mo))}-${pad(Number(d))}`, year: y ?? null });
    return " ";
  });
  return { dates, rest };
}

function takeClocks(text: string): { clocks: string[]; rest: string } {
  const clocks: string[] = [];
  const rest = text.replace(CLOCK, (m) => {
    clocks.push(m.length === 4 ? `0${m}` : m);
    return " ";
  });
  return { clocks, rest };
}

function numberKey(n: number): number {
  return Math.round(Math.abs(n) * 1_000_000);
}

function numbersIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(NUMBER)) out.push(Number(m[0].replace(/,/g, "")));
  return out;
}

function wordsIn(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) ?? [];
}

type Allowed = {
  numbers: Set<number>;
  dates: Set<string>;
  years: Set<string>;
  clocks: Set<string>;
  words: Set<string>;
};

function buildAllowed(valueSets: readonly FactValues[]): Allowed {
  const allowed: Allowed = {
    numbers: new Set(),
    dates: new Set(),
    years: new Set(),
    clocks: new Set(),
    words: new Set(),
  };
  for (const values of valueSets) {
    for (const v of Object.values(values)) {
      if (typeof v === "number") {
        if (Number.isFinite(v)) allowed.numbers.add(numberKey(v));
        continue;
      }
      const { dates, rest: noDates } = takeDates(v);
      for (const d of dates) {
        allowed.dates.add(d.key);
        if (d.year) allowed.years.add(d.year);
      }
      const { clocks, rest } = takeClocks(noDates);
      for (const c of clocks) allowed.clocks.add(c);
      for (const n of numbersIn(rest)) allowed.numbers.add(numberKey(n));
      for (const w of wordsIn(rest)) allowed.words.add(w);
    }
  }
  return allowed;
}

/**
 * Everything wrong with `text` against the values, one short reason per problem.
 * Empty list means the line is grounded.
 * Checked: digits (decimals and thousands separators), spelled numbers from two up,
 * dates, clock times, and weekday and month names.
 */
export function groundingProblems(
  text: string,
  valueSets: FactValues | readonly FactValues[],
): string[] {
  const sets: readonly FactValues[] = Array.isArray(valueSets)
    ? (valueSets as readonly FactValues[])
    : [valueSets as FactValues];
  const problems: string[] = [];
  if (text.trim().length === 0) return ["empty line"];

  const allowed = buildAllowed(sets);

  const { dates, rest: noDates } = takeDates(text);
  for (const d of dates) {
    if (!allowed.dates.has(d.key)) problems.push(`date ${d.key}`);
    else if (d.year && !allowed.years.has(d.year)) problems.push(`year ${d.year}`);
  }
  const { clocks, rest: noClocks } = takeClocks(noDates);
  for (const c of clocks) if (!allowed.clocks.has(c)) problems.push(`time ${c}`);

  for (const n of numbersIn(noClocks)) {
    if (!allowed.numbers.has(numberKey(n))) problems.push(`number ${n}`);
  }

  const words = wordsIn(noClocks);
  for (const w of words) {
    const spelled = NUMBER_WORDS[w];
    if (spelled !== undefined && !allowed.numbers.has(numberKey(spelled))) {
      problems.push(`number word ${w}`);
    }
    const stem = w.endsWith("s") ? w.slice(0, -1) : w;
    const weekday = WEEKDAY_NAMES.find((d) => d === w || d === stem);
    if (weekday && !allowed.words.has(weekday) && !allowed.words.has(`${weekday}s`)) {
      problems.push(`weekday ${weekday}`);
    }
    // Month names alone (a date was already taken out above). "may" stays free: it is a verb.
    const month = MONTH_NAMES.find((m) => m === w);
    if (month && month !== "may" && !allowed.words.has(month)) {
      problems.push(`month ${month}`);
    }
  }
  return problems;
}

/** True only if every number and date in the text exists in the fact values. */
export function checkGrounding(text: string, values: FactValues): boolean {
  return groundingProblems(text, values).length === 0;
}

/** Same check for the weekly report: the text may use values from any of the week's facts. */
export function groundWeekly(text: string, factsValues: readonly FactValues[]): boolean {
  return groundingProblems(text, factsValues).length === 0;
}
