"use client";

import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { streakCopy, toMilestone } from "@/features/game/streak-moments";

type Dot = { day: string; letter: string; pct: number; today: boolean; future: boolean; logged: boolean };

// The Duolingo moment: you showed up today. Flame, the count, the week, what is next.
export function StreakCelebration({ streak, week, onClose }: { streak: number; week: Dot[]; onClose: () => void }) {
  const copyFor = streakCopy(streak);
  const next = toMilestone(streak);
  const span = next ? next.target - next.from : 1;
  const into = next ? streak - next.from : 1;
  return (
    <div role="dialog" aria-modal="true" aria-label={copyFor.title} className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/75 px-6">
      <div className="relative w-full max-w-[360px] overflow-hidden rounded-hero bg-surface p-6 text-center">
        {copyFor.milestone ? (
          <div aria-hidden="true" className="confetti">
            {Array.from({ length: 18 }, (_, i) => (
              <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 90}ms` }} />
            ))}
          </div>
        ) : null}
        <div className="neon-ring flame-pop mx-auto flex h-24 w-24 items-center justify-center rounded-full">
          <span className="flex h-full w-full items-center justify-center rounded-full bg-ink">
            <Flame size={44} strokeWidth={1.7} className="text-amber" aria-hidden="true" />
          </span>
        </div>
        <h2 className={copyFor.milestone ? "neon-text mt-4 text-sub font-bold tracking-[-0.5px]" : "mt-4 text-sub font-bold tracking-[-0.5px]"}>
          {copyFor.title}
        </h2>
        <p className="mt-1 text-body text-ink-2">{copyFor.line}</p>
        <ul className="mt-5 flex justify-between" aria-label="This week">
          {week.map((w) => (
            <li key={w.day} className="flex flex-col items-center gap-1">
              <span
                className={
                  "flex h-8 w-8 items-center justify-center rounded-full border text-caption font-bold " +
                  (w.logged ? "border-fuel bg-fuel text-white" : w.future ? "border-dashed border-dash text-dash" : "border-edge bg-sunken text-muted") +
                  (w.today ? " day-pop" : "")
                }
              >
                {w.logged ? "✓" : ""}
              </span>
              <span className="text-nav text-muted">{w.letter}</span>
            </li>
          ))}
        </ul>
        {next ? (
          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-sunken">
              <div className="h-full rounded-full bg-amber" style={{ width: `${Math.min(100, (into / span) * 100)}%` }} />
            </div>
            <div className="mt-1 text-caption text-muted">
              {next.left} {next.left === 1 ? "day" : "days"} to {next.target}
            </div>
          </div>
        ) : null}
        <Button big className="mt-5 w-full" onClick={onClose}>
          Keep going
        </Button>
      </div>
    </div>
  );
}
