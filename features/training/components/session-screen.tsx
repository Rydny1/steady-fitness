"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { finishSession, saveSet, undoSet } from "../actions";
import { isNewBest, type LoggedSet } from "../progression";
import { ExerciseImage } from "@/components/exercise-image";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";

export type SessionExercise = {
  slug: string;
  name: string;
  muscle: string;
  sets: number;
  repMin: number | null;
  repMax: number | null;
  seconds: number | null;
  rest: number;
  tip: string;
  works: string;
  suggestedKg: number | null;
  lastLabel: string | null;
  history: LoggedSet[];
  swaps: { slug: string; name: string }[];
};

type SetState = { weight: string; reps: string; done: boolean };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function SessionScreen({
  sessionId,
  title,
  startedAt,
  exercises,
  doneSets,
}: {
  sessionId: string;
  title: string;
  startedAt: string;
  exercises: SessionExercise[];
  doneSets: { slug: string; setNo: number; reps: number | null; weight: number | null }[];
}) {
  const router = useRouter();
  const [list, setList] = useState(exercises);
  const [index, setIndex] = useState(0);
  const ex = list[index];

  const initial = useMemo(() => {
    const map: Record<string, SetState[]> = {};
    for (const e of exercises) {
      map[e.slug] = Array.from({ length: e.sets }, (_, i) => {
        const saved = doneSets.find((d) => d.slug === e.slug && d.setNo === i + 1);
        return {
          weight: saved ? String(saved.weight ?? "") : e.suggestedKg !== null ? String(e.suggestedKg) : "",
          reps: saved ? String(saved.reps ?? "") : "",
          done: Boolean(saved),
        };
      });
    }
    return map;
  }, [exercises, doneSets]);
  const [state, setState] = useState<Record<string, SetState[]>>(initial);

  const [elapsed, setElapsed] = useState(0);
  const [restLeft, setRestLeft] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(90);
  const [best, setBest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [finishing, setFinishing] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const started = useRef(new Date(startedAt).getTime());

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (restLeft === null) return;
    if (restLeft <= 0) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(60);
      setRestLeft(null);
      return;
    }
    const t = setTimeout(() => setRestLeft((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [restLeft]);

  if (!ex) return null;
  const sets = state[ex.slug] ?? [];
  const timed = ex.seconds !== null && ex.repMin === null;
  const nextUp = list[index + 1];
  const nextOpen = sets.findIndex((s) => !s.done);

  function patch(slug: string, i: number, p: Partial<SetState>) {
    setState((prev) => ({
      ...prev,
      [slug]: (prev[slug] ?? []).map((s, j) => (j === i ? { ...s, ...p } : s)),
    }));
  }

  function toggleSet(i: number) {
    const s = sets[i];
    if (!s || !ex) return;
    if (s.done) {
      patch(ex.slug, i, { done: false });
      startTransition(async () => {
        await undoSet({ sessionId, exerciseSlug: ex.slug, setNo: i + 1 });
      });
      return;
    }
    const reps = timed ? null : Math.round(Number(s.reps.replace(",", ".")));
    const seconds = timed ? (ex.seconds ?? 30) : null;
    const weight = s.weight.trim() === "" ? 0 : Number(s.weight.replace(",", "."));
    if (!timed && (!Number.isFinite(reps ?? NaN) || (reps ?? 0) < 0)) {
      setError("Enter the reps for this set.");
      return;
    }
    if (!Number.isFinite(weight) || weight < 0) {
      setError("Check the weight.");
      return;
    }
    setError(null);
    patch(ex.slug, i, { done: true });
    if (!timed && isNewBest(ex.history, { weightKg: weight, reps: reps ?? 0 })) {
      setBest(`${copy.train.newBest}: ${ex.name}, ${weight} kg x ${reps}`);
    }
    setRestTotal(ex.rest);
    setRestLeft(ex.rest);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(20);
    startTransition(async () => {
      const res = await saveSet({
        sessionId,
        exerciseSlug: ex.slug,
        setNo: i + 1,
        reps,
        weightKg: weight,
        seconds,
      });
      if (!res.ok) {
        patch(ex.slug, i, { done: false });
        setError(copy.errors.generic);
      }
    });
  }

  function swapTo(slug: string) {
    const replacement = ex?.swaps.find((s) => s.slug === slug);
    if (!replacement || !ex) return;
    // Same muscle group, same slot, fresh sets. History comes from the library card.
    setList((prev) =>
      prev.map((e, i) =>
        i === index
          ? { ...e, slug: replacement.slug, name: replacement.name, suggestedKg: null, lastLabel: null, history: [] }
          : e,
      ),
    );
    setState((prev) => ({
      ...prev,
      [slug]: Array.from({ length: ex.sets }, () => ({ weight: "", reps: "", done: false })),
    }));
    setSwapOpen(false);
  }

  function finish() {
    startTransition(async () => {
      const res = await finishSession({ sessionId, rpe });
      if (res.ok) {
        router.push("/today");
        router.refresh();
      } else {
        setError("Log at least one set before you finish.");
        setFinishing(false);
      }
    });
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex items-center gap-3 px-4 pt-[52px]">
        <Link
          href="/train"
          aria-label="Pause session"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-card"
        >
          <X size={20} strokeWidth={2} aria-hidden="true" />
        </Link>
        <div className="flex-1">
          <div className="text-body font-semibold">{title}</div>
          <div className="text-[14px] text-muted">
            Exercise {index + 1} of {list.length}
          </div>
        </div>
        <span className="num text-[26px]" aria-label="Session time">
          {fmt(elapsed)}
        </span>
      </div>

      <div className="mx-4 mt-[14px] grid gap-1" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0, 1fr))` }}>
        {list.map((e, i) => {
          const all = (state[e.slug] ?? []).every((s) => s.done);
          return (
            <button
              key={e.slug + i}
              type="button"
              aria-label={`Go to ${e.name}`}
              onClick={() => setIndex(i)}
              className="flex h-6 items-center"
            >
              <span
                className={cn(
                  "h-[6px] w-full rounded-full",
                  all ? "bg-train" : i === index ? "bg-train opacity-45" : "bg-line",
                )}
              />
            </button>
          );
        })}
      </div>

      <ExerciseImage slug={ex.slug} name={ex.name} className="mx-4 mt-[18px] h-[170px] rounded-list" />
      <div className="mx-6 mt-4">
        <div className="text-[26px] font-bold tracking-[-0.4px]">{ex.name}</div>
        <div className="mt-[2px] text-small text-muted">
          {ex.sets} x {timed ? `${ex.seconds} s` : `${ex.repMin}${ex.repMax && ex.repMax !== ex.repMin ? `-${ex.repMax}` : ""}`}, rest {ex.rest} s. {ex.works}
        </div>
        <div className="mt-[10px] text-[16px] leading-[1.4]">
          <span className="font-semibold">{copy.train.tip}:</span> {ex.tip}
        </div>
        {ex.swaps.length > 0 ? (
          <button
            type="button"
            onClick={() => setSwapOpen(true)}
            className="mt-2 min-h-11 text-small font-semibold text-protein"
          >
            {copy.train.swap}
          </button>
        ) : null}
      </div>

      <div className="mx-4 mt-4 rounded-list bg-card px-4 py-[6px]">
        {sets.map((s, i) => (
          <div
            key={i}
            className={cn(
              "grid min-h-[56px] grid-cols-[44px_1fr_1fr_48px] items-center gap-2 text-[16px]",
              i < sets.length - 1 && "border-b border-line",
            )}
          >
            <span className={cn(s.done ? "text-muted" : "font-semibold")}>Set {i + 1}</span>
            {timed ? (
              <span className="num col-span-2 text-[22px]">{ex.seconds} s hold</span>
            ) : (
              <>
                <label className="flex h-11 items-center gap-1 rounded-[12px] bg-bg px-[10px]">
                  <input
                    value={s.weight}
                    onChange={(e) => patch(ex.slug, i, { weight: e.target.value })}
                    disabled={s.done}
                    inputMode="decimal"
                    aria-label={`Set ${i + 1} weight in kg`}
                    className="num w-10 flex-1 border-0 bg-transparent text-[22px]"
                  />
                  <span className="text-[14px] text-muted">kg</span>
                </label>
                <label className="flex h-11 items-center gap-1 rounded-[12px] bg-bg px-[10px]">
                  <input
                    value={s.reps}
                    onChange={(e) => patch(ex.slug, i, { reps: e.target.value })}
                    disabled={s.done}
                    inputMode="numeric"
                    placeholder={String(ex.repMin ?? "")}
                    aria-label={`Set ${i + 1} reps`}
                    className="num w-10 flex-1 border-0 bg-transparent text-[22px]"
                  />
                  <span className="text-[14px] text-muted">reps</span>
                </label>
              </>
            )}
            <button
              type="button"
              aria-label={s.done ? `Undo set ${i + 1}` : `Set ${i + 1} done`}
              aria-pressed={s.done}
              onClick={() => toggleSet(i)}
              className={cn(
                "flex h-11 w-11 items-center justify-center justify-self-end rounded-full",
                s.done ? "bg-fuel text-white" : "border-2 border-dash bg-bg",
                i === nextOpen && !s.done && "border-ink",
              )}
            >
              {s.done ? <Check size={16} strokeWidth={2.8} aria-hidden="true" /> : null}
            </button>
          </div>
        ))}
      </div>
      <div className="mx-6 mt-[10px] text-[14px] text-muted">
        {ex.lastLabel ? `${copy.train.lastTime} ${ex.lastLabel}` : "No history for this exercise yet"}
      </div>
      {best ? (
        <p role="status" className="mx-6 mt-2 text-small font-semibold text-fuel-ink">
          {best}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mx-6 mt-2 text-small text-danger">
          {error}
        </p>
      ) : null}

      {restLeft !== null ? (
        <div className="mx-4 mt-[18px] rounded-list bg-ink px-[18px] py-4 text-white" role="timer" aria-label="Rest timer">
          <div className="flex items-baseline justify-between">
            <span className="text-small text-muted-dark">{copy.train.restTimer}</span>
            <span className="num text-[32px] leading-none">{fmt(restLeft)}</span>
          </div>
          <div className="mt-[10px] h-2 overflow-hidden rounded-full bg-ink-line">
            <div
              className="h-2 rounded-full bg-train"
              style={{ width: `${Math.max(0, Math.min(100, (1 - restLeft / restTotal) * 100))}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex-1" />
      <div className="flex items-center gap-[10px] px-4 pb-9 pt-6">
        <div className="min-w-0 flex-1">
          {nextUp ? (
            <button type="button" onClick={() => setIndex(index + 1)} className="min-h-11 text-left">
              <div className="text-caption text-muted">{copy.train.next}</div>
              <div className="truncate text-[16px] font-semibold">{nextUp.name}</div>
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setFinishing(true)}
          className="h-[54px] rounded-full bg-card px-[22px] text-[16px] font-semibold"
        >
          {copy.train.finish}
        </button>
      </div>

      {swapOpen ? (
        <Sheet label={copy.train.swap} onClose={() => setSwapOpen(false)}>
          <ul className="flex flex-col">
            {ex.swaps.map((s) => (
              <li key={s.slug}>
                <button
                  type="button"
                  onClick={() => swapTo(s.slug)}
                  className="flex min-h-[52px] w-full items-center border-b border-line text-left text-body"
                >
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      ) : null}

      {finishing ? (
        <Sheet label={copy.train.finish} onClose={() => setFinishing(false)}>
          <p className="text-small text-muted">How hard was it? 1 easy, 10 all out.</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={rpe === n}
                onClick={() => setRpe(n)}
                className={cn(
                  "num h-11 rounded-full text-[20px]",
                  rpe === n ? "bg-ink text-white" : "bg-card text-ink",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={finish}
            className="mt-5 h-14 w-full rounded-full bg-ink text-body font-semibold text-white"
          >
            {copy.train.finish}
          </button>
        </Sheet>
      ) : null}
    </main>
  );
}

function Sheet({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
      <div className="sheet max-h-[80dvh] w-full max-w-app overflow-y-auto rounded-t-hero bg-bg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-section font-bold tracking-[-0.3px]">{label}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-card">
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
