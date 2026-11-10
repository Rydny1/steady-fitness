# Steady design research: depth, contrast, small-phone type

Basis: current DESIGN.md, `app/globals.css`, `tailwind.config.ts`, rings-card, adaptive-note, progress page. Contrast ratios below are computed by me (WCAG relative luminance), not estimated. Where a source could not be fetched I say so.

Note: DESIGN.md hard-bans gradients, shadows and glassmorphism. The owner has lifted that. Update DESIGN.md "Hard bans" when applying this.

## Evidence base (what the sources actually say)
- iOS default text 17 pt, minimum 11 pt; hit target default 44x44 pt, minimum 28x28; AA contrast 4.5:1 up to 17 pt, 3:1 for bold; thin weights need larger sizes; support text enlargement to 200%. https://developer.apple.com/design/human-interface-guidelines/accessibility (read via the sosumi.ai mirror; the Apple site itself returned no body text to my fetcher).
- iOS Large-default styles: Large Title 34, Title1 28, Title2 22, Title3 20, Body 17/22, Callout 16, Subhead 15, Footnote 13, Caption 12/11. https://developer.apple.com/design/human-interface-guidelines/typography (same mirror).
- Apple adds about 12 pt padding around bezeled controls, 24 pt around unbezeled. Same accessibility page.
- Activity rings: never recolor or filter them; keep an outer margin at least the width of the gap between rings; use them only for personal progress. https://developer.apple.com/design/human-interface-guidelines/activity-rings (summarised by search; mirrors).
- Material 3 replaces shadow-led elevation with tonal surface roles (surface, container low, container, high, highest); shadows are kept for overlapping layers such as sheets. https://material.io/blog/tone-based-surface-color-m3 (search summary). I could not verify M3 dp or type-scale numbers; none are used below.
- WCAG 2.2 1.4.11: UI components and graphics needed to understand content need 3:1 against neighbours. https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html. Target size minimum 24x24 CSS px: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- NN/g visual hierarchy: use at most about 3 sizes, at most about 2 large elements, saturated colour reserved for the most important items, "if everything is contrasted, nothing stands out", group by space, squint-test. https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
- NN/g mobile: prioritise ruthlessly, lead with the summary, give undo for accidental taps. https://www.nngroup.com/articles/mobile-ux/
- NN/g timing: 0.1 s feels instant, 1 s keeps flow, 10 s loses attention. https://www.nngroup.com/articles/response-times-3-important-limits/ Skeletons: unnecessary under 1 s, good for 2 to 10 s full-page loads, spinners for single modules. https://www.nngroup.com/articles/skeleton-screens/
- Von Restorff: the item that differs from similar neighbours is remembered; use sparingly; do not rely on colour alone. https://lawsofux.com/von-restorff-effect/
- Goal-gradient: effort rises as the goal nears; progress cues help. https://lawsofux.com/goal-gradient-effect/ (animal and reward-programme studies, so treat as directional.)
- Peak-end: experiences are judged by the peak and the end (Kahneman 1993). https://lawsofux.com/peak-end-rule/
- Hick's law: fewer options per step, highlight the recommended one. https://lawsofux.com/hicks-law/
- Fogg: behaviour needs motivation, ability and a prompt together. https://behaviormodel.org/
- SDT: autonomy, competence, relatedness. https://selfdeterminationtheory.org/theory/
- Duolingo on streaks: freezes (slack) increased daily active learners by 0.38% relative; 7-day streak learners are 3.6x likelier to finish a course (correlation); loss aversion can cause anxiety. https://blog.duolingo.com/how-duolingo-streak-builds-habit and commentary found by search.
- MacroFactor energy balance: compares intake with expenditure over 30 days, and a user slightly over target can still be in net deficit; built to reassure rather than punish. https://help.macrofactorapp.com/en/articles/224-interpreting-the-energy-balance-widget
- `env(safe-area-inset-*)` is 0 on rectangular viewports and positive where UI intrudes. https://developer.mozilla.org/en-US/docs/Web/CSS/env
- Not verified: Whoop, Oura, Cal AI and Strava UI specifics (no primary source found). Not used as evidence.

