"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ExerciseImage } from "@/components/exercise-image";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";

export type CardExercise = {
  slug: string;
  name: string;
  prescription: string;
  lastLabel: string | null;
  hint: string | null;
  how: string;
  tip: string;
  works: string;
  altNote?: string;
};

export function ExerciseCards({
  items,
  startOpen = true,
  numbered = true,
}: {
  items: CardExercise[];
  startOpen?: boolean;
  numbered?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(startOpen ? (items[0]?.slug ?? null) : null);

  return (
    <ul className="mx-4 mt-5 flex flex-col">
      {items.map((e, i) => {
        const isOpen = open === e.slug;
        return (
          <li key={e.slug} className={cn(isOpen ? "mb-1 rounded-list bg-card p-[14px]" : "px-2")}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : e.slug)}
              className={cn(
                "flex min-h-[56px] w-full items-center gap-[14px] text-left",
                !isOpen && "border-b border-line py-3",
              )}
            >
              <ExerciseImage
                slug={e.slug}
                name={e.name}
                single
                sizes="56px"
                className="h-14 w-14 flex-none rounded-ctl"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold">
                  {numbered ? `${i + 1}. ` : ""}
                  {e.name}
                </span>
                <span className="block truncate text-[14px] text-muted">
                  {e.prescription}
                  {e.lastLabel ? `. ${copy.train.lastTime} ${e.lastLabel}` : ""}
                </span>
              </span>
              {e.hint ? (
                <span className="flex-none rounded-full bg-fuel-soft px-[10px] py-1 text-caption font-semibold text-fuel-ink">
                  {e.hint}
                </span>
              ) : null}
              <ChevronDown
                size={18}
                strokeWidth={2}
                aria-hidden="true"
                className={cn("flex-none text-muted transition-transform", isOpen && "rotate-180")}
              />
            </button>
            {isOpen ? (
              <div className="mt-[14px] flex flex-col gap-3 px-1 pb-1">
                <ExerciseImage slug={e.slug} name={e.name} className="h-[170px] rounded-ctl" />
                <Block label={copy.train.how} text={e.how} />
                <Block label={copy.train.tip} text={e.tip} />
                <Block label={copy.train.works} text={e.works} />
                {e.altNote ? <Block label="Alternative" text={e.altNote} /> : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-caption font-semibold text-muted">{label}</div>
      <div className="mt-[2px] text-[16px] leading-[1.4]">{text}</div>
    </div>
  );
}
