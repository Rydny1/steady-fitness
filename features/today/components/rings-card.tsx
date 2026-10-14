import type { Rings } from "@/features/game";
import { copy } from "@/content/copy";

type Props = {
  rings: Rings;
  fuel: { eaten: number; budget: number };
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
  const label = `Rings: fuel ${Math.round(rings.fuel.progress * 100)} percent, protein ${Math.round(
    rings.protein.progress * 100,
  )} percent, train ${Math.round(rings.train.progress * 100)} percent`;
  return (
    <>
      <div className="mx-4 mt-6 flex items-center gap-5 rounded-hero bg-card px-5 py-6">
        <svg
          width="168"
          height="168"
          viewBox="0 0 180 180"
          role="img"
          aria-label={label}
          className="flex-none"
        >
          <g transform="rotate(-90 90 90)" fill="none" strokeWidth="17" strokeLinecap="round">
            <Ring r={R[0]} color="var(--fuel)" progress={rings.fuel.progress} />
            <Ring r={R[1]} color="var(--protein)" progress={rings.protein.progress} />
            <Ring r={R[2]} color="var(--train)" progress={rings.train.progress} />
          </g>
        </svg>
        <div className="flex min-w-0 flex-col gap-[14px]">
          <Stat
            label={copy.today.ringFuel}
            color="text-fuel"
            value={nf.format(fuel.eaten)}
            of={`/${nf.format(fuel.budget)} kcal`}
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
      <p className="mx-6 mt-3 text-small text-muted">{footer}</p>
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
      <div className="text-[14px] text-muted">{label}</div>
      <div className={`num text-[28px] leading-none ${color}`}>
        {value}
        <span className="text-[18px] text-muted">{of}</span>
      </div>
    </div>
  );
}
