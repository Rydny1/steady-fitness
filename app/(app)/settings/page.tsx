import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireProfile } from "@/lib/session";
import { capitalize } from "@/lib/utils";
import { SettingsPanel } from "@/features/settings/components/settings-panel";
import { latestLedger } from "@/features/data/ledger";
import { trophyState } from "@/features/data/ledger";
import { chapters } from "@/content/copy";
import { formFor } from "@/features/game";
import { copy } from "@/content/copy";

export const metadata = { title: "Profile" };

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireProfile();

  const [targets, plan, habits, prefs, ledger, trophies, logged, weights, factors, adaptiveFlag, skippedFlag] =
    await Promise.all([
      supabase
        .from("targets")
        .select("budget_kcal,bmr_kcal,protein_g")
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("weekly_plan").select("weekday,session_key").order("weekday"),
      supabase.from("habits").select("id,name").is("archived_at", null).order("position"),
      supabase.from("notification_prefs").select("kind,at_time,enabled"),
      latestLedger(supabase, user.id),
      trophyState(supabase, user.id),
      supabase.from("logs").select("day"),
      supabase
        .from("measurements")
        .select("measured_on,weight_kg")
        .not("weight_kg", "is", null)
        .order("measured_on"),
      supabase.auth.mfa.listFactors(),
      supabase.from("user_flags").select("value").eq("key", "adaptive_budget").maybeSingle(),
      supabase.from("user_flags").select("value").eq("key", "profile_skipped").maybeSingle(),
    ]);

  const w = weights.data ?? [];
  const first = w[0]?.weight_kg ?? null;
  const last = w[w.length - 1]?.weight_kg ?? null;
  const down = first !== null && last !== null ? Math.max(0, Math.round((first - last) * 10) / 10) : 0;
  const daysLogged = new Set((logged.data ?? []).map((l) => l.day)).size;
  const form = formFor(ledger.callus);
  const chapter = chapters[ledger.division];

  return (
    <main>
      <div className="px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <Link
          href="/today"
          aria-label="Back to Today"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card"
        >
          <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      <div className="mx-4 mt-5 flex items-center gap-4">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-ink text-[clamp(24px,7.18vw,27px)] font-semibold text-white">
          {capitalize(profile.display_name.slice(0, 1))}
        </span>
        <div>
          <h1 className="text-[clamp(22px,6.67vw,25px)] font-bold tracking-[-0.5px]">{profile.display_name}</h1>
          <div className="text-small text-muted">
            {form.name}. Chapter {chapter.n}, {chapter.name}
          </div>
        </div>
      </div>
      <div className="mx-4 mt-5 grid grid-cols-3 gap-2">
        <Stat value={String(daysLogged)} label="days logged" />
        <Stat value={`${down} kg`} label="down since start" />
        <Stat value={String(Object.values(trophies).filter(Boolean).length)} label="trophies" />
      </div>

      <SettingsPanel
        budgetKcal={targets.data?.budget_kcal ?? 0}
        bmrKcal={targets.data?.bmr_kcal ?? 0}
        proteinG={targets.data?.protein_g ?? 0}
        goalKg={profile.goal_weight_kg}
        currentKg={last === null ? null : Number(last)}
        plan={(plan.data ?? []).map((p) => ({ weekday: p.weekday, sessionKey: p.session_key }))}
        habits={habits.data ?? []}
        prefs={(prefs.data ?? []).map((p) => ({ kind: p.kind, atTime: p.at_time.slice(0, 5), enabled: p.enabled }))}
        wakeTime={profile.wake_time}
        mfaOn={(factors.data?.totp ?? []).some((f) => f.status === "verified")}
        email={user.email ?? ""}
        about={{
          name: profile.display_name,
          heightCm: Number(profile.height_cm),
          birthDate: profile.birth_date,
          sex: profile.sex,
          goalKg: Number(profile.goal_weight_kg),
        }}
        skipped={(skippedFlag.data?.value as { fields?: string[] } | null)?.fields ?? []}
        adaptiveOn={(adaptiveFlag.data?.value as { enabled?: boolean } | null)?.enabled !== false}
      />
      <p className="sr-only">{copy.settings.title}</p>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-tile bg-card p-[14px]">
      <div className="num text-[clamp(22px,6.67vw,25px)] leading-tight">{value}</div>
      <div className="text-caption text-muted">{label}</div>
    </div>
  );
}
