"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** A button that asks: take a photo, or choose one from the gallery. */
export function PhotoPicker({
  label,
  onFile,
  disabled,
  className,
}: {
  label: string;
  onFile: (file: File | undefined) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFile(e.target.files?.[0]);
    e.target.value = "";
  };
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn("inline-flex h-11 items-center rounded-full bg-card px-4 text-small font-semibold", className)}
      >
        {label}
      </button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={pick} />
      <input ref={galleryRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={pick} />
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add a photo"
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40"
          onClick={() => setOpen(false)}
        >
          <div className="sheet w-full max-w-app rounded-t-hero p-4" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                cameraRef.current?.click();
              }}
              className="flex h-14 w-full items-center gap-3 rounded-ctl bg-card px-4 text-body font-semibold"
            >
              <Camera size={22} strokeWidth={1.9} aria-hidden="true" />
              Take a photo
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                galleryRef.current?.click();
              }}
              className="mt-2 flex h-14 w-full items-center gap-3 rounded-ctl bg-card px-4 text-body font-semibold"
            >
              <ImageIcon size={22} strokeWidth={1.9} aria-hidden="true" />
              Choose from gallery
            </button>
            <button type="button" onClick={() => setOpen(false)} className="mt-2 h-12 w-full text-body font-semibold text-muted">
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
