import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { copy } from "@/content/copy";

export const metadata = { title: "Your data" };

export default function DataPage() {
  return (
    <main>
      <div className="px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <Link
          href="/settings"
          aria-label="Back to Profile"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card"
        >
          <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      <h1 className="mx-4 mt-5 text-title font-bold tracking-[-0.8px]">{copy.settings.yourData}</h1>
      <p className="mx-4 mt-2 text-body text-muted">
        One JSON file with every log and number, and a zip with every photo. Both are yours.
      </p>
      <div className="mx-4 mt-6 flex flex-col gap-3">
        <a
          href="/api/export"
          download
          className="flex h-14 items-center justify-center rounded-full bg-ink text-body font-semibold text-white"
        >
          {copy.settings.export}, JSON
        </a>
        <a
          href="/api/export/photos"
          download
          className="flex h-14 items-center justify-center rounded-full bg-card text-body font-semibold"
        >
          Photos, zip
        </a>
      </div>
    </main>
  );
}
