"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

type Mode =
  | { kind: "loading" }
  | { kind: "challenge"; factorId: string }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "failed" };

// Handles both cases: enrol an authenticator app the first time, or ask for
// the 6-digit code on later sign-ins. Proxy sends every aal1 session here.
export function MfaPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (listError || !data) return setMode({ kind: "failed" });

      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) return setMode({ kind: "challenge", factorId: verified.id });

      // Clear half-finished enrolments before starting a new one.
      for (const f of data.all.filter((x) => x.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Steady",
      });
      if (cancelled) return;
      if (enrollError || !enrolled) return setMode({ kind: "failed" });
      setMode({
        kind: "enroll",
        factorId: enrolled.id,
        qr: enrolled.totp.qr_code,
        secret: enrolled.totp.secret,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode.kind !== "challenge" && mode.kind !== "enroll") return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mode.factorId,
      code: code.trim(),
    });
    setBusy(false);
    if (verifyError) {
      setError(copy.mfa.error);
      setCode("");
      return;
    }
    router.replace("/today");
    router.refresh();
  }

  if (mode.kind === "loading") {
    return <div className="mt-8 h-40 rounded-hero bg-card" aria-hidden="true" />;
  }
  if (mode.kind === "failed") {
    return (
      <p role="alert" className="mt-8 text-small text-danger">
        {copy.errors.generic}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
      {mode.kind === "enroll" ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mode.qr}
            alt="Authenticator setup code"
            width={200}
            height={200}
            className="self-center rounded-tile bg-white"
          />
          <p className="text-center text-caption text-muted">
            {copy.mfa.secretLabel}: <span className="num text-ink">{mode.secret}</span>
          </p>
        </>
      ) : null}
      <Field
        label={copy.mfa.codeLabel}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        required
      />
      {error ? (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" big disabled={busy || code.length !== 6} className="w-full">
        {copy.mfa.verify}
      </Button>
    </form>
  );
}
