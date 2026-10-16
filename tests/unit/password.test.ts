import { describe, expect, it } from "vitest";
import { passwordRule, PASSWORD_PATTERN } from "@/lib/password";

describe("password rule", () => {
  it("6 characters with a number and a capital is enough", () => {
    expect(passwordRule.safeParse("Abcde1").success).toBe(true);
    expect(passwordRule.safeParse("steady7Go").success).toBe(true);
  });
  it("rejects short, no number, no capital", () => {
    expect(passwordRule.safeParse("Ab1").success).toBe(false);
    expect(passwordRule.safeParse("abcdef1").success).toBe(false);
    expect(passwordRule.safeParse("Abcdefg").success).toBe(false);
  });
  it("the browser pattern agrees", () => {
    const re = new RegExp("^" + PASSWORD_PATTERN + "$");
    expect(re.test("Abcde1")).toBe(true);
    expect(re.test("abcde1")).toBe(false);
  });
});
