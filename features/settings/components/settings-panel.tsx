"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, X } from "lucide-react";
import {
  deleteEverything,
  saveHabits,
  saveNotificationPrefs,
  savePlan,
  saveProfileDetails,
  saveTargets,
  type SettingsOutcome,
} from "../actions";
import { importOldSteady } from "../import-action";
import { signOut } from "@/features/auth/actions";
import { disablePush, enablePush, pushSupported } from "@/features/notifications/subscribe";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";
import { InfoTip } from "@/components/info-tip";
import type { TipKey } from "@/content/tooltips";
import type { NotifyKindT, SessionKeyT } from "@/lib/supabase/types";

export type PanelProps = {
  budgetKcal: number;
  bmrKcal: number;
  proteinG: number;
  goalKg: number;
  plan: { weekday: number; sessionKey: SessionKeyT }[];
  habits: { id: string; name: string }[];
  prefs: { kind: NotifyKindT; atTime: string; enabled: boolean }[];
  wakeTime: string;
  mfaOn: boolean;
  email: string;
  adaptiveOn: boolean;
  about: { name: string; heightCm: number; birthDate: string; sex: "male" | "female"; goalKg: number };
  skipped: string[];
};

const SESSION_OPTIONS: { key: SessionKeyT; label: string }[] = [
  { key: "football", label: "Football" },
  { key: "gym_a", label: "Legs" },
  { key: "gym_b", label: "Chest and shoulders" },
  { key: "gym_c", label: "Back and arms" },
  { key: "run", label: "Easy run" },
  { key: "run_intervals", label: "Intervals" },
  { key: "stretch", label: "Stretch" },
  { key: "rest", label: "Rest" },
];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const KIND_LABEL: Record<NotifyKindT, string> = {
  wake_gym: "Gym day wake-up",
  wake_run: "Run day wake-up",
  log_nudge: "Log reminder",
  last_call: "Last call",
  weekly: "Sunday week done",
  photo_day: "Photo day, every 2 weeks",
};

type Sheet = null | "about" | "targets" | "plan" | "habits" | "notifications" | "privacy" | "delete" | "import";