## 1. Type scale for phones
Problem: body 17, secondary 15, caption 13, section 22, title 34 are iOS-default sizes. On 320 to 360 px with 16 px gutters they eat a quarter of the screen. Apple's 17 is for the Large setting, and Apple's own list has Subhead 15 and Footnote 13, so most of the app already sits one step above what small-phone density wants. Use `rem` so Chrome's font-size setting still works (Apple asks for 200% enlargement support).

Fluid scale (min at 320 px, max at 430 px, linear between; computed):

| Token | clamp() | 320 / 360 / 390 / 430 px | Replaces |
|---|---|---|---|
| caption | `clamp(0.75rem, 0.659rem + 0.455vw, 0.781rem)` | 12.0 / 12.2 / 12.3 / 12.5 | 13 (-1) |
| small (secondary) | `clamp(0.844rem, 0.662rem + 0.909vw, 0.906rem)` | 13.5 / 13.9 / 14.1 / 14.5 | 15 (-0.5 to -1.5) |
| body | `clamp(0.938rem, 0.756rem + 0.909vw, 1rem)` | 15.0 / 15.4 / 15.6 / 16.0 | 17 (-1 to -2) |
| section | `clamp(1.125rem, 0.761rem + 1.818vw, 1.25rem)` | 18.0 / 18.7 / 19.3 / 20.0 | 22 (-2 to -4) |
| sub | `clamp(1.375rem, 0.648rem + 3.636vw, 1.625rem)` | 22.0 / 23.5 / 24.5 / 26.0 | 28 (-2 to -6) |
| title | `clamp(1.625rem, 0.534rem + 5.455vw, 2rem)` | 26.0 / 28.2 / 29.8 / 32.0 | 34 (-2 to -8) |
| num (stat values) | `clamp(1.5rem, 0.409rem + 5.455vw, 1.875rem)` | 24.0 / 26.2 / 27.8 / 30.0 | 24 to 30 mixed |
| form word | `clamp(2.75rem, 0.568rem + 10.909vw, 3.5rem)` | 44 / 48 / 52 / 56 | 56 (-4 to -12) |
| score | `clamp(3.5rem, 0.591rem + 14.545vw, 4.5rem)` | 56 / 62 / 66 / 72 | 72 (-6 to -16) |

Rules:
- Floor is 12 px (Apple minimum is 11). Never go below 12 for anything a user must read.
- Barlow Condensed numbers are large for little width, so keep ring and tile numbers at the `num` step; the hero number can use `form`.
- Replace arbitrary `text-[14px]`, `text-[16px]`, `text-[17px]`, `text-[24px]` etc. (many in progress/page.tsx) with the tokens. Eight steps total, matching NN/g's "few sizes" advice.
- Line-height: body 1.4, headings 1.1 to 1.2, caption 1.35. Titles keep -0.8 px tracking only above 28 px; below that use -0.3 px.
- Weight: Hanken 400 body, 600 for emphasis; avoid 400 below 13 px on `--card` (use 500).

Tailwind 3 (`tailwind.config.ts` > `fontSize`):
```ts
caption: ["clamp(0.75rem,0.659rem+0.455vw,0.781rem)", { lineHeight: "1.35" }],
small:   ["clamp(0.844rem,0.662rem+0.909vw,0.906rem)", { lineHeight: "1.4" }],
body:    ["clamp(0.938rem,0.756rem+0.909vw,1rem)", { lineHeight: "1.4" }],
section: ["clamp(1.125rem,0.761rem+1.818vw,1.25rem)", { lineHeight: "1.2" }],
sub:     ["clamp(1.375rem,0.648rem+3.636vw,1.625rem)", { lineHeight: "1.15" }],
title:   ["clamp(1.625rem,0.534rem+5.455vw,2rem)", { lineHeight: "1.1" }],
num:     ["clamp(1.5rem,0.409rem+5.455vw,1.875rem)", { lineHeight: "1.05" }],
form:    ["clamp(2.75rem,0.568rem+10.909vw,3.5rem)", { lineHeight: "0.95" }],
score:   ["clamp(3.5rem,0.591rem+14.545vw,4.5rem)", { lineHeight: "0.95" }],
```
Also set `body { font-size: var(--text-body) }` instead of 17px.

