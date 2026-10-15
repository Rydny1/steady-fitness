"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Utensils, Footprints } from "lucide-react";
import { deleteEntry, updateFoodEntry } from "@/features/logging/actions";
import { Button } from "@/components/ui/button";
import type { ActivityItem, FoodItem } from "@/features/data/today";
import { copy } from "@/content/copy";

const nf = new Intl.NumberFormat("en-GB");

export function LogList({
  foods,
  activities,
  photoUrls,
}: {
  foods: FoodItem[];
  activities: ActivityItem[];
  photoUrls: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const count = foods.length + activities.length;
  const [editing, setEditing] = useState<FoodItem | null>(null);

  return (
    <section aria-labelledby="log-h">
      <div className="mx-4 mt-7 flex items-baseline justify-between">
        <h2 id="log-h" className="text-section font-bold tracking-[-0.3px]">
          {copy.today.todayLog}
        </h2>
        <span className="text-small text-muted">{copy.today.logs(count)}</span>
      </div>
      {count === 0 ? (
        <p className="mx-4 mt-3 text-small text-muted">{copy.today.emptyLog}</p>
      ) : (
        <ul className="mx-4 mt-2 flex flex-col" aria-busy={pending}>
          {foods.map((f) => (
            <li key={f.id} className="flex items-center gap-[14px] border-b border-line py-[10px]">
              <Thumb src={f.photoPath ? photoUrls[f.photoPath] : undefined} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-body">{f.name}</div>
                <div className="truncate text-[clamp(13px,3.8vw,14px)] text-muted">{f.detail}</div>
              </div>
              <div className="num text-[clamp(19px,5.9vw,22px)]">{nf.format(f.kcal)}</div>
              <button
                type="button"
                aria-label={`Edit ${f.name}`}
                onClick={() => setEditing(f)}
                className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-muted"
              >
                <Pencil size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <Remove
                label={`${copy.log.remove} ${f.name}`}
                onClick={() =>
                  startTransition(async () => {
                    await deleteEntry({ kind: "food", id: f.id });
                  })
                }
              />
            </li>
          ))}
          {activities.map((a) => (
            <li key={a.id} className="flex items-center gap-[14px] border-b border-line py-[10px] last:border-b-0">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] bg-train-soft">
                <Footprints size={22} strokeWidth={1.8} className="text-train" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-body">{a.name}</div>
                <div className="truncate text-[clamp(13px,3.8vw,14px)] text-muted">{a.detail}</div>
              </div>
              <div className="num text-[clamp(19px,5.9vw,22px)] text-train">+{nf.format(a.burned)}</div>
              <Remove
                label={`${copy.log.remove} ${a.name}`}
                onClick={() =>
                  startTransition(async () => {
                    await deleteEntry({ kind: "activity", id: a.id });
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}
      {editing ? <EditFood key={editing.id} item={editing} onClose={() => setEditing(null)} /> : null}
    </section>
  );
}

function Thumb({ src }: { src?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={48} height={48} className="h-12 w-12 flex-none rounded-[14px] object-cover" />;
  }
  return (
    <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] bg-card">
      <Utensils size={22} strokeWidth={1.8} className="text-muted" aria-hidden="true" />
    </div>
  );
}

function Remove({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-muted"
    >
      <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}

// Fix a saved entry after the fact: a misheard name, a wrong amount, or numbers to override.
function EditFood({ item, onClose }: { item: FoodItem; onClose: () => void }) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.quantity === null ? "" : String(item.quantity));
  const [kcal, setKcal] = useState(String(item.kcal));
  const [protein, setProtein] = useState(String(item.protein_g));
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  const n = (v: string) => {
    const t = v.trim().replace(",", ".");
    return t === "" ? null : Number(t);
  };

  function save(e: React.FormEvent) {
    e.preventDefault();
    const q = n(qty);
    const k = n(kcal);
    const pr = n(protein);
    // Only the amount (or name) changed: let the server work the numbers out again.
    const numbersTouched = kcal !== String(item.kcal) || protein !== String(item.protein_g);
    start(async () => {
      const res = await updateFoodEntry({
        id: item.id,
        name: name.trim(),
        quantity: q !== null && Number.isFinite(q) && q > 0 ? q : null,
        kcal: numbersTouched && k !== null && Number.isFinite(k) ? Math.round(k) : null,
        protein_g: numbersTouched && pr !== null && Number.isFinite(pr) ? pr : null,
      });
      if (res.ok) onClose();
      else setFailed(true);
    });
  }

  const field = (label: string, value: string, set: (v: string) => void, mode?: "decimal") => (
    <label className="flex flex-col gap-2">
      <span className="text-[clamp(13px,3.8vw,14px)] font-semibold">{label}</span>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        inputMode={mode}
        className="h-[54px] rounded-ctl border-0 bg-card px-4 text-body"
      />
    </label>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit entry" className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
      <form onSubmit={save} className="sheet w-full max-w-app rounded-t-hero p-6">
        <div className="flex flex-col gap-4">
          {field("Name", name, setName)}
          <div className="grid grid-cols-3 gap-3">
            {field(item.unit === "ml" ? "ml" : "Grams", qty, setQty, "decimal")}
            {field("kcal", kcal, setKcal, "decimal")}
            {field("Protein, g", protein, setProtein, "decimal")}
          </div>
          <p className="text-small text-muted">Change the grams and the calories follow. Change kcal to set your own.</p>
          {failed ? <p role="alert" className="text-small text-danger">Couldn&apos;t save. Try again.</p> : null}
        </div>
        <div className="mt-6 flex gap-2">
          <Button variant="secondary" big onClick={onClose}>
            Cancel
          </Button>
          <Button big type="submit" disabled={pending} className="flex-1">
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}
