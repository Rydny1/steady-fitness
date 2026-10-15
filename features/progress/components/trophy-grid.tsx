"use client";

import { useState } from "react";
import { Award, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrophyItem = { key: string; name: string; hint: string; line: string; on: boolean };

// Tap a trophy to see what it means and how to earn it.
export function TrophyGrid({ items }: { items: TrophyItem[] }) {
  const [open, setOpen] = useState<TrophyItem | null>(null);
  return (
    <>
      <ul className="mx-4 mt-4 grid grid-cols-4 gap-x-2 gap-y-4">
        {items.map((t) => (
          <li key={t.key}>
            <button
              type="button"
              onClick={() => setOpen(t)}
              className="flex w-full flex-col items-center gap-2 text-center"
              aria-label={`${t.name}. ${t.on ? "Earned" : "Locked"}. ${t.hint}`}
            >
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full",
                  t.on ? "bg-ink" : "box-border border-[1.5px] border-dashed border-dash",
                )}
              >
                {t.on ? (
                  <Award size={24} strokeWidth={1.8} className="text-amber" aria-hidden="true" />
                ) : (
                  <Check size={20} strokeWidth={1.8} className="text-dash" aria-hidden="true" />
                )}
              </span>
              <span className={cn("text-caption leading-[1.25]", t.on ? "font-semibold text-ink" : "text-muted")}>{t.name}</span>
            </button>
          </li>
        ))}
      </ul>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.name}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40"
          onClick={() => setOpen(null)}
        >
          <div className="sheet w-full max-w-app rounded-t-hero p-6 text-ink" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-section font-bold tracking-[-0.3px]">{open.name}</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-card"
              >
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 text-body text-ink-2">{open.hint}</p>
            <p className="mt-3 pb-4 text-small text-muted">{open.on ? open.line : "Not earned yet."}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
