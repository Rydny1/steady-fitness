"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, Dumbbell, Mic, Utensils } from "lucide-react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";

const items = [
  { href: "/today", label: copy.nav.today, Icon: Activity },
  { href: "/train", label: copy.nav.train, Icon: Dumbbell },
  { href: "/fuel", label: copy.nav.fuel, Icon: Utensils },
  { href: "/progress", label: copy.nav.progress, Icon: BarChart3 },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const tab = (it: (typeof items)[number]) => (
    <Link
      key={it.href}
      href={it.href}
      aria-current={active(it.href) ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-0.5 text-nav",
        active(it.href) ? "font-semibold text-ink" : "text-muted",
      )}
    >
      <it.Icon size={24} strokeWidth={active(it.href) ? 1.9 : 1.8} aria-hidden="true" />
      {it.label}
    </Link>
  );

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid h-16 max-w-app grid-cols-5 items-center">
        {tab(items[0])}
        {tab(items[1])}
        <Link
          href="/log"
          aria-label={copy.nav.log}
          className="-mt-6 flex justify-center"
        >
          <span className="neon-ring flex h-16 w-16 items-center justify-center rounded-full">
            <span className="flex h-full w-full items-center justify-center rounded-full bg-ink">
              <Mic size={26} strokeWidth={1.9} className="text-white" aria-hidden="true" />
            </span>
          </span>
        </Link>
        {tab(items[2])}
        {tab(items[3])}
      </div>
    </nav>
  );
}
