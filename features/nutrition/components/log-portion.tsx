"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveEntries } from "@/features/logging/actions";
import { enqueue } from "@/features/logging/offline-queue";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

// One tap logs one portion of a batch recipe.
export function LogPortion({
  day,
  name,
  kcal,
  protein,
}: {
  day: string;
  name: string;
  kcal: number;
  protein: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function log() {
    const input = {
      day,
      logId: null,
      source: "tap" as const,
      items: [
        {
          kind: "food" as const,
          name,
          quantity: 1,
          unit: "portion",
          kcal,
          protein_g: protein,
          confidence: 1,
        },
      ],
    };
    if (!navigator.onLine) {
      enqueue(input);
      setNote(copy.log.offline);
      return;
    }
    start(async () => {
      const res = await saveEntries(input);
      if (res.ok) {
        router.push("/today");
        router.refresh();
      } else {
        setNote(copy.errors.generic);
      }
    });
  }

  return (
    <div className="mx-4 mt-5">
      <Button big onClick={log} disabled={pending} className="w-full">
        Log 1 portion
      </Button>
      {note ? (
        <p role="status" className="mt-2 text-small text-muted">
          {note}
        </p>
      ) : null}
    </div>
  );
}
