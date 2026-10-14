"use client";

import { useActionState } from "react";
import { updatePassword, type FormState } from "@/features/auth/actions";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

const initial: FormState = {};

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col justify-center px-6 py-10">
      <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.8px]">
        {copy.login.updateTitle}
      </h1>
      <p className="mt-3 text-body text-muted">{copy.login.updateSub}</p>
      <form action={action} className="mt-8 flex flex-col gap-4">
        <Field
          label={copy.login.password}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
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
