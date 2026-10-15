import { describe, expect, it } from "vitest";
import { budgetFactorFor, dayBurn, goalFor, kgFromNet, netKcal, readBalance, signed } from "@/features/nutrition/energy";
import { computeTargets } from "@/features/nutrition/targets";

describe("energy balance", () => {
  it("reads the goal from where you are and where you want to be", () => {
    expect(goalFor(85, 75)).toBe("lose");
    expect(goalFor(60, 68)).toBe("gain");
    expect(goalFor(75, 75.5)).toBe("maintain");
    expect(goalFor(null, 70)).toBe("lose");
  });

  it("burn is resting x 1.3 plus the full exercise burn", () => {
    expect(dayBurn(1800, 0)).toBe(2340);
    // The stored add-back is half of the full burn, so 200 stored is 400 burned.
    expect(dayBurn(1800, 200)).toBe(2740);
  });

  it("net is eaten minus burned, and 7700 kcal is about a kilo", () => {
    expect(netKcal(2000, 2740)).toBe(-740);
    expect(kgFromNet(-7700)).toBe(-1);
    expect(kgFromNet(-3850)).toBe(-0.5);
  });

  it("the bigger the deficit the better for a loss goal, until it is too big", () => {
    expect(readBalance("lose", -600).tone).toBe("good");
    expect(readBalance("lose", -250).tone).toBe("okay");
    expect(readBalance("lose", 100).tone).toBe("off");
    expect(readBalance("lose", -1200).label).toMatch(/protein/);
  });

  it("a gain goal wants a surplus and a maintain goal wants zero", () => {
    expect(readBalance("gain", 300).tone).toBe("good");
    expect(readBalance("gain", -100).tone).toBe("off");
    expect(readBalance("maintain", 50).tone).toBe("good");
    expect(readBalance("maintain", -400).tone).toBe("okay");
  });

  it("formats signed numbers", () => {
    expect(signed(-1234.4)).toBe("-1,234");
    expect(signed(250)).toBe("+250");
    expect(signed(0)).toBe("0");
  });

  it("budget moves with the goal", () => {
    const base = { sex: "male" as const, weightKg: 70, heightCm: 178, ageYears: 30 };
    const lose = computeTargets({ ...base, goalWeightKg: 65 });
    const maintain = computeTargets({ ...base, goalWeightKg: 70 });
    const gain = computeTargets({ ...base, goalWeightKg: 78 });
    expect(budgetFactorFor("gain")).toBeGreaterThan(budgetFactorFor("maintain"));
    expect(gain.budgetKcal).toBeGreaterThan(maintain.budgetKcal);
    expect(maintain.budgetKcal).toBeGreaterThan(lose.budgetKcal - 1);
    // A loss goal never goes below resting burn.
    expect(lose.budgetKcal).toBeGreaterThanOrEqual(lose.bmrKcal);
  });
});