Spacing and gutters:
- Screen gutter 16 px at all widths (`px-4`); text blocks outside cards also 16 (was 24). Card padding `p-4` at under 360 and `p-5` from 390 (`p-4 min-[390px]:p-5`).
- Gap between cards 12 px (`gap-3`), between groups 24 px (`mt-6`); NN/g: more space between groups than within.
- Radii: hero 28 to 22, list 24 to 18, tile 20 to 14, ctl 16 to 12. Big radii waste corner space on 320 px screens.
- Ring card: on under 360 px, ring 168 to 144 (`w-36`) and stack stats beside it with gap-4.

## 2. Surface and elevation system (light mode)
Principle: flip the layering. Today white page, grey cards: card vs page is only 1.08:1, which is why it looks flat. Use a very light grey page with white cards, a hairline border, and two soft static shadows. Tonal layering follows Material 3; the shadow is only a faint edge, not a blur filter. Shadows are never animated and there is no `backdrop-filter`, so cost is negligible.

Tokens (add to `:root`; keep old names working by aliasing `--card` to `--surface`):
```css
--page:      #F2F3F5;   /* L0 background */
--surface:   #FFFFFF;   /* L1 cards */
--sunken:    #E9EBEE;   /* inputs, tracks, segmented controls */
--edge:      #DDE0E5;   /* card border */
--shadow-1:  0 1px 2px rgba(18,20,23,.05), 0 1px 1px rgba(18,20,23,.03);
--shadow-2:  0 1px 2px rgba(18,20,23,.06), 0 8px 20px -6px rgba(18,20,23,.12);
--hero-bg:   linear-gradient(165deg,#1E2228 0%,#121417 75%);
--shadow-hero: 0 12px 24px -12px rgba(18,20,23,.5), inset 0 1px 0 rgba(255,255,255,.07);
```
Levels:
- L0 page: `background: var(--page)`.
- L1 card: `background: var(--surface); border:1px solid var(--edge); box-shadow: var(--shadow-1);` (list cards, tiles, log rows).
- L2 raised: same plus `box-shadow: var(--shadow-2)`. Use for the rings card, the Coach callout, bottom sheets, the Log button.
- L3 hero: `background: var(--hero-bg); box-shadow: var(--shadow-hero); color:#fff`. One per screen (unchanged rule, and the von Restorff reason: one dark card among light ones).
- Inputs: `background: var(--sunken)`, no border, 2 px `--protein` focus ring (keep).

Computed ratios: white card vs page 1.11:1; border #DDE0E5 vs page 1.23 (decorative; the shadow and border together define the edge, WCAG 1.4.11 does not require card edges); muted text #5A6068 on page 5.72, on white 6.35, on sunken 5.32; #A9AEB5 on hero start #1E2228 7.16; white on #121417 18.45.

Tailwind: add `colors: { page:"var(--page)", surface:"var(--surface)", sunken:"var(--sunken)", edge:"var(--edge)" }` and `boxShadow: { 1:"var(--shadow-1)", 2:"var(--shadow-2)", hero:"var(--shadow-hero)" }`. Card class: `bg-surface border border-edge shadow-1 rounded-list`. Body: `bg-page`. Pages that use `bg-bg` for pills on cards (`bg-bg` in progress) now become `bg-sunken`.

## 3. Coach insight callouts and key highlights
Why they vanish now: every card is the same grey with the same radius; the Coach card is a peer of 10 others. Von Restorff needs the item to differ from similar neighbours and to be used sparingly; NN/g adds that saturated or warm contrast should be reserved for the most important item and that colour should not be the only cue. So the callout gets a different colour family (warm cream, which no data ring uses), a left accent rule, an icon tile, an eyebrow, and L2 elevation. Max one such callout visible per screen; only the Coach and one "needs attention" state may use it.

