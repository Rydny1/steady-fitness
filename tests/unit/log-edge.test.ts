import { describe, expect, it } from "vitest";
import { quickParse } from "@/features/logging/quick-parse";
import { mergeGym } from "@/features/logging/gym";
import type { DraftItem } from "@/features/logging/schema";

const parse = (t: string) => {
  const r = quickParse(t);
  return { ...r, items: mergeGym(r.items) };
};
const acts = (t: string) => parse(t).items.filter((i): i is Extract<DraftItem, { kind: "activity" }> => i.kind === "activity");
const foods = (t: string) => parse(t).items.filter((i): i is Extract<DraftItem, { kind: "food" }> => i.kind === "food");

describe("activity phrasings", () => {
  const cases: [string, string, number][] = [
    ["ran 5 km in 30 minutes", "run", 30],
    ["ran 20 mins", "run", 20],
    ["I ran for about forty five minutes", "run", 45],
    ["walked twenty five minutes", "walk", 25],
    ["cycled for 1 hour", "cycling", 60],
    ["gym for 1h", "gym", 60],
    ["played football for an hour and a half", "football", 90],
    ["walked for a quarter of an hour", "walk", 15],
    ["did 10k steps", "walk", 90],
    ["went for a 3 mile run", "run", 32],
    ["RAN 4KM", "run", 27],
    ["jogged 5 kilometres", "run", 33],
    ["walked 10,000 steps", "walk", 90],
    ["ran for 1 hour 15 minutes", "run", 75],
    ["walked 1 and a half hours", "walk", 90],
  ];
  it.each(cases)("%s", (text, type, minutes) => {
    const a = acts(text);
    expect(a.length).toBe(1);
    expect(a[0]?.activity_type).toBe(type);
    expect(a[0]?.duration_min).toBe(minutes);
  });
});

describe("strength phrasings", () => {
  it.each([
    ["push ups 3 sets of 15", "push"],
    ["3x10 squats", "squats 3x10"],
    ["squats 3 x 10", "squats 3x10"],
    ["5 sets of 5 deadlifts at 100kg", "100 kg"],
    ["did pull-ups", "assumed"],
    ["I did some push-ups", "assumed"],
  ])("%s", (text, note) => {
    const a = acts(text);
    expect(a.length).toBe(1);
    expect(a[0]?.activity_type).toBe("gym");
    expect(a[0]?.note ?? "").toContain(note);
  });
});

describe("foods", () => {
  it("grams without a space, words, decimals", () => {
    expect(foods("200g chicken breast")[0]?.grams).toBe(200);
    expect(foods("200 grams of rice")[0]?.grams).toBe(200);
    expect(foods("0.5 l milk")[0]?.grams).toBe(500);
    expect(foods("a banana")[0]?.basis).toBe("database");
    expect(foods("3 slices of bread")[0]?.basis).toBe("database");
  });
  it("a list of foods", () => {
    expect(foods("2 eggs, toast and a banana").length).toBeGreaterThanOrEqual(2);
  });
});

describe("negation and fasting", () => {
  it("'no sugar in my coffee' does not log sugar", () => {
    expect(foods("no sugar in my coffee").some((f) => /sugar/i.test(f.name))).toBe(false);
  });
  it("'I didn't have breakfast' logs no food", () => {
    expect(foods("I didn't have breakfast").length).toBe(0);
  });
  it("'without cheese' is not cheese", () => {
    expect(foods("burger without cheese").some((f) => /cheese/i.test(f.name))).toBe(false);
  });
  it("fasting", () => {
    expect(foods("I fasted today")[0]?.name).toBe("Fasting");
    expect(foods("water fast all day")[0]?.name).toBe("Fasting");
    expect(foods("had fast food").some((f) => f.name === "Fasting")).toBe(false);
  });
});

describe("a day told as a story", () => {
  it("takes what it can and hands back the rest", () => {
    const r = parse("Woke up late, ran 5k, had 2 eggs and toast, then gym for an hour");
    expect(r.items.filter((i) => i.kind === "activity").length).toBe(2);
    expect(r.items.filter((i) => i.kind === "food").length).toBeGreaterThanOrEqual(1);
    expect(r.leftover.join(" ")).toContain("woke up");
  });
  it("empty and nonsense do not crash", () => {
    expect(parse("").items).toEqual([]);
    expect(parse("   ").items).toEqual([]);
    expect(parse("asdf qwer").items).toEqual([]);
    expect(parse("😀😀").items).toEqual([]);
  });
  it("very long input stays bounded", () => {
    const r = parse("ran 5 km, ".repeat(300));
    expect(r.items.length).toBeLessThanOrEqual(300);
  });
});

describe("things the live run found", () => {
  it("a whole pizza is not one slice: the AI judges size words", () => {
    const r = parse("ate a whole pizza");
    expect(r.items.length).toBe(0);
    expect(r.leftover.length).toBe(1);
  });
  it("each way counts twice", () => {
    expect(acts("walked to work 20 minutes each way")[0]?.duration_min).toBe(40);
    expect(acts("walked 15 minutes there and back")[0]?.duration_min).toBe(30);
  });
  it("lunch was ..., dinner just ... are read", () => {
    const r = parse("lunch was rice, dinner just a banana");
    expect(r.items.filter((i) => i.kind === "food").length).toBe(2);
    expect(r.leftover).toEqual([]);
  });
  it("a bare time after the sets is the gym session", () => {
    const r = parse("did legs: 4 sets squats at 80kg, 3 sets leg press, about 50 mins");
    const g = r.items.filter((i) => i.kind === "activity");
    expect(g.length).toBe(1);
    expect(g[0]?.kind === "activity" && g[0].duration_min).toBe(50);
    expect(r.leftover).toEqual([]);
  });
  it("a rest day is dropped quietly", () => {
    const r = parse("no gym today, just stretched 15 minutes");
    expect(r.leftover).toEqual([]);
    expect(r.items.length).toBe(1);
  });
});
