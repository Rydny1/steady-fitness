import { describe, expect, it } from "vitest";
import { comebackQuotes, quotes } from "@/content/lines";
import { batchMeals, meals, quickMeals } from "@/content/meals";
import { snacks } from "@/content/snacks";
import { challengeCards, chapters, coachForm, matchLines, notificationPools, trophies } from "@/content/copy";
import { tooltips } from "@/content/tooltips";
import { recipesBySlug, formatAmount } from "@/features/nutrition/shopping-adapter";
import { buildShoppingList } from "@/features/nutrition/shopping-list";

const BANNED = /[—–!]|[\u{1F300}-\u{1FAFF}←-⇿]/u;
const words = (s: string) => s.trim().split(/\s+/).length;

describe("quote bank", () => {
  it("has 60 or more quotes, all under 20 words, each with an author and a source", () => {
    expect(quotes.length).toBeGreaterThanOrEqual(60);
    for (const q of quotes) {
      expect(words(q.text), q.id).toBeLessThan(20);
      expect(q.author.length, q.id).toBeGreaterThan(2);
      expect(q.sourceUrl, q.id).toMatch(/^https?:\/\//);
      expect(BANNED.test(q.text), q.id).toBe(false);
    }
  });

  it("has unique ids and unique texts", () => {
    expect(new Set(quotes.map((q) => q.id)).size).toBe(quotes.length);
    expect(new Set(quotes.map((q) => q.text)).size).toBe(quotes.length);
  });

  it("keeps any one author to 8 quotes at most", () => {
    const counts = new Map<string, number>();
    for (const q of quotes) counts.set(q.author, (counts.get(q.author) ?? 0) + 1);
    for (const [author, n] of counts) expect(n, author).toBeLessThanOrEqual(8);
  });

  it("has a comeback set of 15 or more that is part of the bank", () => {
    expect(comebackQuotes.length).toBeGreaterThanOrEqual(15);
    const ids = new Set(quotes.map((q) => q.id));
    for (const q of comebackQuotes) expect(ids.has(q.id), q.id).toBe(true);
  });

  it("has none of the old harsh coach lines", () => {
    const all = quotes.map((q) => q.text).join(" ");
    expect(all).not.toMatch(/Nobody cares how you feel/);
  });
});

describe("meals", () => {
  it("has five batch recipes and two quick meals with the agreed numbers", () => {
    expect(batchMeals.map((m) => [m.slug, m.kcal, m.protein])).toEqual([
      ["teriyaki-chicken", 380, 42],
      ["greek-chicken", 370, 40],
      ["turkey-chilli", 360, 38],
      ["egg-fried-rice", 390, 35],
      ["tuna-pasta", 370, 32],
    ]);
    expect(quickMeals.map((m) => [m.slug, m.kcal, m.protein])).toEqual([
      ["avocado-egg-toast", 350, 22],
      ["yogurt-bowl", 280, 30],
    ]);
    for (const m of batchMeals) expect(m.portions).toBe(4);
    for (const m of quickMeals) expect(m.portions).toBe(1);
  });

  it("keeps every portion under 400 kcal", () => {
    for (const m of meals) expect(m.kcal).toBeLessThan(400);
  });

  it("keeps the quick buys from before", () => {
    expect(snacks).toHaveLength(9);
    expect(snacks.find((s) => s.slug === "quark")).toMatchObject({ kcal: 150, protein: 24 });
  });

  it("builds a shopping list from the picked batch recipes", () => {
    const by = recipesBySlug();
    const teriyaki = by.get("teriyaki-chicken");
    const greek = by.get("greek-chicken");
    expect(teriyaki && greek).toBeTruthy();
    const list = buildShoppingList([{ recipe: teriyaki!, }, { recipe: greek! }]);
    const chicken = list.flatMap((g) => g.items).find((i) => i.name === "Chicken breast");
    expect(chicken?.amount).toBe(1600);
    expect(formatAmount(chicken?.amount ?? 0, chicken?.unit ?? "")).toBe("1.6 kg");
    const rice = list.flatMap((g) => g.items).find((i) => i.name === "Rice, dry");
    expect(rice?.amount).toBe(400);
  });
});

describe("naming", () => {
  it("uses levels, not football divisions", () => {
    expect(Object.values(chapters).map((c) => c.name)).toEqual([
      "Starting line",
      "Showing up",
      "Building",
      "Consistent",
      "Strong",
      "Disciplined",
      "Proven",
      "One year",
    ]);
  });

  it("uses the new challenge names", () => {
    expect(challengeCards.early_kickoff?.name).toBe("Early bird");
    expect(challengeCards.protein_five?.name).toBe("Protein week");
    expect(challengeCards.full_ninety?.name).toBe("On time");
    expect(challengeCards.ten_k_minutes?.name).toBe("Move more");
    expect(challengeCards.photo_day?.name).toBe("Mirror check");
    expect(challengeCards.weigh_in_three?.name).toBe("Scale check");
    expect(challengeCards.sleep_seven?.name).toBe("Lights out");
  });

  it("says Coach, never Gaffer, and has no football theme in app copy", () => {
    const blob = JSON.stringify({ chapters, coachForm, matchLines, notificationPools, trophies, challengeCards });
    expect(blob).not.toMatch(/Gaffer|Sunday League|Academy|Ballon|Champions League|Hat-trick|First whistle|Full time/);
  });
});

describe("tooltips", () => {
  it("explains the seven required concepts in one line each", () => {
    for (const k of ["callus", "form", "rings", "waistToHeight", "bodyFat", "adaptiveBudget", "vsLastWeek"] as const) {
      expect(tooltips[k].text.length, k).toBeGreaterThan(20);
      expect(tooltips[k].text, k).not.toContain("\n");
    }
  });
});
