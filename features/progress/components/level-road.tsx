"use client";

import { useState } from "react";
import { Check, ChevronDown, Lock } from "lucide-react";
import { DIVISIONS } from "@/features/game/config";
import { chapters } from "@/content/copy";
import { InfoTip } from "@/components/info-tip";
import type { DivisionT } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/** The whole road, level by level: where you have been, where you are, what is next and what it takes. */
export function LevelRoad({ division, careerDays, callus }: { division: DivisionT; careerDays: number; callus: number }) {
  const at = DIVISIONS.findIndex((d) => d.division === division);
  const [all, setAll] = useState(false);
  // Collapsed: where you are and what is next. Tap for the whole road.
  const shown = all ? DIVISIONS.map((rule, i) => ({ rule, i })) : DIVISIONS.map((rule, i) => ({ rule, i })).filter(({ i }) => i === at || i === at + 1 || (at === DIVISIONS.length - 1 && i === at));
  return (
    <section className="mx-4 mt-3 rounded-hero bg-card p-[22px]" aria-label="Level road">
      <h3 className="flex items-center text-[clamp(13px,3.8vw,14px)] text-muted">
        Level road
        <InfoTip tip="level" className="-my-3 -ml-1" />
      </h3>
      <ol className="mt-4">
        {shown.map(({ rule, i }) => {
          const c = chapters[rule.division];
          const done = i < at;
          const now = i === at;
          const next = i === at + 1;
          const daysPct = Math.min(1, careerDays / Math.max(1, rule.days));
          const callusPct = Math.min(1, callus / Math.max(1, rule.bar));
          return (
            <li key={rule.division} className="flex gap-3">
              <span className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-7 w-7 flex-none items-center justify-center rounded-full text-caption font-bold",
                    done && "bg-fuel text-white",
                    now && "bg-ink text-amber ring-2 ring-amber ring-offset-2 ring-offset-card",
                    !done && !now && "border border-dashed border-dash text-dash",
                  )}
                >
                  {done ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : now ? c.n : <Lock size={12} strokeWidth={2.2} aria-hidden="true" />}
                </span>
                {all && i < DIVISIONS.length - 1 ? <span className={cn("w-[2px] flex-1", done ? "bg-fuel" : "bg-line")} style={{ minHeight: now || next ? 64 : 36 }} /> : null}
              </span>
              <div className="min-w-0 flex-1 pb-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn("text-body font-semibold", !done && !now && "text-muted")}>{c.name}</span>
                  <span className="text-caption text-muted">{rule.days === 0 ? "Start" : `Day ${rule.days}`}</span>
                </div>
                {now ? <p className="mt-0.5 text-small text-ink-2">{c.perk}</p> : null}
                {next ? (
                  <div className="mt-2">
                    <p className="text-small text-ink-2">{c.perk}</p>
                    <Bar label={`Days ${Math.min(careerDays, rule.days)} of ${rule.days}`} pct={daysPct} />
                    <Bar label={`Callus ${callus} of ${rule.bar}`} pct={callusPct} />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={() => setAll(!all)}
        aria-expanded={all}
        className="mt-1 flex min-h-11 w-full items-center justify-center gap-1 text-small font-semibold text-muted"
      >
        {all ? "Show less" : `All ${DIVISIONS.length} levels`}
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className={cn("transition-transform", all && "rotate-180")} />
      </button>
    </section>
  );
}

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-caption text-muted">
        <span>{label}</span>
        <span>{Math.round(pct * 100)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full bg-amber" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
