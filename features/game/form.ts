// Form bands from Callus (GAME.md > Form).
import { FORM_BANDS } from "./config";

export type FormKey = (typeof FORM_BANDS)[number]["key"];
export type FormName = (typeof FORM_BANDS)[number]["name"];

export type Form = { key: FormKey; name: FormName };

/** Form band for a Callus value (clamped to 0-100 first). */
export function formFor(callus: number): Form {
  const c = Math.max(0, Math.min(100, callus));
  let found: Form = { key: FORM_BANDS[0].key, name: FORM_BANDS[0].name };
  for (const band of FORM_BANDS) {
    if (c >= band.from) found = { key: band.key, name: band.name };
  }
  return found;
}

/** Index of the Coach line to show for a band: rotates by day number. */
export function formLineIndex(lineCount: number, dayNumber: number): number {
  if (lineCount <= 0) return 0;
  return ((Math.floor(dayNumber) % lineCount) + lineCount) % lineCount;
}
