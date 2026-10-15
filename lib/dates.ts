// All Europe/Riga date math lives here. A "day" is always a 'YYYY-MM-DD' string.
// Pure: callers pass `now` in so tests can control time.

export const TZ = "Europe/Riga";

export type DayString = string;

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export type RigaParts = {
  date: DayString;
  hour: number;
  minute: number;
  weekday: number; // ISO: 1 = Monday ... 7 = Sunday
};

export function rigaParts(now: Date): RigaParts {
  const map: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(now)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const date = `${map.year}-${map.month}-${map.day}`;
  return {
    date,
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: isoWeekday(date),
  };
}

export function todayRiga(now: Date = new Date()): DayString {
  return rigaParts(now).date;
}

function toUtcNoon(day: DayString): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
}

function fromUtc(d: Date): DayString {
  return d.toISOString().slice(0, 10);
}

export function addDays(day: DayString, n: number): DayString {
  const d = toUtcNoon(day);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

export function diffDays(later: DayString, earlier: DayString): number {
  return Math.round(
    (toUtcNoon(later).getTime() - toUtcNoon(earlier).getTime()) / 86_400_000,
  );
}

export function isoWeekday(day: DayString): number {
  const w = toUtcNoon(day).getUTCDay(); // 0 = Sunday
  return w === 0 ? 7 : w;
}

export function weekStart(day: DayString): DayString {
  return addDays(day, -(isoWeekday(day) - 1));
}

export function weekDays(start: DayString): DayString[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function rangeDays(from: DayString, to: DayString): DayString[] {
  const out: DayString[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function weekdayName(day: DayString): string {
  return WEEKDAYS[isoWeekday(day) - 1] ?? "Monday";
}

export function weekdayShort(day: DayString): string {
  return weekdayName(day).slice(0, 3);
}

export function monthName(day: DayString): string {
  const m = Number(day.slice(5, 7));
  return MONTHS[m - 1] ?? "January";
}

/** "Wednesday, 14 October" */
export function formatDayLong(day: DayString): string {
  return `${weekdayName(day)}, ${Number(day.slice(8, 10))} ${monthName(day)}`;
}

/** "14 Oct" */
export function formatDayShort(day: DayString): string {
  return `${Number(day.slice(8, 10))} ${monthName(day).slice(0, 3)}`;
}

/** "08:10" in Riga time for an ISO timestamp. */
export function formatTimeRiga(iso: string): string {
  const p = rigaParts(new Date(iso));
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** Day string (Riga) for an ISO timestamp. */
export function dayOfTimestamp(iso: string): DayString {
  return rigaParts(new Date(iso)).date;
}

export function greeting(hour: number, name: string): string {
  if (hour < 12) return `Morning, ${name}.`;
  if (hour < 18) return `Afternoon, ${name}.`;
  return `Evening, ${name}.`;
}

export function isDay(value: string): value is DayString {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const t = Date.parse(`${value}T12:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === value;
}

export function ageOn(birthDate: DayString, day: DayString): number {
  const by = Number(birthDate.slice(0, 4));
  const bm = Number(birthDate.slice(5, 7));
  const bd = Number(birthDate.slice(8, 10));
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  const d = Number(day.slice(8, 10));
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age -= 1;
  return age;
}
