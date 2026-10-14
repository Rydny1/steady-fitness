"use client";

import { useState, useTransition } from "react";
import { markSeen } from "../actions";
import { InfoTip } from "@/components/info-tip";

// Monday's adaptive budget line, shown once. "Your real burn is 2,780 kcal. Budget moved to 2,085."
export function AdaptiveNote({ text }: { text: string }) {
  const [open, setOpen] = useState(true);
  const [, start] = useTransition();
  if (!open) return null;
  return (
    <section className="mx-4 mt-4 flex items-center gap-1 rounded-list bg-card pl-[18px] pr-1" aria-label="Budget update">
      <p className="flex-1 py-4 text-body leading-[1.35]">{text}</p>
      <InfoTip tip="adaptiveBudget" />
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          start(async () => {
            await markSeen({ key: "adaptive_note" });
          });
        }}
        className="min-h-11 rounded-full px-3 text-small font-semibold"
      >
        Got it
      </button>
    </section>
  );
}
