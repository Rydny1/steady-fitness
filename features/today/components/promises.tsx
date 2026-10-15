"use client";

import { createContext, useContext, useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import { Check, Flame, Snowflake } from "lucide-react";
import { freezeStreak, toggleHabit } from "../actions";
import { Toast } from "@/components/toast";
import { copy } from "@/content/copy";
import { toMilestone } from "@/features/game/streak-moments";
import { cn } from "@/lib/utils";

type Habit = { id: string; name: string; checked: boolean };
type Dot = { day: string; letter: string; pct: number; today: boolean; future: boolean; logged: boolean };

type Ctx = { items: Habit[]; toggle: (id: string) => void; pct: number; done: number };
const PromiseCtx = createContext<Ctx | null>(null);

function usePromises(): Ctx {
  const c = useContext(PromiseCtx);
  if (!c) throw new Error("PromisesProvider is missing");
  return c;
}

/** Holds today's promises so the streak circle and the list move together, instantly. */
export function PromisesProvider({ habits, day, children }: { habits: Habit[]; day: string; children: React.ReactNode }) {
  const [, startTransition] = useTransition();
  const [items, setItem] = useOptimistic(habits, (state, id: string) =>
    state.map((h) => (h.id === id ? { ...h, checked: !h.checked } : h)),
  );
  const done = items.filter((h) => h.checked).length;
  const pct = items.length > 0 ? done / items.length : 0;
  const [perfect, setPerfect] = useState(false);
  const was = useRef(pct);

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

  const toggle = (id: string) =>
    startTransition(async () => {
      setItem(id);
      await toggleHabit({ habitId: id, day });
    });

  return (
    <PromiseCtx.Provider value={{ items, toggle, pct, done }}>
      {perfect ? <Toast tone="hello" message={`All ${items.length} done.`} detail="Perfect day." onGone={() => setPerfect(false)} /> : null}
      {children}
    </PromiseCtx.Provider>
  );
}

/** A circle that fills from the bottom with how much is done. The percentage sits small inside. */
function FillCircle({ pct, size, label, tiny = false }: { pct: number; size: number; label?: string; tiny?: boolean }) {
  const r = size / 2 - 2;
  const level = Math.max(0, Math.min(1, pct));
  const id = `fill-${useId()}`;
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
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={tiny ? 9 : 11} fontWeight="700" fill={level >= 1 ? "#fff" : level === 0 ? "var(--muted)" : "var(--ink)"}>
        {Math.round(level * 100)}%
      </text>
    </svg>
  );
}

/** Streak, today's promise circle, the week, and the week's deficit goal. Sits under the quote. */
export function StreakBlock({
  streak,
  week,
  goal,
  weekDeficit,
  freeze,
  loggedToday,
}: {
  streak: number;
  week: Dot[];
  goal: "lose" | "gain" | "maintain";
  weekDeficit: { got: number; target: number };
  freeze: { frozenToday: boolean; left: number; cost: number; canAfford: boolean };
  loggedToday: boolean;
}) {
  const [ask, setAsk] = useState(false);
  const [frozen, setFrozen] = useState(freeze.frozenToday);
  const [freezeMsg, setFreezeMsg] = useState<string | null>(null);
  const [freezing, startFreeze] = useTransition();
  const { pct } = usePromises();
  const next = toMilestone(streak);
  const dots = week.map((w) => (w.today ? { ...w, pct } : w));
  const wk = weekDeficit.target > 0 ? Math.min(1, weekDeficit.got / weekDeficit.target) : 0;
  const nf = new Intl.NumberFormat("en-GB");
  return (
    <section aria-label="Streak" className="mx-4 mt-3 rounded-hero bg-card p-4">
      <div className="flex items-center gap-4">
        <FillCircle pct={pct} size={64} label={`Promises ${Math.round(pct * 100)} percent`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Flame size={34} strokeWidth={1.8} className={cn("flame-glow", streak > 0 ? "fill-amber text-amber" : "text-dash")} aria-hidden="true" />
            <span className="num text-[clamp(34px,10vw,40px)] leading-none">{streak}</span>
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
            <FillCircle pct={w.future ? 0 : w.pct} size={36} tiny label={`${w.letter}: ${Math.round((w.future ? 0 : w.pct) * 100)} percent`} />
            <span className={cn("text-nav", w.today ? "font-bold text-ink" : "text-muted")}>{w.letter}</span>
          </li>
        ))}
      </ul>
      {streak > 0 && !loggedToday ? (
        <div className="mt-4 rounded-ctl bg-sunken px-3 py-2.5 text-small">
          {frozen ? (
            <span className="flex items-center gap-2 font-medium text-ink">
              <Snowflake size={16} strokeWidth={2} className="text-protein" aria-hidden="true" />
              Streak frozen today. Safe.
            </span>
          ) : ask ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-2">Freeze costs {freeze.cost} Callus if you don&apos;t log.</span>
              <span className="flex gap-1">
                <button type="button" className="min-h-11 rounded-full px-3 font-semibold text-muted" onClick={() => setAsk(false)}>
                  No
                </button>
                <button
                  type="button"
                  disabled={freezing}
                  className="min-h-11 rounded-full bg-ink px-4 font-semibold text-white"
                  onClick={() =>
                    startFreeze(async () => {
                      const r = await freezeStreak();
                      if (r.ok) {
                        setFrozen(true);
                        setAsk(false);
                      } else {
                        setAsk(false);
                        setFreezeMsg(r.reason === "none_left" ? "No freezes left this month." : r.reason === "low_callus" ? "Not enough Callus." : "Couldn't freeze. Try again.");
                      }
                    })
                  }
                >
                  Freeze
                </button>
              </span>
            </div>
          ) : (
            <button
              type="button"
              disabled={freeze.left <= 0 || !freeze.canAfford}
              onClick={() => setAsk(true)}
              className="flex min-h-11 w-full items-center justify-between disabled:opacity-50"
            >
              <span className="flex items-center gap-2 font-semibold text-ink">
                <Snowflake size={16} strokeWidth={2} className="text-protein" aria-hidden="true" />
                Freeze today
              </span>
              <span className="text-caption text-muted">{freeze.left} left this month</span>
            </button>
          )}
          {freezeMsg ? <p role="alert" className="mt-1 text-caption text-danger">{freezeMsg}</p> : null}
        </div>
      ) : null}
      {weekDeficit.target > 0 && goal !== "maintain" ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-caption text-muted">
            <span>{goal === "gain" ? "Week surplus" : "Week deficit"}</span>
            <span>
              <span className="num text-[clamp(15px,4.4vw,17px)] text-ink">{nf.format(weekDeficit.got)}</span> / {nf.format(weekDeficit.target)}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(wk * 100)} aria-label="Weekly goal">
            <div className="h-full rounded-full bg-fuel transition-[width]" style={{ width: `${wk * 100}%` }} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** The five promises, as a list of checkboxes. */
export function PromisesList() {
  const { items, toggle, done } = usePromises();
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
          <label key={h.id} className={cn("flex min-h-[52px] items-center gap-[14px]", i < items.length - 1 && "border-b border-line")}>
            <input type="checkbox" checked={h.checked} onChange={() => toggle(h.id)} className="m-0 h-6 w-6 accent-fuel" />
            <span className={cn("text-body", h.checked && "text-muted line-through")}>{h.name}</span>
            {h.checked ? <Check size={16} strokeWidth={2.6} className="ml-auto text-fuel" aria-hidden="true" /> : null}
          </label>
        ))}
      </div>
    </section>
  );
}
