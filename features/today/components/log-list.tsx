"use client";

import { useTransition } from "react";
import { Trash2, Utensils, Footprints } from "lucide-react";
import { deleteEntry } from "@/features/logging/actions";
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
                <div className="truncate text-[clamp(12px,3.59vw,13px)] text-muted">{f.detail}</div>
              </div>
              <div className="num text-[clamp(18px,5.64vw,21px)]">{nf.format(f.kcal)}</div>
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
                <div className="truncate text-[clamp(12px,3.59vw,13px)] text-muted">{a.detail}</div>
              </div>
              <div className="num text-[clamp(18px,5.64vw,21px)] text-train">+{nf.format(a.burned)}</div>
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
