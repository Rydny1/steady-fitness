import Link from "next/link";
import type { TodayData } from "@/features/data/today";
import { copy } from "@/content/copy";
import { InfoTip } from "@/components/info-tip";

export function FormCard({ d }: { d: TodayData }) {
  const { comparison } = d.match;
  return (
    <section className="mx-4 mt-4 rounded-hero bg-card p-6" aria-label="Form">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center text-small text-muted">
            {copy.today.youAre}
            <InfoTip tip="form" className="-my-3 -ml-1" />
          </div>
          <div className="num text-form tracking-[0.2px]">{d.form.name}</div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end text-small text-muted">
            {copy.today.callus}
            <InfoTip tip="callus" className="-my-3 -mr-3" />
          </div>
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
      <p className="mt-[18px] text-[18px] font-medium leading-[1.35]">{d.form.coachLine}</p>
      {d.observer ? <p className="mt-2 text-small text-ink-2">{d.observer}</p> : null}

      <div className="mt-[18px] flex items-center rounded-inner bg-ink pl-4 text-white">
      <Link
        href="/progress#challenges"
        className="flex min-h-11 flex-1 items-center justify-between py-[14px] pr-1"
      >
        <span className="text-small text-muted-dark">{copy.today.vsLastWeek}</span>
        {comparison.noGhost ? (
          <span className="text-small text-muted-dark">{copy.today.noGhost}</span>
        ) : (
          <span className="num text-[24px] leading-none">
            {comparison.scoreYou} <span className="text-ink-faint">-</span>{" "}
            <span className="text-muted-dark">{comparison.scoreGhost}</span>
          </span>
        )}
      </Link>
        <InfoTip tip="vsLastWeek" light />
      </div>

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
