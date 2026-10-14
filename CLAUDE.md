# Steady - build brief for Claude Code

## Read order
1. CLAUDE.md (this file)
2. PRODUCT.md - what to build
3. GAME.md - rings, form, challenges, chapters, trophies
4. ARCHITECTURE.md - how it is built
5. SECURITY.md - required, every box
6. DESIGN.md + design/*.dc.html - how it looks and talks
7. CONTENT.md - workouts, meals, images
8. supabase/migrations/0001_init.sql - the schema (already tested)

Decisions in these files are final. When something is not covered: choose the simplest option, write it in DECISIONS.md, keep going. Ask the user only before removing a feature or changing a locked decision.

## The user
One user, Rydny. Samsung A52, Chrome. Europe/Riga. Goal: aggressive fat loss, keep muscle, football fitness.

## Old app
Live at https://rydny1.github.io/steady-personal-tracker/ (plain HTML, data in localStorage). PRODUCT.md maps every old feature to its new home. Nothing is dropped. Add a one-time import of the old JSON export in Settings > Your data.

## How to work
You are the lead and you build in order, phase by phase. That is the default: this app is small enough that one careful builder beats a team.
- **Reviewers are required**: after every phase run `security-reviewer` and `qa-tester` from `.claude/agents/`. Fix every BLOCKING item before the next phase.
- **Builder agents are optional** (`domain-engineer`, `ui-engineer`, `integrations-engineer`, `content-curator`). Use one only for work that touches separate folders and can't break what you're doing, for example content-curator sourcing images while you build screens.
- Commit after each phase. Write blockers and open questions in HANDOFF.md.

## Phases
The agent names below say which kind of work it is. Whether you do it yourself or hand it to that agent is your call.

**Phase 0 - Foundation (lead only, serial)**
1. `npx create-next-app -e with-supabase steady`, TypeScript strict
2. Copy in these docs, `.claude/agents/`, `supabase/`, `public/icons/`, `design/`
3. `supabase init`, link project, apply migration, run `supabase/tests/rls_check.sql` locally
4. `lib/env.ts` (zod), `lib/supabase/{server,client,admin}.ts`, `lib/dates.ts`, generated types
5. `app/globals.css` tokens from DESIGN.md, fonts, `(app)/layout.tsx` with bottom nav, auth gate
6. Folder skeleton from ARCHITECTURE.md with typed function stubs (signatures only) for every pure function and action. These signatures are the contract
7. Security headers in `next.config.ts`, `app/manifest.ts` with icons and shortcuts
8. Deploy to Vercel (region fra1). Install on phone. Confirm login works

**Phase 1 - Core loop**
- domain-engineer: targets, body metrics, streak
- integrations-engineer: parseLog, saveEntries, saveMeasurement, habit toggle, Gemini wrapper
- ui-engineer: onboarding, Today, Log sheet, body log, basic Progress weight chart
- content-curator: content files + seed + images
- Gate. Deploy.

**Phase 2 - Game + push**
- domain-engineer: rings, Callus, form, You vs last week, weekly challenges, records, chapters, Answer back, trophies, nightly scoring
- integrations-engineer: cron tick, job_runs, web push, service worker, notification prefs
- ui-engineer: rings, form card, Challenges section, chapter card, trophies, settings for notifications
- Gate. Deploy.

**Phase 3 - Train, Fuel, photos**
- domain-engineer: progression, shopping list
- integrations-engineer: photo upload, signed URLs, meal photo estimate, barcode lookup, offline queue
- ui-engineer: Train (body-part days, exercise cards, muscle coverage, library), Session screen (sets, rest timer), Fuel, photos + compare
- Gate. Deploy.

**Phase 4 - Dashboard + insight + data rights**
- domain-engineer: fact engine, grounding check, goal date, adaptive budget
- integrations-engineer: Observer (voiceFact), weekly report, export, delete everything, old JSON import
- ui-engineer: full Progress dashboard, Settings > Your data, privacy note
- Final gate. Deploy.

## Env vars
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=            # current Flash model id from aistudio.google.com. Gemini 2.5 shuts down 16 Oct 2026
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:
CRON_SECRET=             # openssl rand -hex 32
NEXT_PUBLIC_APP_URL=
```

## Done means
- Installed on the A52, opens full screen, push arrives with the app closed
- Every PRODUCT.md feature works, every old-app feature has a home
- SECURITY_REPORT.md: all PASS. QA_REPORT.md: all PASS
- Unit tests green, build clean, no console errors
- DECISIONS.md lists every call made outside these docs
