# Steady security report

Date: 2026-10-15. Reviewer: security-reviewer agent (read-only; this is the only file written).
Target: https://steady-fitness.vercel.app, Supabase project aybxdaofasfbkmwfdpyj, branch master (3 commits, no git remote configured).
Method: code read of every route, action and migration, live curl probes, live read-only SQL and advisors on the Supabase project, `npm audit`, `npm run build` plus static-bundle scan, git history scans.

Accepted deviation (not a FAIL): SECURITY.md section 1 "turn off new sign-ups". Open sign-up is the owner's decision, recorded in DECISIONS.md line 23. DECISIONS.md itself lists four owner to-dos that are still open (email verification, CAPTCHA, Gemini paid tier, data processing terms). Those are scored below as FAILs under their own boxes.

## Results per box

### 1. Login
| # | Item | Result | Evidence |
|---|---|---|---|
| 1.1 | Email+password, min length 12 | FAIL | App enforces 12 in zod (`features/auth/actions.ts:53,74`) and the form. Supabase itself does not: a direct `POST /auth/v1/signup` with a short password returned `weak_password: Password should be at least 6 characters`. So the server-side minimum is 6 and the 12 rule is bypassed by calling GoTrue directly (no account was created by the probe). Also advisor `auth_leaked_password_protection` = WARN (disabled). |
| 1.2 | Sign-ups off | ACCEPTED DEVIATION | DECISIONS.md:23, migration 0006 drops the trigger. Live: GoTrue signup is open. |
| 1.3 | TOTP required for the account | FAIL | Enforced only by redirects in `proxy.ts:57-71`. (a) `proxy.ts:27-30` skips `/api/*` entirely, and `/api/export`, `/api/export/photos`, `/api/push/subscribe` only check `getUser()` (no aal2 check). (b) No RLS policy mentions aal/jwt (live query on pg_policies returned none), so a password-only (aal1) access token can read and write every table through PostgREST and Storage. (c) Server actions run under the user client with no aal check; the proxy lets aal1 through for `/mfa` and `/auth/*`, so an action POST to those paths is not blocked by the proxy. Net: a stolen password defeats the second factor for data access. Verified by code and policy inspection, not by exploit (no test credentials used). |
| 1.4 | httpOnly session cookies via @supabase/ssr, refresh in proxy | PASS | `lib/supabase/server.ts`, `proxy.ts:32-50`. `proxy.ts` is the Next 16 name for middleware (build lists "Proxy (Middleware)"). Note: browser client (`lib/supabase/client.ts`) is `createBrowserClient`, which stores cookies readable by JS (not httpOnly) in the default configuration; the server-set cookie via `cookieStore.set` uses the options Supabase passes. Not verified by inspecting Set-Cookie flags (needs a login). |
| 1.5 | `getUser()` not `getSession()` | PASS | `grep getSession` finds none in app code. Every action/route/loader uses `getUser()` (`lib/session.ts:13`, each actions file). `proxy.ts` uses `getClaims()` (verified JWT), acceptable for routing only. |
| 1.6 | Generic login error, built-in rate limits left on | FAIL (partial) | Login error is generic (`actions.ts:26,30`). Built-in Supabase rate limits cannot be verified from outside; but sign-up uses `auth.admin.createUser` (`actions.ts:99`), which bypasses Supabase's sign-up rate limits, and the app guard (`lib/signup.ts`) is the only limit. Sign-up also leaks account existence: "email taken" message (`actions.ts:104`) differs from success. |

