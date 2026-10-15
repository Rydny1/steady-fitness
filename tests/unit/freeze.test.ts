import { describe, expect, it } from "vitest";
import { canFreeze, freezesLeft } from "@/features/game/freeze";

describe("streak freeze", () => {
  it("two a month, counted over the last 30 days", () => {
    expect(freezesLeft([], "2026-10-16")).toBe(2);
    expect(freezesLeft(["2026-10-01"], "2026-10-16")).toBe(1);
    expect(freezesLeft(["2026-10-01", "2026-10-10"], "2026-10-16")).toBe(0);
    expect(freezesLeft(["2026-09-01", "2026-10-10"], "2026-10-16")).toBe(1);
  });
  it("refuses a second freeze today, a third in the month, or without the Callus", () => {
    expect(canFreeze(["2026-10-16"], "2026-10-16", 60)).toEqual({ ok: false, reason: "already" });
    expect(canFreeze(["2026-10-01", "2026-10-10"], "2026-10-16", 60)).toEqual({ ok: false, reason: "none_left" });
    expect(canFreeze([], "2026-10-16", 5)).toEqual({ ok: false, reason: "low_callus" });
    expect(canFreeze([], "2026-10-16", 60)).toEqual({ ok: true });
  });
});
