"use client";

import { useState, useTransition } from "react";
import { saveCheckin } from "../actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { copy } from "@/content/copy";
import type { Row } from "@/lib/supabase/types";

export function CheckinCard({
  day,
  checkin,
  sickUsed,
  show,
}: {
  day: string;
  checkin: Row<"day_checkins"> | null;
  sickUsed: number;
  show: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sick, setSick] = useState(checkin?.sick ?? false);

  if (!show && !checkin) return null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = (k: string) => {
      const v = String(f.get(k) ?? "").trim().replace(",", ".");
      return v === "" ? null : Number(v);
    };
    const energy = n("energy");
    startTransition(async () => {
      const res = await saveCheckin({
        day,
        sleepHours: n("sleep"),
        energy: energy === null ? null : Math.round(energy),
        waterL: n("water"),
        cravings: String(f.get("cravings") ?? ""),
        sick,
      });
      if (res.ok) {
        setOpen(false);
        setError(null);
      } else {
        setError(res.reason === "limit" ? copy.checkin.sickLimit : copy.errors.invalid);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-4 mt-4 flex min-h-[56px] w-[calc(100%-32px)] items-center justify-between rounded-list bg-card px-[18px] text-left"
      >
        <span className="text-body">{copy.checkin.title}</span>
        <span className="text-small text-muted">{checkin ? "Saved" : "20 seconds"}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={copy.checkin.title}
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40"
        >
          <form
            onSubmit={onSubmit}
            className="sheet max-h-[90dvh] w-full max-w-app overflow-y-auto rounded-t-hero bg-bg p-6"
          >
            <h2 className="text-section font-bold tracking-[-0.3px]">{copy.checkin.title}</h2>
            <div className="mt-5 flex flex-col gap-4">
              <Field
                label={copy.checkin.sleep}
                name="sleep"
                inputMode="decimal"
                defaultValue={checkin?.sleep_hours ?? ""}
              />
              <Field
                label={copy.checkin.energy}
                name="energy"
                inputMode="numeric"
                defaultValue={checkin?.energy ?? ""}
              />
              <Field
                label={copy.checkin.water}
                name="water"
                inputMode="decimal"
                defaultValue={checkin?.water_ml ? checkin.water_ml / 1000 : ""}
              />
              <label className="flex flex-col gap-2">
                <span className="text-[14px] font-semibold">{copy.checkin.cravings}</span>
                <textarea
                  name="cravings"
                  rows={3}
                  maxLength={1000}
                  defaultValue={checkin?.cravings ?? ""}
                  className="rounded-ctl border-0 bg-card p-4 text-body"
                />
              </label>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={sick}
                  onChange={(e) => setSick(e.target.checked)}
                  className="m-0 h-6 w-6 accent-fuel"
                />
                <span>
                  <span className="block text-body">{copy.checkin.sick}</span>
                  <span className="block text-caption text-muted">
                    {copy.checkin.sickHelp} {sickUsed}/3 used.
                  </span>
                </span>
              </label>
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-small text-danger">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex gap-2">
              <Button variant="secondary" big onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" big disabled={pending} className="flex-1">
                {copy.checkin.save}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
