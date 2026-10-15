import { describe, expect, it } from "vitest";
import { quickParse } from "@/features/logging/quick-parse";
import { mergeGym } from "@/features/logging/gym";
import { activityKcal } from "@/features/nutrition/targets";

const acts = (t: string) => mergeGym(quickParse(t).items).filter((i) => i.kind === "activity");

describe("gym and hiking", () => {
  it("did bench press: accepted, sets assumed", () => {
    const r = quickParse("I did bench press");
    expect(r.leftover).toEqual([]);
    const a = r.items[0];
    expect(a?.kind === "activity" && a.note).toContain("assumed");
  });
  it("sets of reps, several exercises, one gym entry", () => {
    const r = quickParse("I did 4 sets of 30 abs and 4 sets of 4 pullups");
    expect(r.leftover).toEqual([]);
    const merged = acts("I did 4 sets of 30 abs and 4 sets of 4 pullups");
    expect(merged.length).toBe(1);
    const g = merged[0];
    expect(g?.kind === "activity" && g.activity_type).toBe("gym");
    expect(g?.kind === "activity" && g.note).toContain("abs 4x30");
    expect(g?.kind === "activity" && g.note).toContain("pullups 4x4");
  });
  it("a stated gym time wins over the sets", () => {
    const m = acts("in the gym for 30 minutes, 4 sets of 30 abs and 4 sets of 4 pullups");
    expect(m.length).toBe(1);
    const g = m[0];
    expect(g?.kind === "activity" && g.duration_min).toBe(30);
    expect(g?.kind === "activity" && g.note).toContain("abs");
  });
  it("bench press 4x8 at 60 kg", () => {
    const g = acts("bench press 4x8 at 60 kg")[0];
    expect(g?.kind === "activity" && g.note).toContain("bench press 4x8 at 60 kg");
  });
  it("hiking 15 km is a long, hard walk", () => {
    const h = acts("went hiking 15 km")[0];
    expect(h?.kind === "activity" && h.activity_type).toBe("walk");
    expect(h?.kind === "activity" && h.duration_min).toBe(225);
    expect(h?.kind === "activity" && h.met).toBe(6);
    // 90 kg for 3.75 h at MET 6, stored as the 50 percent add-back
    expect(activityKcal("walk", 225, 90, { met: 6 })).toBe(1013);
  });
});
