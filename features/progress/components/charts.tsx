"use client";

import { useMemo, useState } from "react";
import { copy } from "@/content/copy";
import { InfoTip } from "@/components/info-tip";
import type { NetBar } from "@/features/data/progress";

const W = 346;
const H = 150;
const PAD = { l: 6, r: 6, t: 10, b: 10 };

type Point = { day: string; avgKg: number };

/** 7-day average line, faint daily dots, dashed goal line. Drag to scrub: the number follows your finger. */
export function WeightChart({
  trend,
  daily,
  goalKg,
  latestAvg,
  changeLabel,
  rangeLabel,
}: {
  trend: Point[];
  daily: { day: string; kg: number }[];
  goalKg: number;
  latestAvg: number | null;
  changeLabel: string | null;
  rangeLabel: string;
}) {
  const [idx, setIdx] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const values = [...trend.map((t) => t.avgKg), ...daily.map((d) => d.kg), goalKg];
    const min = Math.min(...values) - 0.5;
    const max = Math.max(...values) + 0.5;
    const n = Math.max(1, trend.length - 1);
    const first = trend[0]?.day ?? "";
    const spanDays = Math.max(
      1,
      Math.round(
        (Date.parse(`${trend[trend.length - 1]?.day ?? first}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) /
          86_400_000,
      ),
    );
    const x = (day: string) =>
      PAD.l +
      ((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) / 86_400_000 / spanDays) *
        (W - PAD.l - PAD.r);
    const y = (kg: number) => PAD.t + (1 - (kg - min) / (max - min)) * (H - PAD.t - PAD.b);
    return { x, y, n };
  }, [trend, daily, goalKg]);

  if (trend.length < 2) {
    return <p className="mt-4 text-small text-muted">{copy.progress.weightEmpty}</p>;
  }

  const path = trend
    .map((t, i) => `${i === 0 ? "M" : "L"}${geometry.x(t.day).toFixed(1)},${geometry.y(t.avgKg).toFixed(1)}`)
    .join(" ");
  const active = idx === null ? null : (trend[idx] ?? null);

  function scrub(clientX: number, el: SVGSVGElement) {
    const rect = el.getBoundingClientRect();
    const rel = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setIdx(Math.round(rel * (trend.length - 1)));
  }

  return (
    <>
      <div className="flex items-baseline justify-between">
        <div>
          <span className="num text-[clamp(37px,11.28vw,42px)] leading-none">
            {(active?.avgKg ?? latestAvg ?? 0).toFixed(1)}
          </span>
          <span className="text-body text-muted"> kg</span>
          {active ? <span className="ml-2 text-caption text-muted">{active.day}</span> : null}
        </div>
        {changeLabel ? <span className="text-small font-semibold text-fuel">{changeLabel}</span> : null}
      </div>
      <div className="mt-[2px] flex items-center text-[clamp(13px,3.8vw,14px)] text-muted">
        {copy.progress.sevenDay}. Drag the line to see any day. {rangeLabel}
        <InfoTip tip="sevenDay" className="-my-3" />
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full touch-none"
        role="img"
        aria-label={`Weight trend, latest 7-day average ${latestAvg ?? ""} kilograms`}
        onPointerDown={(e) => scrub(e.clientX, e.currentTarget)}
        onPointerMove={(e) => (e.buttons > 0 || e.pointerType === "touch") && scrub(e.clientX, e.currentTarget)}
        onPointerLeave={() => setIdx(null)}
      >
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={geometry.y(goalKg)}
          y2={geometry.y(goalKg)}
          stroke="var(--muted)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        {daily.map((d) => (
          <circle key={d.day} cx={geometry.x(d.day)} cy={geometry.y(d.kg)} r="2.5" fill="var(--ink)" opacity="0.18" />
        ))}
        <path d={path} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {active ? (
          <>
            <line
              x1={geometry.x(active.day)}
              x2={geometry.x(active.day)}
              y1={PAD.t}
              y2={H - PAD.b}
              stroke="var(--line)"
              strokeWidth="1.5"
            />
            <circle cx={geometry.x(active.day)} cy={geometry.y(active.avgKg)} r="5" fill="var(--ink)" />
          </>
        ) : null}
      </svg>
    </>
  );
}

const CW = 346;
const CH = 120;

/** Net calorie bars around a zero line. Green when it is the right direction for the goal. Dashed line is the daily target. */
export function NetChart({
  bars,
  goal,
  targetNet,
}: {
  bars: NetBar[];
  goal: "lose" | "gain" | "maintain";
  targetNet: number;
}) {
  if (bars.length === 0) return null;
  const peak = Math.max(300, ...bars.map((b) => Math.abs(b.net)), Math.abs(targetNet));
  const mid = CH / 2;
  const scale = (CH / 2 - 8) / peak;
  const y = (v: number) => mid - v * scale;
  const slot = CW / bars.length;
  const bw = Math.min(28, slot * 0.62);
  const good = (v: number) => (goal === "lose" ? v < 0 : goal === "gain" ? v > 0 : Math.abs(v) <= 150);
  return (
    <svg viewBox={`0 0 ${CW} ${CH + 18}`} className="mt-3 w-full" role="img" aria-label="Net calories per day">
      <line x1="0" x2={CW} y1={mid} y2={mid} stroke="var(--edge)" strokeWidth="1" />
      {targetNet !== 0 ? (
        <line x1="0" x2={CW} y1={y(targetNet)} y2={y(targetNet)} stroke="var(--muted)" strokeDasharray="4 4" strokeWidth="1" />
      ) : null}
      {bars.map((b, i) => {
        const x = i * slot + (slot - bw) / 2;
        const top = Math.min(mid, y(b.net));
        const h = Math.max(2, Math.abs(y(b.net) - mid));
        return (
          <g key={`${b.label}-${i}`}>
            <rect x={x} y={top} width={bw} height={h} rx={Math.min(bw / 2, 6)} fill={good(b.net) ? "var(--fuel)" : "var(--train)"} opacity={b.today ? 0.35 : 1} />
            {bars.length <= 14 || i % 4 === 0 ? (
              <text x={x + bw / 2} y={CH + 14} textAnchor="middle" fontSize="12" fill="var(--muted)">
                {b.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Mini rings for one day: three concentric arcs, stroke 4. */
export function MiniRings({
  fuel,
  protein,
  train,
}: {
  fuel: number;
  protein: number;
  train: number;
}) {
  const rings = [
    { r: 17, v: fuel, c: "var(--fuel)" },
    { r: 12, v: protein, c: "var(--protein)" },
    { r: 7, v: train, c: "var(--train)" },
  ];
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <g transform="rotate(-90 20 20)" fill="none" strokeWidth="4" strokeLinecap="round">
        {rings.map((r) => {
          const len = 2 * Math.PI * r.r;
          return (
            <g key={r.r}>
              <circle cx="20" cy="20" r={r.r} stroke={r.c} strokeOpacity="0.16" />
              {r.v > 0 ? (
                <circle cx="20" cy="20" r={r.r} stroke={r.c} strokeDasharray={`${Math.min(1, r.v) * len} ${len}`} />
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
