# Steady - design + copy

**Source of truth: the screens in `design/`** (Today = `Main.dc.html`, plus Login, Log, Progress, Train, Session, Fuel, Profile). They are HTML with inline styles. Copy layout, spacing, sizes and colours from them exactly. Ignore the `<x-dc>`, `<helmet>` and `DCLogic` wrappers, they are the design tool's format. Rebuild each screen as React components with the tokens below. Live canvas (Rydny's view): https://claude.ai/artifact/XqtSU9CAEfH7YLnKxqTUgj

## Direction
White, calm, athletic. Big type, big rings, lots of air. Content sits on soft grey cards with large radii, never shadows. One dark card per screen carries the most important thing (Today: today's line. Progress: You vs last week). Colour only means something: green fuel, blue protein, coral training, amber Callus.

Hard bans: gradients, glassmorphism, drop shadows, purple, emoji, three identical cards in a row as decoration, ALL-CAPS labels, middle-dot meta strings, arrows in button text, monospace labels, confetti, mascots, stock "fitness people" photos, lorem text.

## Tokens (`app/globals.css`, light only in v1)
| Token | Hex | Use |
|---|---|---|
| `--bg` | #FFFFFF | Background. The main colour |
| `--card` | #F5F6F7 | Cards, inputs, segmented controls |
| `--ink` | #121417 | Text, primary buttons, the dark hero card |
| `--ink-2` | #3D4248 | Secondary body text |
| `--muted` | #5F656D | Labels, captions (4.5:1 on white and card) |
| `--muted-dark` | #A9AEB5 | Muted text on the ink card |
| `--line` | #E6E8EB | Hairlines, bar tracks, image placeholders |
| `--fuel` | #0E8A4F | Fuel ring, calories, "down" deltas, checks |
| `--protein` | #2563EB | Protein ring |
| `--train` | #E5432D | Train ring, activity, over budget |
| `--train-soft` | #FDE7E3 | Training icon tiles |
| `--amber` | #F2B300 | Callus bar and trophy icons only. Never text |
| `--danger` | #C2301F | Delete everything, errors |

## Type
- **Barlow Condensed** 600: numbers only (rings values, Callus, weights, scores). `tabular-nums`.
- **Hanken Grotesk** 400 / 500 / 600 / 700: everything else.
- Scale (px): 12 nav / 13 caption / 15 secondary / 17 body / 22 section title / 28 screen sub-title / 34 screen title / 56 form word / 72 score.
- Titles: 700, letter-spacing -0.8 px at 34, -0.3 px at 22. Sentence case only.
- `next/font/google`, fallback `system-ui, sans-serif`.

## Layout
- Phone first, 390 wide. Screen padding 24 px for text, 16 px for cards. Max width 520 px on larger screens.
- Cards: `--card`, radius 28 (hero), 24 (lists), 20 (tiles), padding 22-24.
- Pills and buttons: radius 999. Primary = ink fill, white text, 54-56 px tall. Secondary = card fill.
- Bottom nav: 96 px, white, top hairline. Today, Train, centre Log (64 px ink circle, white ring, mic), Fuel, Progress. Profile from the avatar on Today.
- Icons: `lucide-react`, 24 px, stroke 1.8.
- Touch targets 44 px minimum.

## Rings and bars
- Rings: SVG circles, stroke 17 (Today, 168 px), stroke 4 (week minis, 40 px). Round caps. Track = same colour at 16 % opacity. Start at 12 o'clock. Over 100 %: keep drawing past full in a 20 % darker shade.
- Bars: fully rounded (`rx` = half the width). Track `--line`. Calorie chart bars 28 px wide, over budget in `--train`, today at 35 % opacity until the day ends.
- Weight chart: 2.5 px ink line for the 7-day average, faint dots for daily weights, dashed goal line. Drag to scrub: the number at the top follows your finger.
- Animate rings and bars only on first draw (500 ms ease-out). Respect reduced motion.

## Screens (see `design/`)
| Screen | Holds, top to bottom |
|---|---|
| Sign in | Icon, "One steady day at a time.", email, password, Sign in, Forgot password, privacy line. No sign-up (sign-ups are off) |
| Today | Date + avatar, greeting, rings card, kcal left line, today's line (ink card), form card (form word, Callus, chapter bar, Gaffer line, You vs last week strip, streak / career / trophies tiles), today's session, five promises, today's log with photos |
| Log | Voice / Photo / Type switch, live transcript, parsed items with "Check this", running total, mic + camera + Save log |
| Progress | Challenges (You vs last week ink card, weekly challenge, records), range switch, week rings, weight card, calories card, body tiles, The Gaffer noticed, trophies, photos |
| Train | Week strip, muscle coverage chips, session hero, muscle tags, Start session, exercise list (tap opens How / Tip / Works), stretch list, library by muscle |
| Session | Timer, exercise progress, photo, tip, sets with weight and reps inputs, last time, rest timer (ink card), next exercise, Finish session |
| Fuel | This week's prep (pick 2 recipes), shopping list by aisle, quick buys grid, your plates |
| Profile | Avatar, form and chapter, 3 stat tiles, Targets, Plan, Account, Your data (export, import old Steady, privacy, delete), Sign out |
| Onboarding (not drawn) | One question per screen, same style as Sign in, big numeric inputs |

Greeting by time: "Morning, {name}." before 12:00, "Afternoon, {name}." to 18:00, then "Evening, {name}."

## Motion
- Promotion: the only big moment. Full-screen chapter card, chapter name slides up, story fades in, Callus bar fills. 600 ms.
- Ring close: the ring finishes its stroke, short haptic (`navigator.vibrate(20)`).
- Sheets: slide up 220 ms. Everything else instant.

## Images
- App icon: `public/icons/`. Exercise and food images: CONTENT.md > Images. Every image slot has a `--line` placeholder at the right ratio while loading.

## Voice
Two voices only:
- **The app** (buttons, labels, errors): plain, neutral, short.
- **The Gaffer** (identity lines, Observer, match, chapters, nods, notifications): GAME.md. Few words, calm, true, never shouts.

### Copywriting method (every line goes through this)
1. **Write to one person.** "You", never "users". Read it as if spoken to Rydny in the changing room.
2. **Specific beats general.** "38 g protein short" beats "low protein". Numbers from his data whenever possible.
3. **One idea per line.** If a line has "and", try two lines or cut one.
4. **Short first sentence.** It earns the second. (Sugarman's slippery slide.)
5. **Verbs, not adjectives.** "Log it" beats "Quick and easy logging".
6. **Cut a third.** Write it, then delete 30 %. Omit needless words.
7. **Read it aloud.** If a coach wouldn't say it out loud, rewrite it.
8. **Truth only.** No claim the data can't back. No fake urgency.
9. **Say it his way.** Mirror the words he uses in logs ("jollof", "football", "biezpiens").

Banned words and patterns: unlock, elevate, journey, empower, crush it, beast mode, level up, let's go, you've got this, amazing, awesome, seamless, game-changer, "not just X, but Y", "it's not about X, it's about Y", rhetorical questions, exclamation marks, emoji.

Buttons say what happens: "Log", "Save log", "Start session", "Finish session", "Mark done", "Add photo", "Compare", "Export my data", "Delete everything".

All Gaffer lines, chapters, match lines and trophies: GAME.md.

### Notifications
- wake_gym: "06:30. Feet on the floor." / "The bed will still be there tonight. Gym first." / "Nobody is coming to drag you there. Go." / "You said 06:30. Prove it." / "Cold start. Warm by set two."
- wake_run: "30 minutes. Easy pace. Shoes on." / "Run day. Out the door before you think about it." / "Slow kilometres today. They count."
- log_nudge: "Nothing logged. The day is ending." / "Say what you did. 30 seconds." / "Your streak is waiting on one sentence." / "Good day or bad day, log it." / "Last week's you logged by now."
- last_call: "One hour left. Log or lose {streak} days." / "Midnight takes the streak. Your call."
- weekly: the full-time line from GAME.md

### Empty and error states
| Where | Copy |
|---|---|
| Today, nothing logged | "Nothing logged yet. Tap the mic and say what you did." |
| Weight chart, under 2 weigh-ins | "Two weigh-ins start the trend. Morning, after the toilet, before food." |
| Progress photos, none | "No photos yet. Front, side, back. Same spot, every two weeks." |
| Meal photos, none | "Photos of your meals show up here." |
| Patterns, under 14 days | "Two weeks of logs and I'll tell you what I see." |
| Voice not supported | "Voice isn't available in this browser. Type it instead." |
| Parse failed | "Couldn't read that log. Your words are saved. Try again or enter it by hand." |
| Gemini limit hit | "AI is resting for today. Enter it by hand, it still counts." |
| Offline | "Offline. Your log will send when you're back." |
| Delete confirm | "This deletes every log, number and photo. It can't be undone. Type DELETE." |
