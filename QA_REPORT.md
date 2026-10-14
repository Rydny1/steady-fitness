# QA report

Run against branch state of 2026-10-15, production URL https://steady-fitness.vercel.app. No app code, git, SQL or env files were touched. Written: this file, `tests/e2e/smoke.spec.ts`, `tests/e2e/playwright.config.ts`.

## Summary

| # | Item | Result |
|---|---|---|
| 1 | tsc, lint, vitest, build | PASS |
| 2 | Design bans and football wording | PASS in app code (2 notes) |
| 3 | Copy states | PASS (1 note) |
| 4 | Content checks | PASS |
| 5 | Accessibility review | FAIL (h1 on 2 pages, dialogs) |
| 6 | Playwright smoke | PASS (6 passed, 1 skipped by design) |
| 7 | Lighthouse mobile /login | FAIL on perf 90 and SEO (robots.txt) |
| 8 | Logic review | FAIL (real bugs listed) |

## 1. Gate commands: PASS

- `npx tsc --noEmit`: 0 errors.
- `npm run lint`: 0 errors, 6 warnings (all `security/*`): features/insights/facts.ts:325, features/insights/grounding.ts:78, features/nutrition/adaptive-budget.ts:38, features/nutrition/shopping-adapter.ts:9, features/nutrition/targets.ts:98 (non-literal RegExp), tests/unit/content.test.ts:10.
- `npx vitest run --coverage`: 7 files, 172 tests, all passed. Coverage 86.64% statements, 83.88% branches, 89.1% functions, 88.17% lines. Gap: `features/training/actions.ts` and `data.ts` are 0% covered (only progression.ts is tested).
- `npm run build`: succeeded first try (Next 16.4.0 Turbopack, 24 routes, no EPERM).
- Note: vitest prints a Vite warning that `vitest.config.ts` is loaded as CommonJS. Cosmetic.

## 2. Design bans: PASS in app code

