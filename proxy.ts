import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";

// Runs on every page request: CSP nonce, session refresh, login and MFA gate.
// Route handlers under /api do their own auth and return 401 JSON.

const PUBLIC_PATHS = ["/login", "/signup", "/privacy", "/auth/confirm", "/auth/forgot-password"];

function isPublic(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV !== "production");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // API routes authenticate themselves.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const path = request.nextUrl.pathname;

  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    const res = NextResponse.redirect(url);
    // Keep refreshed auth cookies on the redirect.
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  if (!claims) {
    if (!isPublic(path)) return redirect("/login");
  } else {
    const aal = (claims as { aal?: string }).aal;
    if (aal === "aal1" && !path.startsWith("/auth/") && path !== "/mfa") {
      // Signed in with a password. Require the authenticator code, or make
      // the first-time user enrol one (SECURITY.md section 1).
      const { data: lvl } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (lvl?.nextLevel === "aal2" && lvl.currentLevel !== "aal2") {
        return redirect("/mfa");
      }
      if (lvl && lvl.nextLevel === "aal1" && path !== "/mfa") {
        return redirect("/mfa");
      }
    } else if (aal === "aal2" && (path === "/login" || path === "/mfa")) {
      return redirect("/today");
    }
    if (path === "/") return redirect("/today");
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
