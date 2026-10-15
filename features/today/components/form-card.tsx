import type { TodayData } from "@/features/data/today";
import { copy } from "@/content/copy";
import { InfoTip } from "@/components/info-tip";
import type { TipKey } from "@/content/tooltips";

export function FormCard({ d }: { d: TodayData }) {
  return (
    <section className="mx-4 mt-3 rounded-hero bg-card p-4 min-[380px]:p-5" aria-label="Form">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center text-small text-muted">
            {copy.today.youAre}
            <InfoTip tip="form" className="-my-3 -ml-1" />
          </div>
          <div className="num text-form">{d.form.name}</div>
        </div>
        <div className="flex-none text-right">
          <div className="flex items-center justify-end text-small text-muted">
            {copy.today.callus}
            <InfoTip tip="callus" className="-my-3 -mr-3" />
          </div>
          <div className="num text-form">{d.form.callus}</div>
        </div>
      </div>
      <div
        className="mt-4 h-[10px] overflow-hidden rounded-full bg-sunken"
        role="progressbar"
        aria-label={copy.today.callus}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={d.form.callus}
      >
        <div className="bar-fill h-[10px] rounded-full bg-amber" style={{ width: `${d.form.callus}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-caption text-muted">
        <span>{copy.today.chapterLine(d.chapter.n, d.chapter.name)}</span>
        <span>
          {d.chapter.toNext
            ? copy.today.toNext(d.chapter.toNext.days, d.chapter.toNext.name)
            : copy.today.atTop}
        </span>
      </div>
      <p className="mt-4 text-body font-medium leading-[1.35]">{d.form.coachLine}</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Tile value={String(d.streak)} label={copy.today.streak} tip="streak" />
        <Tile value={String(d.careerDays)} label={copy.today.career} tip="career" />
        <Tile
          value={String(d.trophiesEarned)}
          suffix={`/${d.trophiesTotal}`}
          label={copy.today.trophies}
          tip="trophies"
        />
      </div>
    </section>
  );
}

function Tile({ value, suffix, label, tip }: { value: string; suffix?: string; label: string; tip: TipKey }) {
  return (
    <div className="rounded-inner bg-bg px-3 py-2.5">
      <div className="num text-num leading-none">
        {value}
        {suffix ? <span className="text-small text-muted">{suffix}</span> : null}
      </div>
      <div className="mt-0.5 flex items-center text-caption leading-tight text-muted">
        {label}
        <InfoTip tip={tip} className="-my-3 -mr-3 -ml-1 scale-90" />
      </div>
    </div>
  );
}
