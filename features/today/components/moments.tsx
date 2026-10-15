"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/toast";

type Props = {
  name: string;
  streak: number;
  /** True when the person was just sent here after saving a log. */
  saved: boolean;
  /** The plain line about what is left today. */
  status: string;
  /** True the first time Today opens after the person signed in or enrolled. */
};

const KEY = "steady-welcomed";

// Small pop-ups for moments: saved a log, or opened the app. One at a time, never twice in a row.
export function Moments({ name, streak, saved, status }: Props) {
  const [kind, setKind] = useState<"saved" | "hello" | null>(null);

  useEffect(() => {
    if (saved) {
      setKind("saved");
      // Drop the flag from the address so a refresh does not show it again.
      window.history.replaceState(null, "", "/today");
      return;
    }
    try {
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, "1");
        setKind("hello");
      }
    } catch {
      /* private mode: skip the welcome */
    }
  }, [saved]);

  if (kind === "saved") return <Toast message="Logged." detail={status} onGone={() => setKind(null)} />;
  if (kind === "hello") {
    return (
      <Toast
        tone="hello"
        message={`Welcome back, ${name}.`}
        detail={streak > 1 ? `Day ${streak} in a row. Keep it going.` : "Good to see you."}
        onGone={() => setKind(null)}
      />
    );
  }
  return null;
}
