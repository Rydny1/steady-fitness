import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Per-request server client (publishable key, user cookies).
 * Never cache it in a module-level variable.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component. The proxy refreshes sessions.
          }
        },
      },
    },
  );
}

/** Verified user (hits Supabase Auth), or null. Never trust getSession alone. */
export async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

type Db = Awaited<ReturnType<typeof createClient>>;

/**
 * The signed-in user, read from the token's signed claims: no round trip to Supabase on every tap,
 * and the session is refreshed here if the token has run out (server actions may set cookies).
 * Same shape as auth.getUser(), so call sites barely change.
 */
export async function getUserFast(supabase: Db): Promise<{ data: { user: { id: string; email: string | null } | null } }> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return { data: { user: null } };
  return { data: { user: { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null } } };
}
