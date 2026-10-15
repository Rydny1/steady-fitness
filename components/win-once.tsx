"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/toast";

/** A small celebration that shows once per id (per device), then never again. */
export function WinOnce({ id, message, detail }: { id: string; message: string; detail?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const key = `steady-win-${id}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* private mode: show it anyway */
    }
    setShow(true);
    if ("vibrate" in navigator) navigator.vibrate?.(30);
  }, [id]);
  return show ? <Toast tone="hello" message={message} detail={detail} onGone={() => setShow(false)} /> : null;
}
