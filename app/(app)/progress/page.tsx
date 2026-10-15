import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { loadProgress, type ProgressData, type Range } from "@/features/data/progress";
import { diffDays, formatDayShort, rigaParts, weekdayShort } from "@/lib/dates";
import {  MiniRings, WeightChart } from "@/features/progress/components/charts";
import { FORM_BANDS } from "@/features/game/config";
import { WinOnce } from "@/components/win-once";
import { LevelRoad } from "@/features/progress/components/level-road";
import { TrophyGrid } from "@/features/progress/components/trophy-grid";
import { CoachNote } from "@/components/coach-note";
import { NetCard } from "@/features/progress/components/net-card";
import { ChallengePicker } from "@/features/progress/components/challenge-picker";
import { WeighIn } from "@/features/progress/components/weigh-in";
import { ProgressPhotos, type ProgressPhoto } from "@/features/photos/components/progress-photos";
import { signedUrls } from "@/features/photos/signed-urls";
import { challengeCards, copy, matchLines, roundNames, trophies } from "@/content/copy";
import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/info-tip";
import type { TipKey } from "@/content/tooltips";
import type { MatchLine } from "@/features/game";

export const metadata = { title: "Progress" };

const RANGES: { key: Range; label: string }[] = [
  { key: "week", label: copy.progress.range.week },
  { key: "month", label: copy.progress.range.month },
  { key: "3m", label: copy.progress.range.threeMonths },
  { key: "all", label: copy.progress.range.all },
];

function matchText(m: MatchLine, d: ProgressData): string | null {
  switch (m.key) {
    case "no_ghost":
      return matchLines.noGhost;
    case "winning":
      return matchLines.winning;
    case "losing_round":
      return matchLines.losingRound(roundNames[m.round], m.n);
    case "full_time_win":
      return matchLines.fullTimeWin(m.you, m.ghost);
    case "draw":
      return matchLines.draw(m.you, m.ghost);
    case "loss":
      return matchLines.loss(m.you, m.ghost, m.day);
    case "perfect":
      return matchLines.perfect;
    default:
      return d.comparison.noGhost ? matchLines.noGhost : null;
  }
}