export function SettingsPanel(p: PanelProps) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<SettingsOutcome>, after?: () => void) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        setSheet(null);
        after?.();
        router.refresh();
      } else {
        setError(res.reason === "invalid" ? copy.errors.invalid : copy.errors.generic);
      }
    });
  }

  const row = (
    label: string,
    value: string,
    onClick?: () => void,
    href?: string,
    last = false,
  ) => {
    const inner = (
      <>
        <span className="flex-1 text-body">{label}</span>
        <span className="text-[16px] text-muted">{value}</span>
        <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="text-faint" />
      </>
    );
    const cls = cn(
      "flex min-h-[54px] w-full items-center gap-3 text-left",
      !last && "border-b border-line",
    );
    return href ? (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    ) : (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  };

  const group = (title: string, children: React.ReactNode, tip?: TipKey) => (
    <>
      <div className="mx-6 mt-7 flex items-center text-small font-semibold text-muted">
        {title}
        {tip ? <InfoTip tip={tip} className="-my-3" /> : null}
      </div>
      <div className="mx-4 mt-2 rounded-list bg-card px-[18px]">{children}</div>
    </>
  );

  const plannedSessions = p.plan.filter((d) => d.sessionKey !== "rest").length;
  const notificationsOn = p.prefs.filter((n) => n.enabled).length;

  return (
    <>
      {group(
        copy.settings.targets,
        <>
          {row("About you", p.skipped.length > 0 ? "Add details" : "Edit", () => setSheet("about"))}
          {row("Daily budget", `${p.budgetKcal.toLocaleString("en-GB")} kcal`, () => setSheet("targets"))}
          {row("Protein", `${p.proteinG} g`, () => setSheet("targets"))}
          {row("Goal weight", `${p.goalKg} kg`, () => setSheet("targets"), undefined, true)}
        </>,
        "adaptiveBudget",
      )}
      {group(
        copy.settings.plan,
        <>
          {row("Weekly plan", `${plannedSessions} sessions`, () => setSheet("plan"))}
          {row("Five promises", "Edit", () => setSheet("habits"))}
          {row(copy.settings.notifications, `${notificationsOn} on`, () => setSheet("notifications"), undefined, true)}
        </>,
      )}
      {group(
        copy.settings.account,
        <>
          {row(copy.settings.security, p.mfaOn ? "On" : "Off", undefined, "/mfa")}
          {row("Password", "Change", undefined, "/auth/update-password", true)}
        </>,
      )}
      {group(
        copy.settings.yourData,
        <>
          {row(copy.settings.export, "JSON and photos", undefined, "/settings/data")}
          {row(copy.settings.importOld, "From backup file", () => setSheet("import"))}
          {row(copy.settings.privacy, "What is stored", () => setSheet("privacy"))}
          <button
            type="button"
            onClick={() => setSheet("delete")}
            className="flex min-h-[54px] w-full items-center text-left text-body text-danger"
          >
            {copy.settings.deleteAll}
          </button>
        </>,
      )}
      <form action={signOut}>
        <button
          type="submit"
          className="mx-4 mb-10 mt-7 h-[54px] w-[calc(100%-32px)] rounded-full bg-card text-body font-semibold"
        >
          {copy.settings.signOut}
        </button>
      </form>

      {sheet === "about" ? (
        <AboutSheet p={p} pending={pending} error={error} onClose={() => setSheet(null)} onSave={(v) => run(() => saveProfileDetails(v))} />
      ) : null}
      {sheet === "targets" ? (
        <TargetsSheet p={p} pending={pending} error={error} onClose={() => setSheet(null)} onSave={(v) => run(() => saveTargets(v))} />
      ) : null}
      {sheet === "plan" ? (
        <PlanSheet p={p} pending={pending} error={error} onClose={() => setSheet(null)} onSave={(days) => run(() => savePlan({ days }))} />
      ) : null}
      {sheet === "habits" ? (
        <HabitsSheet p={p} pending={pending} error={error} onClose={() => setSheet(null)} onSave={(habits) => run(() => saveHabits({ habits }))} />
      ) : null}
      {sheet === "notifications" ? (
        <NotificationsSheet p={p} pending={pending} error={error} onClose={() => setSheet(null)} onSave={(v) => run(() => saveNotificationPrefs(v))} />
      ) : null}
      {sheet === "privacy" ? (
        <SheetFrame title={copy.settings.privacy} onClose={() => setSheet(null)}>
          <ul className="flex flex-col gap-3 text-body">
            {copy.settings.privacyText.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </SheetFrame>
      ) : null}
      {sheet === "import" ? (
        <ImportSheet onClose={() => setSheet(null)} onDone={() => router.refresh()} />
      ) : null}
      {sheet === "delete" ? (
        <DeleteSheet
          onClose={() => setSheet(null)}
          pending={pending}
          error={error}
          onConfirm={(confirm) =>
            run(
              () => deleteEverything({ confirm }),
              () => router.replace("/login"),
            )
          }
        />
      ) : null}
    </>
  );
}

function SheetFrame({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
      <div className="sheet max-h-[90dvh] w-full max-w-app overflow-y-auto rounded-t-hero bg-bg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-section font-bold tracking-[-0.3px]">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-card">
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = "h-[54px] rounded-ctl border-0 bg-card px-4 text-body w-full";

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="mt-3 text-small text-danger">
      {error}
    </p>
  ) : null;
}

function AboutSheet({
  p,
  pending,
  error,
  onClose,
  onSave,
}: {
  p: PanelProps;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (v: {
    name: string;
    heightCm: number;
    birthDate: string;
    sex: "male" | "female";
    goalKg: number;
    recalc: boolean;
  }) => void;
}) {
  const [name, setName] = useState(p.about.name);
  const [height, setHeight] = useState(String(p.about.heightCm));
  const [birth, setBirth] = useState(p.about.birthDate);
  const [sex, setSex] = useState<"male" | "female">(p.about.sex);
  const [goal, setGoal] = useState(String(p.about.goalKg));
  const [recalc, setRecalc] = useState(true);
  return (
    <SheetFrame title="About you" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            name,
            heightCm: Number(height.replace(",", ".")),
            birthDate: birth,
            sex,
            goalKg: Number(goal.replace(",", ".")),
            recalc,
          });
        }}
        className="flex flex-col gap-4"
      >
        {p.skipped.length > 0 ? (
          <p className="text-small text-muted">
            You skipped some questions, so Steady is using average numbers. Fill these in for a budget that fits you.
          </p>
        ) : null}
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold">Height, cm</span>
            <input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" className={inputCls} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold">Goal weight, kg</span>
            <input value={goal} onChange={(e) => setGoal(e.target.value)} inputMode="decimal" className={inputCls} />
          </label>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">Birth date</span>
          <input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Sex, for the calorie formula">
          {(["male", "female"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={sex === s}
              onClick={() => setSex(s)}
              className={cn("h-12 rounded-full text-body font-semibold", sex === s ? "bg-ink text-white" : "bg-card text-ink")}
            >
              {s === "male" ? "Male" : "Female"}
            </button>
          ))}
        </div>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" checked={recalc} onChange={(e) => setRecalc(e.target.checked)} className="m-0 h-6 w-6 accent-fuel" />
          <span className="text-body">Recalculate my budget and protein</span>
        </label>
        <ErrorLine error={error} />
        <Button type="submit" big disabled={pending} className="w-full">
          Save
        </Button>
      </form>
    </SheetFrame>
  );
}

