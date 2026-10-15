"use client";

import { useState, useTransition } from "react";
import { Award } from "lucide-react";
import { ackTrophies } from "../actions";
import { Button } from "@/components/ui/button";

type Trophy = { key: string; name: string; line: string };

const CONFETTI = Array.from({ length: 18 }, (_, i) => i);

// A small celebration when a trophy is earned. Shown once per trophy, then remembered.
export function Celebration({ trophies }: { trophies: Trophy[] }) {
  const [open, setOpen] = useState(true);
  const [, start] = useTransition();
  const first = trophies[0];
  if (!open || !first) return null;

  function close() {
    setOpen(false);
    start(async () => {
      await ackTrophies({ keys: trophies.map((t) => t.key) });
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Trophy earned: ${first.name}`}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/70 px-6"
    >
      <div className="relative w-full max-w-[360px] overflow-hidden rounded-hero bg-surface p-6 text-center">
        <div aria-hidden="true" className="confetti">
          {CONFETTI.map((i) => (
            <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 90}ms` }} />
          ))}
        </div>
        <div className="neon-ring mx-auto flex h-24 w-24 items-center justify-center rounded-full">
          <span className="flex h-full w-full items-center justify-center rounded-full bg-ink">
            <Award size={40} strokeWidth={1.6} className="text-amber" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-5 text-caption font-semibold uppercase tracking-[0.12em] text-muted">
          {trophies.length > 1 ? `${trophies.length} trophies earned` : "Trophy earned"}
        </div>
        <h2 className="neon-text mt-1 text-sub font-bold tracking-[-0.5px]">{first.name}</h2>
        <p className="mt-2 text-body text-ink-2">{first.line}</p>
        {trophies.length > 1 ? (
          <p className="mt-2 text-small text-muted">
            Also: {trophies.slice(1).map((t) => t.name).join(", ")}
          </p>
        ) : null}
        <p className="mt-3 text-small text-muted">It now sits next to your name.</p>
        <Button big className="mt-5 w-full" onClick={close}>
          Nice
        </Button>
      </div>
    </div>
  );
}
