"use client";

import { useEffect } from "react";
import { flushQueue } from "@/features/logging/offline-queue";

// Registers the service worker and sends any offline-queued taps when back online.
export function PwaBoot() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Not fatal: the app works without it, only push and offline shell are lost.
      });
    }
    void flushQueue();
    const onOnline = () => void flushQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
  return null;
}
