import { requireProfile } from "@/lib/session";
import { BottomNav } from "@/components/bottom-nav";
import { PwaBoot } from "@/components/pwa-boot";

// Auth gate for every app screen. No profile yet means onboarding.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireProfile();
  return (
    <>
      <div className="screen">{children}</div>
      <BottomNav />
      <PwaBoot />
    </>
  );
}
