import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { OnboardingFlow } from "@/features/settings/components/onboarding-flow";

export const metadata = { title: "Set up" };

export default async function OnboardingPage() {
  const { supabase } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("user_id").maybeSingle();
  if (profile) redirect("/today");
  return <OnboardingFlow />;
}