Chosen design (warm "coach's note"):
```css
.coach {
  position: relative;
  background: #FBF5E6;
  border: 1px solid #E6D5A8;
  border-radius: 18px;
  padding: 14px 16px 14px 20px;
  box-shadow: var(--shadow-2);
}
.coach::before {            /* 4px rule, decorative */
  content: ""; position: absolute; left: 0; top: 12px; bottom: 12px;
  width: 4px; border-radius: 0 4px 4px 0; background: #B7791F;
}
.coach-eyebrow { font: 600 var(--text-caption)/1.3 var(--font-hanken); color: #7A5A1E; } /* "The Coach noticed" */
.coach-body    { font-size: var(--text-body); color: #121417; margin-top: 4px; }
.coach-icon    { width: 32px; height: 32px; border-radius: 999px; background: #121417; color: #fff; } /* 18 px lucide icon */
```
Layout: icon tile and eyebrow on one row, body below, optional text button "See why" (44 px tall) at the end. Computed: body #121417 on #FBF5E6 16.96:1; eyebrow #7A5A1E 5.83:1; #5C4310 as an alternate dark text 8.52:1; rule #B7791F vs bg 3.35:1 (passes 3:1 and is decorative anyway). The ochre rule is darker than Callus amber #F2B300, so no meaning collision; do not use `#FBF5E6` anywhere else.

Alternative (if cream feels off-brand): white L2 card, 4 px `--ink` left rule, ink icon tile, ink eyebrow, no tint. Weaker isolation (hierarchy by shape only), cleaner. Or a one-off inverse (ink gradient) callout, but only on screens without the dark hero, otherwise two dark cards cancel the effect.

Other highlights:
- Adaptive budget note (`adaptive-note.tsx`): same `.coach` look without the icon, since it is informational; "Got it" becomes a 44 px text button.
- Section title above the callout is dropped (the eyebrow carries it); fewer elements, per NN/g.
- Keep green/blue/coral strictly for data (see section 4); never use them as callout fills.

## 4. Colour contrast audit (computed)
| Pair | Ratio | Verdict / fix |
|---|---|---|
| muted #5F656D on card #F5F6F7 | 5.44 | Passes. Darken to #5A6068 for margin on the new page (5.72) |
| muted on white / sunken #ECEEF1 | 5.88 / 5.06 | Pass |
| ink-2 #3D4248 on card | 9.37 | Pass |
| muted-dark #A9AEB5 on ink | 8.27 | Pass |
| ink-faint #6B7178 on ink | 3.74 | Fails for text. Use only for decoration or lift to #8D939A (about 5.9, my estimate) |
| faint #9AA0A6 on white | 2.64 | Fails. Placeholder/disabled only; never for information |
| fuel #0E8A4F on white / card | 4.41 / 4.07 | Fails 4.5 as small text. For text use fuel-ink #0B6E3F (6.33 on white); keep #0E8A4F for rings/fills |
| train #E5432D on white / card | 4.06 / 3.75 | Fails as small text. Text colour #B93A26 (5.68 / 5.25) |
| protein #2563EB on white | 5.17 | Pass |
| danger #C2301F on white | 5.62 | Pass |
| amber #F2B300 on white | 1.87 | Already banned as text; as a bar it needs a label because 1.87 < 3:1 |
| white on fuel button | 4.41 | Fails for 16 px regular. Use bold 17+ or ink text, or fuel-ink fill |
| card #F5F6F7 vs white | 1.08 | Reason for flatness, fixed by section 2 |
| ring track (fuel 16%) vs card | 1.22 | Track is decorative, but raise to 20% so the unfilled part is visible |

Accent rules:
1. Colour = data. Fuel/protein/train appear only in rings, bars, deltas, and the number they describe. Text version of each colour uses the darker "ink" variant above.
2. Never colour alone: pair every red/green with a sign, word or icon ("over by 120", "left 340").
3. One saturated element per viewport region (NN/g). The hero and the Coach callout are the two permitted exceptions, in different colour families.
4. Over-budget stays coral; on-goal green; never red for a deficit that is the goal.

