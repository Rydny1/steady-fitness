"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Check, Flame } from "lucide-react";
import { toggleHabit } from "../actions";
import { Toast } from "@/components/toast";
import { copy } from "@/content/copy";
import { toMilestone } from "@/features/game/streak-moments";
import { cn } from "@/lib/utils";

type Habit = { id: string; name: string; checked: boolean };
type Dot = { day: string; letter: string; pct: number; today: boolean; future: boolean; logged: boolean };

/** A circle that fills from the bottom with how much is done. The percentage sits small inside. */
function FillCircle({ pct, size, label, tiny = false }: { pct: number; size: number; label?: string; tiny?: boolean }) {
  const r = size / 2 - 2;
  const level = Math.max(0, Math.min(1, pct));
  const id = `fill-${size}-${Math.round(level * 100)}${tiny ? "t" : ""}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <defs>
        <clipPath id={id}>
          <rect x="0" y={size - size * level} width={size} height={size * level} className="fill-rise" />
        </clipPath>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="var(--sunken)" stroke="var(--edge)" strokeWidth="1.5" />
      <g clipPath={`url(#${id})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill={level >= 1 ? "var(--fuel)" : "var(--fuel-soft)"} stroke="var(--fuel)" strokeWidth="1.5" />
      </g>
      {tiny ? (
        level >= 1 ? (
          <path d={`M${size * 0.3} ${size * 0.52} l${size * 0.14} ${size * 0.14} l${size * 0.27} -${size * 0.3}`} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        ) : null
      ) : (
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="13" fontWeight="700" fill={level >= 1 ? "#fff" : "var(--ink)"}>
          {Math.round(level * 100)}%
        </text>
      )}
    </svg>
  );
}

export function Promises({
  habits,
  day,
  streak,
  week,
}: {
  habits: Habit[];
  day: string;
  streak: number;
  week: Dot[];
}) {
  const [, startTransition] = useTransition();
  const [items, setItem] = useOptimistic(habits, (state, id: string) =>
    state.map((h) => (h.id === id ? { ...h, checked: !h.checked } : h)),
  );
  const done = items.filter((h) => h.checked).length;
  const pct = items.length > 0 ? done / items.length : 0;
  const [perfect, setPerfect] = useState(false);
  const was = useRef(pct);
  const next = toMilestone(streak);

  // A small celebration the moment the last promise is ticked (once a day).
  useEffect(() => {
    if (pct >= 1 && was.current < 1) {
      try {
        const key = `steady-win-promises-${day}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          setPerfect(true);
        }
      } catch {
        setPerfect(true);
      }
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(30);
    }
    was.current = pct;
  }, [pct, day]);

  const dots = week.map((w) => (w.today ? { ...w, pct } : w));

  return (
    <section aria-labelledby="promises-h">
      {perfect ? <Toast tone="hello" message={`All ${items.length} promises done.`} detail="Perfect day." onGone={() => setPerfect(false)} /> : null}
      <div className="mx-4 mt-5 rounded-hero bg-card p-4">
        <div className="flex items-center gap-4">
          <FillCircle pct={pct} size={68} label={`Promises ${Math.round(pct * 100)} percent`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Flame size={22} strokeWidth={2} className={streak > 0 ? "text-amber" : "text-dash"} aria-hidden="true" />
              <span className="num text-num leading-none">{streak}</span>
              <span className="text-small text-muted">day streak</span>
            </div>
            <div className="mt-1 text-caption text-muted">
              {next ? `${next.left} ${next.left === 1 ? "day" : "days"} to ${next.target}` : "Top of the streaks"}
            </div>
          </div>
        </div>
        <ul className="mt-4 flex justify-between" aria-label="This week">
          {dots.map((w) => (
            <li key={w.day} className="flex flex-col items-center gap-1">
              {w.future ? (
                <span className="block h-[30px] w-[30px] rounded-full border border-dashed border-dash" />
              ) : (
                <FillCircle pct={w.pct} size={30} tiny label={`${w.letter}: ${Math.round(w.pct * 100)} percent`} />
              )}
              <span className={cn("text-nav", w.today ? "font-bold text-ink" : "text-muted")}>{w.letter}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-4 mt-3 flex items-baseline justify-between">
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
            className={cn("flex min-h-[52px] items-center gap-[14px]", i < items.length - 1 && "border-b border-line")}
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
            <span className={cn("text-body", h.checked && "text-muted line-through")}>{h.name}</span>
            {h.checked ? <Check size={16} strokeWidth={2.6} className="ml-auto text-fuel" aria-hidden="true" /> : null}
          </label>
        ))}
      </div>
    </section>
  );
}