function TargetsSheet({
  p,
  pending,
  error,
  onClose,
  onSave,
}: {
  p: PanelProps;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (v: { budgetKcal: number; proteinG: number; goalKg: number; adaptive: boolean }) => void;
}) {
  const [adaptive, setAdaptive] = useState(p.adaptiveOn);
  const [budget, setBudget] = useState(String(p.budgetKcal));
  const [protein, setProtein] = useState(String(p.proteinG));
  const [goal, setGoal] = useState(String(p.goalKg));
  return (
    <SheetFrame title={copy.settings.targets} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            budgetKcal: Math.round(Number(budget.replace(",", "."))),
            proteinG: Math.round(Number(protein.replace(",", "."))),
            goalKg: Number(goal.replace(",", ".")),
            adaptive,
          });
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">Daily budget, kcal (not below {p.bmrKcal})</span>
          <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" className={inputCls} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">Protein, g</span>
          <input value={protein} onChange={(e) => setProtein(e.target.value)} inputMode="numeric" className={inputCls} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">Goal weight, kg</span>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} inputMode="decimal" className={inputCls} />
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={adaptive}
            onChange={(e) => setAdaptive(e.target.checked)}
            className="m-0 h-6 w-6 accent-fuel"
          />
          <span>
            <span className="block text-body">Adjust my budget every Monday</span>
            <span className="block text-caption text-muted">
              Off keeps the numbers above exactly as you set them.
            </span>
          </span>
        </label>
        <ErrorLine error={error} />
        <Button type="submit" big disabled={pending} className="w-full">
          Save
        </Button>
      </form>
    </SheetFrame>
  );
}

