"use client";

import { useEffect } from "react";

// One place that gives every modal sheet the keyboard behaviour it needs:
// focus moves into the sheet when it opens and returns when it closes, Tab stays inside,
// and Escape closes it (through its own Close or Cancel button, so each sheet keeps its logic).

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function topDialog(): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
  return all.length > 0 ? (all[all.length - 1] ?? null) : null;
}

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

export function DialogGuard() {
  useEffect(() => {
    let current: HTMLElement | null = null;
    let returnTo: HTMLElement | null = null;

    const sync = () => {
      const top = topDialog();
      if (top === current) return;
      if (!top && returnTo?.isConnected) returnTo.focus();
      if (top && !current) returnTo = document.activeElement as HTMLElement | null;
      current = top;
      if (top && !top.contains(document.activeElement)) {
        const first = focusables(top).find((el) => !el.matches('[aria-label="Close"]')) ?? focusables(top)[0];
        first?.focus();
      }
      if (!top) returnTo = null;
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    const onKey = (e: KeyboardEvent) => {
      const top = topDialog();
      if (!top) return;
      if (e.key === "Escape") {
        const close =
          top.querySelector<HTMLElement>('button[aria-label="Close"]') ??
          Array.from(top.querySelectorAll<HTMLElement>("button")).find((b) => b.textContent?.trim() === "Cancel");
        if (close) {
          e.preventDefault();
          close.click();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables(top);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!top.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}
