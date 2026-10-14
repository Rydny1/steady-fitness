"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveEntries } from "@/features/logging/actions";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import type { ActivityT, SessionKeyT } from "@/lib/supabase/types";

// Mark a football, run or stretch session done with its default minutes.
export function QuickDone({
  day,
  sessionKey,
  activity,
  minutes,
}: {
  day: string;
  sessionKey: SessionKeyT;
  activity: ActivityT;
  minutes: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(minutes));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    const m = Math.round(Number(value.replace(",", ".")));
    if (!Number.isFinite(m) || m < 1 || m > 600) {
      setError(copy.errors.invalid);
      return;
    }
    start(async () => {
      const res = await saveEntries({
        day,
        logId: null,
        source: "tap",
        items: [
          {
            kind: "activity",
            activity_type: activity,
            session_key: sessionKey === "rest" ? null : sessionKey,
            duration_min: m,
            rpe: null,
          },
        ],
      });
      if (res.ok) {
        router.push("/today");
        router.refresh();
      } else {
        setError(copy.errors.generic);
      }
    });
  }

  return (
    <div className="mx-6 mt-[18px] flex items-center gap-2">
      <label className="flex h-[54px] items-center gap-2 rounded-ctl bg-card px-4">
        <span className="sr-only">Minutes</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="numeric"
          className="num w-14 border-0 bg-transparent text-[24px]"
        />
        <span className="text-small text-muted">min</span>
      </label>
      <Button big onClick={submit} disabled={pending} className="flex-1">
        {copy.train.markDone}
      </Button>
      {error ? (
        <p role="alert" className="sr-only">
          {error}
        </p>
      ) : null}
    </div>
  );
}
