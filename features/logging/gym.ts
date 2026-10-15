import type { DraftItem } from "./schema";

type Act = Extract<DraftItem, { kind: "activity" }>;

/**
 * One gym session, one entry. Exercises said as sets and reps become minutes; if the person
 * also said how long they were in the gym, that time wins and the exercises become the note.
 * "30 minutes in the gym, 4 sets of 30 abs" is one 30 minute session, not two.
 */
export function mergeGym(items: DraftItem[]): DraftItem[] {
  const isGym = (i: DraftItem): i is Act => i.kind === "activity" && i.activity_type === "gym";
  const gyms = items.filter(isGym);
  const strength = gyms.filter((g) => g.strength);
  if (strength.length === 0) return items;
  const explicit = gyms.filter((g) => !g.strength);
  const notes = strength.map((g) => g.note).filter((n): n is string => Boolean(n));
  const minutes = strength.reduce((s, g) => s + g.duration_min, 0);

  const merged: Act =
    explicit[0] !== undefined
      ? { ...explicit[0], note: [explicit[0].note, ...notes].filter(Boolean).join(", ") }
      : { ...strength[0]!, strength: false, duration_min: Math.max(5, Math.min(600, minutes)), note: notes.join(", ") };

  const out: DraftItem[] = [];
  let placed = false;
  for (const it of items) {
    if (isGym(it)) {
      if (!placed) {
        out.push(merged);
        placed = true;
      }
      continue;
    }
    out.push(it);
  }
  return out;
}
