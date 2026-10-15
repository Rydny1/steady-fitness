"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveEntries } from "@/features/logging/actions";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

// Body log: weight, and waist and neck when you have them. One sheet, 10 seconds.
export function WeighIn({ day, openOnLoad }: { day: string; openOnLoad: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(openOnLoad);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    setOpen(openOnLoad);
  }, [openOnLoad]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = (k: string) => {
      const v = String(f.get(k) ?? "").trim().replace(",", ".");
      return v === "" ? null : Number(v);
    };
    const weight = n("weight");
    const waist = n("waist");
    const neck = n("neck");
    if (weight === null && waist === null && neck === null) {
      setError(copy.errors.invalid);
      return;
    }
    start(async () => {
      const res = await saveEntries({
        day,
        logId: null,
        source: "tap",
        items: [{ kind: "body", weight_kg: weight, waist_cm: waist, neck_cm: neck }],
      });
      if (res.ok) {
        setOpen(false);
        setError(null);
        router.replace("/progress");
        router.refresh();
      } else {
        setError(res.reason === "invalid" ? copy.errors.invalid : copy.errors.generic);
      }
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {copy.progress.weighIn}
      </Button>
      {open ? (
        <div role="dialog" aria-modal="true" aria-label={copy.progress.weighIn} className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
          <form onSubmit={submit} className="sheet w-full max-w-app rounded-t-hero bg-bg p-6">
            <h2 className="text-section font-bold tracking-[-0.3px]">{copy.progress.weighIn}</h2>
            <p className="mt-1 text-small text-muted">Morning, after the toilet, before food.</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(
                [
                  ["weight", "Weight, kg"],
                  ["waist", "Waist, cm"],
                  ["neck", "Neck, cm"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex flex-col gap-2">
                  <span className="text-[clamp(12px,3.59vw,13px)] font-semibold">{label}</span>
                  <input
                    name={k}
                    inputMode="decimal"
                    autoFocus={k === "weight"}
                    className="num h-[54px] rounded-ctl border-0 bg-card px-3 text-[clamp(20px,6.15vw,23px)]"
                  />
                </label>
              ))}
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-small text-danger">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" big onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" big disabled={pending} className="flex-1">
                Save
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
