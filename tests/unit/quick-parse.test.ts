import { describe, expect, it } from "vitest";
import { quickParse } from "@/features/logging/quick-parse";

const acts = (t: string) => quickParse(t).items.filter((i) => i.kind === "activity");

describe("quickParse", () => {
  it("I ran four kilometers: no AI needed", () => {
    const r = quickParse("I ran four kilometers");
    expect(r.leftover).toEqual([]);
    const a = r.items[0];
    expect(a?.kind).toBe("activity");
    if (a?.kind === "activity") {
      expect(a.activity_type).toBe("run");
      expect(a.duration_min).toBe(27);
    }
  });
  it("steps", () => {
    const a = acts("I walked 5000 steps")[0];
    expect(a?.kind === "activity" && a.duration_min).toBe(45);
    const k = acts("did 8k steps")[0];
    expect(k?.kind === "activity" && k.activity_type).toBe("walk");
  });
  it("time and sport", () => {
    const a = acts("played football for 60 minutes")[0];
    expect(a?.kind === "activity" && a.duration_min).toBe(60);
    expect(acts("gym for an hour")[0]?.kind === "activity").toBe(true);
    const b = acts("ran for 1 hour 30 minutes")[0];
    expect(b?.kind === "activity" && b.duration_min).toBe(90);
  });
  it("a pace and a distance", () => {
    const a = acts("ran 5k at 6:00/km")[0];
    expect(a?.kind === "activity" && a.duration_min).toBe(30);
  });
  it("narrates a whole day", () => {
    const r = quickParse("I walked 5000 steps, played football for 45 minutes and had two boiled eggs");
    expect(r.items.length).toBe(3);
    expect(r.leftover).toEqual([]);
    const egg = r.items.find((i) => i.kind === "food");
    expect(egg?.kind === "food" && egg.basis).toBe("database");
  });
  it("food with grams", () => {
    const f = quickParse("200 g cooked rice").items[0];
    expect(f?.kind === "food" && f.grams).toBe(200);
  });
  it("hands unknown things to the AI", () => {
    const r = quickParse("ran 4 km and ate a plate of zzqx blorp");
    expect(r.items.length).toBe(1);
    expect(r.leftover.length).toBe(1);
  });
});
