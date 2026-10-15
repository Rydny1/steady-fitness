import type { Rings } from "@/features/game";
import { copy } from "@/content/copy";
import { InfoTip } from "@/components/info-tip";

type Props = {
  rings: Rings;
  /** Net so far today (eaten minus the day's burn) and the target net, both signed. */
  fuel: { net: number; target: number; goal: "lose" | "gain" | "maintain" };
  protein: { eaten: number; target: number };
  train: { done: number; planned: number };
  footer: string;
};

const R = [78, 58, 38] as const;
const circumference = (r: number) => 2 * Math.PI * r;

function Ring({
  r,
  color,
  progress,
}: {
  r: number;
  color: string;
  progress: number;
}) {
  const len = circumference(r);
  const base = Math.min(1, progress);
  const over = Math.max(0, Math.min(1, progress - 1));
  return (
    <>
      <circle cx="90" cy="90" r={r} stroke={color} strokeOpacity="0.16" />
      <circle
        className="ring-arc"
        cx="90"
        cy="90"
        r={r}
        stroke={color}
        strokeDasharray={`${base * len} ${len}`}
        style={{ ["--ring-len" as string]: `${base * len}` }}
      />
      {over > 0 ? (
        <circle
          cx="90"
          cy="90"
          r={r}
          stroke={color}
          strokeDasharray={`${over * len} ${len}`}
          style={{ filter: "brightness(0.8)" }}
        />
      ) : null}
    </>
  );
}

const nf = new Intl.NumberFormat("en-GB");

export function RingsCard({ rings, fuel, protein, train, footer }: Props) {
  // Size of the deficit (or surplus when gaining) against the one you chose.
  const sign = fuel.goal === "gain" ? 1 : -1;
  const got = Math.max(0, sign * fuel.net);
  const want = Math.max(1, Math.abs(fuel.target));
  const deficitProgress = got / want;
  const label = `Rings: ${fuel.goal === "gain" ? "surplus" : "deficit"} ${Math.round(deficitProgress * 100)} percent, protein ${Math.round(
    rings.protein.progress * 100,
  )} percent, train ${Math.round(rings.train.progress * 100)} percent`;
  return (
    <>
      <div className="raised relative mx-4 mt-4 flex items-center gap-4 rounded-hero bg-card p-4">
        <InfoTip tip="rings" className="absolute right-2 top-2" />
        <svg
          viewBox="0 0 180 180"
          role="img"
          aria-label={label}
          className="h-auto w-[clamp(108px,32vw,140px)] flex-none"
        >
          <g transform="rotate(-90 90 90)" fill="none" strokeWidth="17" strokeLinecap="round">
            <Ring r={R[0]} color="var(--fuel)" progress={deficitProgress} />
            <Ring r={R[1]} color="var(--protein)" progress={rings.protein.progress} />
            <Ring r={R[2]} color="var(--train)" progress={rings.train.progress} />
          </g>
        </svg>
        <div className="flex min-w-0 flex-col gap-3">
          <Stat
            label={fuel.goal === "gain" ? "Surplus" : "Deficit"}
            color="text-fuel"
            value={nf.format(Math.round(got))}
            of={`/${nf.format(Math.round(want))} kcal`}
          />
          <Stat
            label={copy.today.ringProtein}
            color="text-protein"
            value={String(Math.round(protein.eaten))}
            of={`/${protein.target} g`}
          />
          <Stat
            label={copy.today.ringTrain}
            color="text-train"
            value={String(train.done)}
            of={`/${train.planned} min`}
          />
        </div>
      </div>
      <p className="mx-4 mt-3 text-small text-muted">{footer}</p>
    </>
  );
}

function Stat({
  label,
  color,
  value,
  of,
}: {
  label: string;
  color: string;
  value: string;
  of: string;
}) {
  return (
    <div>
      <div className="text-[clamp(13px,3.8vw,14px)] text-muted">{label}</div>
      <div className={`num text-[clamp(24px,7.18vw,27px)] leading-none ${color}`}>
        {value}
        <span className="text-[clamp(15px,4.62vw,17px)] text-muted">{of}</span>
      </div>
    </div>
  );
}
