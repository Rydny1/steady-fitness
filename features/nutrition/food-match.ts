// Matches a food the model named to the verified table (content/foods.ts) and works out kcal
// and protein from grams. The model supplies a name and a weight; the numbers come from here.
import { foods, type Food } from "@/content/foods";

const STOP = new Set(["a", "an", "the", "some", "of", "with", "and", "my", "piece", "plate", "bowl", "serving", "portion", "big", "small", "large", "medium"]);

function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("es") && /(ch|sh|x|s|o)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9āčēģīķļņšūž ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP.has(w))
    .map(stem);
}

type Entry = { food: Food; candidates: { text: string; set: Set<string> }[] };

let index: Entry[] | null = null;
function getIndex(): Entry[] {
  if (index) return index;
  index = foods.map((food) => ({
    food,
    candidates: [food.name, ...food.aliases].map((text) => ({ text: tokens(text).join(" "), set: new Set(tokens(text)) })),
  }));
  return index;
}

const STATE_WORDS: Record<string, Food["state"]> = {
  raw: "raw",
  uncooked: "raw",
};

export type Match = { food: Food; score: number };

/** Best food for a spoken name, with a score from 0 to 1. Accept at 0.72 or more. */
export function matchFood(name: string): Match | null {
  const q = tokens(name);
  if (q.length === 0) return null;
  const qText = q.join(" ");
  const qSet = new Set(q);
  const wantsRaw = q.some((w) => STATE_WORDS[w] === "raw");

  let best: Match | null = null;
  for (const entry of getIndex()) {
    let s = 0;
    for (const c of entry.candidates) {
      if (c.set.size === 0) continue;
      let score: number;
      if (c.text === qText) score = 1;
      else {
        let inter = 0;
        for (const t of c.set) if (qSet.has(t)) inter += 1;
        const candInQuery = inter / c.set.size;
        const queryInCand = inter / qSet.size;
        if (candInQuery === 1) score = 0.72 + 0.28 * (c.set.size / qSet.size);
        else if (queryInCand === 1) score = 0.6 + 0.3 * (qSet.size / c.set.size);
        else score = 0.5 * (inter / (c.set.size + qSet.size - inter));
      }
      if (score > s) s = score;
    }
    // People log cooked food unless they say raw.
    if (!wantsRaw && entry.food.state === "raw") s -= 0.08;
    if (wantsRaw && entry.food.state !== "raw") s -= 0.08;
    if (!best || s > best.score) best = { food: entry.food, score: s };
  }
  return best && best.score >= 0.72 ? best : null;
}

/** Grams for an amount the person gave: grams and ml as they are, otherwise a household portion. */
export function gramsFor(food: Food, quantity: number | null, unit: string | null): number {
  const q = quantity && quantity > 0 ? quantity : 1;
  const u = (unit ?? "").toLowerCase().trim();
  if (u === "g" || u === "gram" || u === "grams" || u === "ml" || u === "millilitre" || u === "millilitres") return q;
  if (u === "kg") return q * 1000;
  if (u === "l" || u === "litre" || u === "litres") return q * 1000;
  const unitStem = stem(u);
  const portion =
    food.portions.find((p) => stem(p.unit.toLowerCase()) === unitStem && unitStem !== "") ?? food.portions[0];
  return Math.round(q * (portion?.grams ?? 100));
}

export function nutrientsFor(food: Food, grams: number): { kcal: number; protein_g: number } {
  const f = grams / 100;
  return {
    kcal: Math.max(0, Math.min(5000, Math.round(food.per100.kcal * f))),
    protein_g: Math.max(0, Math.min(300, Math.round(food.per100.protein * f * 10) / 10)),
  };
}
