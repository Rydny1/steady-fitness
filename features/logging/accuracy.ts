import { gramsFor, matchFood, nutrientsFor } from "@/features/nutrition/food-match";
import type { DraftFood } from "./schema";
import type { foodCategories } from "./schema";

type Category = (typeof foodCategories)[number];

// Plausible energy density, kcal per gram, by kind of food. A guess outside its band is not
// believable (a soup cannot hold 9 kcal/g, that is pure oil) so it is pulled back to the band.
const DENSITY: Record<Category, [number, number]> = {
  dish: [0.8, 3.2],
  soup_stew: [0.3, 2.2],
  meat_fish: [0.8, 3.6],
  grain_starch: [0.8, 4.0],
  produce: [0.1, 1.6],
  dairy_egg: [0.3, 4.2],
  snack_sweet: [1.5, 6.0],
  drink: [0, 1.0],
  fat_oil: [6.0, 9.0],
};

/** Keeps a model-guessed kcal inside the believable band for its weight and category. */
export function plausibleKcal(kcal: number | null, grams: number | null, category: Category | null | undefined): number {
  const guess = kcal !== null && kcal > 0 ? kcal : 0;
  if (grams === null || grams <= 0) return Math.min(guess, 1500);
  const [lo, hi] = DENSITY[category ?? "dish"];
  return Math.max(lo * grams, Math.min(hi * grams, guess > 0 ? guess : ((lo + hi) / 2) * grams));
}

// The calorie accuracy pipeline. A language model is good at naming food and estimating how much
// there is, and poor at remembering energy density. So the model gives a name and grams, and the
// numbers come from the verified table. Only foods the table does not know fall back to the
// model's own kcal guess, and they are marked as estimates.

export type RawFood = {
  name: string;
  grams: number | null;
  quantity: number | null;
  unit: string | null;
  category?: Category | null;
  /** The model's own guess, used only when the table has no match. */
  kcal: number | null;
  protein_g: number | null;
  confidence: number;
};

export type SavedLookup = { name: string; kcal: number; protein_g: number; quantity: number | null };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function finalizeFood(item: RawFood, saved: readonly SavedLookup[] = []): DraftFood {
  const name = item.name.trim().slice(0, 80) || "Food";

  // 1. Your own saved food or recipe, exact name: use its numbers.
  const mine = saved.find((s) => norm(s.name) === norm(name));
  if (mine && (item.grams === null || item.grams <= 0)) {
    const times = item.quantity && item.quantity > 0 ? item.quantity : 1;
    return {
      kind: "food",
      name,
      quantity: times,
      unit: "portion",
      kcal: clamp(Math.round(mine.kcal * times), 0, 5000),
      protein_g: clamp(Math.round(mine.protein_g * times * 10) / 10, 0, 300),
      confidence: 1,
      basis: "saved",
      grams: null,
      per100: null,
    };
  }

  // 2. The verified table: grams x per 100 g.
  const m = matchFood(name);
  if (m) {
    const stated = item.grams !== null && item.grams > 0;
    const grams = clamp(Math.round(stated ? (item.grams as number) : gramsFor(m.food, item.quantity, item.unit)), 1, 5000);
    const n = nutrientsFor(m.food, grams);
    return {
      kind: "food",
      name,
      quantity: grams,
      unit: m.food.liquid ? "ml" : "g",
      kcal: n.kcal,
      protein_g: n.protein_g,
      confidence: Math.round(Math.min(1, m.score * (stated ? 1 : 0.85)) * 100) / 100,
      basis: "database",
      grams,
      per100: { kcal: m.food.per100.kcal, protein: m.food.per100.protein },
    };
  }

  // 3. Unknown to the table: the model's estimate, flagged so you know to check it.
  return {
    kind: "food",
    name,
    quantity: item.grams !== null && item.grams > 0 ? Math.round(item.grams) : item.quantity && item.quantity > 0 ? item.quantity : null,
    unit: item.grams !== null && item.grams > 0 ? "g" : item.unit ? item.unit.slice(0, 16) : null,
    kcal: clamp(Math.round(plausibleKcal(item.kcal, item.grams, item.category)), 0, 5000),
    protein_g: clamp(Math.round((item.protein_g ?? 0) * 10) / 10, 0, Math.max(5, (item.grams ?? 300) * 0.4)),
    confidence: Math.min(item.confidence, 0.6),
    basis: "estimate",
    grams: item.grams !== null && item.grams > 0 ? Math.round(item.grams) : null,
    per100: null,
  };
}
