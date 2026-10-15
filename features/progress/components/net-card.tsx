"use client";

import { useEffect, useState } from "react";
import { InfoTip } from "@/components/info-tip";
import { signed } from "@/features/nutrition/energy";
import { monthNeed, paceSentence, type NetProjection } from "@/features/nutrition/projection";
import { getNetInsight } from "../insight";
import { NetChart } from "./charts";
import type { NetBar } from "@/features/data/progress";

type Goal = "lose" | "gain" | "maintain";

/** Net calories: eaten minus burned. The number that moves your weight. */
export function NetCard({
  bars,
  goal,
  targetNet,
  projection,
  insightKey,
}: {
  bars: NetBar[];
  goal: Goal;
  targetNet: number;
  projection: NetProjection;
  insightKey: string;
}) {
  const plain = [paceSentence(projection), monthNeed(projection)].filter(Boolean).join(" ");
  const [text, setText] = useState(plain);
  const [ai, setAi] = useState(false);

  useEffect(() => {
    let live = true;
    setText(plain);
    setAi(false);
    if (projection.avgNet === null) return;
    getNetInsight({ key: insightKey, ...projection, goal })
      .then((r) => {
        if (live && r.text) {
          setText(r.text);
          setAi(r.ai);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insightKey]);

  const word = goal === "lose" ? "deficit" : goal === "gain" ? "surplus" : "balance";
  return (
    <section className="mx-4 mt-3 rounded-hero bg-card p-[22px]" aria-label="Net calories">
      <div className="flex items-center justify-between">
        <span className="flex items-center text-[clamp(15px,4.62vw,17px)] font-bold">
          Net calories
          <InfoTip tip="energyBalance" className="-my-3 -ml-1" />
        </span>
        {projection.avgNet !== null ? (
          <span className="text-small text-muted">
            avg <span className="num text-[clamp(16px,4.6vw,18px)] text-ink">{signed(projection.avgNet)}</span> a day
          </span>
        ) : null}
      </div>
      <NetChart bars={bars} goal={goal} targetNet={targetNet} />
      <div className="mt-1 flex justify-between text-caption text-muted">
        <span>Dashed: your daily {word} target</span>
        <span className="num">{signed(targetNet)}</span>
      </div>
      <p className={"mt-3 text-body leading-[1.4] " + (ai ? "neon-text" : "text-ink")} aria-live="polite">
        {text}
      </p>
    </section>
  );
}