export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; weigh?: string }>;
}) {
  const sp = await searchParams;
  const range: Range = RANGES.some((r) => r.key === sp.r) ? (sp.r as Range) : "month";
  const { supabase, profile, today } = await requireProfile();
  const d = await loadProgress(supabase, profile, today, range);

  const photoUrls = await signedUrls(
    supabase,
    "progress-photos",
    d.photos.map((p) => p.storage_path),
  );
  const photos: ProgressPhoto[] = d.photos
    .filter((p) => p.pose)
    .map((p) => ({
      id: p.id,
      pose: p.pose as ProgressPhoto["pose"],
      takenOn: p.taken_on,
      url: photoUrls[p.storage_path] ?? null,
    }));

  const text = matchText(d.matchLine, d);
  const nextBand = FORM_BANDS.find((b) => b.from > d.callus) ?? null;
  const cmp = d.comparison;
  const earned = Object.values(d.trophies).filter(Boolean).length;
  const weightChange =
    d.weight.changeKg === null
      ? null
      : `${Math.abs(d.weight.changeKg)} kg ${d.weight.changeKg <= 0 ? "down" : "up"} in ${
          range === "week" ? "7" : range === "month" ? "30" : range === "3m" ? "90" : "this range"
        } days`;

  return (
    <main>
      <h1 className="px-4 pt-[max(16px,env(safe-area-inset-top))] text-title font-bold tracking-[-0.8px]">{copy.progress.title}</h1>

      <div id="challenges" className="mx-4 mt-7 flex items-baseline justify-between">
        <h2 className="text-section font-bold tracking-[-0.3px]">{copy.progress.challenges}</h2>
        <span className="text-small text-muted">
          {d.daysLeft === 0 ? "Last day" : `${d.daysLeft} ${d.daysLeft === 1 ? "day" : "days"} left`}
        </span>
      </div>

      <section className="mx-4 mt-3 rounded-hero bg-ink px-[22px] pb-5 pt-6 text-white" aria-label={copy.today.vsLastWeek}>
        <div className="flex items-center justify-between">
          <span className="flex items-center text-small text-muted-dark">
            {copy.today.vsLastWeek}
            <InfoTip tip="vsLastWeek" light className="-my-3 -ml-1" />
          </span>
          {!cmp.noGhost ? (
            <span className="text-caption text-muted-dark">
              {weekdayShort(d.weekStart)} to {cmp.daysCompared === 7 ? "Sun" : weekdayShort(addDaysStr(d.weekStart, cmp.daysCompared - 1))}
            </span>
          ) : null}
        </div>
        {cmp.noGhost ? (
          <p className="mt-4 text-[clamp(14px,4.36vw,16px)] font-medium leading-[1.4]">{matchLines.noGhost}</p>
        ) : (
          <>
            <div className="mt-[14px] flex items-end justify-between">
              <div>
                <div className="text-[clamp(13px,3.8vw,14px)] text-muted-dark">You</div>
                <div className="num text-score leading-[0.9]">{cmp.scoreYou}</div>
              </div>
              <div className="num text-[clamp(34px,10.26vw,38px)] leading-[1.2] text-ink-faint">-</div>
              <div className="text-right">
                <div className="text-[clamp(13px,3.8vw,14px)] text-muted-dark">Last week</div>
                <div className="num text-score leading-[0.9] text-muted-dark">{cmp.scoreGhost}</div>
              </div>
            </div>
            <ul className="mt-[18px] border-t border-ink-line">
              {cmp.rounds.map((r, i) => (
                <li
                  key={r.key}
                  className={cn(
                    "grid min-h-[46px] grid-cols-[1fr_44px_44px_20px] items-center gap-2 text-[clamp(13px,4.10vw,15px)]",
                    i < cmp.rounds.length - 1 && "border-b border-ink-line",
                  )}
                >
                  <span className="text-ink-soft">{roundNames[r.key]}</span>
                  <span className={cn("num text-right text-[clamp(19px,5.9vw,22px)]", r.outcome === "loss" ? "text-muted-dark" : "text-white")}>
                    {r.you}
                  </span>
                  <span className={cn("num text-right text-[clamp(19px,5.9vw,22px)]", r.outcome === "win" ? "text-muted-dark" : "text-white")}>
                    {r.ghost}
                  </span>
                  <span className="flex justify-end" aria-label={r.outcome}>
                    {r.outcome === "win" ? (
                      <span className="inline-block h-3 w-3 rounded-full bg-white" />
                    ) : r.outcome === "draw" ? (
                      <span className="inline-block h-[2px] w-3 bg-ink-faint" />
                    ) : (
                      <span className="box-border inline-block h-3 w-3 rounded-full border-2 border-muted-dark" />
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {text ? <p className="mt-4 text-[clamp(14px,4.36vw,16px)] font-medium leading-[1.4]">{text}</p> : null}
            {d.winStreak >= 2 ? (
              <div className="mt-[14px] text-[clamp(13px,3.8vw,14px)] text-muted-dark">{matchLines.streak(d.winStreak)}</div>
            ) : null}
          </>
        )}
      </section>

      {d.picked?.progress.done ? (
        <WinOnce id={`challenge-${d.weekStart}`} message="Challenge done." detail="+6 Callus. Nicely done." />
      ) : null}
      {d.answerBack ? (
        <section className="mx-4 mt-3 rounded-hero bg-card p-[22px]">
          <div className="text-[clamp(13px,3.8vw,14px)] text-muted">{copy.progress.answerBack}</div>
          <p className="mt-2 text-body">{copy.progress.answerBackLine}</p>
        </section>
      ) : null}

      {d.picked ? (
        <section className="mx-4 mt-3 rounded-hero bg-card p-[22px]" aria-label="Weekly challenge">
          <div className="flex items-center justify-between">
            <span className="flex items-center text-[clamp(13px,3.8vw,14px)] text-muted">
              {copy.progress.picked}
              <InfoTip tip="weeklyChallenge" className="-my-3 -ml-1" />
            </span>
            <span className="flex items-center gap-[6px] rounded-full bg-bg px-3 py-[6px] text-[clamp(13px,3.8vw,14px)] font-semibold">
              <span className="h-2 w-2 rounded-full bg-amber" />
              {copy.progress.reward}
            </span>
          </div>
          <div className="mt-[10px] text-[clamp(20px,6.15vw,23px)] font-bold tracking-[-0.4px]">
            {challengeCards[d.picked.key]?.name}
          </div>
          <div className="mt-1 text-[clamp(13px,4.10vw,15px)] text-ink-2">{challengeCards[d.picked.key]?.goal}</div>
          <div className="mt-2 text-caption text-muted">
            +6 Callus lifts your form and level.{" "}
            {nextBand ? `${nextBand.name} starts at ${nextBand.from}. You're at ${d.callus}.` : "You're at the top."}
          </div>
          <div
            className="mt-4 grid gap-[6px]"
            style={{ gridTemplateColumns: `repeat(${Math.min(d.picked.progress.goal, 7)}, minmax(0, 1fr))` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={d.picked.progress.goal}
            aria-valuenow={d.picked.progress.current}
          >
            {Array.from({ length: Math.min(d.picked.progress.goal, 7) }, (_, i) => (
              <span
                key={i}
                className={cn("h-[10px] rounded-full", i < d.picked!.progress.current ? "bg-ink" : "bg-line")}
              />
            ))}
          </div>
          <div className="mt-[10px] flex justify-between gap-3 text-[clamp(13px,3.8vw,14px)] text-muted">
            <span>
              {d.picked.progress.done
                ? "Done"
                : d.picked.progress.failed
                  ? "Out of reach this week"
                  : `${d.picked.progress.current} of ${d.picked.progress.goal}`}
            </span>
            <span className="text-right">{challengeCards[d.picked.key]?.why}</span>
          </div>
        </section>
      ) : (
        <ChallengePicker weekStart={d.weekStart} offers={d.offers.map((o) => ({ key: o.key, why: o.why }))} />
      )}

      <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
        <Record label="Bench best" value={d.records.benchBest ?? "None yet"} />
        <Record label="Best streak" value={`${d.records.bestStreak} days`} />
        <Record label="Lowest avg" value={d.records.lowestAvg ? `${d.records.lowestAvg} kg` : "None yet"} />
      </div>

      <section className="mx-4 mt-3 rounded-hero bg-card p-[22px]" aria-label={copy.progress.season}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center text-[clamp(13px,3.8vw,14px)] text-muted">
            {copy.progress.season}
            <InfoTip tip="seasonRecord" className="-my-3 -ml-1" />
          </h3>
          <span className="num text-[clamp(24px,7.18vw,27px)] leading-none">
            {d.season.w}-{d.season.d}-{d.season.l}
          </span>
        </div>
        {d.season.weeks.length === 0 ? (
          <p className="mt-3 text-small text-muted">{copy.progress.seasonEmpty}</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-[6px]" aria-label="Weeks">
            {d.season.weeks.map((w) => (
              <li
                key={w.weekStart}
                title={`Week of ${w.weekStart}`}
                aria-label={`Week of ${w.weekStart}: ${w.result === "W" ? "win" : w.result === "L" ? "loss" : w.result === "D" ? "draw" : "first week"}`}
                className={cn(
                  "box-border h-[14px] w-[14px] rounded-full",
                  w.result === "W" && "bg-fuel",
                  w.result === "D" && "bg-muted-dark",
                  w.result === "L" && "bg-train",
                  w.result === "F" && "border-2 border-muted-dark",
                )}
              />
            ))}
          </ul>
        )}
      </section>

      <LevelRoad division={d.division} careerDays={d.careerDays} callus={d.callus} />

      <div
        role="tablist"
        aria-label="Range"
        className="mx-4 mt-9 grid grid-cols-4 rounded-full bg-card p-1"
      >
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/progress?r=${r.key}`}
            scroll={false}
            role="tab"
            aria-selected={range === r.key}
            className={cn(
              "flex h-9 items-center justify-center rounded-full text-small",
              range === r.key ? "bg-ink font-semibold text-white" : "font-medium text-muted",
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <div className="mx-4 mt-5 flex justify-between" aria-label={copy.progress.weekRings}>
        {d.weekRings.map((w) => (
          <div key={w.day} className="flex flex-col items-center gap-[6px]">
            <MiniRings fuel={w.fuel} protein={w.protein} train={w.train} />
            <span className={cn("text-nav", w.today ? "font-bold text-ink" : "text-muted")}>{w.letter}</span>
          </div>
        ))}
      </div>

      <section className="mx-4 mt-6 rounded-hero bg-card p-[22px]" aria-label={copy.progress.weight}>
        <WeightChart
          trend={d.weight.trend}
          daily={d.weight.daily}
          goalKg={d.weight.goalKg}
          latestAvg={d.weight.latestAvg}
          changeLabel={weightChange}
          rangeLabel=""
        />
        {d.weight.goalText ? <div className="mt-2 text-small">{d.weight.goalText}</div> : null}
        {d.weight.weekKg !== null || d.weight.totalKg !== null ? (
          <div className="mt-1 text-small text-ink-2">
            {d.weight.weekKg !== null
              ? `${Math.abs(d.weight.weekKg)} kg ${d.weight.weekKg <= 0 ? "down" : "up"} this week`
              : null}
            {d.weight.weekKg !== null && d.weight.totalKg !== null ? ", " : null}
            {d.weight.totalKg !== null
              ? `${Math.abs(d.weight.totalKg)} kg ${d.weight.totalKg <= 0 ? "down" : "up"} total since start`
              : null}
            .
          </div>
        ) : null}
        <div className="mt-3">
          <WeighIn day={today} openOnLoad={sp.weigh === "1"} />
        </div>
      </section>

      <NetCard
        bars={d.net.bars}
        goal={d.net.goal}
        targetNet={d.net.targetNet}
        projection={d.net.projection}
        insightKey={d.net.insightKey}
      />

      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        <BodyTile
          label="Waist"
          value={d.body.waistCm === null ? "None" : String(d.body.waistCm)}
          unit=" cm"
          note={d.body.waistDelta && d.body.waistDelta > 0 ? `${d.body.waistDelta} cm down` : "Log a waist to see it move"}
          good={Boolean(d.body.waistDelta && d.body.waistDelta > 0)}
        />
        <BodyTile
          label={copy.progress.waistHeight}
          tip="waistToHeight"
          value={d.body.waistToHeight === null ? "None" : d.body.waistToHeight.toFixed(2)}
          note="Under 0.50"
        />
        <BodyTile
          label={copy.progress.bodyFat}
          tip="bodyFat"
          value={d.body.bodyFat === null ? "None" : String(d.body.bodyFat)}
          unit=" %"
          note={d.body.bodyFatDelta && d.body.bodyFatDelta > 0 ? `${d.body.bodyFatDelta} down` : "Needs waist and neck"}
          good={Boolean(d.body.bodyFatDelta && d.body.bodyFatDelta > 0)}
        />
        <BodyTile label={copy.progress.bmi} tip="bmi" value={d.body.bmi === null ? "None" : String(d.body.bmi)} note="Ignores muscle" />
      </div>

      {d.body.history.length > 0 ? (
        <details className="mx-4 mt-3 rounded-list bg-card px-[18px] py-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-body font-semibold">
            Body history
          </summary>
          <ul className="pb-2">
            {d.body.history.map((m) => (
              <li key={m.id} className="flex items-center justify-between border-t border-line py-3 text-small">
                <span className="text-muted">{formatDayShort(m.measured_on)}</span>
                <span>
                  {[
                    m.weight_kg !== null ? `${m.weight_kg} kg` : null,
                    m.waist_cm !== null ? `waist ${m.waist_cm}` : null,
                    m.neck_cm !== null ? `neck ${m.neck_cm}` : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <h2 className="mx-4 mt-9 text-section font-bold tracking-[-0.3px]">{copy.progress.noticed}</h2>
      {d.weeklySummary ? (
        <CoachNote eyebrow={copy.progress.weeklyReport} className="mx-4 mt-3">
          {d.weeklySummary}
        </CoachNote>
      ) : null}
      {d.notes.length === 0 ? (
        <p className="mx-4 mt-3 text-small text-muted">{copy.progress.patternsEmpty}</p>
      ) : (
        <>
          <CoachNote className="mx-4 mt-3">
            {d.notes[0]?.text}
            <span className="mt-1 block text-caption text-muted">{d.notes[0] ? whenLabel(d.notes[0].when) : null}</span>
          </CoachNote>
          <ul className="mx-4 mt-2">
            {d.notes.slice(1).map((n, i, arr) => (
              <li key={n.id} className={cn("py-[14px]", i < arr.length - 1 && "border-b border-line")}>
                <div className="text-body leading-[1.4]">{n.text}</div>
                <div className="mt-1 text-caption text-muted">{whenLabel(n.when)}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mx-4 mt-8 flex items-baseline justify-between">
        <h2 className="text-section font-bold tracking-[-0.3px]">{copy.progress.trophyRoom}</h2>
        <span className="text-small text-muted">
          {earned} of {trophies.length}
        </span>
      </div>
      <TrophyGrid items={trophies.map((t) => ({ key: t.key, group: t.group, name: t.name, hint: t.hint, line: t.line, on: d.trophies[t.key] === true }))} />

      <ProgressPhotos
        photos={photos}
        today={today}
        due={photos.length === 0 || diffDays(today, photos[0]?.takenOn ?? today) >= 14}
      />
    </main>
  );
}

function Record({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-tile bg-card p-[14px]">
      <div className="text-caption text-muted">{label}</div>
      <div className="num mt-[2px] text-[clamp(20px,6.15vw,23px)] leading-tight">{value}</div>
    </div>
  );
}

function BodyTile({
  label,
  tip,
  value,
  unit,
  note,
  good,
}: {
  label: string;
  tip?: TipKey;
  value: string;
  unit?: string;
  note: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-tile bg-card p-4">
      <div className="flex items-center text-[clamp(13px,3.8vw,14px)] text-muted">
        {label}
        {tip ? <InfoTip tip={tip} className="-my-3 -ml-1" /> : null}
      </div>
      <div className="num mt-1 text-[clamp(25px,7.69vw,29px)] leading-[1.1]">
        {value}
        {unit ? <span className="text-[clamp(14px,4.36vw,16px)] text-muted">{unit}</span> : null}
      </div>
      <div className={cn("text-caption", good ? "font-semibold text-fuel" : "text-muted")}>{note}</div>
    </div>
  );
}

function whenLabel(iso: string): string {
  const p = rigaParts(new Date(iso));
  const t = rigaParts(new Date());
  const time = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  if (p.date === t.date) return `Today, ${time}`;
  return `${formatDayShort(p.date)}, ${time}`;
}

function addDaysStr(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