## 5. Navigation, tab bar, top of screen
- Bottom nav is 96 px, a lot on a small phone. Use `h-16` (64 px) plus the safe area: `padding-bottom: env(safe-area-inset-bottom)`; total height `calc(64px + env(safe-area-inset-bottom))`. Update `--nav-h` to that and the `.screen` bottom padding to `calc(var(--nav-h) + 16px)`.
- Item layout: 24 px icon, 12 px label (caption floor), each cell full-height, so tap area is 64 px tall by width/5 (above 44 and Apple's 44x44 default). Active item: ink icon + 600 label + 2.5 px ink pill above; inactive `--muted` (5.7:1).
- Centre Log: 52 px ink circle, `-translate-y-3`, `shadow-2`, 3 px `--page` ring. Tap area 52.
- Nav surface: `background: var(--surface); border-top:1px solid var(--edge); box-shadow: 0 -4px 12px -8px rgba(18,20,23,.15)`. No blur.
- Installed PWA: viewport meta needs `viewport-fit=cover`; the `env()` insets are 0 otherwise (MDN: 0 on rectangular viewports; the `viewport-fit` requirement I could not confirm from MDN, it is WebKit practice). Top: `padding-top: max(env(safe-area-inset-top), 12px)`. Manifest `display: "standalone"`, `theme_color: "#F2F3F5"`, `background_color: "#F2F3F5"` so the status bar matches the page.
- Screen top: title block `pt-3 pb-2`, title token `title`, no more than greeting + avatar row above rings. Lead with the summary (NN/g).
- Tap targets: 44 px minimum for all icons/links (InfoTip, "Got it", chips). Space them at least 8 px apart (Apple suggests more around unbezeled controls). WCAG 24 px is the floor, not the goal.

## 6. Onboarding and forms
One question per screen (Hick's law: fewer options per step; progress cue uses the goal-gradient effect).
Exact layout, 390 px, `min-h-dvh flex flex-col`:
1. Header row (h-12, px-4): left Back text-icon button 44x44 (chevron, `aria-label="Back"`), centre a 4 px progress bar (`bg-sunken`, fill `--ink`, width = step/total, transform scaleX), right Skip as a 44 px-high text button (`text-small text-muted`, only when optional).
2. Question: `title` token, 12 px under it one `small` helper line in `--muted`.
3. Input area: `flex-1`, big numeric input in `num`/`form` size, centred in a `--sunken` pill 64 px tall, label above (never placeholder-only).
4. Bottom action bar, sticky: `padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: var(--page); border-top: 1px solid var(--edge);` holding one full-width primary: 52 px tall, ink fill, white text 17 semibold, radius 999. The primary stays above the keyboard via `100dvh` and `position: sticky; bottom: 0`.
5. Secondary actions never sit beside the primary. Skip lives only in the header; a "I'll set this later" link, if needed, is a 44 px text button under the primary, once.
6. Errors: inline under the field in `--danger`, text states the fix. Primary stays enabled so the user gets the message instead of a dead button.

## 7. Charts, rings, energy balance
Rings (Apple: do not recolor/filter its own; yours may be styled, but keep the margin between rings):
- 168 to 144 px on small phones (`clamp(136px, 40vw, 168px)`), stroke 17 to 14, gap between rings at least 6 px (radii 78/58/38 are 20 apart with 17 stroke, so 3 px; change radii to 78/60/42 at stroke 14, gap 4).
- Track 20% of the colour. Round caps. Start 12 o'clock (keep). Over 100%: darker colour overlay (keep) plus a `+` in the label for non-colour cue.
- Centre text: remaining kcal in `num`, unit in caption. Put numbers beside the ring only if width >= 360, else under it.
- Empty state: grey-track ring only, centre "0", one line below: "Nothing logged yet. Tap the mic and say what you did." (from copy). No zero-value coloured arcs.
Bar/line charts:
- Bars: 2 px gap minimum, `rx` full; axis labels 12 px `--muted`; only 3 y-gridlines in `--edge`; goal line dashed `--dash` with a 12 px end label; today bar 35% (keep).
- Weight line: 2.5 px ink 7-day average, raw dots 40% opacity (>= 3:1 is not required for faint context, but the average line is full ink). Scrub readout 28 px `num`.
- Graphics that carry meaning need 3:1 against neighbours (WCAG 1.4.11): ring fills and bars pass (fuel 4.41, protein 5.17, coral 4.06 on white); tracks do not need to.

Energy balance for a deficit/surplus goal:
- Show three numbers, in this order: Eaten, Budget (target intake), Left. Budget already encodes the goal, so "on goal" = eaten at or below budget but above a sensible floor, shown in `fuel` with a check icon; over = coral with the exact number ("120 over").
- Net energy ("deficit 420") is an estimate. Label it "Estimated" and show it as a weekly figure, not a daily scoreboard. MacroFactor does exactly this: it compares intake with an estimated expenditure over 30 days and says a user slightly over target can still be in deficit. Link it to the weight trend, not to a single day.
- Honest rules: never green-light very low intake (below the floor, show neutral grey "Low" plus "Eat something" copy, not a green success); never imply precision (round to 10 kcal); a day under budget is not "won", a week is.
- Layout: one thin horizontal bar under the rings: filled to eaten/budget, with a tick at 100%; right of it "340 left". Colour fuel under budget, coral over. For surplus goals, invert the meaning only in the copy ("340 to go"), keep the colour logic: reaching the target is green.

## 8. Motion and perceived speed
- Taps respond within 100 ms (NN/g 0.1 s = instant): `:active { transform: scale(.97); transition: transform 90ms cubic-bezier(.2,0,0,1); }` on cards, buttons, nav cells. Press state is the only thing that must be instant.
- Page change: prefetch with `next/link` (default) and keep nav shell mounted. Content fade-in `opacity 0 to 1`, 160 ms, `ease-out`, no translate. Do not animate more than `transform` and `opacity`.
- Skeletons (NN/g: not under 1 s, good for 2 to 10 s page loads, spinners for single modules): show a skeleton only if data takes over 300 ms (setTimeout guard), shaped exactly like the card (same height, radius), `--sunken` blocks with a 1.2 s opacity pulse 0.6 to 1 (no shimmer gradient, cheaper). Use a small spinner only for a single card refresh.
- Optimistic UI: logging, "Mark done", promise checks, set completion update local state immediately (React `useOptimistic`), reconcile on server response, show the existing offline line if it fails. Never block taps behind a spinner. NN/g also advises undo for accidental taps; give a 5 s "Undo" toast on delete/remove.
- Sheets: slide up 220 ms `cubic-bezier(.2,0,0,1)`, backdrop opacity 160 ms. Dismiss 160 ms.
- Rings/bars first draw 500 ms ease-out (keep) but only on first view of the day, never on tab revisit; numbers count with a 400 ms ease-out, `tabular-nums`.
- Peak-end: the biggest motion goes to the end of a flow (session finished, day closed, promotion): 600 ms ring close + haptic (already specified). Do not spend the budget on every tap.
- Reduced motion: wrap in `@media (prefers-reduced-motion: no-preference)` (already the pattern).

## 9. Ranked top 15 (impact first)
1. Page `#F2F3F5` + white cards with `--edge` border and `--shadow-1` (S). Fixes flatness at the root.
2. Coach callout as `.coach` (cream, rule, icon, L2) (S).
3. Fluid type tokens; replace all `text-[Npx]` with tokens (M, many call sites).
4. Reduce body 17 to 15-16 and section/title sizes per section 1 (S once tokens exist).
5. Hero gradient + inset highlight + `--shadow-hero` on the single dark card (S).
6. Nav height 96 to 64 + safe-area, 12 px labels, raised 52 px Log button (S).
7. Text-safe colour variants: fuel-ink, coral #B93A26 for small text, drop `--faint` for info (S).
8. Smaller radii (22/18/14/12) and 16 px gutters, p-4 under 360 px (S).
9. Optimistic updates on log/promise/set actions + undo toast (M).
10. Ring card resize (clamp), 14 px stroke, 20% tracks, empty state (S).
11. Onboarding layout: header Back/Skip + sticky primary action bar (M).
12. Energy balance bar with Eaten / Budget / Left and an "Estimated" weekly net (M).
13. Skeletons matching card sizes with 300 ms guard (M).
14. Press feedback (`active:scale-[.97]`, 90 ms) and 160 ms content fade (S).
15. Update DESIGN.md hard bans and tokens, and `viewport-fit=cover` + theme colour in manifest (S).

Caveat: streaks and loss-aversion mechanics are double-edged; Duolingo's own data supports slack (freezes), so keep streak copy calm. I did not test any of the above on a device; verify on the A52 and a 320 px emulation after applying.
