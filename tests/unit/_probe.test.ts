import { it } from "vitest";
import { appendFileSync } from "node:fs";
import { matchFood } from "@/features/nutrition/food-match";
it("probe", () => {
  for (const n of ["greek yogurt", "Greek-style yogurt", "plain greek yoghurt", "yogurt (greek)", "natural greek yogurt 400g", "high protein greek yogurt", "strained yogurt", "yogurt", "whole milk greek yogurt", "skyr", "protein yogurt", "greek yogurt, plain", "milbona high protein yogurt"]) {
    const m = matchFood(n);
    appendFileSync("probe.out", `${n} => ${m?.food.id ?? "NO MATCH"} ${m?.score.toFixed(2) ?? ""} ${m?.food.per100.protein ?? ""}\n`);
  }
});
