# Decisions

Every call made outside the spec docs, and every change the owner asked for after the spec was written.

## Owner changes after the spec (this supersedes the docs where they differ)
- **Daily quote card**: real quotes only, person's name under the quote, under 20 words, verified against a source. Bank of 60 or more in `content/quotes/quotes.ts` (re-exported by `content/lines.ts`). All the old harsh Coach lines are gone. A set tagged `comeback` is used on Off form days. Rotation is deterministic by day number, so nothing repeats inside the bank length.
- **You vs last week**: matching last week in a round wins the round. Only doing worse loses it. A round where both sides did nothing (0 against 0) stays a draw so nothing wins for free.
- **No football theme**: levels are Starting line, Showing up, Building, Consistent, Strong, Disciplined, Proven, One year. Challenges are Early bird, Protein week, On time, Move more, Mirror check, Scale check, Lights out (Clean week unchanged). "The Coach" replaces "The Gaffer". Also renamed for the same reason: form word Unplayable is now Peak form, trophies First whistle and Hat-trick are Day one and Three in a row, "Full time" is "Week done". Football as an activity (the sport) stays.
- **Database**: enum `division_t` is now `level_t` with the eight new values (migration 0003). Challenge keys in `weekly_challenges.challenge_key` keep their old internal ids (early_kickoff and so on) because they are only keys, the display names changed.
- **Info tooltips**: a (?) beside every concept a new user would not know, text in `content/tooltips.ts`, opens in a bottom sheet.
- **Progress**: season record (W-D-L plus a dot per week) and level history timeline under the weekly challenge. Photos section has front, side and back, a grid sorted by date, a compare slider, and a nudge when the last photo is 14 days old (also a Saturday push, notification kind `photo_day`). The weight card says when the goal is reached at this pace, and this week and total movement.
- **Food**: five batch recipes and two quick meals replace the West African set, quick buys unchanged. Quick meals appear in the quick buys grid, batch recipes in the weekly prep and shopping list. You can add your own recipes (name, kcal and protein per portion), they become saved foods and one-tap logs. Targets can be set by hand in Profile, with an option to switch the Monday adaptive budget off.

