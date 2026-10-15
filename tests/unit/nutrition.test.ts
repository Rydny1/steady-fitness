import { describe, expect, it } from "vitest";
import {
  activityKcal,
  bmr,
  computeTargets,
  dayBudget,
  needsRetarget,
  safetyKeys,
  safetyLine,
} from "@/features/nutrition/targets";
import { adaptiveBudget, adaptiveLine, groupThousands } from "@/features/nutrition/adaptive-budget";
import {
  buildShoppingList,
  picksNeeded,
  suggestRecipes,
  type ShoppingRecipe,
} from "@/features/nutrition/shopping-list";

describe("targets", () => {
  it("BMR uses Mifflin-St Jeor for both sexes", () => {
    expect(bmr({ sex: "male", weightKg: 85, heightCm: 180, ageYears: 30 })).toBe(1830);
    expect(bmr({ sex: "female", weightKg: 70, heightCm: 165, ageYears: 25 })).toBeCloseTo(1445.25, 5);
  });

  it("budget is 75 percent of base burn but never below BMR (floor wins)", () => {
    const t = computeTargets({ sex: "male", weightKg: 85, heightCm: 180, ageYears: 30, goalWeightKg: 78 });
    expect(t.bmrKcal).toBe(1830);
    expect(t.baseBurnKcal).toBe(2379);
    // 2379 * 0.75 = 1784, under the 1830 floor
    expect(t.budgetKcal).toBe(1830);
  });

  it("protein is 2 g per goal kg, with a 1.6 g per current kg minimum", () => {
    const a = computeTargets({ sex: "male", weightKg: 85, heightCm: 180, ageYears: 30, goalWeightKg: 78 });
    expect(a.proteinG).toBe(156);
    const b = computeTargets({ sex: "male", weightKg: 120, heightCm: 180, ageYears: 30, goalWeightKg: 80 });
    // 2.0 * 80 = 160, 1.6 * 120 = 192
    expect(b.proteinG).toBe(192);
  });

  it("exercise add-back is 50 percent of MET * kg * hours, rounded", () => {
    // football 7.0 * 85 kg * 1 h * 0.5 = 297.5 -> 298
    expect(activityKcal("football", 60, 85)).toBe(298);
    expect(activityKcal("gym", 45, 85)).toBe(Math.round(0.5 * 5 * 85 * 0.75));
    expect(activityKcal("walk", 30, 80)).toBe(70);
    expect(activityKcal("run", 30, 80)).toBe(160);
    expect(activityKcal("run", 30, 80, { fastRun: true })).toBe(Math.round(0.5 * 9.8 * 80 * 0.5));
    expect(activityKcal("circuit", 60, 80)).toBe(240);
    expect(activityKcal("stretch", 10, 80)).toBe(Math.round(0.5 * 2.3 * 80 * (10 / 60)));
    expect(activityKcal("cycling", 60, 80)).toBe(300);
    expect(activityKcal("other", 60, 80)).toBe(160);
  });

  it("exercise add-back is zero for bad input", () => {
    expect(activityKcal("gym", 0, 80)).toBe(0);
    expect(activityKcal("gym", 30, 0)).toBe(0);
  });

  it("day budget adds the burn and ignores negatives", () => {
    // The stored burn is the 50 percent add-back, so the full burn (596) is added to the limit.
    expect(dayBudget(1830, 298)).toBe(2426);
    expect(dayBudget(1830, -5)).toBe(1830);
  });

  it("new targets row when the 7-day average moves 1 kg", () => {
    expect(needsRetarget(90, 89.1)).toBe(false);
    expect(needsRetarget(90, 89)).toBe(true);
    expect(needsRetarget(90, 91.5)).toBe(true);
  });
});

