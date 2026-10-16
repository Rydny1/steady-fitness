"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { passwordRule } from "@/lib/password";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimSignupSlot } from "@/lib/signup";
import { env } from "@/lib/env";
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

const passwordSchema = z.object({ password: passwordRule });

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

const signUpSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: passwordRule,
    confirm: z.string().max(200),
    agree: z.literal("on"),
  })
  .refine((v) => v.password === v.confirm);

/**
 * Normal sign-up: email and a password (6+ characters, a number, a capital), explicit consent for health data
 * (GDPR Art. 9). Created confirmed (no email round trip yet), limited to 5 new accounts an hour
 * per address, then signed in. Two-step sign-in is set up on the next screen.
 */
export async function createAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
    agree: formData.get("agree"),
  });
  if (!parsed.success) return { error: copy.login.signupInvalid };
  if (!(await claimSignupSlot())) return { error: copy.errors.tooFast };

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    // The database only accepts accounts that carry this token (checked against Vault), so the
    // public Auth endpoint cannot be used to skip the password rule, consent or the rate guard.
    user_metadata: {
      steady_signup_token: env().SIGNUP_TOKEN,
      consent_health_data_at: new Date().toISOString(),
      consent_version: 1,
    },
  });
  if (error || !created.user) return { error: copy.login.signupTaken };
  // The token has done its job. Remove it so it never sits in the user's own metadata.
  await admin.auth.admin.updateUserById(created.user.id, {
    user_metadata: { steady_signup_token: null },
  });

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInError) return { error: copy.login.error };
  redirect("/today");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
