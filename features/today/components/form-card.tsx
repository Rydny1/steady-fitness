import Link from "next/link";
import type { TodayData } from "@/features/data/today";
import { copy } from "@/content/copy";

export function FormCard({ d }: { d: TodayData }) {
  const { comparison } = d.match;
  return (
    <section className="mx-4 mt-4 rounded-hero bg-card p-6" aria-label="Form">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-small text-muted">{copy.today.youAre}</div>
          <div className="num text-form tracking-[0.2px]">{d.form.name}</div>
        </div>
        <div className="text-right">
          <div className="text-small text-muted">{copy.today.callus}</div>
          <div className="num text-form">{d.form.callus}</div>
        </div>
      </div>
      <div
        className="mt-[18px] h-[10px] overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={copy.today.callus}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={d.form.callus}
      >
        <div
          className="bar-fill h-[10px] rounded-full bg-amber"
          style={{ width: `${d.form.callus}%` }}
        />
      </div>
      <div className="mt-[10px] flex justify-between text-[14px] text-muted">
        <span>{copy.today.chapterLine(d.chapter.n, d.chapter.name)}</span>
        <span>
          {d.chapter.toNext
            ? copy.today.toNext(d.chapter.toNext.days, d.chapter.toNext.name)
            : copy.today.atTop}
        </span>
      </div>
      <p className="mt-[18px] text-[18px] font-medium leading-[1.35]">{d.form.gafferLine}</p>

      <Link
        href="/progress#challenges"
        className="mt-[18px] flex min-h-11 items-center justify-between rounded-inner bg-ink px-4 py-[14px] text-white"
      >
        <span className="text-small text-muted-dark">{copy.today.vsLastWeek}</span>
        {comparison.noGhost ? (
          <span className="text-small text-muted-dark">{copy.today.noGhost}</span>
        ) : (
          <span className="num text-[24px] leading-none">
            {comparison.scoreYou} <span className="text-[#6b7178]">-</span>{" "}
            <span className="text-muted-dark">{comparison.scoreGhost}</span>
          </span>
        )}
      </Link>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Tile value={String(d.streak)} label={copy.today.streak} />
        <Tile value={String(d.careerDays)} label={copy.today.career} />
        <Tile
          value={String(d.trophiesEarned)}
          suffix={`/${d.trophiesTotal}`}
          label={copy.today.trophies}
        />
      </div>
    </section>
  );
}

function Tile({ value, suffix, label }: { value: string; suffix?: string; label: string }) {
  return (
    <div className="rounded-inner bg-bg px-[14px] py-3">
      <div className="num text-[26px] leading-none">
        {value}
        {suffix ? <span className="text-[17px] text-muted">{suffix}</span> : null}
      </div>
      <div className="mt-[2px] text-caption text-muted">{label}</div>
    </div>
  );
}
