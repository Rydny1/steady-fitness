"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, ChevronDown } from "lucide-react";
import { saveShoppingChecks, savePicks } from "../actions";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";

export type PickMeal = {
  slug: string;
  name: string;
  kcal: number;
  protein: number;
  image: string | null;
};

export type ListGroup = {
  group: string;
  items: { id: string; name: string; amountLabel: string }[];
};

export function FuelPicks({
  weekStart,
  meals,
  picked,
  maxPicks,
}: {
  weekStart: string;
  meals: PickMeal[];
  picked: string[];
  maxPicks: number;
}) {
  const [, start] = useTransition();
  const [items, setItems] = useOptimistic(picked, (_prev, next: string[]) => next);

  function toggle(slug: string) {
    const next = items.includes(slug)
      ? items.filter((s) => s !== slug)
      : [...items, slug].slice(-maxPicks);
    start(async () => {
      setItems(next);
      await savePicks({ weekStart, slugs: next });
    });
  }

  return (
    <>
      <div className="mx-4 mt-6 flex items-baseline justify-between">
        <h2 className="text-section font-bold tracking-[-0.3px]">{copy.fuel.prep}</h2>
        <span className="text-small text-muted" aria-live="polite">
          {items.length} of {maxPicks} picked
        </span>
      </div>
      <ul className="mt-[14px] flex gap-3 overflow-x-auto px-4 pb-1">
        {meals.map((m) => {
          const on = items.includes(m.slug);
          return (
            <li key={m.slug} className="w-[236px] flex-none">
              <button
                type="button"
                aria-pressed={on}
                aria-label={`${on ? "Remove" : "Pick"} ${m.name}`}
                onClick={() => toggle(m.slug)}
                className="relative block h-[168px] w-full overflow-hidden rounded-list bg-line"
              >
                {m.image ? (
                  <Image src={m.image} alt="" fill sizes="236px" className="object-cover" />
                ) : null}
                <span
                  className={cn(
                    "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full",
                    on ? "bg-ink text-white" : "bg-bg text-muted",
                  )}
                >
                  {on ? <Check size={16} strokeWidth={2.6} aria-hidden="true" /> : null}
                </span>
              </button>
              <Link href={`/fuel/${m.slug}`} className="mt-[10px] block min-h-11">
                <div className="text-body font-semibold">{m.name}</div>
                <div className="text-[clamp(13px,3.8vw,14px)] text-muted">
                  {m.kcal} kcal, {m.protein} g protein a portion
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function ShoppingList({
  weekStart,
  groups,
  checked,
  totalKcal,
  portions,
}: {
  weekStart: string;
  groups: ListGroup[];
  checked: string[];
  /** Energy in everything on the list, for the picked recipes. */
  totalKcal: number;
  portions: number;
}) {
  const [open, setOpen] = useState(true);
  const [, start] = useTransition();
  const [done, setDone] = useState(new Set(checked));
  const total = groups.reduce((s, g) => s + g.items.length, 0);

  function toggle(id: string) {
    const next = new Set(done);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDone(next);
    start(async () => {
      await saveShoppingChecks({ weekStart, checked: [...next] });
    });
  }

  if (total === 0) {
    return (
      <p className="mx-4 mt-3 text-small text-muted">{copy.fuel.pickTwo}. The list builds itself.</p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="mx-4 mt-8 flex min-h-11 w-[calc(100%-32px)] items-center justify-between text-left"
      >
        <h2 className="text-section font-bold tracking-[-0.3px]">{copy.fuel.shopping}</h2>
        <span className="flex items-center gap-2 text-small text-muted" aria-live="polite">
          {done.size} of {total}
          <ChevronDown size={18} strokeWidth={2} aria-hidden="true" className={cn("transition-transform", open && "rotate-180")} />
        </span>
      </button>
      <p className="mx-4 text-small text-muted">
        About {new Intl.NumberFormat("en-GB").format(totalKcal)} kcal across {portions} portions.
      </p>
      {open ? (
      <div className="mx-4 mt-[10px] rounded-list bg-card px-[18px] py-1">
        {groups.map((g, gi) => (
          <div key={g.group} className={cn("py-[10px]", gi < groups.length - 1 && "border-b border-line")}>
            <div className="pt-1 text-[clamp(13px,3.8vw,14px)] font-semibold text-muted">{g.group}</div>
            {g.items.map((i) => (
              <label key={i.id} className="flex min-h-12 items-center gap-[14px]">
                <input
                  type="checkbox"
                  checked={done.has(i.id)}
                  onChange={() => toggle(i.id)}
                  className="m-0 h-[22px] w-[22px] accent-fuel"
                />
                <span className={cn("flex-1 text-body", done.has(i.id) && "text-muted line-through")}>
                  {i.name}
                </span>
                <span className="text-small text-muted">{i.amountLabel}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
      ) : null}
    </>
  );
}
