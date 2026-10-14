import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayRiga } from "@/lib/dates";
import type { Row } from "@/lib/supabase/types";

export type Profile = Row<"profiles">;

/** Verified user for this request, or redirect to /login. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
});

/** User plus profile. No profile yet means onboarding. */
export const requireProfile = cache(async () => {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");
  return { supabase, user, profile, today: todayRiga() };
});
