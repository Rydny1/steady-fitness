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
    // The deficit you choose wins: 1,000 a day sits well under the base burn.
    const chosen = computeTargets({ ...base, goalWeightKg: 65, netKcal: -1000 });
    expect(chosen.baseBurnKcal - chosen.budgetKcal).toBe(1000);
  });
});

import { budgetStatus, fullBurn } from "@/features/nutrition/energy";

describe("budget is a ceiling", () => {
  it("says how much more fits when under", () => {
    const s = budgetStatus(1200, 1500, 14);
    expect(s.tone).toBe("good");
    expect(s.text).toContain("300 kcal more");
  });
  it("flags going over", () => {
    expect(budgetStatus(1700, 1500, 14).tone).toBe("over");
  });
  it("flags eating far too little late in the day, not in the morning", () => {
    expect(budgetStatus(500, 1500, 20).tone).toBe("low");
    expect(budgetStatus(500, 1500, 9).tone).toBe("good");
  });
  it("shows the full exercise burn, double the stored add-back", () => {
    expect(fullBurn(329)).toBe(658);
  });
});

import { deficitStatus } from "@/features/nutrition/energy";

describe("deficit status", () => {
  it("says how much more you can eat while ahead of the target", () => {
    expect(deficitStatus(-1340, -1200, "lose", 1000, 2000, 14).text).toBe("Eat up to 140 more.");
  });
  it("says how far over you are when the deficit is short", () => {
    const s = deficitStatus(-1000, -1200, "lose", 2200, 2000, 14);
    expect(s.tone).toBe("over");
    expect(s.text).toBe("200 over target.");
  });
  it("works for gaining: eat more until the surplus is there", () => {
    expect(deficitStatus(100, 300, "gain", 2000, 2800, 14).text).toBe("Eat 200 more.");
    expect(deficitStatus(400, 300, "gain", 3000, 2800, 14).text).toBe("Target hit.");
  });
  it("flags eating far too little late in the day", () => {
    expect(deficitStatus(-1900, -1200, "lose", 500, 2000, 20).tone).toBe("low");
  });
});
