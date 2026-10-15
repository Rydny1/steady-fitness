"use client";

import { useState, useTransition } from "react";
import { markSeen } from "../actions";
import { Button } from "@/components/ui/button";
import { chapters, droppedChapter } from "@/content/copy";
import type { DivisionT } from "@/lib/supabase/types";

// The one big moment: a level change. Full screen, name slides up, story fades in, Callus fills.
export function LevelCard({
  kind,
  division,
  callus,
}: {
  kind: "promoted" | "dropped";
  division: DivisionT;
  callus: number;
}) {
  const [open, setOpen] = useState(true);
  const [, start] = useTransition();
  const level = chapters[division];
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Level ${level.n}, ${level.name}`}
      className="fixed inset-0 z-[60] flex flex-col justify-center bg-ink px-4 text-white"
    >
      <div className="mx-auto w-full max-w-app">
        <div className="text-small text-muted-dark">
          {kind === "promoted" ? `Level ${level.n}` : "Level dropped"}
        </div>
        <h2 className="chapter-name num mt-2 text-score leading-[0.95]">{level.name}</h2>
        <p className="chapter-story mt-6 text-[clamp(18px,5.38vw,20px)] font-medium leading-[1.3]">
          {kind === "promoted" ? level.story : droppedChapter(level.name)}
        </p>
        <div className="mt-8 h-[10px] overflow-hidden rounded-full bg-ink-line">
          <div className="bar-fill h-[10px] rounded-full bg-amber" style={{ width: `${callus}%` }} />
        </div>
        <Button
          big
          className="mt-10 w-full bg-white text-ink"
          onClick={() => {
            setOpen(false);
            start(async () => {
              await markSeen({ key: "chapter_event" });
            });
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