function PlanSheet({
  p,
  pending,
  error,
  onClose,
  onSave,
}: {
  p: PanelProps;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (days: { weekday: number; sessionKey: SessionKeyT }[]) => void;
}) {
  const [days, setDays] = useState(
    Array.from({ length: 7 }, (_, i) => p.plan.find((d) => d.weekday === i + 1)?.sessionKey ?? "rest"),
  );
  return (
    <SheetFrame title={copy.settings.plan} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(days.map((sessionKey, i) => ({ weekday: i + 1, sessionKey })));
        }}
        className="flex flex-col gap-3"
      >
        {days.map((k, i) => (
          <label key={i} className="flex items-center gap-3">
            <span className="w-24 text-small text-muted">{WEEKDAYS[i]}</span>
            <select
              value={k}
              onChange={(e) =>
                setDays((prev) => prev.map((v, j) => (j === i ? (e.target.value as SessionKeyT) : v)))
              }
              className="h-12 flex-1 rounded-ctl border-0 bg-card px-3 text-body"
            >
              {SESSION_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        <ErrorLine error={error} />
        <Button type="submit" big disabled={pending} className="mt-2 w-full">
          Save
        </Button>
      </form>
    </SheetFrame>
  );
}

function HabitsSheet({
  p,
  pending,
  error,
  onClose,
  onSave,
}: {
  p: PanelProps;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (habits: { id: string; name: string }[]) => void;
}) {
  const [names, setNames] = useState(p.habits.map((h) => h.name));
  return (
    <SheetFrame title={copy.today.promises} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(p.habits.map((h, i) => ({ id: h.id, name: names[i] ?? h.name })));
        }}
        className="flex flex-col gap-3"
      >
        {names.map((n, i) => (
          <input
            key={i}
            value={n}
            maxLength={40}
            aria-label={`Promise ${i + 1}`}
            onChange={(e) => setNames((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
            className={inputCls}
          />
        ))}
        <ErrorLine error={error} />
        <Button type="submit" big disabled={pending} className="mt-2 w-full">
          Save
        </Button>
      </form>
    </SheetFrame>
  );
}

function NotificationsSheet({
  p,
  pending,
  error,
  onClose,
  onSave,
}: {
  p: PanelProps;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (v: { prefs: PanelProps["prefs"]; wakeTime: string }) => void;
}) {
  const [prefs, setPrefs] = useState(p.prefs);
  const [wake, setWake] = useState(p.wakeTime.slice(0, 5));
  const [pushState, setPushState] = useState<string | null>(null);

  async function turnOn() {
    const r = await enablePush();
    setPushState(
      r === "on"
        ? "Notifications are on for this phone."
        : r === "denied"
          ? "Notifications are blocked in your browser settings."
          : r === "unsupported"
            ? "This browser can't receive notifications. Install Steady to the home screen first."
            : copy.errors.generic,
    );
  }

  return (
    <SheetFrame title={copy.settings.notifications} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ prefs, wakeTime: wake });
        }}
        className="flex flex-col gap-3"
      >
        {prefs.map((n, i) => (
          <div key={n.kind} className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={n.enabled}
              aria-label={KIND_LABEL[n.kind]}
              onChange={(e) =>
                setPrefs((prev) => prev.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)))
              }
              className="m-0 h-6 w-6 accent-fuel"
            />
            <span className="flex-1 text-body">{KIND_LABEL[n.kind]}</span>
            <input
              type="time"
              value={n.atTime.slice(0, 5)}
              aria-label={`${KIND_LABEL[n.kind]} time`}
              onChange={(e) =>
                setPrefs((prev) => prev.map((x, j) => (j === i ? { ...x, atTime: e.target.value } : x)))
              }
              className="h-11 rounded-ctl border-0 bg-card px-3 text-body"
            />
          </div>
        ))}
        <label className="mt-2 flex items-center gap-3">
          <span className="flex-1 text-body">Wake time</span>
          <input
            type="time"
            value={wake}
            onChange={(e) => setWake(e.target.value)}
            className="h-11 rounded-ctl border-0 bg-card px-3 text-body"
          />
        </label>
        {pushSupported() ? (
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" onClick={() => void turnOn()}>
              Allow on this phone
            </Button>
            <Button variant="ghost" onClick={() => void disablePush().then(() => setPushState("Off for this phone."))}>
              Turn off
            </Button>
          </div>
        ) : null}
        {pushState ? (
          <p role="status" className="text-small text-muted">
            {pushState}
          </p>
        ) : null}
        <ErrorLine error={error} />
        <Button type="submit" big disabled={pending} className="mt-2 w-full">
          Save
        </Button>
      </form>
    </SheetFrame>
  );
}

function ImportSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2_000_000) {
      setMsg("That file is too large.");
      return;
    }
    const text = await file.text();
    start(async () => {
      const res = await importOldSteady({ json: text });
      if (res.ok) {
        setMsg(`Imported ${res.days} days.`);
        onDone();
      } else {
        setMsg("Couldn't read that file. Use the backup file from the old Steady.");
      }
    });
  }

  return (
    <SheetFrame title={copy.settings.importOld} onClose={onClose}>
      <p className="text-body text-muted">
        Pick the backup file you exported from the old Steady. Days already in the new app are kept.
      </p>
      <label className="mt-4 flex h-14 cursor-pointer items-center justify-center rounded-full bg-ink text-body font-semibold text-white">
        {pending ? "Importing" : "Choose file"}
        <input
          type="file"
          accept="application/json,.json"
          className="sr-only"
          disabled={pending}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </label>
      {msg ? (
        <p role="status" className="mt-3 text-small text-ink-2">
          {msg}
        </p>
      ) : null}
    </SheetFrame>
  );
}

function DeleteSheet({
  onClose,
  onConfirm,
  pending,
  error,
}: {
  onClose: () => void;
  onConfirm: (word: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const [word, setWord] = useState("");
  return (
    <SheetFrame title={copy.settings.deleteAll} onClose={onClose}>
      <p className="text-body">{copy.settings.deleteConfirm}</p>
      <input
        value={word}
        onChange={(e) => setWord(e.target.value)}
        autoComplete="off"
        aria-label="Type DELETE"
        className={cn(inputCls, "mt-4")}
      />
      <ErrorLine error={error} />
      <Button
        variant="danger"
        big
        disabled={word !== "DELETE" || pending}
        onClick={() => onConfirm(word)}
        className="mt-4 w-full"
      >
        {copy.settings.deleteAll}
      </Button>
    </SheetFrame>
  );
}
