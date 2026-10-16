// Reading a nutrition label. The AI only copies the printed numbers; this file does the arithmetic
// and checks that they add up (energy must match protein, carbs and fat), so a misread digit or a
// kJ figure taken for kcal is caught instead of logged.

export type LabelRaw = {
  name: string | null;
  kcal100: number | null;
  protein100: number | null;
  carbs100: number | null;
  fat100: number | null;
  kcalServing: number | null;
  proteinServing: number | null;
  carbsServing: number | null;
  fatServing: number | null;
  servingG: number | null;
  packG: number | null;
};

export type LabelFacts = {
  name: string;
  kcal100: number;
  protein100: number;
  packG: number | null;
  servingG: number | null;
  /** Things the person should look at before trusting it. */
  warnings: string[];
};

const KJ_PER_KCAL = 4.184;

/** Energy the macros should add up to (Atwater: 4, 4, 9). */
function expectedKcal(p: number, c: number, f: number): number {
  return 4 * p + 4 * c + 9 * f;
}

const near = (kcal: number, expected: number) => Math.abs(kcal - expected) <= Math.max(25, expected * 0.2);

export function resolveLabel(raw: LabelRaw): LabelFacts | null {
  const warnings: string[] = [];
  const scale = raw.servingG && raw.servingG > 0 ? 100 / raw.servingG : null;

  let kcal = raw.kcal100;
  let protein = raw.protein100;
  let carbs = raw.carbs100;
  let fat = raw.fat100;
  if (kcal === null || protein === null) {
    if (scale === null || raw.kcalServing === null || raw.proteinServing === null) return null;
    kcal = raw.kcalServing * scale;
    protein = raw.proteinServing * scale;
    carbs = raw.carbsServing === null ? null : raw.carbsServing * scale;
    fat = raw.fatServing === null ? null : raw.fatServing * scale;
    warnings.push("Worked out per 100 g from the serving size.");
  }

  // Do the printed numbers add up? A kJ figure read as kcal is the usual slip.
  if (carbs !== null && fat !== null) {
    const exp = expectedKcal(protein, carbs, fat);
    if (!near(kcal, exp)) {
      if (near(kcal / KJ_PER_KCAL, exp)) {
        kcal = kcal / KJ_PER_KCAL;
        warnings.push("That looked like kJ, converted to kcal.");
      } else {
        warnings.push("The numbers don't add up. Check them against the pack.");
      }
    }
  }

  if (kcal < 0 || kcal > 900 || protein < 0 || protein > 100) return null;
  return {
    name: (raw.name ?? "").trim().slice(0, 80) || "Packaged food",
    kcal100: Math.round(kcal),
    protein100: Math.round(protein * 10) / 10,
    packG: raw.packG && raw.packG > 0 ? Math.round(raw.packG) : null,
    servingG: raw.servingG && raw.servingG > 0 ? Math.round(raw.servingG) : null,
    warnings,
  };
}
