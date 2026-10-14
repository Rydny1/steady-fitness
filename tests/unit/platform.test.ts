import { describe, expect, it } from "vitest";
import { CATCH_UP_MINUTES, dueKinds, minutesOf, pickLine, shouldSend } from "@/features/notifications/schedule";
import { parseOffProduct, scaleToGrams } from "@/features/nutrition/barcode";
import { buildCsp } from "@/lib/csp";

describe("notification schedule", () => {
  const prefs = [
    { kind: "wake_gym" as const, atTime: "06:15", enabled: true },
    { kind: "log_nudge" as const, atTime: "21:30", enabled: true },
    { kind: "weekly" as const, atTime: "21:00", enabled: true },
    { kind: "last_call" as const, atTime: "23:00", enabled: false },
  ];

  it("is due from its time until the catch-up window ends", () => {
    expect(dueKinds(prefs, minutesOf("06:14"), 2)).toEqual([]);
    expect(dueKinds(prefs, minutesOf("06:15"), 2)).toEqual(["wake_gym"]);
    expect(dueKinds(prefs, minutesOf("06:15") + CATCH_UP_MINUTES - 1, 2)).toEqual(["wake_gym"]);
    expect(dueKinds(prefs, minutesOf("06:15") + CATCH_UP_MINUTES, 2)).toEqual([]);
  });

  it("skips disabled kinds and sends the weekly one only on Sunday", () => {
    expect(dueKinds(prefs, minutesOf("23:05"), 2)).toEqual([]);
    expect(dueKinds(prefs, minutesOf("21:05"), 3)).toEqual([]);
    expect(dueKinds(prefs, minutesOf("21:05"), 7)).toEqual(["weekly"]);
  });

  it("checks the condition for each kind", () => {
    const base = { planned: null, loggedToday: false, streak: 3, photoDue: false, weekday: 2 };
    expect(shouldSend("wake_gym", { ...base, planned: "gym_a" })).toBe(true);
    expect(shouldSend("wake_gym", { ...base, planned: "run" })).toBe(false);
    expect(shouldSend("wake_run", { ...base, planned: "run" })).toBe(true);
    expect(shouldSend("log_nudge", base)).toBe(true);
    expect(shouldSend("log_nudge", { ...base, loggedToday: true })).toBe(false);
    expect(shouldSend("last_call", { ...base, loggedToday: true })).toBe(false);
    expect(shouldSend("photo_day", { ...base, photoDue: true, weekday: 6 })).toBe(true);
    expect(shouldSend("photo_day", { ...base, photoDue: true, weekday: 2 })).toBe(false);
    expect(shouldSend("photo_day", { ...base, photoDue: false, weekday: 6 })).toBe(false);
  });

  it("rotates the line by day and fills the streak", () => {
    expect(pickLine("log_nudge", 0, 0)).not.toBe(pickLine("log_nudge", 1, 0));
    expect(pickLine("last_call", 0, 18)).toContain("18 days");
  });
});

describe("barcode lookup parsing", () => {
  it("reads per-100 g numbers and scales them to the grams eaten", () => {
    const p = parseOffProduct({
      status: 1,
      product: { product_name: "Skyr natural", nutriments: { "energy-kcal_100g": 63, proteins_100g: 11 } },
    });
    expect(p).toEqual({ name: "Skyr natural", kcalPer100: 63, proteinPer100: 11 });
    expect(scaleToGrams(p!, 150)).toEqual({ kcal: 95, protein_g: 16.5 });
  });

  it("rejects products with missing numbers or a not-found status", () => {
    expect(parseOffProduct({ status: 0 })).toBeNull();
    expect(parseOffProduct({ status: 1, product: { product_name: "X", nutriments: {} } })).toBeNull();
    expect(parseOffProduct(null)).toBeNull();
  });
});

describe("content security policy", () => {
  it("is nonce based for scripts and forbids framing", () => {
    const csp = buildCsp("abc123", false);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("unsafe-eval");
    expect(buildCsp("n", true)).toContain("unsafe-eval");
  });
});