## Build decisions
- Next.js 16 (proxy.ts instead of middleware.ts), Tailwind 3, `cacheComponents` off. Every page is dynamic because the CSP nonce is per request.
- Budget formula follows the spec literally: 0.75 x 1.3 x BMR is below BMR, so the BMR floor applies and the starting budget equals BMR plus exercise add-back. The Monday adaptive budget then moves it by at most 150 kcal a week from real data. Owner can set any budget at or above BMR by hand.
- Progression step is 2 kg (CONTENT.md), not 2.5 (PRODUCT.md).
- Exercise add-back stored in `activity_entries.kcal_burned` is 50 percent of MET x kg x hours.
- "Logged" for score and streak means a `logs` row created on the day itself. A log started and never saved still counts as engaging. Back-filled days score as not logged.
- Extra tables beyond 0001 (migration 0002): `user_flags` (remembered state: Answer back, level event, trophies earned, shopping ticks, picks, adaptive toggle) and `observer_notes` (the Coach's feed). Both have RLS forced.
- Answer back starts by itself after a lost week or a missed day that cost Callus, and finishes after 3 clean days (half the lost Callus returns).
- The nod (rare extra line) is implemented as a pure function in the game engine but not wired to a push yet.
- **Sign-ups are open** (owner's request, supersedes SECURITY.md section 1 "turn off new sign-ups"): anyone can create an account at /signup with an email and a 12+ character password, after ticking explicit consent for health data (GDPR Art. 9) and reading /privacy. Accounts are created confirmed through the admin API (no email round trip yet), limited to 5 new accounts an hour per address (claimed in `job_runs`). Two-step sign-in is still required for every account. Isolation is Row Level Security on every table plus per-folder Storage policies. Still to do by the owner before inviting people: turn on email verification and a CAPTCHA in Supabase Auth, put Gemini on the paid tier (the free tier lets Google use inputs for training, and the key shares 20 requests a day per model across all users), and sign data processing terms with Supabase, Vercel and Google.
- Delete everything uses the secret-key client once (to delete the auth user, which cascades every table). It is the only place outside `api/cron` that imports it.
- Photos: client re-encodes to JPEG 1600 px (drops EXIF and GPS), uploads straight to private Storage, signed URLs last one hour. The export zip is built by a 60-line stored-zip writer (`lib/zip.ts`) so no zip dependency was added.
- Packages added: zod, @google/genai, web-push, server-only, vitest, @vitest/coverage-v8, eslint-plugin-security, prettier, @playwright/test, @types/web-push. All pinned to exact versions.
- Gemini: model chain from `GEMINI_MODEL` then `GEMINI_FALLBACK_MODELS` (comma separated), one attempt per model (now 8 s each, 45 s total). The key currently shows 5 requests a minute and 20 a day per model, so three models give three times the headroom.
- Offline queue holds tap logs only (saved foods, quick buys, barcode results), never AI calls.
- **Security review fixes (SECURITY_REPORT.md)**: two-step sign-in is now enforced by the database too (restrictive policy `require_aal2` on every user table and on Storage), so a password-only session cannot read data through the REST API. Direct calls to the public Auth sign-up endpoint are refused by a trigger that needs a secret token (Vault `steady_signup_token`, env `SIGNUP_TOKEN`) that only the Steady server knows, so the 12-character rule, consent box and rate guard cannot be skipped. Consent time and version are stored in the user's metadata. Failed AI calls now count toward the daily limit. Force RLS is on every table. `/auth/confirm` rejects backslash redirects, export downloads refuse cross-site requests, and every dependency is pinned to an exact version.

## Round 4 (owner changes)

- **Two-step sign-in is optional.** It added friction at sign-up and login. It is offered in Settings ("Turn on"), and once a person enrols an authenticator app it is enforced: the proxy asks for the code, and the database refuses a password-only session through `public.mfa_satisfied()` (migration 0009). People without a factor are not blocked.
- **The daily limit is a ceiling, built around net calories.** Limit = rest-day amount + the full exercise burn (stored `kcal_burned` is a 50 percent add-back, so it is divided by the share). Net = eaten minus (resting x 1.3 + exercise). The adaptive Monday limit subtracts the window's average exercise burn so training is not counted twice.
- **Net calories on Progress** replace the eaten-versus-budget chart: bars around zero, a dashed target, the pace in kg a week, weeks to goal, what 30 days would need (flagged past -1,000 a day), and a short Coach line written by Gemini (numbers checked against the facts, 5 a day per person, plain sentence otherwise).
- **Meal photos are no longer kept** (only used to read the plate). Progress photos stay. Quick buys are a shopping reference and no longer log on tap.
- **Trophies renamed** (Spark, Momentum, Outdone, Surge, Daybreak, Rebound, Driven, Lighter, Transformed, Trim, Peak, Proof) with a tap-for-meaning sheet. Moments: trophy celebration, saved toast, welcome-back toast.
- Days with less than 40 percent of resting burn logged are not counted in net averages.

## Round 5 (owner changes)

- **Built around the deficit you choose.** Limit = daily burn plus the deficit (or surplus, to gain) the person picks. Steady suggests one from goal weight and weeks (capped at -1,000 / +600 a day, 0.5 kg a week by default), reads it back ("0.8 kg a week. Fast and doable."), and the person overrides it. Below the resting burn is allowed and warned about; the limit never goes under 1,000. Today's first ring is the deficit so far against the target, with one short line: "Eat up to 140 more."
- **Logging reads the plain stuff without AI.** `features/logging/quick-parse.ts` reads times, distances, steps, pace and foods with grams or counts. Only what it cannot read goes to Gemini, and if Gemini is down the rule-read items are still returned. Distance, steps and pace become minutes and speed in `nutrition/activity.ts` (run, walk and cycling burn by speed).
- **Gemini quota:** the free tier is about 20 requests a day per model, so the chain now spans eight models (lite first), with a 45 s total deadline.
- **Less text everywhere.** Form bands are explained in its tooltip: off form is bad, finding form medium, in form good, peak form best.

## Round 6 (owner changes)

- **Voice no longer repeats on phones.** Android Chrome re-sends earlier words in every result when continuous recognition is on. Recognition is now one utterance at a time, and segments are merged without repeats (`features/logging/speech.ts`, tested).
- **Streak and promises as circles.** Today shows a circle that fills with how many promises are done (small % inside), the streak with a flame and the distance to the next milestone, and the week as seven circles. Small wins pop once a day each: the Duolingo-style streak card on the first log of the day, all promises done, protein target hit, training done, challenge done. Milestones: 3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365.
- **Deficit fun fact:** "About 0.19 kg of body fat. Repeat it for a week: 1.3 kg." (7,700 kcal per kg.)
- **Any logged day counts toward net averages**, fasting days included ("I fasted today" logs a zero-calorie entry).
- **Photo buttons** everywhere offer camera or gallery (`components/photo-picker.tsx`).

## Round 7 (owner changes)

- **Any activity can be logged.** The type stays one of eight (other for anything new), the person's own name is stored as `label` (migration 0010). Known activities use a MET table; unknown ones use the AI's estimate held to 1.5 to 15, and an assumed time is flagged. Strength is sets x reps turned into minutes and merged into one gym entry; hiking is MET 6 at 4 km/h.
- **Promises: zero to nine** (migration 0011). Removed ones are archived, never deleted. The all-promises point needs all of them.
- **Harder Callus, longer road.** Gains shrink above 50 (floor 50 percent). Form bands 35 / 65 / 90. Eight levels over 365 days (10, 30, 60, 100, 150, 220, 365) named Rookie, Contender, Grinder, Dialed In, Locked On, Elite, Legend, Icon. 43 trophies in nine groups.
- **Streak freeze.** Two a month, set for today, costs 8 Callus only if nothing is logged that day; the streak is kept. Stored in `user_flags.streak_freezes`.
- **Day pages** (`/day/[date]`, up to 60 days back) with the same edit sheet; "Add to this day" on the Log screen.
- **Known simplification:** net uses burn = BMR x 1.3 + full exercise MET x kg x h, so steps and long walks are partly counted twice and hard runs are about 10 percent high. Kept on purpose: it is simple to explain and errs toward a bigger burn number. Revisit if real weight change disagrees.

## Round 8 (owner changes)

- **Three tiers of truth for food numbers:** (1) a label you read or a food you saved, exact per 100 g for any amount; (2) the verified table (USDA, Open Food Facts, composites); (3) an AI estimate, clamped to a believable range and marked. A bigger model does not fix a wrong table row; reading the printed label does.
- **Read a label:** the AI only copies the printed nutrition table; code converts per serving to per 100 g, checks energy against protein, carbs and fat (4/4/9), converts kJ mistaken for kcal, and warns when the numbers do not add up. The person confirms, and the food is saved with its exact per 100 g values (migration 0012).
- **Matcher fix:** rare words decide (greek beats plain), generic words (plain, natural) are ignored. "Greek yogurt, plain" used to land on plain yogurt (3.5 g protein per 100 g instead of 9).
- Free AI options were compared (Gemini lite first, Groq as a text-only fallback candidate). Not switched; health data goes to whichever provider is used.
