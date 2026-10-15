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
