import { MfaPanel } from "@/features/auth/components/mfa-panel";
import { copy } from "@/content/copy";

export const metadata = { title: "Two-step sign-in" };

export default function MfaPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col justify-center px-6 py-10">
      <h1 className="text-[clamp(29px,8.72vw,32px)] font-bold leading-[1.1] tracking-[-0.8px]">
        {copy.mfa.setupTitle}
      </h1>
      <p className="mt-3 text-body text-muted">{copy.mfa.setupSub}</p>
      <MfaPanel />
    </main>
  );
}
