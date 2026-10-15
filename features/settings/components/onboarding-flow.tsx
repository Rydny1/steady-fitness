"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { completeOnboarding } from "../onboarding-action";
import { computeTargets } from "@/features/nutrition/targets";
import { GENERIC_TARGETS } from "../defaults";
import { ageOn, todayRiga } from "@/lib/dates";
import { enablePush } from "@/features/notifications/subscribe";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";

type Answers = {
  name: string;
  heightCm: string;
  birthDate: string;
  sex: "male" | "female" | "";
  weightKg: string;
  goalKg: string;
  waistCm: string;
  neckCm: string;
  wakeTime: string;
};

type Step = {
  key: keyof Answers;
  label: string;
  type: "text" | "number" | "date" | "time" | "sex";
  unit?: string;
  optional?: boolean;
};

const steps: Step[] = [
  { key: "name", label: copy.onboarding.name, type: "text" },
  { key: "heightCm", label: copy.onboarding.height, type: "number", unit: "cm" },
  { key: "birthDate", label: copy.onboarding.birth, type: "date" },
  { key: "sex", label: copy.onboarding.sex, type: "sex" },
  { key: "weightKg", label: copy.onboarding.weight, type: "number", unit: "kg" },
  { key: "goalKg", label: copy.onboarding.goal, type: "number", unit: "kg" },
  { key: "waistCm", label: copy.onboarding.waist, type: "number", unit: "cm", optional: true },
  { key: "neckCm", label: copy.onboarding.neck, type: "number", unit: "cm", optional: true },
  { key: "wakeTime", label: copy.onboarding.wake, type: "time" },
];

const num = (s: string): number => Number(s.replace(",", "."));

function valid(step: Step, v: string): boolean {
  if (step.optional && v === "") return true;
  if (step.type === "text") return v.trim().length > 0 && v.length <= 40;
  if (step.type === "number") return v !== "" && Number.isFinite(num(v)) && num(v) > 0;
  if (step.type === "sex") return v === "male" || v === "female";
  return v !== "";
}

