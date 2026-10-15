# Steady

**A fitness app that doesn't lie to you about calories.**

You tell it what you ate. It tells you what that was. Then it keeps score of whether you showed up.

No streak guilt. No 40-tab dashboard. One quiet app that logs by voice, counts honestly, and treats consistency as the thing worth winning.

Live: <https://steady-fitness.vercel.app>

---

## Why this exists

Most calorie apps make you do two jobs: be a nutritionist and a data-entry clerk. So you quit by Thursday.

Steady flips it. You talk. It listens. It works out the rest.

Three promises, and the code is built around them:

1. **Logging takes seconds.** Say it, type it, or snap it.
2. **The numbers are real.** Not "an AI's best guess." Real numbers from a real food table.
3. **It rewards showing up.** A score called *Callus* goes up when you log and train, and drops when you skip. Simple. Honest.

---

## What you get

| Screen | What it does |
|---|---|
| **Today** | Your three rings (calories, protein, training), net calories for your goal, one true line from the Coach, your Callus, and today's log. Tap any entry to fix it. |
| **Train** | A week strip, today's session, exercise cards with images. |
| **Log** | Two tabs: *Text* (type or talk, with a mic beside the box) and *Photo*. Edit before you save. Edit after, too. |
| **Fuel** | Batch recipes, a shopping list that builds itself (and folds away), quick buys, your own recipes. |
| **Progress** | Weight trend, season record, levels, trophies, progress photos, a projection. |

When you earn a trophy, you get a small celebration. The latest one becomes a title next to your name.

---

## The calorie problem (and how Steady solves it)

Here's the bug every AI calorie app has.

Ask a language model "how many calories in this plate?" and it will answer with total confidence. And it will be wrong by 30 to 100 percent. Models are great at *seeing* food. They are bad at *remembering energy density*.

We hit it for real. A plate of egusi soup, plantain, shrimp and cassava came back as **2,800 kcal**. Two other assistants said roughly 900 to 1,250. The soup alone was priced as if it were pure oil.

So Steady stopped asking the model for calories at all.

### The rule: the model sees. The code counts.

```
 voice / text / photo
        │
        ▼
 ┌──────────────────┐   names + grams + category
 │  Gemini (vision  │   "egusi soup with spinach", 250 g, soup_stew
 │  and language)   │   It never has the last word on kcal.
 └────────┬─────────┘
          ▼
 ┌──────────────────────────────────────────────┐
 │  Resolver  (features/logging/accuracy.ts)    │
 │                                              │
 │  1. Your saved food or recipe, exact name    │──▶ your numbers
 │  2. Verified food table, 350+ foods          │──▶ grams × per-100 g
 │  3. Guarded estimate (flagged "AI estimate") │──▶ clamped by plausibility
 └──────────────────────────────────────────────┘
          ▼
 Draft items you can edit, each labelled with where its number came from
```

**Layer 1: your own foods win.** If you saved "my shake," that's what it is.

**Layer 2: a verified table.** About 350 foods from USDA FoodData Central, Open Food Facts, and documented composites for dishes like egusi soup, jollof rice, ndolé and fufu. The model supplies grams. Code multiplies. `250 g × 196 kcal/100 g = 490 kcal`. Same answer every time.

**Layer 3: a guarded fallback.** For anything the table doesn't know, the model's guess is allowed, but it is clamped to what's physically believable for that kind of food. A soup can't be 8.8 kcal per gram. That's oil. The guard pulls it back to a sane band, and the item is labelled **AI estimate** so you know to glance at it.

Two more details that matter:

- **The dish is what comes before "with."** "Ndolé with shrimp" is ndolé, not shrimp. Matching the side ingredient would price the whole dish wrong.
- **Every item shows its source.** *from food table*, *your saved food*, or *AI estimate*. No black box.

Change the grams in the edit sheet and the calories follow. Change the kcal and you're in charge.

---

## Your deficit, your call

Pick a goal weight and a number of weeks. Steady suggests a daily deficit (or surplus, to gain), tells you plainly what pace that is, and you can change it. Today shows the deficit so far against your target and how much you can still eat.

