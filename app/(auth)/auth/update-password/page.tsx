"use client";

import { useActionState } from "react";
import { updatePassword, type FormState } from "@/features/auth/actions";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { PASSWORD_HINT, PASSWORD_MIN, PASSWORD_PATTERN } from "@/lib/password";

const initial: FormState = {};

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col justify-center px-6 py-10">
      <h1 className="text-[clamp(29px,8.72vw,32px)] font-bold leading-[1.1] tracking-[-0.8px]">
        {copy.login.updateTitle}
      </h1>
      <p className="mt-3 text-body text-muted">{copy.login.updateSub}</p>
      <form action={action} className="mt-8 flex flex-col gap-4">
        <PasswordField
          label={copy.login.password}
          name="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          pattern={PASSWORD_PATTERN}
          title={PASSWORD_HINT}
          required
        />
        {state.error ? (
          <p role="alert" className="text-small text-danger">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" big disabled={pending} className="w-full">
          {copy.login.updateSubmit}
        </Button>
      </form>
    </main>
  );
}
