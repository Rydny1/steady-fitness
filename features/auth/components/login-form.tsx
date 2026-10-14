"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type FormState } from "../actions";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

const initial: FormState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);
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
        <Field
          label={copy.login.password}
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.error ? (
        <p role="alert" className="mt-3 text-small text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" big disabled={pending} className="mt-6 w-full">
        {copy.login.submit}
      </Button>
      <Link
        href="/auth/forgot-password"
        className="mt-4 flex min-h-11 items-center justify-center self-center px-3 text-small text-muted"
      >
        {copy.login.forgot}
      </Link>
    </form>
  );
}