Logging is built the same way: simple things ("ran 4 km", "5000 steps", "2 eggs") are read by rules, instantly, with no AI. Only the rest goes to Gemini, and the numbers always come from code.

## Net calories that know your goal

Steady estimates what you burned (resting burn plus exercise) and subtracts it from what you ate.

- **Losing weight?** A bigger deficit is good news.
- **Gaining?** A surplus is the win.
- **Maintaining?** Close to zero is the goal.

Your daily budget and the Monday budget adjustment use the same goal logic. 7,700 kcal is treated as one kilo.

---

## Under the hood

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router), React, TypeScript strict |
| Styling | Tailwind 3, fluid type, one design token file |
| Data | Supabase: Postgres, Auth, private Storage |
| AI | Gemini, with a speed-ranked model fallback chain |
| Hosting | Vercel |
| Tests | Vitest. 180+ unit tests on the pure engine |

### Shape of the code

```
features/
  game/        Callus, form, levels, trophies, streaks (pure, tested)
  nutrition/   targets, energy balance, food matching (pure, tested)
  logging/     parse, estimate, save, the accuracy resolver
  body/        weight trend, body-fat estimate
  insights/    the Observer: one true line a day, from facts, not vibes
  training/    sessions and exercises
  jobs/        nightly scoring, weekly report, adaptive budget
content/       foods table, recipes, copy, tooltips
lib/ai/        the only file that talks to Gemini
proxy.ts       auth, MFA gate, per-request CSP nonce
```

The rule of the codebase: **business logic is pure functions, tested without a database.** Pages call them. They don't contain them.

### Security, in plain words

- Two-step sign-in (authenticator app) is optional. Turn it on in Settings and it is enforced everywhere, including in the database: a password-only session sees nothing.
- Row-level security is on and *forced* on every table. A bug in the app can't read someone else's data, because the database says no.
- Photos live in private buckets. They're served by short-lived signed links.
- Strict Content-Security-Policy with a nonce per request.
- Sign-up is open, but only through the app's own gate. Direct calls to the auth API are refused by a database trigger.
- Scheduled jobs are authenticated with a bearer secret and are idempotent.
- The admin key exists in only three places: cron jobs, sign-up, and "delete everything."

Details: `SECURITY.md` and `SECURITY_REPORT.md`.

### Speed

- Login check by verifying the token locally, not a network round trip per page.
- Skeleton screens for every tab, so a switch never looks frozen.
- Visited pages stay in the client cache for a short while.
- Per-model AI timeouts (8 s) so a slow model never stalls a log.
- Images recompressed. Fonts self-hosted.

---

## Run it yourself

You need Node 20+, a Supabase project, a Gemini API key, and a Vercel account.

```bash
git clone <this repo>
cd steady
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Environment variables (names only, never commit values):

| Name | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The publishable (public) key |
| `SUPABASE_SECRET_KEY` | Server-only admin key |
| `GEMINI_API_KEY` | Gemini key |
| `GEMINI_MODEL` | Preferred model |
| `GEMINI_FALLBACK_MODELS` | Comma list, tried in speed order |
| `CRON_SECRET` | Bearer secret for the scheduled tick |
| `SIGNUP_TOKEN` | Secret the sign-up gate checks |

Database: apply the files in `supabase/migrations/` in order.

### Commands

```bash
npm run dev        # local dev server
npm run build      # production build
npm run lint       # ESLint
npx tsc --noEmit   # type check
npx vitest run     # unit tests
```

---

## Honest limits

- Meal photos give a *good* estimate, not a lab result. Portion size from a picture is the hard part. Check the grams.
- The food table is strong on common, Latvian and West African foods. It's not every food on earth. Unknown foods fall back to a guarded estimate and say so.
- Free-tier AI has rate limits. The model chain softens that. A paid tier removes it.
- Payments, a CMS and push on iOS are out of scope for this build.

---

## More docs

`PRODUCT.md` what it does · `GAME.md` how scoring works · `DESIGN.md` how it looks · `ARCHITECTURE.md` how it's built · `DECISIONS.md` every change of mind, with the reason · `QA_REPORT.md` what was tested

---

Built to be steady. Not perfect. Steady.
