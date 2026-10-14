"use client";

import { useState, useTransition } from "react";
import { pickChallenge } from "../actions";
import { challengeCards, copy } from "@/content/copy";
import { cn } from "@/lib/utils";

type Offer = { key: string; why: string };

// Monday: three offers, pick one. Each card says why it was picked, in plain words.
export function ChallengePicker({ weekStart, offers }: { weekStart: string; offers: Offer[] }) {
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<string | null>(null);

  return (
    <section className="mx-4 mt-3 rounded-hero bg-card p-[22px]" aria-labelledby="pick-h">
      <div className="flex items-center justify-between">
        <h3 id="pick-h" className="text-[14px] text-muted">
          {copy.progress.pickChallenge}
        </h3>
        <span className="flex items-center gap-[6px] rounded-full bg-bg px-3 py-[6px] text-[14px] font-semibold">
          <span className="h-2 w-2 rounded-full bg-amber" />
          {copy.progress.reward}
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {offers.map((o) => {
          const card = challengeCards[o.key];
          if (!card) return null;
          return (
            <li key={o.key}>
              <button
                type="button"
                disabled={pending}
                aria-pressed={chosen === o.key}
                onClick={() => {
                  setChosen(o.key);
                  start(async () => {
                    const res = await pickChallenge({ weekStart, key: o.key });
                    if (!res.ok) setChosen(null);
                  });
                }}
                className={cn(
                  "block w-full rounded-inner bg-bg p-4 text-left",
                  chosen === o.key && "ring-2 ring-ink",
                )}
              >
                <span className="block text-[18px] font-bold tracking-[-0.2px]">{card.name}</span>
                <span className="mt-[2px] block text-[15px] text-ink-2">{card.goal}</span>
                <span className="mt-2 block text-caption text-muted">{o.why}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
