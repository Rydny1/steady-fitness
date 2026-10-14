import Image from "next/image";
import { LoginForm } from "@/features/auth/components/login-form";
import { copy } from "@/content/copy";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
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
        <h1 className="mt-7 text-[40px] font-bold leading-[1.05] tracking-[-1px]">
          One steady day
          <br />
          at a time.
        </h1>
        <p className="mt-3 text-body text-muted">{copy.login.sub}</p>
        <LoginForm />
      </div>
      <p className="mb-10 text-center text-[14px] leading-[1.45] text-muted">
        {copy.login.privacy}
      </p>
    </main>
  );
}
