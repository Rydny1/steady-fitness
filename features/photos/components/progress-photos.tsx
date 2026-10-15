"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { compressImage } from "../compress";
import { uploadPhoto } from "../upload";
import { deletePhoto, recordProgressPhoto } from "../actions";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { PhotoPicker } from "@/components/photo-picker";
import { copy } from "@/content/copy";
import { capitalize, cn } from "@/lib/utils";

export type ProgressPhoto = {
  id: string;
  pose: "front" | "side" | "back";
  takenOn: string;
  url: string | null;
};

const POSES = ["front", "side", "back"] as const;
const label = capitalize;

export function ProgressPhotos({
  photos,
  today,
  due,
}: {
  photos: ProgressPhoto[];
  today: string;
  /** The last progress photo is 14 or more days old, or there is none. */
  due: boolean;
}) {
  const router = useRouter();
  const [pose, setPose] = useState<(typeof POSES)[number]>("front");
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [history, setHistory] = useState(false);

  const latest = POSES.map((p) => photos.find((x) => x.pose === p) ?? null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    start(async () => {
      try {
        const c = await compressImage(file);
        const path = await uploadPhoto("progress-photos", c.blob);
        if (!path) {
          setError(copy.errors.generic);
          return;
        }
        const res = await recordProgressPhoto({ path, takenOn: today, pose });
        if (res.ok) router.refresh();
        else setError(copy.errors.generic);
      } catch {
        setError(copy.errors.generic);
      }
    });
  }

  return (
    <section id="photos" aria-labelledby="photos-h" className="mt-8">
      <div className="mx-4 flex items-center justify-between">
        <h2 id="photos-h" className="text-section font-bold tracking-[-0.3px]">
          {copy.progress.photos}
        </h2>
        {photos.length >= 2 ? (
          <button type="button" onClick={() => setCompare(true)} className="min-h-11 text-small font-semibold">
            {copy.progress.compare}
          </button>
        ) : null}
      </div>

      {due ? (
        <p role="status" className="mx-4 mt-3 rounded-inner bg-card px-4 py-3 text-small font-semibold">
          {copy.progress.photoDay}
        </p>
      ) : null}
      {photos.length === 0 ? (
        <p className="mx-4 mt-3 text-small text-muted">{copy.progress.photosEmpty}</p>
      ) : (
        <div className="mx-4 mt-[10px] grid grid-cols-3 gap-2">
          {latest.map((p, i) => (
            <div key={POSES[i]} className="relative flex aspect-[3/4] items-end overflow-hidden rounded-inner bg-line p-[10px] text-[12px] text-muted">
              {p?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt={`${label(p.pose)} photo`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              ) : null}
              <span className={cn("relative rounded-full px-2 py-[2px]", p?.url ? "bg-bg text-ink" : "")}>
                {label(POSES[i] ?? "front")}
                {p ? `, ${p.takenOn.slice(8)}/${p.takenOn.slice(5, 7)}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mx-4 mt-3 flex items-center gap-2">
        <div className="flex gap-1" role="radiogroup" aria-label="Pose">
          {POSES.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={pose === p}
              onClick={() => setPose(p)}
              className={cn(
                "min-h-11 rounded-full px-4 text-small",
                pose === p ? "bg-ink font-semibold text-white" : "bg-card text-muted",
              )}
            >
              {label(p)}
            </button>
          ))}
        </div>
        <PhotoPicker label={busy ? "Saving" : copy.progress.addPhoto} disabled={busy} onFile={(f) => void onFile(f)} />
      </div>
      {error ? (
        <p role="alert" className="mx-4 mt-2 text-small text-danger">
          {error}
        </p>
      ) : null}

      {photos.length > 3 ? (
        <>
          <button
            type="button"
            onClick={() => setHistory(!history)}
            aria-expanded={history}
            className="mx-4 mt-2 flex min-h-11 w-[calc(100%-32px)] items-center justify-between text-small font-semibold text-muted"
          >
            <span>History ({photos.length})</span>
            <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className={cn("transition-transform", history && "rotate-180")} />
          </button>
          {history ? (
            <ul className="mt-1 flex snap-x gap-2 overflow-x-auto px-4 pb-2" aria-label="All photos, newest first">
              {photos.map((p) => (
                <li key={p.id} className="relative h-[104px] w-[78px] flex-none snap-start overflow-hidden rounded-inner bg-line">
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt={`${label(p.pose)} on ${p.takenOn}`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  ) : null}
                  <span className="absolute bottom-1 left-1 rounded-full bg-bg px-1.5 py-[1px] text-[11px] text-ink">
                    {label(p.pose).slice(0, 1)} {p.takenOn.slice(8)}/{p.takenOn.slice(5, 7)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {compare ? <CompareSheet photos={photos} onClose={() => setCompare(false)} onDelete={(id) => deletePhoto({ id }).then(() => router.refresh())} /> : null}
    </section>
  );
}

function CompareSheet({
  photos,
  onClose,
  onDelete,
}: {
  photos: ProgressPhoto[];
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [pose, setPose] = useState<(typeof POSES)[number]>("front");
  const same = photos.filter((p) => p.pose === pose && p.url);
  const [a, setA] = useState(0);
  const [b, setB] = useState(Math.max(0, same.length - 1));
  const [pos, setPos] = useState(50);
  const left = same[Math.min(a, same.length - 1)];
  const right = same[Math.min(b, same.length - 1)];

  return (
    <div role="dialog" aria-modal="true" aria-label={copy.progress.compare} className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
      <div className="sheet max-h-[92dvh] w-full max-w-app overflow-y-auto rounded-t-hero bg-bg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-section font-bold tracking-[-0.3px]">{copy.progress.compare}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-card">
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="flex gap-1" role="radiogroup" aria-label="Pose">
          {POSES.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={pose === p}
              onClick={() => {
                setPose(p);
                setA(0);
                setB(Math.max(0, photos.filter((x) => x.pose === p && x.url).length - 1));
              }}
              className={cn("min-h-11 rounded-full px-4 text-small", pose === p ? "bg-ink font-semibold text-white" : "bg-card text-muted")}
            >
              {label(p)}
            </button>
          ))}
        </div>
        {same.length < 2 || !left || !right ? (
          <p className="mt-4 text-small text-muted">Two photos of the same pose make a comparison.</p>
        ) : (
          <>
            <div className="relative mt-4 aspect-[3/4] w-full overflow-hidden rounded-list bg-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={right.url ?? ""} alt={`${label(pose)} on ${right.takenOn}`} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={left.url ?? ""} alt={`${label(pose)} on ${left.takenOn}`} className="h-full w-full object-cover" />
              </div>
              <div className="absolute inset-y-0 w-[2px] bg-bg" style={{ left: `${pos}%` }} />
            </div>
            <label className="mt-3 flex items-center gap-3">
              <span className="sr-only">Slider</span>
              <input
                type="range"
                min={0}
                max={100}
                value={pos}
                onChange={(e) => setPos(Number(e.target.value))}
                className="h-11 flex-1 accent-ink"
              />
            </label>
            <div className="mt-2 flex gap-3 text-small">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-muted">Left</span>
                <select value={a} onChange={(e) => setA(Number(e.target.value))} className="h-11 rounded-ctl border-0 bg-card px-3">
                  {same.map((p, i) => (
                    <option key={p.id} value={i}>
                      {p.takenOn}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-muted">Right</span>
                <select value={b} onChange={(e) => setB(Number(e.target.value))} className="h-11 rounded-ctl border-0 bg-card px-3">
                  {same.map((p, i) => (
                    <option key={p.id} value={i}>
                      {p.takenOn}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button variant="ghost" className="mt-2" onClick={() => onDelete(left.id)}>
              Delete the left photo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
