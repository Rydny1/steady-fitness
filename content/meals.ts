// Recipes. Five batch recipes (cook Sunday, 4 portions each) and two quick meals.
// All ingredients come from Rimi, Maxima or Lidl in Riga. Numbers are estimates per portion.
// Amounts left null are to taste: the shopping list shows the item without a quantity.

export type Aisle = 'Meat and fish' | 'Fruit and veg' | 'Dairy' | 'Tins and dry' | 'Spices';

export const aisleOrder: Aisle[] = ['Meat and fish', 'Fruit and veg', 'Dairy', 'Tins and dry', 'Spices'];

export type Ingredient = {
  name: string;
  /** Amount as written ("800 g", "2 cans", "4"). Null where no amount is given. */
  amount: string | null;
  aisle: Aisle;
};

export type Meal = {
  slug: string;
  name: string;
  /** Batch recipes make 4 portions for the week. Quick meals are one portion, no prep. */
  kind: 'batch' | 'quick';
  portions: number;
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
  perPortion: 'Each batch recipe makes 4 portions. Per portion approx. 360 to 390 kcal, 32 to 42 g protein.',
} as const;

export const meals: Meal[] = [
  {
    slug: 'teriyaki-chicken',
    name: 'Teriyaki chicken and broccoli bowls',
    kind: 'batch',
    portions: 4,
    kcal: 380,
    protein: 42,
    ingredients: [
      { name: 'Chicken breast', amount: '800 g', aisle: 'Meat and fish' },
      { name: 'Broccoli', amount: '400 g', aisle: 'Fruit and veg' },
      { name: 'Garlic', amount: null, aisle: 'Fruit and veg' },
      { name: 'Ginger', amount: null, aisle: 'Fruit and veg' },
      { name: 'Rice, dry', amount: '200 g', aisle: 'Tins and dry' },
      { name: 'Soy sauce', amount: null, aisle: 'Tins and dry' },
      { name: 'Honey', amount: null, aisle: 'Tins and dry' },
      { name: 'Sesame seeds', amount: null, aisle: 'Spices' },
    ],
    steps: [
      'Dice the chicken and cook it in a pan.',
      'Make the sauce: soy sauce, honey, garlic, ginger.',
      'Toss the chicken in the sauce.',
      'Steam the broccoli.',
      'Portion with rice. Sprinkle with sesame seeds.',
    ],
  },
  {
    slug: 'greek-chicken',
    name: 'Greek chicken bowl',
    kind: 'batch',
    portions: 4,
    kcal: 370,
    protein: 40,
    ingredients: [
      { name: 'Chicken breast', amount: '800 g', aisle: 'Meat and fish' },
      { name: 'Cucumber', amount: null, aisle: 'Fruit and veg' },
      { name: 'Tomatoes', amount: null, aisle: 'Fruit and veg' },
      { name: 'Red onion', amount: null, aisle: 'Fruit and veg' },
      { name: 'Lemon', amount: null, aisle: 'Fruit and veg' },
      { name: 'Feta', amount: '100 g', aisle: 'Dairy' },
      { name: 'Rice, dry', amount: '200 g', aisle: 'Tins and dry' },
      { name: 'Olive oil', amount: null, aisle: 'Tins and dry' },
      { name: 'Oregano', amount: null, aisle: 'Spices' },
    ],
    steps: [
      'Marinate the chicken in lemon, oregano and olive oil.',
      'Pan-cook or bake it.',
      'Chop the cucumber, tomatoes and red onion.',
      'Portion with rice and crumbled feta.',
    ],
  },
  {
    slug: 'turkey-chilli',
    name: 'Turkey chilli with beans',
    kind: 'batch',
    portions: 4,
    kcal: 360,
    protein: 38,
    ingredients: [
      { name: 'Turkey mince', amount: '800 g', aisle: 'Meat and fish' },
      { name: 'Onion', amount: null, aisle: 'Fruit and veg' },
      { name: 'Peppers', amount: null, aisle: 'Fruit and veg' },
      { name: 'Kidney beans, tinned', amount: '2 cans', aisle: 'Tins and dry' },
      { name: 'Chopped tomatoes, tinned', amount: '2 cans', aisle: 'Tins and dry' },
      { name: 'Cumin', amount: null, aisle: 'Spices' },
      { name: 'Smoked paprika', amount: null, aisle: 'Spices' },
      { name: 'Chilli flakes', amount: null, aisle: 'Spices' },
    ],
    steps: [
      'Brown the turkey.',
      'Add everything else.',
      'Simmer 30 min.',
    ],
    note: 'No rice needed. The beans are the carbs.',
  },
  {
    slug: 'egg-fried-rice',
    name: 'Egg fried rice with chicken and veg',
    kind: 'batch',
    portions: 4,
    kcal: 390,
    protein: 35,
    ingredients: [
      { name: 'Chicken breast', amount: '600 g', aisle: 'Meat and fish' },
      { name: 'Frozen mixed veg', amount: '300 g', aisle: 'Fruit and veg' },
      { name: 'Garlic', amount: null, aisle: 'Fruit and veg' },
      { name: 'Eggs', amount: '4', aisle: 'Dairy' },
      { name: 'Rice, dry', amount: '300 g', aisle: 'Tins and dry' },
      { name: 'Soy sauce', amount: null, aisle: 'Tins and dry' },
      { name: 'Sesame oil', amount: null, aisle: 'Tins and dry' },
    ],
    steps: [
      'Cook the rice and let it cool.',
      'Scramble the eggs and set them aside.',
      'Stir-fry the chicken, then add the veg and the rice.',
      'Add the eggs back with a splash of soy sauce.',
    ],
  },
  {
    slug: 'tuna-pasta',
    name: 'Spicy tuna pasta',
    kind: 'batch',
    portions: 4,
    kcal: 370,
    protein: 32,
    ingredients: [
      { name: 'Tuna, tinned', amount: '3 cans', aisle: 'Meat and fish' },
      { name: 'Garlic', amount: null, aisle: 'Fruit and veg' },
      { name: 'Pasta, dry', amount: '300 g', aisle: 'Tins and dry' },
      { name: 'Chopped tomatoes, tinned', amount: null, aisle: 'Tins and dry' },
      { name: 'Olives', amount: null, aisle: 'Tins and dry' },
      { name: 'Capers (optional)', amount: null, aisle: 'Tins and dry' },
      { name: 'Chilli flakes', amount: null, aisle: 'Spices' },
    ],
    steps: [
      'Cook the pasta.',
      'Fry the garlic and chilli, add the tomatoes and simmer 10 min.',
      'Stir in the drained tuna.',
      'Combine with the pasta.',
    ],
  },
  {
    slug: 'avocado-egg-toast',
    name: 'Avocado egg toast',
    kind: 'quick',
    portions: 1,
    kcal: 350,
    protein: 22,
    ingredients: [
      { name: 'Eggs', amount: '2', aisle: 'Dairy' },
      { name: 'Avocado', amount: '0.5', aisle: 'Fruit and veg' },
      { name: 'Whole grain bread', amount: '2 slices', aisle: 'Tins and dry' },
      { name: 'Salt and pepper', amount: null, aisle: 'Spices' },
      { name: 'Chilli flakes', amount: null, aisle: 'Spices' },
    ],
    steps: [
      'Toast the bread.',
      'Mash the avocado on top.',
      'Fry or boil the eggs and put them on top.',
    ],
    note: 'No prep. Under 10 minutes.',
  },
  {
    slug: 'yogurt-bowl',
    name: 'Greek yogurt power bowl',
    kind: 'quick',
    portions: 1,
    kcal: 280,
    protein: 30,
    ingredients: [
      { name: 'Skyr or Greek yogurt', amount: '250 g', aisle: 'Dairy' },
      { name: 'Banana', amount: '1', aisle: 'Fruit and veg' },
      { name: 'Berries or any fruit', amount: null, aisle: 'Fruit and veg' },
      { name: 'Oats', amount: '30 g', aisle: 'Tins and dry' },
      { name: 'Honey', amount: null, aisle: 'Tins and dry' },
    ],
    steps: ['Layer it all. Done in 2 minutes.'],
    note: 'No prep.',
  },
];

/** The five batch recipes, for the weekly prep. */
export const batchMeals: Meal[] = meals.filter((m) => m.kind === 'batch');
/** The quick meals, logged with one tap. */
export const quickMeals: Meal[] = meals.filter((m) => m.kind === 'quick');

const MEAL_IMAGES = new Set([
  'teriyaki-chicken',
  'greek-chicken',
  'turkey-chilli',
  'egg-fried-rice',
  'tuna-pasta',
  'avocado-egg-toast',
  'yogurt-bowl',
]);

/** Public image path for a meal slug, or null when no photo exists for it. */
export function mealImage(slug: string): string | null {
  return MEAL_IMAGES.has(slug) ? `/images/meals/${slug}.webp` : null;
}

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
