import "server-only";
import { z } from "zod";

// Zod-checked env. Server only: a client import fails the build.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  SUPABASE_SECRET_KEY: z.string().min(10),
  GEMINI_API_KEY: z.string().min(10),
  GEMINI_MODEL: z.string().min(3),
  GEMINI_FALLBACK_MODELS: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(20),
  VAPID_PRIVATE_KEY: z.string().min(20),
  VAPID_SUBJECT: z.string().startsWith("mailto:"),
  CRON_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.url(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Names only. Never print values.
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment: ${names}`);
  }
  cached = parsed.data;
  return cached;
}
