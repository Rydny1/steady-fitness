"use client";

import { useState } from "react";
import { ExerciseCards, type CardExercise } from "./exercise-cards";
import { copy } from "@/content/copy";
import { capitalize, cn } from "@/lib/utils";

const MUSCLES = ["chest", "back", "shoulders", "arms", "legs", "core"] as const;
const label = capitalize;

export function Library({ byMuscle }: { byMuscle: Record<string, CardExercise[]> }) {
  const [muscle, setMuscle] = useState<(typeof MUSCLES)[number]>("chest");
  const list = byMuscle[muscle] ?? [];
  return (
    <section aria-labelledby="library-h" className="mt-8">
      <h2 id="library-h" className="mx-6 text-section font-bold tracking-[-0.3px]">
        {copy.train.library}
      </h2>
      <div className="mx-4 mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Muscle">
        {MUSCLES.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={muscle === m}
            onClick={() => setMuscle(m)}
            className={cn(
              "min-h-11 rounded-full px-4 text-small",
              muscle === m ? "bg-ink font-semibold text-white" : "bg-card text-muted",
            )}
          >
            {label(m)}
          </button>
        ))}
      </div>
      <ExerciseCards key={muscle} items={list} startOpen={false} numbered={false} />
    </section>
  );
}
