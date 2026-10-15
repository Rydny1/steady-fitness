"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Sparkles } from "lucide-react";

// A small pop-up that slides in from the top, says one thing, and leaves by itself.
export function Toast({
  message,
  detail,
  tone = "done",
  ms = 3800,
  onGone,
}: {
  message: string;
  detail?: string;
  tone?: "done" | "hello";
  ms?: number;
  onGone?: () => void;
}) {
  const [open, setOpen] = useState(true);
  // A fresh onGone on every render must not restart the timer.
  const gone = useRef(onGone);
  useEffect(() => {
    gone.current = onGone;
  });
  useEffect(() => {
    const t = setTimeout(() => {
      setOpen(false);
      gone.current?.();
    }, ms);
    return () => clearTimeout(t);
  }, [ms]);
  if (!open) return null;
  const Icon = tone === "hello" ? Sparkles : Check;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center px-4 pt-[max(12px,env(safe-area-inset-top))]">
      <div
        role="status"
        aria-live="polite"
        className="toast neon-chip pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-list px-4 py-3 shadow-[var(--shadow-2)]"
        onClick={() => setOpen(false)}
      >
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ink text-white">
          <Icon size={16} strokeWidth={2.4} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold leading-tight">{message}</span>
          {detail ? <span className="block text-small leading-snug text-muted">{detail}</span> : null}
        </span>
      </div>
    </div>
  );
}