Scanned app/, features/, components/, content/, lib/, proxy.ts, public/sw.js.
- gradient, uppercase, text-transform, tracking-widest, shadow-/box-shadow/drop-shadow: 0 hits.
- Emoji ranges: 0 hits.
- U+2192, U+2014, U+2013 (and the other arrows): 0 hits, in source and in content/*.ts strings.
- Middle dots: 0 hits.
- Exclamation marks in copy: 0 hits.
- Hex colours in .tsx: only `app/layout.tsx:42 themeColor "#ffffff"` (allowed).
- Banned words: 1 hit. `content/quotes/quotes.ts:85`, quote q32 is a real Lao Tzu quote that contains "journey" ("The journey of a thousand li ..."). It is a verbatim quote with attribution, so it is a judgement call. If the ban is meant to cover quotes, swap q32 for another Lao Tzu line.
- Football wording in user-visible strings: none. Remaining hits are allowed internal keys (`early_kickoff`, `earlyKickoff*`) and code comments (`features/game/weekly-match.ts:57` "full time"). 
- Stale wording outside the shipped UI (not FAIL, cleanup): `supabase/migrations/0002_flags_and_notes.sql:3` comment says "the Gaffer's feed"; `features/HANDOFF-domain.md:10` says "Gaffer lines"; DESIGN.md, CONTENT.md, GAME.md, PRODUCT.md and `design/Main.dc.html` / `design/Progress.dc.html` still use Gaffer, Unplayable, Hat-trick, First whistle. Tests reference the old names only as negative assertions.

## 3. Copy states: PASS

All ten strings in DESIGN.md "Empty and error states" exist in `content/copy.ts` with identical wording and are rendered:
- emptyLog: features/today/components/log-list.tsx:32
- weightEmpty: features/progress/components/charts.tsx:54
- photosEmpty: features/photos/components/progress-photos.tsx:80
- mealPhotosEmpty: app/(app)/fuel/page.tsx:129
- patternsEmpty: app/(app)/progress/page.tsx:395
- voiceUnsupported, parseFailed, aiLimit, offline: features/logging/components/log-screen.tsx (108, 142/149/175, 233/259/261)
- deleteConfirm: features/settings/components/settings-panel.tsx:563
- Note: `copy.offlineNotice` (copy.ts:260) is defined but never used (duplicate of `copy.log.offline`). Remove or use it. `public/offline.html` also carries an Offline message.

## 4. Content checks: PASS

- Quotes: unit test passes (60 or more, each under 20 words, author and source URL, unique, max 8 per author, 15+ comeback).
- Meals: 5 batch (teriyaki 380/42, greek 370/40, turkey chilli 360/38, egg fried rice 390/35, tuna pasta 370/32) and 2 quick (avocado toast 350/22, yogurt bowl 280/30) match tests/unit/content.test.ts.
- Images: resolved the slug-based path builders. All 26 exercise and stretch slugs have their `-0`/`-1` webp or svg drawing in public/images; 7 meal images, 8 snack images and fuel/batch-prep.webp exist. 0 missing.
- Seed: all 26 slugs in content/exercises.ts and content/stretch.ts exist in supabase/seed.sql, and seed has no extra rows.

## 5. Accessibility review: FAIL

Passes: global `:focus-visible` 2px outline with offset (app/globals.css:66); no `outline-none` anywhere; all text inputs are wrapped in a `<label>` or have `htmlFor`/`sr-only` label; touch targets use h-11/h-14/min-h-11/min-h-12 (checkbox rows use min-h-11/12 labels); tablists have `role="tab"` and `aria-selected`; sheets use `role="dialog" aria-modal="true"` with a label; all animation sits inside `prefers-reduced-motion: no-preference` (only the chevron `transition-transform` in features/training/components/exercise-cards.tsx:73 and `transition-opacity` in components/ui/button.tsx:29 are ungated, both harmless); h1 is single on 14 pages.

FAIL items:
1. No `<h1>` on `/log` (app/(focus)/log/page.tsx via features/logging/components/log-screen.tsx) and `/train/[session]` (features/training/components/session-screen.tsx). Fix: add one h1 per screen (visible or `sr-only`).
2. Dialogs have no Escape handler and no focus trap or focus return (log-screen.tsx:677, my-recipes.tsx:123, progress-photos.tsx:176, weigh-in.tsx:58, settings-panel.tsx:224, checkin-sheet.tsx:67, level-card.tsx:26, session-screen.tsx:410). Only components/info-tip.tsx handles Escape. Fix: shared sheet component with Escape, focus move on open, restore on close.
3. Tab semantics are incomplete: tabs have no `aria-controls`/roving arrow keys (progress/page.tsx:272, log-screen.tsx:295, library.tsx:19). Minor.
4. The onboarding page has three conditional h1s (one per step), fine as long as only one renders at a time.

## 6. Playwright smoke: PASS

`tests/e2e/smoke.spec.ts` and config at `tests/e2e/playwright.config.ts` (baseURL from BASE_URL, default production, viewport 390x844). The config is in tests/e2e, not the repo root, because QA may only write there. Run with `npx playwright test -c tests/e2e/playwright.config.ts`. Chromium installed.
Result: 6 passed, 1 skipped. Covered: /login form (one h1, email, password, Sign in), /signup (consent checkbox unchecked, Create account), /privacy, /today redirects to /login, manifest valid (name, standalone, start_url, 192 and 512 icons resolve), /sw.js 200 with `no-cache` and a JavaScript content type. The signed-in flow is `test.skip` and needs QA_EMAIL, QA_PASSWORD and QA_TOTP_SECRET (authenticator code on every sign-in).
Note: Playwright creates `test-results/` in the repo root. It is git-ignored.

## 7. Lighthouse mobile, /login: FAIL

Performance 82, Accessibility 100, Best Practices 100, SEO 92.
- FCP 0.9 s, LCP 2.4 s, TBT 620 ms (local run, lab noise is large), CLS 0, Speed Index 1.2 s. Performance is under the 90 target mainly due to TBT, unused JS (30 KiB) and legacy JS (14 KiB).
- SEO 92: `robots.txt` audit fails. `GET /robots.txt` is redirected (307) by proxy.ts to the login HTML, so crawlers see invalid robots syntax. Fix: add `app/robots.ts` and exclude `/robots.txt` (and `/sitemap.xml`) from the auth redirect in proxy.ts.
- bf-cache fails with 2 reasons (likely `Cache-Control: no-store` and the service worker). Informational.
- PWA installability was not scored (Lighthouse 12 dropped the PWA category). Manifest and icons were verified in the smoke test.

## 8. Logic review: FAIL (real bugs, not fixed)

Medium:
1. features/jobs/tick.ts:115-135 (weekly push). `claim()` for `push:user:kind:date` is taken before `writeWeeklyReport()` and `sendToUser()`, and this block has no try/catch. One throw (AI call, DB error, push error) aborts `runTick` for every remaining user in the loop and the claimed key means that notification is never retried. Wrap each user's body in try/catch and release the claim on failure.
2. features/jobs/tick.ts:49-66 (catch-up scoring). When one night fails, the loop continues to the next day. `scoreUserDay` for day D+1 then runs against the ledger of D-1 (wrong streak, callus, level), and `prev.day >= day` (score-day.ts:36) makes the later retry of D a no-op. The ledger ends up with a permanent gap. Break out of the loop on failure.
3. features/logging/actions.ts:196-236 (saveEntries). Food, activity and body writes are separate inserts with no idempotency key. If the activity or body write fails after the food insert, the user sees "failed", retries, and the foods are double counted. The offline queue replay has the same exposure (a double tap also doubles). Fix: use a single RPC/transaction, or dedupe on `log_id` (delete child rows for `logId` first or pass a client-generated idempotency key).
4. features/jobs/weekly-report.ts:124-129 vs score-day.ts:56-61. The Sunday 21:00 report treats Sunday as finished (`toRecord(x, afterDay)` closes the Fuel ring) and writes `weekly_reviews.result` plus pushes the "Week done" score. At 00:05 Monday `scoreUserDay` recomputes with the final Sunday and upserts a possibly different result. The pushed score and the stored record can disagree (any Sunday logging after 21:00). Either push after the final score or do not persist the result at 21:00.
5. PostgREST 1000-row cap, unpaginated: features/data/day-facts.ts:57-100 (logs, habit_checks, activity_entries over a range) and features/data/ledger.ts:101-116 (`workout_sets`, `daily_scores` for all time) and progress.ts:159-163. The "all" range loads 365 days: 5 habits a day is 1825 rows, so habit_checks and logs get truncated silently (unordered, so recent days can be the ones dropped) which skews week comparison, `loggedOnDay` and lift record counts. Needs `.range()` paging or per-range limits plus `.order`.

Low:
6. features/jobs/score-day.ts:142-170 vs 172-190. On Sunday the answer-back reward (`answer_back` flag cleared, `answer_back_done` written) is written before the `daily_scores` write. If the ledger write throws, tick releases the key and retries, but the flag is already cleared, so the retry loses the Callus reward. Write the ledger first or make the flag change last.
7. features/jobs/score-day.ts:193-203. The `weekly_reviews` upsert result is not checked. A failure leaves the day scored (key kept) with no week review and a missing dot in the season record.
8. features/jobs/tick.ts:40. `p.created_at.slice(0, 10)` is the UTC date, not the Riga date. A profile created between 22:00 and 24:00 UTC (Riga is UTC+2 or +3) gets its first scored day one day before it existed. Use `dayOfTimestamp(p.created_at)`. Same pattern at features/data/progress.ts:338.
9. features/jobs/tick.ts:76-78. `ledger` is read before the scoring loop, so `streak` for the last_call push can be one night stale when the same tick scored last night.
10. features/data/progress.ts:259 vs 285. Calorie bars mark a day "over" when eaten > budget, while `onBudget` counts days up to 105% as on budget. Same day can show a coral bar and count as on budget.
11. features/data/progress.ts:271. `.slice(-26)` for the "all" range shows only the last 26 weeks of calories while the weight card shows the full history.
12. features/data/today.ts:106. The quote pool switches to the comeback set when the form drops to Off form, so today's quote can change mid-day after a log. Rotate by day from one pool, or pick the pool once per day.
13. features/logging/actions.ts:99. `parseLog(text, todayRiga())` passes today even when the user is back-filling `day`, so words like "yesterday" resolve against the wrong date. features/logging/actions.ts:266 falls back to an arbitrary 80 kg for activity burn when no earlier weigh-in exists (use the profile weight).
14. features/logging/actions.ts:345. `deleteEntry` revalidates only `/today`; `/progress` (calorie bars, rings) stays stale until the next navigation revalidation.

No timezone mistake found in `lib/dates.ts` (noon-UTC arithmetic is DST-safe) and no off-by-one in the week or range helpers (`rangeStart` month = 30 days, 3m = 90, all = 365 inclusive; adaptive window = 14 days ending yesterday).

## Fix list for the owner (priority)

1. tick.ts error handling per user and stop-on-failure (bugs 1, 2).
2. saveEntries idempotency (bug 3).
3. Paginate or limit the day-facts and ledger queries (bug 5).
4. robots.txt through the proxy (SEO 100) and TBT/unused JS on /login.
5. h1 on /log and /train/[session]; Escape and focus handling for sheets.
