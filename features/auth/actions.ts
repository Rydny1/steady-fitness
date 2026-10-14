"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/content/copy";

export type FormState = { error?: string; ok?: boolean };

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

export async function signIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  // Generic error, never reveal which field was wrong.
  if (!parsed.success) return { error: copy.login.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: copy.login.error };

  redirect("/today");
}

const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: copy.errors.invalid };

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";
  // Same answer whether or not the address has an account.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/auth/update-password`,
  });
  return { ok: true };
}

const passwordSchema = z.object({ password: z.string().min(12).max(200) });

export async function updatePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = passwordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: copy.login.updateSub };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: copy.errors.signedOut };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: copy.errors.generic };
  redirect("/today");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
