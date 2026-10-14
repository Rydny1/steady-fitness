import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Browser client: publishable key only. Used for login MFA steps and
// photo upload to Storage. All other writes go through server actions.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
