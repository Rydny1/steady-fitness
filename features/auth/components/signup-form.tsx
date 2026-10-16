"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createAccount, type FormState } from "../actions";
import { Field } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { PASSWORD_HINT, PASSWORD_MIN, PASSWORD_PATTERN } from "@/lib/password";

const initial: FormState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(createAccount, initial);
  return (
    <form action={action} className="mt-9 flex flex-col">
      <div className="flex flex-col gap-[14px]">
        <Field
          label={copy.login.email}
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
        />
        <PasswordField
          label={copy.login.password}
          name="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          pattern={PASSWORD_PATTERN}
          title={PASSWORD_HINT}
          required
        />
        <p className="-mt-2 text-caption text-muted">{PASSWORD_HINT}</p>
        <PasswordField
          label={copy.login.confirm}
          name="confirm"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          required
        />
      </div>
      <label className="mt-4 flex items-start gap-3">
        <input type="checkbox" name="agree" required className="mt-1 h-6 w-6 flex-none accent-fuel" />
        <span className="text-small text-ink-2">
          {copy.login.agree}{" "}
          <Link href="/privacy" className="font-semibold underline">
            {copy.login.privacyLink}
          </Link>
        </span>
      </label>
      {state.error ? (
        <p role="alert" className="mt-3 text-small text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" big disabled={pending} className="mt-6 w-full">
        {copy.login.signupSubmit}
      </Button>
      <Link
        href="/login"
        className="mt-4 flex min-h-11 items-center justify-center self-center px-3 text-small text-muted"
      >
        {copy.login.haveAccount}
      </Link>
    </form>
  );
}
