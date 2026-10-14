import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Password-reset link target. Only allows redirects to paths inside the app.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/today";
  // Only a plain in-app path. A double slash or a slash and backslash is read by browsers as another site.
  const safe = nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.includes("\\");
  const next = safe ? nextParam : "/today";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
  }
  redirect("/login");
}
