"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { deleteRecipe, saveRecipe } from "../actions";
import { saveEntries } from "@/features/logging/actions";
import { enqueue } from "@/features/logging/offline-queue";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

export type MyRecipe = { id: string; name: string; kcal: number; protein_g: number };

// Your own recipes. Saved here, they become one-tap logs, same as saved foods.
export function MyRecipes({ recipes, day }: { recipes: MyRecipe[]; day: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function log(r: MyRecipe) {
    const input = {
      day,
      logId: null,
      source: "saved" as const,
      items: [
        {
          kind: "food" as const,
          name: r.name,
          quantity: 1,
          unit: "portion",
          kcal: r.kcal,
          protein_g: Number(r.protein_g),
          confidence: 1,
        },
      ],
    };
    if (!navigator.onLine) {
      enqueue(input);
      setNote(copy.log.offline);
      return;
    }
    start(async () => {
      const res = await saveEntries(input);
      setNote(res.ok ? `${r.name}. ${copy.log.saved}` : copy.errors.generic);
      if (res.ok) router.refresh();
    });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const kcal = Math.round(Number(String(f.get("kcal") ?? "").replace(",", ".")));
    const protein = Number(String(f.get("protein") ?? "").replace(",", "."));
    start(async () => {
      const res = await saveRecipe({ name: String(f.get("name") ?? ""), kcal, proteinG: protein });
      if (res.ok) {
        setOpen(false);
        setError(null);
        router.refresh();
      } else {
        setError(res.reason === "duplicate" ? "You already have a recipe with that name." : copy.errors.invalid);
      }
    });
  }

  return (
    <section aria-labelledby="mine-h" className="mt-8">
      <div className="mx-6 flex items-center justify-between">
        <h2 id="mine-h" className="text-section font-bold tracking-[-0.3px]">
          {copy.fuel.mine}
        </h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 items-center gap-1 text-small font-semibold"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          {copy.fuel.addRecipe}
        </button>
      </div>
      {recipes.length === 0 ? (
        <p className="mx-6 mt-2 text-small text-muted">{copy.fuel.mineEmpty}</p>
      ) : (
        <ul className="mx-4 mt-3 rounded-list bg-card px-[18px]">
          {recipes.map((r, i) => (
            <li key={r.id} className={`flex min-h-[56px] items-center gap-2 ${i < recipes.length - 1 ? "border-b border-line" : ""}`}>
              <button
                type="button"
                disabled={pending}
                onClick={() => log(r)}
                className="min-h-11 min-w-0 flex-1 text-left"
                aria-label={`Log ${r.name}`}
              >
                <span className="block truncate text-body">{r.name}</span>
                <span className="block text-[14px] text-muted">
                  {r.kcal} kcal, {Math.round(Number(r.protein_g))} g protein a portion
                </span>
              </button>
              <button
                type="button"
                aria-label={`Delete ${r.name}`}
                onClick={() =>
                  start(async () => {
                    await deleteRecipe({ id: r.id });
                    router.refresh();
                  })
                }
                className="flex h-11 w-11 items-center justify-center text-muted"
              >
                <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mx-6 mt-2 min-h-5 text-small text-muted" role="status" aria-live="polite">
        {note}
      </p>

      {open ? (
        <div role="dialog" aria-modal="true" aria-label={copy.fuel.addRecipe} className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
          <form onSubmit={submit} className="sheet w-full max-w-app rounded-t-hero bg-bg p-6">
            <h2 className="text-section font-bold tracking-[-0.3px]">{copy.fuel.addRecipe}</h2>
            <div className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-[14px] font-semibold">Name</span>
                <input name="name" maxLength={80} required className="h-[54px] rounded-ctl border-0 bg-card px-4 text-body" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-2">
                  <span className="text-[14px] font-semibold">kcal a portion</span>
                  <input name="kcal" inputMode="numeric" required className="num h-[54px] rounded-ctl border-0 bg-card px-4 text-[24px]" />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-[14px] font-semibold">Protein, g a portion</span>
                  <input name="protein" inputMode="decimal" required className="num h-[54px] rounded-ctl border-0 bg-card px-4 text-[24px]" />
                </label>
              </div>
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-small text-danger">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" big onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" big disabled={pending} className="flex-1">
                Save recipe
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
