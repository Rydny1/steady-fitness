import { describe, expect, it } from "vitest";
import { collapseRepeats, mergeSegments } from "@/features/logging/speech";

describe("speech cleanup", () => {
  it("collapses growing copies from a phone", () => {
    expect(mergeSegments(["I", "I walked", "I walked 60", "I walked 60 minutes"])).toBe("I walked 60 minutes");
  });
  it("keeps genuinely new segments", () => {
    expect(mergeSegments(["I walked 60 minutes", "and ran 3 km"])).toBe("I walked 60 minutes and ran 3 km");
  });
  it("drops repeated phrases", () => {
    expect(collapseRepeats("walked 60 minutes walked 60 minutes walked 60 minutes")).toBe("walked 60 minutes");
    expect(collapseRepeats("2 eggs and 2 eggs")).toBe("2 eggs and 2 eggs");
  });
});
