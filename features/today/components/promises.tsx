"use client";

import { useOptimistic, useTransition } from "react";
import { toggleHabit } from "../actions";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";

type Habit = { id: string; name: string; checked: boolean };

export function Promises({ habits, day }: { habits: Habit[]; day: string }) {
  const [, startTransition] = useTransition();
  const [items, setItem] = useOptimistic(habits, (state, id: string) =>
    state.map((h) => (h.id === id ? { ...h, checked: !h.checked } : h)),
  );
  const done = items.filter((h) => h.checked).length;

  return (
    <section aria-labelledby="promises-h">
      <div className="mx-4 mt-7 flex items-baseline justify-between">
        <h2 id="promises-h" className="text-section font-bold tracking-[-0.3px]">
          {copy.today.promises}
        </h2>
        <span className="text-small text-muted" aria-live="polite">
          {copy.today.of(done, items.length)}
        </span>
      </div>
      <div className="mx-4 mt-3 rounded-list bg-card px-[18px] py-1">
        {items.map((h, i) => (
          <label
            key={h.id}
            className={cn(
              "flex min-h-[52px] items-center gap-[14px]",
              i < items.length - 1 && "border-b border-line",
            )}
          >
            <input
              type="checkbox"
              checked={h.checked}
              onChange={() =>
                startTransition(async () => {
                  setItem(h.id);
                  await toggleHabit({ habitId: h.id, day });
                })
              }
              className="m-0 h-6 w-6 accent-fuel"
            />
            <span
              className={cn("text-body", h.checked && "text-muted line-through")}
            >
              {h.name}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
