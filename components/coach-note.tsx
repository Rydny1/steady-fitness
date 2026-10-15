import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** The Coach's callout: the one warm, raised card on a screen, so it is the thing you notice. */
export function CoachNote({
  eyebrow = "The Coach noticed",
  children,
  className,
}: {
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("coach", className)} aria-label={eyebrow}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ink text-white">
          <MessageCircle size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="coach-eyebrow text-caption">{eyebrow}</span>
      </div>
      <div className="mt-2 text-body leading-[1.4] text-ink">{children}</div>
    </section>
  );
}
