import { Check, Minus, TriangleAlert } from "lucide-react";
import { InfoTip } from "@/components/info-tip";
import { signed, type BalanceRead, type Goal } from "@/features/nutrition/energy";
import { cn } from "@/lib/utils";

/** One calm line: your net so far today against the target, or yesterday's net. */
export function EnergyLine({
  goal,
  targetNet,
  todayNet,
  yesterdayNet,
  read,
}: {
  goal: Goal;
  targetNet: number;
  todayNet: number | null;
  yesterdayNet: number | null;
  plannedNet: number;
  read: BalanceRead | null;
}) {
  if (todayNet === null && yesterdayNet === null) return null;
  const tone = todayNet !== null ? "okay" : (read?.tone ?? "okay");
  const Icon = tone === "good" ? Check : tone === "off" ? TriangleAlert : Minus;
  const word = goal === "gain" ? "surplus" : "deficit";
  return (
    <div className="mx-4 mt-2 flex items-start gap-2">
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-white",
          tone === "good" ? "bg-fuel" : tone === "off" ? "bg-train" : "bg-muted",
        )}
      >
        <Icon size={12} strokeWidth={2.6} aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 text-small text-ink-2">
        {todayNet !== null ? (
          <>
            Net today <span className="num text-[clamp(16px,4.6vw,18px)]">{signed(todayNet)}</span>. Target{" "}
            <span className="num text-[clamp(16px,4.6vw,18px)]">{signed(targetNet)}</span> a {word}.
          </>
        ) : (
          <>
            Yesterday <span className="num text-[clamp(16px,4.6vw,18px)]">{signed(yesterdayNet ?? 0)}</span> net. {read?.label}
          </>
        )}
      </p>
      <InfoTip tip="energyBalance" className="-mr-3 -mt-3" />
    </div>
  );
}