describe("safety lines", () => {
  const base = { weeklyChangePct: [], recentEatenKcal: [], bmrKcal: 1830 };

  it("too fast: loss over 1.2 percent a week for 2 weeks", () => {
    expect(safetyKeys({ ...base, weeklyChangePct: [-1.3, -1.5] })).toEqual(["too_fast"]);
    expect(safetyKeys({ ...base, weeklyChangePct: [-1.3, -1.1] })).toEqual([]);
    expect(safetyKeys({ ...base, weeklyChangePct: [-1.5] })).toEqual([]);
    expect(safetyKeys({ ...base, weeklyChangePct: [-0.4, -1.3, -1.5] })).toEqual(["too_fast"]);
  });

  it("under floor: eaten under BMR 3 days running", () => {
    expect(safetyKeys({ ...base, recentEatenKcal: [1500, 1600, 1700] })).toEqual(["under_floor"]);
    expect(safetyKeys({ ...base, recentEatenKcal: [1500, 1900, 1700] })).toEqual([]);
    expect(safetyKeys({ ...base, recentEatenKcal: [1500, 1600] })).toEqual([]);
  });

  it("back pain note", () => {
    expect(safetyKeys({ ...base, noteText: "Lower back pain after squats" })).toEqual(["back_pain"]);
    expect(safetyKeys({ ...base, noteText: "legs felt heavy" })).toEqual([]);
    expect(safetyKeys({ ...base, noteText: "" })).toEqual([]);
  });

  it("returns several at once and the exact PRODUCT.md lines", () => {
    const keys = safetyKeys({
      weeklyChangePct: [-2, -2],
      recentEatenKcal: [1, 1, 1],
      bmrKcal: 1830,
      noteText: "sciatica again",
    });
    expect(keys).toEqual(["too_fast", "under_floor", "back_pain"]);
    expect(safetyLine("too_fast")).toBe(
      "Too fast. You are losing muscle with the fat. Add 200 kcal a day.",
    );
    expect(safetyLine("under_floor")).toBe("Under your floor 3 days. Eat. Hunger is not the goal.");
    expect(safetyLine("back_pain")).toBe(
      "Skip loaded hinges today. If pain runs down a leg or lasts over 2 weeks, see a physio.",
    );
  });
});

describe("adaptive budget", () => {
  const days = (n: number, kcal: number | null) =>
    Array.from({ length: n }, (_, i) => ({ day: `2026-09-${String(i + 1).padStart(2, "0")}`, kcal }));

  it("needs 14 days", () => {
    const r = adaptiveBudget({ days: days(13, 2300), trendStartKg: 90, trendEndKg: 89, currentBudgetKcal: 2000, bmrKcal: 1830 });
    expect(r).toEqual({ status: "not_enough_data", reason: "too_few_days" });
  });

  it("needs 80 percent of days logged", () => {
    const d = days(14, 2300).map((x, i) => (i < 4 ? { ...x, kcal: null } : x));
    const r = adaptiveBudget({ days: d, trendStartKg: 90, trendEndKg: 89, currentBudgetKcal: 2000, bmrKcal: 1830 });
    expect(r).toEqual({ status: "not_enough_data", reason: "too_few_logged" });
    const ok = days(14, 2300).map((x, i) => (i < 2 ? { ...x, kcal: null } : x));
    expect(
      adaptiveBudget({ days: ok, trendStartKg: 90, trendEndKg: 89, currentBudgetKcal: 2000, bmrKcal: 1830 }).status,
    ).toBe("ok");
  });

  it("real burn = avg in minus trend change * 7700 / days, budget = 75 percent", () => {
    const r = adaptiveBudget({ days: days(14, 2300), trendStartKg: 90, trendEndKg: 89, currentBudgetKcal: 2085, bmrKcal: 1830 });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.realBurnKcal).toBe(2850);
    expect(r.avgEatenKcal).toBe(2300);
    expect(r.newBudgetKcal).toBe(2138);
    expect(r.changeKcal).toBe(53);
    expect(r.capped).toBe(false);
    expect(r.atFloor).toBe(false);
  });

  it("caps the change at 150 kcal a week, up and down", () => {
    const up = adaptiveBudget({ days: days(14, 3000), trendStartKg: 90, trendEndKg: 90, currentBudgetKcal: 1900, bmrKcal: 1830 });
    expect(up.status === "ok" && up.newBudgetKcal).toBe(2050);
    expect(up.status === "ok" && up.capped).toBe(true);
    const down = adaptiveBudget({ days: days(14, 2000), trendStartKg: 90, trendEndKg: 90, currentBudgetKcal: 2300, bmrKcal: 1830 });
    expect(down.status === "ok" && down.newBudgetKcal).toBe(2150);
  });

  it("never goes below BMR", () => {
    const r = adaptiveBudget({ days: days(14, 1500), trendStartKg: 90, trendEndKg: 90, currentBudgetKcal: 1840, bmrKcal: 1830 });
    expect(r.status === "ok" && r.newBudgetKcal).toBe(1830);
    expect(r.status === "ok" && r.atFloor).toBe(true);
  });

  it("formats the plain line with thousands separators", () => {
    expect(groupThousands(2780)).toBe("2,780");
    expect(groupThousands(850)).toBe("850");
    const r = adaptiveBudget({ days: days(14, 2300), trendStartKg: 90, trendEndKg: 89, currentBudgetKcal: 2085, bmrKcal: 1830 });
    expect(adaptiveLine(r)).toBe("Your real burn is 2,850 kcal. Budget moved to 2,138.");
    const same = adaptiveBudget({ days: days(14, 2780), trendStartKg: 90, trendEndKg: 90, currentBudgetKcal: 2085, bmrKcal: 1830 });
    expect(adaptiveLine(same)).toBe("Your real burn is 2,780 kcal. Budget stays at 2,085.");
    expect(adaptiveLine({ status: "not_enough_data", reason: "too_few_days" })).toBeNull();
  });
});