export function OnboardingFlow() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [a, setA] = useState<Answers>({
    name: "",
    heightCm: "",
    birthDate: "",
    sex: "",
    weightKg: "",
    goalKg: "",
    waistCm: "",
    neckCm: "",
    wakeTime: "06:30",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [targetsShown, setTargetsShown] = useState(false);
  const [done, setDone] = useState(false);

  const coreAnswered =
    a.heightCm !== "" && a.birthDate !== "" && a.sex !== "" && a.weightKg !== "";
  const targets = useMemo(() => {
    if (!targetsShown) return null;
    if (!coreAnswered) return { ...GENERIC_TARGETS };
    return computeTargets({
      sex: a.sex === "female" ? "female" : "male",
      weightKg: num(a.weightKg),
      heightCm: num(a.heightCm),
      ageYears: ageOn(a.birthDate, todayRiga()),
      goalWeightKg: a.goalKg === "" ? num(a.weightKg) : num(a.goalKg),
    });
  }, [targetsShown, a, coreAnswered]);

  const step = steps[index];

  async function finish() {
    setBusy(true);
    setError(null);
    const res = await completeOnboarding({
      name: a.name.trim() === "" ? null : a.name.trim(),
      heightCm: a.heightCm === "" ? null : num(a.heightCm),
      birthDate: a.birthDate === "" ? null : a.birthDate,
      sex: a.sex === "" ? null : a.sex,
      weightKg: a.weightKg === "" ? null : num(a.weightKg),
      goalKg: a.goalKg === "" ? null : num(a.goalKg),
      waistCm: a.waistCm === "" ? null : num(a.waistCm),
      neckCm: a.neckCm === "" ? null : num(a.neckCm),
      wakeTime: a.wakeTime === "" ? null : a.wakeTime,
    });
    setBusy(false);
    if (res.ok || res.reason === "exists") {
      setDone(true);
      return;
    }
    const labels: Record<string, string> = {
      name: "name",
      heightCm: "height",
      birthDate: "birth date",
      sex: "sex",
      weightKg: "weight",
      goalKg: "goal weight",
      waistCm: "waist",
      neckCm: "neck",
      wakeTime: "wake time",
    };
    if (res.reason === "invalid") {
      const names = (res.fields ?? []).map((f) => labels[f] ?? f).filter(Boolean);
      setError(names.length > 0 ? `Check your ${names.join(", ")}.` : copy.errors.invalid);
    } else if (res.reason === "signed_out") {
      setError(copy.errors.signedOut);
    } else {
      setError(copy.errors.generic);
    }
  }

  async function askPush() {
    setBusy(true);
    await enablePush();
    router.replace("/today");
    router.refresh();
  }

  if (done) {
    return (
      <Shell>
        <h1 className="text-title font-bold tracking-[-0.8px]">{copy.onboarding.budgetTitle}</h1>
        <p className="mt-2 text-body text-muted">{copy.onboarding.pushLine}</p>
        <div className="mt-8 flex flex-col gap-3">
          <Button big onClick={askPush} disabled={busy} className="w-full">
            {copy.onboarding.allow}
          </Button>
          <Button
            big
            variant="secondary"
            onClick={() => {
              router.replace("/today");
              router.refresh();
            }}
            className="w-full"
          >
            {copy.onboarding.skip}
          </Button>
        </div>
      </Shell>
    );
  }

  if (targetsShown && targets) {
    return (
      <Shell>
        <h1 className="text-title font-bold tracking-[-0.8px]">{copy.onboarding.budgetTitle}</h1>
        <p className="mt-2 text-body text-muted">{copy.onboarding.budgetSub}</p>
        <div className="mt-8 grid grid-cols-2 gap-2">
          <div className="rounded-tile bg-card p-5">
            <div className="num text-[clamp(37px,11.28vw,42px)] leading-none text-fuel">
              {targets.budgetKcal.toLocaleString("en-GB")}
            </div>
            <div className="mt-1 text-caption text-muted">kcal a day, plus training</div>
          </div>
          <div className="rounded-tile bg-card p-5">
            <div className="num text-[clamp(37px,11.28vw,42px)] leading-none text-protein">{targets.proteinG}</div>
            <div className="mt-1 text-caption text-muted">g protein a day</div>
          </div>
        </div>
        {error ? (
          <p role="alert" className="mt-4 text-small text-danger">
            {error}
          </p>
        ) : null}
        {!coreAnswered ? (
          <p className="mt-4 text-small text-muted">
            Steady uses average numbers until you add your height, birth date, sex and weight. Do it any time in Profile.
          </p>
        ) : null}
        <Button big onClick={finish} disabled={busy} className="mt-8 w-full">
          {copy.onboarding.start}
        </Button>
      </Shell>
    );
  }

  if (!step) return null;
  const value = a[step.key];

  function skip() {
    if (!step) return;
    setA({ ...a, [step.key]: step.key === "wakeTime" ? "06:30" : "" });
    if (index === steps.length - 1) {
      setTargetsShown(true);
      return;
    }
    setIndex(index + 1);
  }

  function next() {
    if (!step || !valid(step, value)) return;
    if (index === steps.length - 1) {
      setTargetsShown(true);
      return;
    }
    setIndex(index + 1);
  }

  return (
    <Shell>
      <div className="flex h-12 items-center gap-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => setIndex(index - 1)}
          disabled={index === 0}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-card text-ink disabled:opacity-0"
        >
          <ChevronLeft size={22} strokeWidth={2} aria-hidden="true" />
        </button>
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={index + 1}
          aria-label={`Question ${index + 1} of ${steps.length}`}
        >
          <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
        <button type="button" onClick={skip} className="flex h-11 flex-none items-center px-2 text-small font-semibold text-muted">
          Skip
        </button>
      </div>
      <h1 className="mt-8 text-sub font-bold tracking-[-0.5px]">{step.label}</h1>
      <form
        className="mt-8 flex flex-1 flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        {step.type === "sex" ? (
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={step.label}>
            {(["male", "female"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={a.sex === s}
                onClick={() => setA({ ...a, sex: s })}
                className={cn(
                  "h-14 rounded-full text-body font-semibold",
                  a.sex === s ? "bg-ink text-white" : "bg-card text-ink",
                )}
              >
                {s === "male" ? "Male" : "Female"}
              </button>
            ))}
          </div>
        ) : (
          <label className="flex items-baseline gap-3 rounded-ctl bg-card px-5">
            <span className="sr-only">{step.label}</span>
            <input
              autoFocus
              value={value}
              onChange={(e) => setA({ ...a, [step.key]: e.target.value })}
              type={step.type === "number" ? "text" : step.type}
              inputMode={step.type === "number" ? "decimal" : undefined}
              className={cn(
                "h-20 w-full border-0 bg-transparent",
                step.type === "number" ? "num text-[clamp(37px,11.28vw,42px)]" : "text-sub font-semibold",
              )}
            />
            {step.unit ? <span className="text-body text-muted">{step.unit}</span> : null}
          </label>
        )}
        <div className="sticky bottom-0 mt-auto bg-page pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
          <Button type="submit" big disabled={!valid(step, value)} className="w-full">
            {index === steps.length - 1 ? copy.onboarding.done : copy.onboarding.next}
          </Button>
        </div>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-4 pt-[max(12px,env(safe-area-inset-top))]">
      {children}
    </main>
  );
}
