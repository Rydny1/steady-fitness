import { it, vi } from "vitest";
import { appendFileSync, readFileSync } from "node:fs";

vi.mock("server-only", () => ({}));

// Throwaway live check against Gemini. Reads the key from .env.local, never prints it.
it("live parse", { timeout: 120000 }, async () => {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  const { parseLog } = await import("@/lib/ai/gemini");
  const { resolveActivity } = await import("@/features/nutrition/activity");
  for (const text of [
    "I ran four kilometers",
    "I walked 5000 steps, then 45 minutes of football, and had two boiled eggs",
    "ran 5k in 27 minutes this morning",
  ]) {
    const r = await parseLog(text, "2026-10-15");
    appendFileSync("live.out", `\n# ${text}\n${JSON.stringify(r.ok ? { model: r.model, items: r.data.items.map((i) => ({ kind: i.kind, name: i.name, type: i.activity_type, dur: i.duration_min, km: i.distance_km, steps: i.steps, pace: i.pace_min_per_km, resolved: i.kind === "activity" && i.activity_type ? resolveActivity({ type: i.activity_type, durationMin: i.duration_min, distanceKm: i.distance_km, steps: i.steps, paceMinPerKm: i.pace_min_per_km }) : null })), unclear: r.data.unclear } : r)}\n`);
  }
});
