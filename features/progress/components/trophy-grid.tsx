"use client";

import { useState } from "react";
import { Award, ChevronDown, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrophyItem = { key: string; group: string; name: string; hint: string; line: string; on: boolean };

const NEXT_GROUPS = ["Streaks", "Weight", "Journey", "Weeks", "Challenges", "Strength", "Waist", "Photos", "Habits", "Start"];

/** Earned first. Then the few you are closest to. Everything else folds away. */
export function TrophyGrid({ items }: { items: TrophyItem[] }) {
  const [open, setOpen] = useState<TrophyItem | null>(null);
  const [all, setAll] = useState(false);
  const earned = items.filter((t) => t.on);
  // The next one to earn in each group, in an order that feels reachable.
  const next = NEXT_GROUPS.map((g) => items.find((t) => t.group === g && !t.on)).filter((t): t is TrophyItem => Boolean(t)).slice(0, 3);
  const groups = [...items.reduce((m, t) => m.set(t.group, [...(m.get(t.group) ?? []), t]), new Map<string, TrophyItem[]>())];

  const medal = (t: TrophyItem) => (
    <button key={t.key} type="button" onClick={() => setOpen(t)} className="flex w-[68px] flex-none flex-col items-center gap-1 text-center" aria-label={`${t.name}. Earned.`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink">
        <Award size={22} strokeWidth={1.8} className="text-amber" aria-hidden="true" />
      </span>
      <span className="text-caption font-semibold leading-tight text-ink">{t.name}</span>
    </button>
  );

  return (
    <>
      {earned.length > 0 ? (
        <div className="mt-3 flex gap-1 overflow-x-auto px-4 pb-1" role="list" aria-label="Earned trophies">
          {earned.map(medal)}
        </div>
      ) : (
        <p className="mx-4 mt-3 text-small text-muted">None yet. Your first is one log away.</p>
      )}

      {next.length > 0 ? (
        <ul className="mx-4 mt-3 rounded-list bg-card px-4 py-1" aria-label="Next up">
          {next.map((t, i) => (
            <li key={t.key} className={cn(i < next.length - 1 && "border-b border-line")}>
              <button type="button" onClick={() => setOpen(t)} className="flex min-h-14 w-full items-center gap-3 text-left">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-dashed border-dash text-dash">
                  <Lock size={14} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold">{t.name}</span>
                  <span className="block truncate text-caption text-muted">{t.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => setAll(!all)}
        aria-expanded={all}
        className="mx-4 mt-1 flex min-h-11 w-[calc(100%-32px)] items-center justify-center gap-1 text-small font-semibold text-muted"
      >
        {all ? "Hide" : `All ${items.length} trophies`}
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className={cn("transition-transform", all && "rotate-180")} />
      </button>

      {all
        ? groups.map(([group, list]) => (
            <div key={group} className="mt-3">
              <div className="mx-4 flex items-baseline justify-between">
                <h3 className="text-small font-semibold text-muted">{group}</h3>
                <span className="text-caption text-muted">
                  {list.filter((t) => t.on).length} of {list.length}
                </span>
              </div>
              <ul className="mx-4 mt-2 grid grid-cols-4 gap-x-2 gap-y-3">
                {list.map((t) => (
                  <li key={t.key}>
                    <button type="button" onClick={() => setOpen(t)} className="flex w-full flex-col items-center gap-1 text-center" aria-label={`${t.name}. ${t.on ? "Earned" : "Locked"}. ${t.hint}`}>
                      <span className={cn("flex h-11 w-11 items-center justify-center rounded-full", t.on ? "bg-ink" : "border border-dashed border-dash")}>
                        {t.on ? <Award size={20} strokeWidth={1.8} className="text-amber" aria-hidden="true" /> : <Lock size={13} strokeWidth={2} className="text-dash" aria-hidden="true" />}
                      </span>
                      <span className={cn("text-caption leading-tight", t.on ? "font-semibold text-ink" : "text-muted")}>{t.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        : null}

      {open ? (
        <div role="dialog" aria-modal="true" aria-label={open.name} className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40" onClick={() => setOpen(null)}>
          <div className="sheet w-full max-w-app rounded-t-hero p-6 text-ink" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-section font-bold tracking-[-0.3px]">{open.name}</h2>
              <button type="button" aria-label="Close" onClick={() => setOpen(null)} className="flex h-11 w-11 items-center justify-center rounded-full bg-card">
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
