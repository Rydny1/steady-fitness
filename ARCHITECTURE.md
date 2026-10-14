# Steady - architecture

## How it runs and how you get it
| Question | Answer |
|---|---|
| What is it | A web app built as a PWA. One codebase for phone and laptop |
| Where it lives | Vercel (app) + Supabase EU region, Frankfurt or Stockholm (database, login, photos) |
| How you open it | `https://<name>.vercel.app` in Chrome on the A52, then menu > Install app. It gets a home-screen icon, opens full screen, sends push notifications |
| App Store / APK | Neither. No store review, updates go live on every deploy. If a Play Store listing is ever wanted, wrap it later with Bubblewrap (TWA) |
| Cost | €0 on free tiers. Gemini paid tier with a €2 monthly cap: about €0.10 to €0.50 a month at one user |

## Stack
| Layer | Tech | Why |
|---|---|---|
| Starter | `npx create-next-app -e with-supabase steady` (official Vercel + Supabase starter: App Router, `@supabase/ssr` cookie auth, Tailwind, shadcn/ui) | Auth wiring done right on day one |
| Language | TypeScript, `strict: true`, `noUncheckedIndexedAccess: true` | Catches bugs before runtime |
| UI | React Server Components by default, client components only for interaction. shadcn/ui primitives restyled with DESIGN.md tokens. `lucide-react` icons | No UI library look |
| Validation | `zod` on every input: forms, server actions, Gemini output, env vars | One schema, used client and server |
| DB | Supabase Postgres, migrations in `supabase/migrations`, generated types `supabase gen types` | Schema is code |
| AI | `@google/genai`, model from env `GEMINI_MODEL` | Gemini 2.5 shuts down 16 Oct 2026. Never hard-code a model id |
| PWA | Next.js `app/manifest.ts` + hand-written `public/sw.js` (push + small offline shell). No PWA plugin | Fewer moving parts |
| Push | `web-push` with VAPID keys | Works on Android Chrome |
| Scheduler | Supabase `pg_cron` + `pg_net`: one job every 15 min calls `POST /api/cron/tick` | One idempotent endpoint instead of many crons |
| Tests | Vitest (pure logic), Playwright (one smoke run), SQL RLS check | Test what can silently break |
| Lint | ESLint + Prettier, `eslint-plugin-security` | Cheap guard |

## Folder structure
```
steady/
  app/
    (auth)/login/page.tsx
    (app)/layout.tsx              # auth gate + bottom nav
    (app)/today/page.tsx
    (app)/train/page.tsx
    (app)/train/[session]/page.tsx
    (app)/fuel/page.tsx
    (app)/fuel/[recipe]/page.tsx
    (app)/progress/page.tsx
    (app)/settings/page.tsx
    (app)/settings/data/page.tsx  # export + delete everything
    api/cron/tick/route.ts        # scheduler entry, secret-protected
    api/push/subscribe/route.ts
    manifest.ts
    layout.tsx
  features/                       # one folder per domain, owns its UI + logic
    logging/    components/ actions.ts schema.ts parse.ts
    nutrition/  components/ actions.ts targets.ts adaptive-budget.ts barcode.ts shopping-list.ts
    body/       components/ actions.ts metrics.ts
    training/   components/ actions.ts progression.ts
    game/       callus.ts divisions.ts weekly-match.ts streak.ts   # pure, no I/O
    insights/   facts.ts observer.ts grounding.ts weekly-report.ts
    photos/     components/ actions.ts compress.ts
    notifications/ schedule.ts send.ts copy.ts
  lib/
    supabase/server.ts client.ts admin.ts   # admin = secret key, import 'server-only'
    ai/gemini.ts                            # the only file that talks to Gemini
    env.ts                                  # zod-checked env, import 'server-only'
    dates.ts                                # all Europe/Riga date math
    rate-limit.ts
  content/   exercises.ts meals.ts snacks.ts copy.ts
  components/ui/                            # restyled shadcn primitives
  supabase/migrations/  supabase/seed.sql  supabase/tests/
  public/sw.js  public/icons/  public/images/
  tests/unit/  tests/e2e/
  CREDITS.md  DECISIONS.md
```
Rules:
- `features/*` never import from another feature's `components/`. Shared bits go to `lib/` or `components/ui/`.
- Pure logic (calc, game, insights) has no imports from Supabase, Next or React. It takes plain data and returns plain data. 100% unit tested.
- Reads: server components query Supabase directly through `lib/supabase/server.ts`.
- Writes: server actions only. Each action: get user, validate with zod, write, `revalidatePath`. No client-side writes except photo upload to Storage.
- `lib/supabase/admin.ts` is imported only by `api/cron/*`.

