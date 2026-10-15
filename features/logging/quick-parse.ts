// The no-AI path. Most logs are simple ("ran 4 km", "5000 steps", "45 min football", "2 eggs",
// "200 g rice"). Those are read here with plain rules, instantly, for free, and the same way every
// time. Only what these rules cannot read goes to the AI, so a busy or out-of-quota model rarely
// matters.
import type { ActivityT } from "@/lib/supabase/types";
import { matchFood } from "@/features/nutrition/food-match";
import { resolveActivity } from "@/features/nutrition/activity";
import { finalizeFood, type SavedLookup } from "./accuracy";
import type { DraftItem } from "./schema";

const WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, half: 0.5,
};
const NUM = String.raw`(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|half)`;

const num = (s: string): number | null => {
  const n = Number(s);
  if (Number.isFinite(n)) return n;
  return WORDS[s] ?? null;
};

const ACTIVITY_WORDS: [RegExp, ActivityT][] = [
  [/\b(?:run|ran|running|jog|jogged|jogging)\b/, "run"],
  [/\b(?:walk|walked|walking|hike|hiked|hiking)\b/, "walk"],
  [/\b(?:cycle|cycled|cycling|bike|biked|biking|rode)\b/, "cycling"],
  [/\b(?:football|soccer)\b/, "football"],
  [/\b(?:gym|lift|lifted|lifting|weights|workout|worked out)\b/, "gym"],
  [/\b(?:stretch|stretched|stretching|yoga)\b/, "stretch"],
  [/\b(?:circuit|hiit)\b/, "circuit"],
];

export type QuickResult = {
  items: DraftItem[];
  /** Clauses the rules could not read. These go to the AI. */
  leftover: string[];
};

const FILLER =
  /^(?:(?:i|we|so|and|also|then|just|today|yesterday|this morning|this afternoon|tonight|this evening|had|ate|eaten|have|drank|did|do|for (?:breakfast|lunch|dinner|a snack|snack)|about|around|like|some|my)\b\s*)+/;

function duration(clause: string): number | null {
  let total = 0;
  let found = false;
  if (/\bhalf an hour\b/.test(clause)) return 30;
  if (/\ban hour\b/.test(clause)) return 60;
  for (const m of clause.matchAll(new RegExp(`${NUM}\\s*(?:hours?|hrs?|h)\\b`, "g"))) {
    const n = num(m[1] ?? "");
    if (n !== null) {
      total += n * 60;
      found = true;
    }
  }
  for (const m of clause.matchAll(new RegExp(`${NUM}\\s*(?:minutes?|mins?)\\b`, "g"))) {
    const n = num(m[1] ?? "");
    if (n !== null) {
      total += n;
      found = true;
    }
  }
  return found ? total : null;
}

function distance(clause: string): number | null {
  const km = clause.match(new RegExp(`${NUM}\\s*(?:km|kms|k|kilometers?|kilometres?)\\b`));
  if (km) return num(km[1] ?? "");
  const mi = clause.match(new RegExp(`${NUM}\\s*(?:mi|miles?)\\b`));
  if (mi) {
    const n = num(mi[1] ?? "");
    return n === null ? null : Math.round(n * 1.609 * 100) / 100;
  }
  return null;
}

function steps(clause: string): number | null {
  const m = clause.match(/(\d+(?:\.\d+)?)\s*(k)?\s*steps?\b/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.round(m[2] ? n * 1000 : n) : null;
}

function paceMin(clause: string): number | null {
  const m = clause.match(/(\d{1,2}):(\d{2})\s*(?:\/\s*km|per km|pace|min\/km)?/);
  if (m && /(?:\/\s*km|per km|pace)/.test(clause)) return Number(m[1]) + Number(m[2]) / 60;
  const p = clause.match(/pace (?:of )?(\d+(?:\.\d+)?)/);
  return p ? Number(p[1]) : null;
}

function readActivity(clause: string): DraftItem | null {
  const st = steps(clause);
  let type: ActivityT | null = null;
  for (const [re, t] of ACTIVITY_WORDS) {
    if (re.test(clause)) {
      type = t;
      break;
    }
  }
  if (type === null && st !== null) type = "walk";
  if (type === null) return null;
  const r = resolveActivity({
    type,
    durationMin: duration(clause),
    distanceKm: st === null ? distance(clause) : null,
    steps: st,
    paceMinPerKm: paceMin(clause),
  });
  if (!r) return null;
  return {
    kind: "activity",
    activity_type: type,
    session_key: type === "football" ? "football" : type === "run" ? "run" : null,
    duration_min: Math.max(1, Math.min(600, r.durationMin)),
    rpe: null,
    speed_kmh: r.speedKmh,
    note: r.note,
  };
}

const UNITS = String.raw`(g|grams?|kg|ml|l|litres?|liters?|cups?|slices?|pieces?|spoons?|tablespoons?|tbsp|tsp|teaspoons?|bowls?|plates?|cans?|bottles?|glass(?:es)?)`;

function readFood(clause: string, saved: readonly SavedLookup[]): DraftItem | null {
  const m = clause.match(new RegExp(`^(?:${NUM}\\s*)?(?:${UNITS}\\s+)?(?:of\\s+)?(.+)$`));
  if (!m) return null;
  const qty = m[1] ? num(m[1]) : null;
  const unit = m[2] ?? null;
  const name = (m[3] ?? "").trim();
  if (name.length < 3) return null;
  const hit = matchFood(name);
  if (!hit || hit.score < 0.85) return null;
  const u = unit?.toLowerCase() ?? null;
  const grams = qty !== null && u && /^(g|grams?)$/.test(u) ? qty : qty !== null && u === "kg" ? qty * 1000 : null;
  const ml = qty !== null && u && /^(ml)$/.test(u) ? qty : qty !== null && u && /^(l|litres?|liters?)$/.test(u) ? qty * 1000 : null;
  const food = finalizeFood(
    {
      name: hit.food.name.split(",")[0] ?? name,
      grams: grams ?? ml,
      quantity: grams === null && ml === null ? (qty ?? 1) : null,
      unit: grams === null && ml === null ? u : null,
      kcal: null,
      protein_g: null,
      confidence: hit.score,
    },
    saved,
  );
  return { ...food, name: name.slice(0, 80) };
}

/** Reads what it can with rules. The rest comes back in `leftover`. */
export function quickParse(text: string, saved: readonly SavedLookup[] = []): QuickResult {
  const cleaned = text.toLowerCase().replace(/(\d),(\d{3})\b/g, "$1$2").replace(/\s+/g, " ").trim();
  const clauses = cleaned
    .split(/[;.\n]|,|\band\b|\bthen\b|\bafter that\b|\bplus\b|\bwith\b/)
    .map((c) => c.replace(FILLER, "").trim())
    .filter((c) => c.length > 0);

  const items: DraftItem[] = [];
  const leftover: string[] = [];
  for (const clause of clauses) {
    const act = readActivity(clause);
    if (act) {
      items.push(act);
      continue;
    }
    const food = readFood(clause, saved);
    if (food) {
      items.push(food);
      continue;
    }
    leftover.push(clause);
  }
  return { items, leftover };
}
