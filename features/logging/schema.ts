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

export const parsedItemSchema = z.object({
  kind: z.enum(["food", "activity", "body", "note"]),
  name: z.string().max(120),
  quantity: num.nullable(),
  unit: z.string().max(16).nullable(),
  kcal: num.nullable(),
  protein_g: num.nullable(),
  activity_type: z.enum(activityTypes).nullable(),
  duration_min: num.nullable(),
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
});

export const draftActivitySchema = z.object({
  kind: z.literal("activity"),
  activity_type: z.enum(activityTypes),
  session_key: z.enum(sessionKeys).nullable(),
  duration_min: z.number().int().min(1).max(600),
  rpe: z.number().int().min(1).max(10).nullable(),
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
