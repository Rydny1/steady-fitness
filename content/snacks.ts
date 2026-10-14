// Supermarket quick buys (Rimi, Maxima, Lidl). Typical values. Check the label.
// Source of truth: CONTENT.md > Fuel.

export type Snack = {
  slug: string;
  name: string;
  amount: string;
  /** Approximate kcal. A range is [min, max]. */
  kcal: number | [number, number];
  /** Approximate grams of protein. */
  protein: number;
};

export const snacks: Snack[] = [
  { slug: 'quark', name: 'Low-fat biezpiens (quark)', amount: '200 g', kcal: 150, protein: 24 },
  { slug: 'skyr', name: 'Skyr / high-protein yogurt, plain', amount: '150 g', kcal: 95, protein: 16 },
  { slug: 'kefir', name: 'Kefir, 1%', amount: '500 ml', kcal: 200, protein: 15 },
  { slug: 'eggs', name: 'Boiled eggs', amount: '2', kcal: 140, protein: 12 },
  { slug: 'tuna', name: 'Tuna in water + 2 rice cakes', amount: '1 can', kcal: 200, protein: 26 },
  { slug: 'protein-drink', name: 'High-protein milk drink', amount: '1 bottle', kcal: [150, 200], protein: 25 },
  { slug: 'chicken-slices', name: 'Chicken breast slices', amount: '100 g', kcal: 100, protein: 20 },
  { slug: 'edamame', name: 'Frozen edamame', amount: '150 g', kcal: 180, protein: 17 },
  { slug: 'fruit', name: 'Banana or apple', amount: '1', kcal: 100, protein: 1 },
];

/** Public image path for a snack slug, or null when no photo was found (tuna). */
export function snackImage(slug: string): string | null {
  return SNACK_IMAGES.has(slug) ? `/images/snacks/${slug}.webp` : null;
}

const SNACK_IMAGES = new Set([
  'quark', 'skyr', 'kefir', 'eggs', 'protein-drink', 'chicken-slices', 'edamame', 'fruit',
]);

export function formatKcal(kcal: Snack['kcal']): string {
  return Array.isArray(kcal) ? `${kcal[0]} to ${kcal[1]}` : String(kcal);
}
