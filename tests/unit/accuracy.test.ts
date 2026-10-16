import { describe, expect, it } from "vitest";
import { finalizeFood } from "@/features/logging/accuracy";

const raw = (name: string, grams: number | null, kcal: number | null = 999) => ({
  name,
  grams,
  quantity: null,
  unit: null,
  kcal,
  protein_g: null,
  confidence: 0.9,
});

describe("finalizeFood", () => {
  it("computes from the table, ignoring the model's own kcal", () => {
    const d = finalizeFood(raw("grilled chicken breast", 150));
    expect(d.basis).toBe("database");
    expect(d.kcal).toBeGreaterThan(200);
    expect(d.kcal).toBeLessThan(290);
    expect(d.grams).toBe(150);
  });

  it("falls back to the model estimate for unknown food and says so", () => {
    const d = finalizeFood(raw("zzqx blorp", 200, 410));
    expect(d.basis).toBe("estimate");
    expect(d.kcal).toBe(410);
  });

  it("prefers the user's saved food on an exact name", () => {
    const d = finalizeFood(raw("my shake", null), [{ name: "My Shake", kcal: 320, protein_g: 30, quantity: null }]);
    expect(d.basis).toBe("saved");
    expect(d.kcal).toBe(320);
  });
});

import { plausibleKcal } from "@/features/logging/accuracy";
import { matchFood } from "@/features/nutrition/food-match";

describe("guards", () => {
  it("pulls an impossible soup back to a believable density", () => {
    // 250 g of soup at 2,210 kcal is 8.8 kcal/g, which is pure oil
    expect(plausibleKcal(2210, 250, "soup_stew")).toBeLessThanOrEqual(550);
  });
  it("matches the dish, not the side ingredient", () => {
    expect(matchFood("egusi soup with spinach")?.food.id).toBe("egusi_soup");
    expect(matchFood("ndole with shrimp")?.food.id).toBe("ndole");
  });
});

describe("the Greek yogurt problem", () => {
  it("any way of saying greek yogurt reaches the greek entry, not plain", async () => {
    const { matchFood } = await import("@/features/nutrition/food-match");
    for (const n of ["greek yogurt", "greek yogurt, plain", "natural greek yogurt", "strained yogurt", "Greek-style yogurt"]) {
      expect(matchFood(n)?.food.id).toBe("yogurt_greek_whole");
    }
    expect(matchFood("plain yogurt")?.food.id).toBe("yogurt_plain_whole");
  });
  it("400 g of greek yogurt is about 36 g protein, not 14", () => {
    const d = finalizeFood(raw("greek yogurt, plain", 400));
    expect(d.protein_g).toBeGreaterThan(30);
  });
  it("your own labelled food wins and is exact for any amount", () => {
    const d = finalizeFood(raw("my high protein greek yogurt", 400), [
      { name: "High protein greek yogurt", kcal: 0, protein_g: 0, quantity: null, per100Kcal: 98, per100Protein: 11.5 },
    ]);
    expect(d.basis).toBe("label");
    expect(d.kcal).toBe(392);
    expect(d.protein_g).toBe(46);
  });
});
