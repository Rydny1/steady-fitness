"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type FormState } from "@/features/auth/actions";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

const initial: FormState = {};

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col justify-center px-6 py-10">
      <h1 className="text-[clamp(29px,8.72vw,32px)] font-bold leading-[1.1] tracking-[-0.8px]">
        {copy.login.forgotTitle}
      </h1>
      <p className="mt-3 text-body text-muted">{copy.login.forgotSub}</p>
      <form action={action} className="mt-8 flex flex-col gap-4">
        <Field label={copy.login.email} name="email" type="email" autoComplete="email" required />
        {state.error ? (
          <p role="alert" className="text-small text-danger">
            {state.error}
          </p>
        ) : null}
        {state.ok ? <p className="text-small text-fuel">{copy.login.forgotSent}</p> : null}
        <Button type="submit" big disabled={pending} className="w-full">
          {copy.login.forgotSubmit}
        </Button>
      </form>
      <Link href="/login" className="mt-4 flex min-h-11 items-center justify-center text-small text-muted">
        {copy.login.submit}
      </Link>
    </main>
  );
}