### 2. API and server actions
| # | Item | Result | Evidence |
|---|---|---|---|
| 2.1 | Every action/route: get user, reject if none | FAIL | All data actions and the four API routes do (checked each file). Exceptions: `createAccount`, `signIn`, `requestPasswordReset` are intentionally public. `signOut` has no check (harmless). `updatePassword` checks. `app/auth/confirm/route.ts` is public by design. Marked FAIL only because auth is user-present but not aal2 (see 1.3). Live: `/today` 307 to /login, `/api/export` 401, `/api/export/photos` 401, `/api/push/subscribe` POST fake Origin 403, same Origin no cookie 401. |
| 2.2 | Every input validated with zod | FAIL | Actions all use zod. Gaps: `app/auth/confirm/route.ts:10` casts `type` to `EmailOtpType` with no validation and `next` is checked by hand; `searchParams` on `/progress` (`r`, `weigh`), `/train` (`d`), and route params `[recipe]`, `[session]` are used without zod (they only select from static content, low risk, but the rule is "every input"). |
| 2.3 | Mutations via server actions; route handlers POST only + Origin check except cron | FAIL (low) | Export routes are GET (`app/api/export/route.ts:29`, `photos/route.ts:7`), no Origin check. Read-only and CORP same-origin, so no practical CSRF, but not to spec. Push route is POST/DELETE with a proper same-host Origin check (`push/subscribe/route.ts:18-26`). |
| 2.4 | Cron: Bearer CRON_SECRET, timingSafeEqual, 32+ bytes | PASS | `app/api/cron/tick/route.ts:11-16` hashes both sides to equal length then `timingSafeEqual`. `lib/env.ts:15` requires min 32 chars. Live: no secret 401, wrong secret 401, GET 405. Vault secret `steady_cron_secret` present and pg_cron job `steady-tick` active every 15 min (live SQL). |
| 2.5 | AI endpoints rate limited 60 parses / 20 photos per user per day | FAIL | Implemented (`lib/rate-limit.ts`, used in `features/logging/actions.ts:89,129`) but counts only rows with `model` set, i.e. successful Gemini calls. Failed/timeouts (model stays null) are never counted, so a client can trigger unlimited Gemini calls that fail or fall back across the model chain. Check and insert are not atomic (parallel requests overshoot). The weekly report and observer also call Gemini per user from the cron with no per-user cap, so cost scales with open sign-ups. |
| 2.6 | Errors to client generic | PASS | Actions return enum reasons; routes return `{error: "failed"}`; details only to console (`gemini.ts`, `tick/route.ts:24`). |
| 2.7 | No dangerouslySetInnerHTML; AI text plain | PASS | grep over app, features, components, lib: no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`. |

### 3. Database
| # | Item | Result | Evidence |
|---|---|---|---|
| 3.1 | RLS enabled AND forced on every public table | FAIL | Live `pg_class`: enabled on all 25 tables. Forced on all except `daily_scores`, `weekly_reviews`, `exercises`, `job_runs` (`relforcerowsecurity=false`; migration 0001:313-323 only enables). Not exploitable by the API roles, but the box says forced. |
| 3.2 | Security Advisor zero errors/warnings | FAIL | Live `get_advisors(security)`: WARN `auth_leaked_password_protection` (disabled); INFO `rls_enabled_no_policy` on `job_runs` (intended deny-all). |
| 3.3 | `supabase/tests/rls_check.sql` passes | FAIL | Not run: it needs a local Supabase reset and I may not run anything that writes. It also covers only `measurements`/`food_entries`, not all tables or storage. |
| 3.4 | Views `security_invoker = true` | PASS | Migration 0001:280-293, three views. Live: anon gets 401 on all three. |
| 3.5 | Ledger tables read-only to users | PASS | Only `read_own` SELECT policies on `daily_scores`, `weekly_reviews` (0001:315-316); writes only via secret key in `features/jobs/*`. |
| 3.6 | No raw SQL from strings | PASS | No `.rpc(`, no SQL strings in app code. `ilike` inputs in `features/logging/actions.ts:301,319` escape `%` and `_`. |
| 3.7 | SQL functions invoker + `search_path=''` | PASS | Live: zero functions in `public`. Migration 0005 function was dropped by 0006. Also no triggers on auth.users. |
| 3.8 | Anonymous table access (task check) | PASS | Live curl with the publishable key against 25 tables/views: every one returned 401 `42501 permission denied`. Storage anon list of `progress-photos` returned `[]`, public object URL returns 400. |

### 4. Keys and secrets
| # | Item | Result | Evidence |
|---|---|---|---|
| 4.1 | Only the 3 NEXT_PUBLIC vars public | FAIL (low) | `lib/env.ts` also defines `NEXT_PUBLIC_APP_URL` (a 4th public var; harmless URL, but not on the list). Everything secret is non-prefixed. |
| 4.2 | `server-only` in env.ts and admin.ts | PASS | `lib/env.ts:1`, `lib/supabase/admin.ts:1`; also `lib/signup.ts`, `lib/push.ts`, `lib/ai/gemini.ts`, `lib/rate-limit.ts`, `lib/session.ts`. No `"use client"` file (33 checked) imports env/admin/push/signup/gemini/session; two client files import only `type`s from `features/data/*` (erased). |
| 4.3 | Build scan of `.next/static` | PASS | `npm run build` exit 0. Literal grep hit one chunk (`2f3p33_swa95o.js`): it is supabase-js library code `startsWith("sb_secret_")` (a prefix check, no key). I also compared the actual values of SUPABASE_SECRET_KEY, GEMINI_API_KEY, VAPID_PRIVATE_KEY, CRON_SECRET (read, not printed) against all 32 static files: 0 matches. |
| 4.4 | `.env*` ignored, repo private, GitHub scanning | FAIL | `.gitignore` ignores `.env*` (except `.env.example`) and `ACCOUNT.local.txt`; `git check-ignore` confirms. No env file or key pattern in any tracked file or in history (`git log -S` for every real secret value: 0 commits; pattern scan for sb_secret/AQ./AIza/VAPID: only the blank `CRON_SECRET=` in `.env.example`). BUT `git remote -v` is empty, so "repo is private + GitHub secret scanning + push protection" cannot be verified, and there is no `.github/` (no Dependabot). |
| 4.5 | CRON_SECRET in Vault, not in SQL | PASS | Migration 0004 reads `vault.decrypted_secrets`; live: `steady_cron_secret` exists. |

### 5. Data and photos
| # | Item | Result | Evidence |
|---|---|---|---|
| 5.1 | Buckets private, `{user_id}/` paths, folder policy | PASS | Live: both buckets `public=false`. Policy `photos_own` (0001:334-338) checks folder = `auth.uid()`. DB check `storage_path like user_id/%`. `recordMealPhoto` and `recordProgressPhoto` re-check the prefix and a strict path regex. |
| 5.2 | Signed URLs 1 hour | PASS | `features/photos/signed-urls.ts:12` 3600 s. |
| 5.3 | Client re-encode strips EXIF | PASS | `features/photos/compress.ts` canvas to JPEG. Client-only; a direct API upload by the user bypasses it (own data, low risk). |
| 5.4 | 5 MB, JPEG/WebP only | PASS | Live: `file_size_limit=5242880`; mime list in migration 0001:329-331. |
| 5.5 | Progress photos never to Gemini | PASS (by code) | Only `estimateMealAction` sends an image, with base64 supplied by the client; it does not read Storage. Nothing reads progress-photos for Gemini. The client could choose to send any image to that action (the user's own choice). |
| 5.6 | Gemini paid tier, EUR 2 cap | FAIL | Cannot be verified from the repo; DECISIONS.md:23 says it is still an owner to-do. With open sign-up the free tier lets Google train on all users' health text. |

### 6. Web (live `curl -sI https://steady-fitness.vercel.app/login`)
| # | Item | Result | Evidence |
|---|---|---|---|
| 6.1 | CSP with required directives and nonces | PASS | Header present: `default-src 'self'`; script-src `'self' 'nonce-…' 'strict-dynamic'`; connect-src `'self' https://*.supabase.co wss://*.supabase.co https://world.openfoodfacts.org`; img-src `'self' data: blob: https://*.supabase.co`; `frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`. Note: `style-src 'unsafe-inline'` (documented in `lib/csp.ts`). Nonce is set in `proxy.ts`, not `next.config.ts` (acceptable). |
| 6.2 | HSTS | PASS | `max-age=63072000; includeSubDomains; preload` |
| 6.3 | nosniff, Referrer-Policy | PASS | Both present. |
| 6.4 | Permissions-Policy | PASS | `microphone=(self), camera=(self), geolocation=()` |
| 6.5 | COOP / CORP | PASS | `same-origin` both. Extra: `X-Frame-Options: DENY`, no `X-Powered-By`. |
| 6.6 | securityheaders.com grade A | FAIL | Not run (external site, no network tool for it). Headers above should grade A, but a missing check is a FAIL. |
| 6.7 | Open redirect `app/auth/confirm/route.ts` | FAIL (low) | `next` accepted if it starts with `/` and not `//` (line 12). `/\evil.com` and `/<TAB>/evil.com` pass that test and browsers normalise them to `//evil.com`. Exploit needs a valid `token_hash`, so it is hard to abuse, but it should use URL parsing and a same-origin check. Live: `next=//evil.com` with bad token redirects to /login. |
| 6.8 | Service worker | NOTE | `public/sw.js` accepts push `url` if it starts with `/` (same `//` gap); payloads are server-made so low risk. |

### 7. Dependencies
| # | Item | Result | Evidence |
|---|---|---|---|
| 7.1 | Exact versions, lockfile committed | FAIL | `package.json`: `next: "latest"`, `@supabase/ssr: "latest"`, `@supabase/supabase-js: "latest"`, `react ^19`, `clsx ^`, `lucide-react ^`, `tailwind-merge ^`, `tailwindcss ^3.4.1`, and others. DECISIONS.md claims "all pinned" (true only for the added packages). Lockfile is committed. `latest` can pull a breaking or compromised release on the next install. |
| 7.2 | `npm audit --audit-level=high` passes | FAIL | Exit non-zero: 9 vulnerabilities (7 high, 2 moderate): tailwindcss 3.x chain (braces, chokidar, micromatch, fast-glob, postcss-nested, postcss-selector-parser) and `eslint-config-next@15.3.1` (installed next is 16.4.0, version mismatch). `npm audit --omit=dev` = 0 vulnerabilities, so all are build/dev tooling, none run in production. |
| 7.3 | Dependabot | FAIL | No `.github/dependabot.yml`; no remote. |
| 7.4 | Reason in DECISIONS.md per package | PASS | DECISIONS.md:26 lists the added packages. |

### 8. GDPR
| # | Item | Result | Evidence |
|---|---|---|---|
| 8.1 | EU data, Vercel `fra1` | PASS (partial verify) | `vercel.json` regions `fra1`; response header `x-vercel-id ...::fra1::`. Supabase region not verified in this run. |
| 8.2 | Export and Delete everything | PASS | Export routes authenticated and RLS-scoped (`api/export`, `api/export/photos`). `deleteEverything` (`features/settings/actions.ts:161`) requires zod `confirm === "DELETE"` and the UI input matches (`settings-panel.tsx:575`), removes photos then the auth user (cascade). Caveats: no re-authentication or aal2 check; storage `list` limit 1000. |
| 8.3 | No analytics/trackers/3rd-party scripts | PASS | No such code or packages; CSP blocks third-party scripts; fonts via `next/font/google` are self-hosted at build. |
| 8.4 | Collect only what is used | PASS | No location/contacts. |
| 8.5 | Privacy note in Settings (incl. Chrome voice typing) | PASS | `content/copy.ts:225-231`, `/privacy`. |
| 8.6 | Sign-ups open: privacy policy, consent, DPAs | FAIL | Policy page and a required consent checkbox exist (`signup-form.tsx:43`; server-checked `agree: z.literal("on")` at `actions.ts:76`). But consent is not recorded (no timestamp/version stored anywhere), so it cannot be demonstrated (GDPR Art. 7(1)); and DPAs with Supabase, Vercel and Google are an open owner to-do (DECISIONS.md:23). |

### 9. Final gate
| # | Item | Result | Evidence |
|---|---|---|---|
| 9.1 | All boxes proven | FAIL | See the FAILs above. |
| 9.2 | Logged-out: every action and route refuses | PASS (routes), PASS (actions by code) | Routes tested live (above). All 10 `use server` files check `getUser()` before any write except the intentionally public auth actions. I did not POST raw action IDs. |
| 9.3 | Publishable-key curl of each table | PASS | Section 3.8. |

## Additional hunts
- Secrets in code/history: none found (4.4). `ACCOUNT.local.txt` exists locally, is gitignored, was not opened.
- Client components importing admin/env: none (4.2).
- Server actions/routes without getUser: only intentionally public ones (2.1).
- Raw SQL, dangerouslySetInnerHTML: none.
- IDOR: all client-supplied ids (entry id, photo id, habit id, session id, log id, endpoint) go through the user-scoped client, protected by RLS `auth.uid() = user_id` plus composite FKs `(parent_id, user_id)`. PASS. Secret-key loaders in `features/jobs/*`, `features/data/day-facts.ts`, `ledger.ts`, `insights/observer.ts` filter by `user_id` in every query I read (admin queries at `score-day.ts:72,79,145`, `adaptive.ts:20-39`, `tick.ts:67,80`). The only unfiltered admin query is the intended `profiles` list in `tick.ts:32`. PASS.
- `features/data/*` loaders used by pages rely on RLS via the user client.
- Push subscribe: upsert/delete by `endpoint` under RLS; zod on both, https only, same-host Origin check. PASS. Hardening idea: an attacker-chosen `https://` endpoint makes the server call that URL on notification (limited SSRF-style, web-push only posts encrypted payloads); consider an allowlist of push service hosts.
- Sign-up path flaws: (1) accounts are created `email_confirm: true` with no verification, so anyone can register an address they do not own (squat or block the real owner, and the real owner could later take over via password reset); (2) rate guard is per IP from `x-forwarded-for` only (5/hour), there is no global cap or CAPTCHA, so rotating IPs (IPv6, proxies) allows unlimited accounts, each of which costs Gemini and cron time; (3) Supabase direct signup bypasses the guard completely (live GoTrue probe shows signup open with a 6-char minimum); (4) `signupTaken` reveals registered emails; (5) the guard rows in `job_runs` (and score/push keys) are never cleaned up, so the table grows forever; (6) `claimSignupSlot` runs before the email check and consumes a slot even for taken emails (minor).
- Tick scalability: `runTick` loops all profiles sequentially under `maxDuration = 60` while pg_net times out at 55 s; with open sign-up later users will be silently skipped. Availability, not confidentiality.
- Lesser: `importOldSteady` accepts up to 2 MB JSON and runs one DB round trip per day (authenticated DoS on own account). Migration 0005 (dropped later) hard-codes the owner's email in git history.

## BLOCKING (must fix before more users)
1. Second factor is not enforced where it matters: add a restrictive RLS policy requiring `(auth.jwt()->>'aal') = 'aal2'` on every user table and on `storage.objects`, and check aal2 in `getUser`/`requireUser`, the three API routes and the proxy for `/api`. Today a stolen password alone reads all data over PostgREST.
2. Supabase Auth config: raise minimum password length to 12 and turn on leaked-password protection (direct signup currently accepts 6 characters, bypassing the app's rule and rate guard).
3. Sign-up abuse: turn on email verification and a CAPTCHA in Supabase Auth, stop using `admin.createUser` with `email_confirm: true` (or add a global cap), so nobody can register an email they do not own and bots cannot mass-create accounts that spend Gemini quota.
4. Put Gemini on the paid tier with the EUR 2 cap before real users type health data into it; also count failed Gemini calls in the rate limit and cap cron-side Gemini per user.
5. Record consent (timestamp + policy version) at sign-up and sign the data processing terms with Supabase, Vercel and Google.
6. Pin `next`, `@supabase/ssr`, `@supabase/supabase-js` and the other `^`/`latest` deps to exact versions; fix `eslint-config-next` / `tailwindcss` so `npm audit --audit-level=high` exits 0.
7. Connect a private GitHub remote with secret scanning, push protection and Dependabot (none configured, so the 4.4 and 7.3 boxes cannot be shown).

## NOTES
- `force row level security` missing on `daily_scores`, `weekly_reviews`, `exercises`, `job_runs` (add a migration).
- Harden `app/auth/confirm/route.ts`: validate `type` with zod and parse `next` with `new URL(next, origin)`; same `//` gap in `public/sw.js` notification URL.
- Export routes are GET; spec says POST with Origin check. Low risk (read-only, CORP same-origin).
- `NEXT_PUBLIC_APP_URL` is a fourth public variable; update the SECURITY.md list or drop it.
- Add aal2 plus recent re-authentication to `deleteEverything` and the exports.
- Add a tests for the RLS check across all tables and storage, run it locally, and extend `rls_check.sql`.
- Run securityheaders.com after the next deploy; headers look A-grade by inspection.
- Clean old `job_runs` rows (score, push, signup keys) on a schedule.
- Add an allowlist of push-service hosts for `push_subscriptions.endpoint`.
- `eslint-config-next@15.3.1` does not match Next 16.4.0.
- Supabase's own sign-in rate limits, email-verification state, region and Gemini billing tier could not be inspected from here (Auth config is not exposed by the available tools).

## Counts
PASS: 31. FAIL: 20 (incl. partials). Accepted deviation: 1.
