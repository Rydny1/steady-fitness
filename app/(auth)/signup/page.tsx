import Image from "next/image";
import { SignupForm } from "@/features/auth/components/signup-form";
import { copy } from "@/content/copy";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-app flex-col px-6">
      <div className="flex flex-1 flex-col justify-center py-10">
        <Image
          src="/icons/icon-192.png"
          alt="Steady"
          width={72}
          height={72}
          priority
          className="rounded-[20px]"
        />
        <h1 className="mt-7 text-[clamp(34px,10.26vw,38px)] font-bold leading-[1.05] tracking-[-1px]">
          {copy.login.createAccount}
        </h1>
        <p className="mt-3 text-body text-muted">{copy.login.createSub}</p>
        <SignupForm />
      </div>
      <p className="mb-10 text-center text-[clamp(13px,3.8vw,14px)] leading-[1.45] text-muted">{copy.login.privacy}</p>
    </main>
  );
}
