// Shopping list: picked recipes merged and scaled, grouped by aisle (PRODUCT.md). Code only.
import { SHOPPING, SHOPPING_GROUPS, type ShoppingGroup } from "./config";

export type Ingredient = {
  name: string;
  amount: number;
  /** g, ml, tbsp, tsp, can, or "" for items counted whole. */
  unit: string;
  group: ShoppingGroup;
};

export type ShoppingRecipe = {
  id: string;
  name: string;
  ingredients: readonly Ingredient[];
};

export type ShoppingPick = {
  recipe: ShoppingRecipe;
  /** Batches to cook. Default 1. */
  batches?: number;
};

export type ShoppingItem = {
  /** Stable key for checkboxes: name and unit. */
  id: string;
  name: string;
  amount: number;
  unit: string;
  /** Recipe names this item is needed for. */
  recipes: string[];
};

export type ShoppingGroupList = { group: ShoppingGroup; items: ShoppingItem[] };

function round(n: number): number {
  const f = 10 ** SHOPPING.decimals;
  return Math.round(n * f) / f;
}

function itemId(name: string, unit: string): string {
  return `${name.trim().toLowerCase()}|${unit}`;
}

/**
 * Merge the ingredients of the picked recipes, scale by batches, and group them.
 * Same name and unit add up. Groups follow the fixed aisle order; empty groups are dropped;
 * items are sorted by name.
 */
export function buildShoppingList(picks: readonly ShoppingPick[]): ShoppingGroupList[] {
  const merged = new Map<string, ShoppingItem & { group: ShoppingGroup }>();
  for (const pick of picks) {
    const batches = pick.batches ?? 1;
    for (const ing of pick.recipe.ingredients) {
      const id = itemId(ing.name, ing.unit);
      const existing = merged.get(id);
      const add = ing.amount * batches;
      if (existing) {
        existing.amount += add;
        if (!existing.recipes.includes(pick.recipe.name)) existing.recipes.push(pick.recipe.name);
      } else {
        merged.set(id, {
          id,
          name: ing.name.trim(),
          amount: add,
          unit: ing.unit,
          recipes: [pick.recipe.name],
          group: ing.group,
        });
      }
    }
  }
  return SHOPPING_GROUPS.map((group) => ({
    group,
    items: [...merged.values()]
      .filter((i) => i.group === group)
      .map(({ group: _g, ...item }) => ({ ...item, amount: round(item.amount) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.items.length > 0);
}

/** Number of recipes to pick: 2 for the weekend batch, 3 with the Thursday extra. */
export function picksNeeded(withThursday: boolean): number {
  return SHOPPING.picksWeekend + (withThursday ? SHOPPING.picksThursday : 0);
}

/** Recipes to suggest: not cooked last week, in the given order. */
export function suggestRecipes(
  allIds: readonly string[],
  lastWeekIds: readonly string[],
  count: number,
): string[] {
  const fresh = allIds.filter((id) => !lastWeekIds.includes(id));
  const rest = allIds.filter((id) => lastWeekIds.includes(id));
  return [...fresh, ...rest].slice(0, count);
}
