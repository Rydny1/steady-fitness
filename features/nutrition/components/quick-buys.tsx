"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { saveEntries } from "@/features/logging/actions";
import { enqueue } from "@/features/logging/offline-queue";
import { copy } from "@/content/copy";

export type QuickBuy = {
  slug: string;
  name: string;
  detail: string;
  kcal: number;
  protein: number;
  image: string | null;
};

// Tap an item to log it for today. Offline taps queue and send later.
export function QuickBuys({ items, day }: { items: QuickBuy[]; day: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function log(q: QuickBuy) {
    const input = {
      day,
      logId: null,
      source: "tap" as const,
      items: [
        {
          kind: "food" as const,
          name: q.name,
          quantity: null,
          unit: null,
          kcal: q.kcal,
          protein_g: q.protein,
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
      setNote(res.ok ? `${q.name}. ${copy.log.saved}` : copy.errors.generic);
      if (res.ok) router.refresh();
    });
  }

  return (
    <>
      <ul className="mx-4 mt-[14px] grid grid-cols-2 gap-x-3 gap-y-[18px]">
        {items.map((q) => (
          <li key={q.slug}>
            <button
              type="button"
              disabled={pending}
              onClick={() => log(q)}
              className="block w-full text-left"
              aria-label={`Log ${q.name}`}
            >
              <span className="relative block aspect-square overflow-hidden rounded-tile bg-line">
                {q.image ? (
                  <Image src={q.image} alt="" fill sizes="(max-width: 520px) 45vw, 230px" className="object-cover" />
                ) : null}
              </span>
              <span className="mt-2 block text-[clamp(13px,4.10vw,15px)] font-semibold">{q.name}</span>
              <span className="block text-[clamp(13px,3.8vw,14px)] text-muted">{q.detail}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mx-4 mt-3 min-h-5 text-small text-muted" role="status" aria-live="polite">
        {note}
      </p>
    </>
  );
}
