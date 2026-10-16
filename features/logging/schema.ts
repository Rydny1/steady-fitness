import { z } from "zod";

// Parsed log (PRODUCT.md > Gemini parse prompt). Used as the Gemini response
// schema and again to validate whatever comes back. Never trust model output.

export const activityTypes = [
  "football",
  "run",
  "gym",
  "circuit",
  "walk",
  "stretch",
  "cycling",
  "other",
] as const;

export const sessionKeys = [
  "gym_a",
  "gym_b",
  "gym_c",
  "run",
  "run_intervals",
  "football",
  "stretch",
] as const;

const num = z.number().finite();

/** What kind of thing it is. Used only to sanity-check the model's own calorie guess. */
export const foodCategories = ["dish", "soup_stew", "meat_fish", "grain_starch", "produce", "dairy_egg", "snack_sweet", "drink", "fat_oil"] as const;

export const parsedItemSchema = z.object({
  kind: z.enum(["food", "activity", "body", "note"]),
  name: z.string().max(120),
  quantity: num.nullable(),
  unit: z.string().max(16).nullable(),
  /** Weight eaten in grams (millilitres for drinks). The numbers are computed from this. */
  grams: num.nullable(),
  category: z.enum(foodCategories).nullable(),
  kcal: num.nullable(),
  protein_g: num.nullable(),
  activity_type: z.enum(activityTypes).nullable(),
  duration_min: num.nullable(),
  /** Said as a distance, steps or a pace instead of a time. Code turns these into minutes. */
  distance_km: num.nullable(),
  steps: num.nullable(),
  pace_min_per_km: num.nullable(),
  /** Strength: "4 sets of 8 bench press at 60 kg". Code turns these into minutes. */
  sets: num.nullable(),
  reps: num.nullable(),
  load_kg: num.nullable(),
  /** For an activity we have no table for: the AI's estimate of how hard it is (MET), and a typical duration if none was said. */
  met: num.nullable(),
  assumed_duration_min: num.nullable(),
  session_key: z.enum(sessionKeys).nullable(),
  body: z
    .object({
      weight_kg: num.nullable(),
      waist_cm: num.nullable(),
      neck_cm: num.nullable(),
    })
    .nullable(),
  confidence: num.min(0).max(1),
});

export const parseResultSchema = z.object({
  items: z.array(parsedItemSchema).max(30),
  unclear: z.array(z.string().max(200)).max(20),
});

export type ParsedItem = z.infer<typeof parsedItemSchema>;
export type ParseResult = z.infer<typeof parseResultSchema>;

// What the confirm sheet edits and saveEntries accepts. Stricter than the
// model output: ranges match the database CHECK constraints.
export const draftFoodSchema = z.object({
  kind: z.literal("food"),
  name: z.string().trim().min(1).max(80),
  quantity: z.number().positive().max(99999).nullable(),
  unit: z.string().trim().max(16).nullable(),
  kcal: z.number().int().min(0).max(5000),
  protein_g: z.number().min(0).max(300),
  confidence: z.number().min(0).max(1).nullable(),
  /** Where the numbers came from: your saved food, the verified table, or the model's guess. */
  basis: z.enum(["database", "saved", "estimate", "label"]).optional(),
  grams: z.number().min(0).max(5000).nullable().optional(),
  per100: z
    .object({ kcal: z.number().min(0).max(900), protein: z.number().min(0).max(100) })
    .nullable()
    .optional(),
});

export const draftActivitySchema = z.object({
  kind: z.literal("activity"),
  activity_type: z.enum(activityTypes),
  session_key: z.enum(sessionKeys).nullable(),
  duration_min: z.number().int().min(1).max(600),
  rpe: z.number().int().min(1).max(10).nullable(),
  /** Known speed in km/h, when a distance or pace was given. Makes the burn more exact. */
  speed_kmh: z.number().min(1).max(45).nullable().optional(),
  /** How the minutes were worked out, for display only. */
  note: z.string().max(100).nullable().optional(),
  /** Minutes were worked out from sets and reps (merged into one gym entry on read). */
  strength: z.boolean().optional(),
  /** The person's own name for it, when it is not one of the standard types. */
  label: z.string().max(40).nullable().optional(),
  /** MET override for things like hiking. */
  met: z.number().min(1).max(20).nullable().optional(),
});

export const draftBodySchema = z.object({
  kind: z.literal("body"),
  weight_kg: z.number().min(35).max(300).nullable(),
  waist_cm: z.number().min(40).max(200).nullable(),
  neck_cm: z.number().min(20).max(70).nullable(),
});

export const draftItemSchema = z.discriminatedUnion("kind", [
  draftFoodSchema,
  draftActivitySchema,
  draftBodySchema,
]);

export type DraftItem = z.infer<typeof draftItemSchema>;
export type DraftFood = z.infer<typeof draftFoodSchema>;
export type DraftActivity = z.infer<typeof draftActivitySchema>;
export type DraftBody = z.infer<typeof draftBodySchema>;

export const saveEntriesSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  logId: z.uuid().nullable(),
  source: z.enum(["voice", "text", "tap", "photo", "saved", "barcode"]),
  items: z.array(draftItemSchema).min(1).max(30),
});

export type SaveEntriesInput = z.infer<typeof saveEntriesSchema>;