describe("shopping list", () => {
  const r1: ShoppingRecipe = {
    id: "jollof",
    name: "Jollof chicken rice",
    ingredients: [
      { name: "Chicken breast", amount: 800, unit: "g", group: "Meat and fish" },
      { name: "Red pepper", amount: 2, unit: "", group: "Fruit and veg" },
      { name: "Onion", amount: 2, unit: "", group: "Fruit and veg" },
      { name: "Basmati rice", amount: 240, unit: "g", group: "Tins and dry" },
      { name: "Thyme", amount: 1, unit: "tsp", group: "Spices" },
    ],
  };
  const r2: ShoppingRecipe = {
    id: "yassa",
    name: "Chicken yassa",
    ingredients: [
      { name: "chicken breast ", amount: 800, unit: "g", group: "Meat and fish" },
      { name: "Onion", amount: 8, unit: "", group: "Fruit and veg" },
      { name: "Basmati rice", amount: 240, unit: "g", group: "Tins and dry" },
      { name: "Yoghurt", amount: 150.25, unit: "g", group: "Dairy" },
    ],
  };

  it("merges the same ingredient across recipes and scales by batches", () => {
    const list = buildShoppingList([{ recipe: r1 }, { recipe: r2, batches: 2 }]);
    const meat = list.find((g) => g.group === "Meat and fish");
    expect(meat?.items).toHaveLength(1);
    expect(meat?.items[0]?.amount).toBe(2400);
    expect(meat?.items[0]?.recipes).toEqual(["Jollof chicken rice", "Chicken yassa"]);
    const veg = list.find((g) => g.group === "Fruit and veg");
    expect(veg?.items.find((i) => i.name === "Onion")?.amount).toBe(18);
    const dairy = list.find((g) => g.group === "Dairy");
    expect(dairy?.items[0]?.amount).toBe(300.5);
  });

  it("groups in aisle order and drops empty groups", () => {
    const list = buildShoppingList([{ recipe: r1 }]);
    expect(list.map((g) => g.group)).toEqual(["Meat and fish", "Fruit and veg", "Tins and dry", "Spices"]);
    expect(list[1]?.items.map((i) => i.name)).toEqual(["Onion", "Red pepper"]);
  });

  it("keeps different units apart and handles the same recipe twice", () => {
    const rec: ShoppingRecipe = {
      id: "x",
      name: "X",
      ingredients: [
        { name: "Oil", amount: 2, unit: "tbsp", group: "Tins and dry" },
        { name: "Oil", amount: 100, unit: "ml", group: "Tins and dry" },
      ],
    };
    const list = buildShoppingList([{ recipe: rec }, { recipe: rec }]);
    expect(list[0]?.items).toHaveLength(2);
    expect(list[0]?.items[0]?.recipes).toEqual(["X"]);
  });

  it("empty picks give an empty list", () => {
    expect(buildShoppingList([])).toEqual([]);
  });

  it("picks 2 recipes, 3 with Thursday, and rotates so none repeats", () => {
    expect(picksNeeded(false)).toBe(2);
    expect(picksNeeded(true)).toBe(3);
    expect(suggestRecipes(["a", "b", "c", "d", "e"], ["a", "b"], 2)).toEqual(["c", "d"]);
    expect(suggestRecipes(["a", "b", "c"], ["a", "b"], 3)).toEqual(["c", "a", "b"]);
  });
});