## Data flows

### Voice log
```
mic (Web Speech API, on the phone)
  -> text shown live
  -> server action parseLog(text)
       auth check -> zod(text, max 4000) -> rate limit (60/day)
       -> insert logs row (raw text kept)
       -> lib/ai/gemini.ts (structured output, 15 s timeout, 1 retry)
       -> zod validate Gemini JSON (reject anything off-schema)
       -> return draft items (not saved)
  -> confirm sheet (user edits)
  -> server action saveEntries(draft)
       auth -> zod -> compute kcal_burned in code -> insert food/activity rows (log_id linked)
       -> upsert saved_foods use_count -> revalidatePath('/today')
```

### Photo
```
pick/take photo -> canvas re-encode to JPEG 1600px q0.8 (this also strips GPS/EXIF)
  -> upload to Storage at {user_id}/{uuid}.jpg (RLS checks the folder)
  -> server action inserts photos row
  -> display via signed URL (1 hour), never public
```

### Scheduler (every 15 min)
```
pg_cron -> pg_net POST /api/cron/tick (Bearer CRON_SECRET from Supabase Vault)
  -> constant-time secret check
  -> now in Europe/Riga
  -> for each due job: insert job_runs(job_key) ... on conflict do nothing
       inserted? run it. Already there? skip (no double sends)
  -> jobs: push notifications, nightly scoring (00:05 for yesterday),
           weekly match + AI summary (Mon 00:10 / Sun 21:00)
```

## Database
Full schema: `supabase/migrations/0001_init.sql` (tested: migration runs, user B cannot read or write user A's rows, bad values rejected).

Design choices:
- 3rd normal form. Totals (calories, protein, weight average) are views, never stored.
- Two allowed exceptions, documented: `activity_entries.kcal_burned` (depends on weight that day, so frozen at save) and the `daily_scores` / `weekly_reviews` ledger (past results must not change if rules change).
- `user_id` on every user table, even child tables, so RLS is one simple rule everywhere.
- Every column validated with CHECK constraints. Enums for fixed sets.
- `logs.raw_text` keeps what was said, so entries can be re-parsed if the model improves.
- `exercises` is seeded reference data so `workout_sets` has a real foreign key.

Seed (`supabase/seed.sql`): exercises from CONTENT.md only. User defaults (weekly plan, notification times, 5 habits: Walk 30 min, Stretch 10 min, Water 2.5 L, Hit protein, Asleep by 23:30) are created by the onboarding server action, because they need a user id. The user can rename habits.

Generate types after every migration: `supabase gen types typescript --local > lib/supabase/types.ts`.

## Gemini wrapper (`lib/ai/gemini.ts`)
- One exported function per job: `parseLog`, `estimateMealPhoto`, `voiceFact` (Observer line), `weeklyReport`.
- `voiceFact` and `weeklyReport` output must pass `features/insights/grounding.ts` (every number and date in the output exists in the input facts) or the template line is used.
- Model from `GEMINI_MODEL` (set to the current Flash model, check aistudio.google.com at setup).
- `responseMimeType: 'application/json'` + `responseSchema`. Then zod parse again. Never trust it.
- Timeout 15 s, 1 retry on 429/5xx with backoff. On failure: keep the raw log, show manual entry.
- User text is data. The prompt says extraction only. Output is rendered as plain text, never HTML, never executed.

## Change-friendly by design
- All tunable numbers (deficit %, MET values, Callus points, division thresholds) live in `features/*/config.ts` files, not inline.
- All app copy lives in `content/copy.ts`.
- All colours and type in `app/globals.css` tokens.
- New feature = new folder in `features/`.

## Scaling note
Built for one user, ready for many: every row has `user_id`, every table has RLS, the app server is stateless. Opening it to more people = turning sign-ups back on plus a privacy policy. Nothing else in the code changes.
