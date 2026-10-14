"use client";

import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { tooltips, type TipKey } from "@/content/tooltips";
import { cn } from "@/lib/utils";

// A small (?) that opens a one-line explanation in a bottom sheet.
export function InfoTip({
  tip,
  className,
  light = false,
}: {
  tip: TipKey;
  className?: string;
  /** Use on the dark ink cards. */
  light?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const t = tooltips[tip];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`What is ${t.title}?`}
        className={cn(
          "inline-flex h-11 w-11 flex-none items-center justify-center rounded-full",
          light ? "text-muted-dark" : "text-muted",
          className,
        )}
      >
        <HelpCircle size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.title}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="sheet w-full max-w-app rounded-t-hero bg-bg p-6 text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-section font-bold tracking-[-0.3px]">{t.title}</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-card"
              >
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 pb-4 text-body leading-[1.4] text-ink-2">{t.text}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
