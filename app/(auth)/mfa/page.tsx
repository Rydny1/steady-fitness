import { MfaPanel } from "@/features/auth/components/mfa-panel";

export const metadata = { title: "Two-step sign-in" };

export default function MfaPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col justify-center px-4 py-10">
      <MfaPanel />
    </main>
  );
}
