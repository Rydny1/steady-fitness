# Steady - security

Every item below is required. Claude Code must do each one and record proof in `SECURITY_REPORT.md` (item, what was done, how it was checked). Nothing ships with an open item.

## What goes wrong most in AI-built apps (2025-2026 scans)
1. Database tables readable by anyone because Row Level Security is off or wrong
2. Admin (service/secret) key shipped to the browser or committed to git
3. API endpoints with no login check
4. Missing security headers (no CSP, framing allowed)
5. One user can read another user's data by changing an id (IDOR)
6. Secrets in the repo
Steady is designed against all six.

## 1. Login
- [ ] Supabase Auth, email + password, min length 12
- [ ] After creating Rydny's account: **turn off new sign-ups** in Supabase Auth settings. Nobody else can create an account
- [ ] TOTP two-factor (authenticator app) enabled and required for the account (Supabase MFA, free)
- [ ] Sessions in httpOnly cookies via `@supabase/ssr` (starter default). Middleware refreshes them
- [ ] Server code checks the user with `supabase.auth.getUser()`, never trusts `getSession()` alone
- [ ] Login form: generic error ("Email or password is wrong"), Supabase built-in rate limits left on

## 2. API and server actions
- [ ] Every server action and route starts with: get user, reject if none
- [ ] Every input validated with zod (types, lengths, ranges). Reject, never coerce silently
- [ ] Mutations only through server actions (Next checks Origin, which blocks CSRF). Route handlers accept POST only and check Origin, except cron
- [ ] `/api/cron/tick`: `Authorization: Bearer CRON_SECRET`, compared with `crypto.timingSafeEqual`. 32+ random bytes
- [ ] AI endpoints rate limited: 60 parses and 20 photo estimates per user per day (count rows in `logs`)
- [ ] Errors to the client are generic. Details go to server logs only. Never return stack traces or SQL
- [ ] No `dangerouslySetInnerHTML` anywhere. AI text rendered as plain text

## 3. Database
- [ ] RLS enabled and forced on every table in `public` (migration does it, verify in dashboard)
- [ ] Run Supabase Security Advisor (`get_advisors`): zero errors, zero warnings before each deploy
- [ ] `supabase/tests/rls_check.sql` passes locally: user B reads 0 rows of user A, cannot insert as A
- [ ] Views use `security_invoker = true` (migration does it)
- [ ] Ledger tables (`daily_scores`, `weekly_reviews`) are read-only to users. Only the cron job writes them
- [ ] No raw SQL built from strings. Supabase query builder or parameterised RPC only
- [ ] Any SQL function: `security invoker`, `set search_path = ''`

## 4. Keys and secrets
- [ ] Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` are public. Everything else server-only
- [ ] `lib/env.ts` and `lib/supabase/admin.ts` start with `import 'server-only'` so a client import fails the build
- [ ] Build check: `grep -r "sb_secret\|GEMINI_API_KEY\|VAPID_PRIVATE" .next/static` returns nothing
- [ ] `.env*` in `.gitignore`. Repo is private. GitHub secret scanning + push protection on
- [ ] `CRON_SECRET` also stored in Supabase Vault (for pg_net), not in SQL files

## 5. Data and photos
- [ ] Buckets private. Paths start with `{user_id}/`. Storage policy checks the folder (migration does it)
- [ ] Signed URLs only, 1 hour
- [ ] Photos re-encoded on the client before upload. This strips EXIF including GPS location
- [ ] Upload limits: 5 MB, JPEG or WebP only (bucket enforces it)
- [ ] Progress photos never sent to Gemini. Code path does not exist
- [ ] Gemini on the paid tier with a €2 monthly cap. Free tier lets Google use your data for training and humans may read it. Paid tier does not

## 6. Web
Set in `next.config.ts` headers for all routes:
- [ ] `Content-Security-Policy`: `default-src 'self'`; `connect-src 'self' https://*.supabase.co https://world.openfoodfacts.org`; `img-src 'self' data: blob: https://*.supabase.co`; `frame-ancestors 'none'`; nonces for scripts (Next middleware pattern)
- [ ] `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- [ ] `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: microphone=(self), camera=(self), geolocation=()` (camera for meal photos and barcodes)
- [ ] `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`
- [ ] Check with securityheaders.com after deploy: grade A or better

## 7. Dependencies
- [ ] Exact versions in `package.json`, lockfile committed
- [ ] `npm audit --audit-level=high` passes
- [ ] Dependabot on for security updates
- [ ] No package added without a reason in `DECISIONS.md`

## 8. GDPR (only what applies)
Steady is used by one person for himself. GDPR's household exemption covers purely personal use, so no legal duties apply today. Health data is still the most sensitive kind, so Steady follows the rules that matter anyway, and is ready if it ever gets more users:
- [ ] Data stored in the EU (Supabase EU region; Vercel functions region `fra1`)
- [ ] Settings > Your data: **Export everything** (one JSON file + photos zip) and **Delete everything** (all rows, all photos, the account). Type "DELETE" to confirm
- [ ] No analytics, no trackers, no third-party scripts, no ads
- [ ] Collect only what a feature uses. No location, no contacts
- [ ] A short plain-language privacy note in Settings: what is stored, where, who can see it (only you), what goes to Gemini (log text, computed facts, meal photos if you tap Estimate). Also: Chrome's voice typing sends audio to Google to turn it into text
- [ ] If sign-ups ever open: privacy policy, explicit consent for health data (GDPR Art. 9), data processing terms with Supabase, Vercel, Google

## 9. Final gate (run by the security-reviewer agent)
- [ ] All boxes above ticked with proof in `SECURITY_REPORT.md`
- [ ] Manual try: log out, call every server action and API route, all must refuse
- [ ] Manual try: with the publishable key only, `curl` each table through the REST API, all must return empty or 401
