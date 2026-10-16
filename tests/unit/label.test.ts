import { describe, expect, it } from "vitest";
import { resolveLabel, type LabelRaw } from "@/features/nutrition/label";

const none: LabelRaw = { name: null, kcal100: null, protein100: null, carbs100: null, fat100: null, kcalServing: null, proteinServing: null, carbsServing: null, fatServing: null, servingG: null, packG: null };

describe("resolveLabel", () => {
  it("takes the per 100 g column as printed", () => {
    const l = resolveLabel({ ...none, name: "Greek yogurt", kcal100: 98, protein100: 11.5, carbs100: 4, fat100: 4.4, packG: 400 });
    expect(l).toMatchObject({ kcal100: 98, protein100: 11.5, packG: 400, warnings: [] });
  });
  it("works per 100 g out from a serving column", () => {
    const l = resolveLabel({ ...none, kcalServing: 147, proteinServing: 17.3, carbsServing: 6, fatServing: 6.6, servingG: 150 });
    expect(l?.kcal100).toBe(98);
    expect(l?.protein100).toBe(11.5);
    expect(l?.warnings[0]).toContain("serving size");
  });
  it("catches kJ read as kcal", () => {
    const l = resolveLabel({ ...none, kcal100: 410, protein100: 10, carbs100: 4, fat100: 5 });
    expect(l?.kcal100).toBe(98);
    expect(l?.warnings.join(" ")).toContain("kJ");
  });
  it("flags numbers that do not add up, and refuses nonsense", () => {
    expect(resolveLabel({ ...none, kcal100: 300, protein100: 10, carbs100: 4, fat100: 5 })?.warnings.join(" ")).toContain("don't add up");
    expect(resolveLabel({ ...none, kcal100: 1200, protein100: 10 })).toBeNull();
    expect(resolveLabel(none)).toBeNull();
  });
});
