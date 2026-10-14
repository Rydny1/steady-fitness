// Batch recipes. Source of truth: CONTENT.md > Fuel. All numbers are estimates.
// Each recipe makes 4 portions; kcal and protein are per portion.

export type Aisle = 'Meat and fish' | 'Fruit and veg' | 'Dairy' | 'Tins and dry' | 'Spices';

export const aisleOrder: Aisle[] = ['Meat and fish', 'Fruit and veg', 'Dairy', 'Tins and dry', 'Spices'];

export type Ingredient = {
  name: string;
  /** Amount as written in CONTENT.md. Null where CONTENT.md gives none. */
  amount: string | null;
  aisle: Aisle;
};

export type Meal = {
  slug: string;
  name: string;
  portions: 4;
  /** Approximate kcal per portion. */
  kcal: number;
  /** Approximate grams of protein per portion. */
  protein: number;
  ingredients: Ingredient[];
  steps: string[];
  /** Extra note shown under the steps. */
  note?: string;
};

export const batchPlan = {
  summary:
    'Sunday: cook 2 recipes = 8 portions = lunch and dinner Mon to Thu. Thursday night: 1 recipe for Fri and Sat. Rotate so no recipe repeats two weeks running.',
  fridge: 'Fridge max 3 days. Freeze anything for day 4.',
  perPortion: 'Each recipe makes 4 portions. Per portion approx. 510 to 580 kcal, about 50 g protein.',
} as const;

