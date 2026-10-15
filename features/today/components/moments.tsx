"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/toast";
import { StreakCelebration } from "./streak-celebration";

type Dot = { day: string; letter: string; pct: number; today: boolean; future: boolean; logged: boolean };

type Props = {
  name: string;
  day: string;
  streak: number;
  week: Dot[];
  loggedToday: boolean;
  /** True when the person was just sent here after saving a log. */
  saved: boolean;
  /** The plain line about the deficit today. */
  status: string;
  proteinHit: boolean;
  trained: boolean;
  /** Something bigger (a trophy or level card) is already on screen: stay quiet. */
  quiet: boolean;
};

type Item = { kind: "streak" } | { kind: "saved" } | { kind: "hello" } | { kind: "protein" } | { kind: "train" };

const once = (key: string): boolean => {
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
};

// Small pop-ups for small wins, one at a time: first log of the day, saved, welcome back,
// protein target, training done. Each shows once a day.
export function Moments({ name, day, streak, week, loggedToday, saved, status, proteinHit, trained, quiet }: Props) {
  const [queue, setQueue] = useState<Item[]>([]);

  useEffect(() => {
    if (quiet) return;
    const q: Item[] = [];
    if (loggedToday && once(`steady-win-streak-${day}`)) q.push({ kind: "streak" });
    else if (saved) q.push({ kind: "saved" });
    else {
      try {
        if (!sessionStorage.getItem("steady-welcomed")) {
          sessionStorage.setItem("steady-welcomed", "1");
          q.push({ kind: "hello" });
        }
      } catch {
        /* private mode: skip the welcome */
      }
    }
    if (proteinHit && once(`steady-win-protein-${day}`)) q.push({ kind: "protein" });
    if (trained && once(`steady-win-train-${day}`)) q.push({ kind: "train" });
    if (saved) window.history.replaceState(null, "", "/today");
    setQueue(q);
  }, [quiet, loggedToday, saved, proteinHit, trained, day]);

  const head = queue[0];
  const pop = () => setQueue((q) => q.slice(1));
  if (!head) return null;

  if (head.kind === "streak") return <StreakCelebration streak={streak} week={week} onClose={pop} />;
  if (head.kind === "saved") return <Toast message="Logged." detail={status} onGone={pop} />;
  if (head.kind === "protein") return <Toast message="Protein target hit." detail="Muscle stays." onGone={pop} />;
  if (head.kind === "train") return <Toast message="Training done." detail="That's the hard part." onGone={pop} />;
  return (
    <Toast
      tone="hello"
      message={`Welcome back, ${name}.`}
      detail={loggedToday ? (streak > 1 ? `${streak} days in a row.` : "Good to see you.") : streak > 0 ? `Log today to keep your ${streak}-day streak.` : "Log today to start a streak."}
      onGone={pop}
    />
  );
}
