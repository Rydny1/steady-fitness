import { requireProfile } from "@/lib/session";
import { PwaBoot } from "@/components/pwa-boot";

// Full-screen flows (Log, Session): same auth gate, no bottom nav.
export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  await requireProfile();
  return (
    <div className="mx-auto min-h-dvh w-full max-w-app">
      {children}
      <PwaBoot />
    </div>
  );
}