export const meals: Meal[] = [
  {
    slug: 'jollof-chicken',
    name: 'Jollof chicken rice',
    portions: 4,
    kcal: 575,
    protein: 50,
    ingredients: [
      { name: 'Chicken breast', amount: '800 g', aisle: 'Meat and fish' },
      { name: 'Red peppers', amount: '2', aisle: 'Fruit and veg' },
      { name: 'Onions', amount: '2', aisle: 'Fruit and veg' },
      { name: 'Chilli (or scotch bonnet if Rimi has it)', amount: '1', aisle: 'Fruit and veg' },
      { name: 'Frozen mixed veg', amount: '300 g', aisle: 'Fruit and veg' },
      { name: 'Basmati rice, dry', amount: '240 g', aisle: 'Tins and dry' },
      { name: 'Tomato paste', amount: '140 g', aisle: 'Tins and dry' },
      { name: 'Oil', amount: '2 tbsp', aisle: 'Tins and dry' },
      { name: 'Stock cube', amount: null, aisle: 'Tins and dry' },
      { name: 'Thyme', amount: null, aisle: 'Spices' },
      { name: 'Curry powder', amount: null, aisle: 'Spices' },
      { name: 'Bay leaf', amount: null, aisle: 'Spices' },
    ],
    steps: [
      'Blend peppers, onion, chilli.',
      'Fry paste in oil 5 min, add blend, cook down 15 min.',
      'Add spices, stock, rice, water. Lid on, low heat 25 min.',
      'Bake or pan-sear chicken separately, slice, portion on top.',
    ],
  },
  {
    slug: 'suya-beef',
    name: 'Suya beef with sweet potato',
    portions: 4,
    kcal: 575,
    protein: 48,
    ingredients: [
      { name: 'Lean beef strips or 5% mince', amount: '800 g', aisle: 'Meat and fish' },
      { name: 'Sweet potato', amount: '900 g', aisle: 'Fruit and veg' },
      { name: 'Peppers', amount: '2', aisle: 'Fruit and veg' },
      { name: 'Onions', amount: '2', aisle: 'Fruit and veg' },
      { name: 'Roasted peanuts (ground), for the suya mix', amount: '40 g', aisle: 'Tins and dry' },
      { name: 'Oil', amount: '1 tbsp', aisle: 'Tins and dry' },
      { name: 'Chilli flakes', amount: null, aisle: 'Spices' },
      { name: 'Ginger', amount: null, aisle: 'Spices' },
      { name: 'Garlic powder', amount: null, aisle: 'Spices' },
      { name: 'Paprika', amount: null, aisle: 'Spices' },
      { name: 'Onion powder', amount: null, aisle: 'Spices' },
      { name: 'Salt', amount: null, aisle: 'Spices' },
    ],
    steps: [
      'Mix the suya mix: ground peanuts, chilli flakes, ginger, garlic powder, paprika, onion powder, salt.',
      'Coat beef in suya mix, sear hot.',
      'Roast sweet potato cubes 200 C 30 min.',
      'Raw onion slices on top when serving.',
    ],
  },
  {
    slug: 'turkey-chilli',
    name: 'Spicy turkey bean chilli',
    portions: 4,
    kcal: 510,
    protein: 50,
    ingredients: [
      { name: 'Turkey mince', amount: '800 g', aisle: 'Meat and fish' },
      { name: 'Onion', amount: '1', aisle: 'Fruit and veg' },
      { name: 'Peppers', amount: '2', aisle: 'Fruit and veg' },
      { name: 'Kidney beans, drained', amount: '2 cans', aisle: 'Tins and dry' },
      { name: 'Chopped tomatoes', amount: '2 cans', aisle: 'Tins and dry' },
      { name: 'Oil', amount: '1 tbsp', aisle: 'Tins and dry' },
      { name: 'Cumin', amount: null, aisle: 'Spices' },
      { name: 'Smoked paprika', amount: null, aisle: 'Spices' },
      { name: 'Chilli', amount: null, aisle: 'Spices' },
      { name: 'Garlic', amount: null, aisle: 'Spices' },
    ],
    steps: [
      'Brown turkey, add veg 5 min, spices, tomatoes, beans.',
      'Simmer 30 min.',
    ],
    note: 'Rice optional (adds about 200 kcal per 150 g cooked).',
  },
  {
    slug: 'chicken-yassa',
    name: 'Chicken yassa (Senegalese onion-lemon)',
    portions: 4,
    kcal: 590,
    protein: 51,
    ingredients: [
      { name: 'Chicken breast', amount: '800 g', aisle: 'Meat and fish' },
      { name: 'Onions', amount: '800 g', aisle: 'Fruit and veg' },
      { name: 'Lemons', amount: '3', aisle: 'Fruit and veg' },
      { name: 'Garlic', amount: null, aisle: 'Fruit and veg' },
      { name: 'Chilli', amount: null, aisle: 'Fruit and veg' },
      { name: 'Rice, dry', amount: '240 g', aisle: 'Tins and dry' },
      { name: 'Mustard', amount: '3 tbsp', aisle: 'Tins and dry' },
      { name: 'Oil', amount: '2 tbsp', aisle: 'Tins and dry' },
      { name: 'Stock cube', amount: null, aisle: 'Tins and dry' },
    ],
    steps: [
      'Marinate chicken in lemon, mustard, garlic overnight Saturday.',
      'Sear chicken.',
      'Cook sliced onions slowly 25 min in the marinade until soft.',
      'Combine, simmer 10 min. Serve on rice.',
    ],
  },
  {
    slug: 'fish-stew',
    name: 'West African fish stew with potatoes',
    portions: 4,
    kcal: 540,
    protein: 50,
    ingredients: [
      { name: 'Frozen cod or pollock', amount: '1 kg', aisle: 'Meat and fish' },
      { name: 'Potatoes', amount: '1 kg', aisle: 'Fruit and veg' },
      { name: 'Peppers', amount: '2', aisle: 'Fruit and veg' },
      { name: 'Onion', amount: '1', aisle: 'Fruit and veg' },
      { name: 'Ginger', amount: null, aisle: 'Fruit and veg' },
      { name: 'Garlic', amount: null, aisle: 'Fruit and veg' },
      { name: 'Chilli', amount: null, aisle: 'Fruit and veg' },
      { name: 'Chopped tomatoes', amount: '2 cans', aisle: 'Tins and dry' },
      { name: 'Oil', amount: '2 tbsp', aisle: 'Tins and dry' },
      { name: 'Thyme', amount: null, aisle: 'Spices' },
    ],
    steps: [
      'Blend tomatoes, peppers, onion, ginger, garlic, chilli.',
      'Fry 15 min.',
      'Add fish chunks, simmer 10 min gently.',
      'Boil potatoes separately.',
    ],
  },
];

/**
 * Public image path for a meal slug, or null when no photo was found.
 * No photo for chicken-yassa: use the UI's neutral placeholder.
 */
export function mealImage(slug: string): string | null {
  return MEAL_IMAGES.has(slug) ? `/images/meals/${slug}.webp` : null;
}

const MEAL_IMAGES = new Set(['jollof-chicken', 'suya-beef', 'turkey-chilli', 'fish-stew']);

/** Header photo for the Fuel page. */
export const fuelHeaderImage = '/images/fuel/batch-prep.webp';

export function getMeal(slug: string): Meal | undefined {
  return meals.find((m) => m.slug === slug);
}

/** Shopping list for a set of meals, grouped by aisle. Amounts are listed per recipe. */
export function shoppingList(slugs: string[]): { aisle: Aisle; items: { name: string; amount: string | null; meal: string }[] }[] {
  const chosen = meals.filter((m) => slugs.includes(m.slug));
  return aisleOrder
    .map((aisle) => ({
      aisle,
      items: chosen.flatMap((m) =>
        m.ingredients.filter((i) => i.aisle === aisle).map((i) => ({ name: i.name, amount: i.amount, meal: m.name })),
      ),
    }))
    .filter((g) => g.items.length > 0);
}
