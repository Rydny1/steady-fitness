"use client";

import { saveEntries } from "./actions";
import type { SaveEntriesInput } from "./schema";

// Tap logs made offline wait here and go out when the phone is back online.
// Small by design: only tap entries (saved foods, barcode results), never AI.

const KEY = "steady.queue.v1";

type Queued = { id: string; input: SaveEntriesInput };

function read(): Queued[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Queued[]) : [];
  } catch {
    return [];
  }
}

function write(items: Queued[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked. Nothing more to do.
  }
}

export function queuedCount(): number {
  return read().length;
}

export function enqueue(input: SaveEntriesInput): void {
  write([...read(), { id: crypto.randomUUID(), input }]);
}

let flushing = false;

/** Sends queued entries in order. Stops at the first failure and keeps the rest. */
export async function flushQueue(): Promise<number> {
  if (flushing || typeof navigator === "undefined" || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    let items = read();
    while (items.length > 0) {
      const next = items[0];
      if (!next) break;
      const res = await saveEntries(next.input);
      if (!res.ok) break;
      items = items.slice(1);
      write(items);
      sent += 1;
    }
  } catch {
    // Network dropped mid-send. The remaining items stay queued.
  } finally {
    flushing = false;
  }
  return sent;
}
