import { gramsFor, matchFood, nutrientsFor } from "@/features/nutrition/food-match";
import type { DraftFood } from "./schema";

// The calorie accuracy pipeline. A language model is good at naming food and estimating how much
// there is, and poor at remembering energy density. So the model gives a name and grams, and the
// numbers come from the verified table. Only foods the table does not know fall back to the
// model's own kcal guess, and they are marked as estimates.

export type RawFood = {
  name: string;
  grams: number | null;
  quantity: number | null;
  unit: string | null;
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
    kcal: clamp(Math.round(item.kcal ?? 0), 0, 5000),
    protein_g: clamp(Math.round((item.protein_g ?? 0) * 10) / 10, 0, 300),
    confidence: Math.min(item.confidence, 0.6),
    basis: "estimate",
    grams: item.grams !== null && item.grams > 0 ? Math.round(item.grams) : null,
    per100: null,
  };
}
