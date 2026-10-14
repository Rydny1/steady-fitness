import { meals, type Meal } from "@/content/meals";
import type { ShoppingRecipe } from "./shopping-list";

// content/meals.ts keeps amounts as written in CONTENT.md ("800 g", "2 tbsp", "2").
// The pure shopping list wants numbers. This adapter parses them once.

function parseAmount(raw: string | null): { amount: number; unit: string } {
  if (raw === null) return { amount: 0, unit: "" };
  const m = /^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]*)$/.exec(raw.trim());
  if (!m) return { amount: 0, unit: "" };
  return { amount: Number((m[1] ?? "0").replace(",", ".")), unit: m[2] ?? "" };
}

export function toShoppingRecipe(meal: Meal): ShoppingRecipe {
  return {
    id: meal.slug,
    name: meal.name,
    ingredients: meal.ingredients.map((i) => {
      const { amount, unit } = parseAmount(i.amount);
      return { name: i.name, amount, unit, group: i.aisle };
    }),
  };
}

export function recipesBySlug(): Map<string, ShoppingRecipe> {
  return new Map(meals.map((m) => [m.slug, toShoppingRecipe(m)] as const));
}

/** "1.6 kg", "480 g", "2", or "" for to-taste items. */
export function formatAmount(amount: number, unit: string): string {
  if (amount <= 0) return "";
  if (unit === "g" && amount >= 1000) return `${Math.round(amount / 100) / 10} kg`;
  return unit ? `${amount} ${unit}` : String(amount);
}
