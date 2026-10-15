"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedNote = { id: string; text: string; when: string };

/** The Coach's latest notes. Two sit under the newest one; older ones fold away and scroll. */
export function NotesFeed({ notes }: { notes: FeedNote[] }) {
  const [more, setMore] = useState(false);
  const recent = notes.slice(0, 2);
  const older = notes.slice(2);
  const row = (n: FeedNote, last: boolean) => (
    <li key={n.id} className={cn("py-3", !last && "border-b border-line")}>
      <div className="text-small leading-[1.4]">{n.text}</div>
      <div className="mt-0.5 text-caption text-muted">{n.when}</div>
    </li>
  );
  return (
    <>
      {recent.length > 0 ? <ul className="mx-4 mt-1">{recent.map((n, i) => row(n, i === recent.length - 1 && older.length === 0))}</ul> : null}
      {older.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setMore(!more)}
            aria-expanded={more}
            className="mx-4 flex min-h-11 w-[calc(100%-32px)] items-center justify-center gap-1 text-small font-semibold text-muted"
          >
            {more ? "Hide earlier" : `Earlier (${older.length})`}
            <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className={cn("transition-transform", more && "rotate-180")} />
          </button>
          {more ? <ul className="mx-4 max-h-72 overflow-y-auto rounded-list bg-card px-4">{older.map((n, i) => row(n, i === older.length - 1))}</ul> : null}
        </>
      ) : null}
    </>
  );
}
