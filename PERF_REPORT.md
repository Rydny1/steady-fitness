# PERF_REPORT

Date 2026-10-15. Scope: public/images/** and public/icons/** modified; nothing else in the repo touched (`npm run build` regenerated the git-ignored .next folder only).
Originals are saved in the scratch folder: `...\scratchpad\perf\orig_images` and `orig_icons`.

## Task 1: images

Method: sharp, WebP, effort 6, metadata stripped, widths capped (exercises 720, meals 960, snacks 640, fuel 1040, never upscaled). Quality started at 72 and was raised in steps of 4 per file until windowed luma SSIM (8x8 window, stride 4) against the original resized to the same size was at least 0.98. Lowest SSIM in the set: 0.98. Four files would have grown at the quality needed, so the original was kept byte-for-byte: exercises/push_up-0, push_up-1, side_plank-0 and meals/yogurt-bowl. 47 of 58 files needed quality above 72 to hold SSIM 0.98; the sources were already fairly tight, so most of the saving comes from the snack file and from resizing.

| Folder | Files | Before (bytes) | After (bytes) | Saved |
|---|---:|---:|---:|---:|
| exercises | 42 | 1,626,042 | 1,211,142 | 25.5% |
| meals | 7 | 758,846 | 601,810 | 20.7% |
| snacks | 8 | 664,412 | 268,618 | 59.6% |
| fuel | 1 | 75,234 | 56,474 | 24.9% |
| moves (svg) | 5 | 3,239 | 2,498 | 22.9% |
| **images total** | 63 | **3,127,773** | **2,140,542** | **31.6% (-987,231)** |
| icons | 7 | 53,982 | 4,779 | 91.1% (-49,203) |

10 biggest originals:

| File | Before | After | Saved | q | SSIM | Dimensions |
|---|---:|---:|---:|---:|---:|---|
| snacks/chicken-slices.webp | 353,394 | 94,824 | 73% | 76 | 0.9823 | 1200x900 to 640 wide |
| meals/yogurt-bowl.webp | 142,858 | 142,858 | 0% (original kept) | n/a | n/a | 1200x900 |
| meals/teriyaki-chicken.webp | 138,450 | 102,870 | 26% | 84 | 0.983 | 1200x800 to 960 |
| meals/avocado-egg-toast.webp | 119,810 | 97,748 | 18% | 72 | 0.9878 | 800x1200 (not upscaled) |
| meals/greek-chicken.webp | 115,950 | 76,838 | 34% | 84 | 0.9821 | 1200x847 to 960 |
| meals/egg-fried-rice.webp | 114,992 | 81,496 | 29% | 84 | 0.9837 | 1200x960 to 960 |
| meals/tuna-pasta.webp | 89,788 | 70,966 | 21% | 72 | 0.9814 | 800x1200 |
| exercises/bulgarian_split_squat-1.webp | 86,240 | 73,352 | 15% | 84 | 0.9828 | 800x1200 to 720 |
| exercises/bulgarian_split_squat-0.webp | 82,498 | 70,464 | 15% | 84 | 0.9824 | 800x1200 to 720 |
| fuel/batch-prep.webp | 75,234 | 56,474 | 25% | 72 | 0.9809 | 800x1200 |

Notes
- The big win is chicken-slices (353 KB to 95 KB).
- components/exercise-image.tsx line 24 renders drawing SVGs with `unoptimized`, so those files are served as-is. Photo frames go through /_next/image.
- Remaining weight is mostly exercises (1.2 MB across 42 frames). More gain would come from AVIF (`images.formats: ["image/avif","image/webp"]`, costs CPU on first request), not from lower WebP quality.

### SVG (public/images/moves, 5 files)
svgo multipass, floatPrecision 4. `role="img"`, `aria-label`, `viewBox` and width/height are kept. Strokes and shapes are unchanged: svgo only merged lines into one path and shortened coordinates. Rasterised at 576 dpi, mean per-channel difference vs the original is at most 0.001 of 255, with 0 to 21 pixels differing by more than 40 (anti-aliasing at joins). I checked this numerically; I did not eyeball the renders.

### public/icons
The manifest (app/manifest.ts) needs icon-192.png, icon-512.png, icon-maskable-512.png and icon-mono.svg; shortcuts reuse icon-192. sw.js uses icon-192.png and badge-96.png. All seven files kept, same names.
- PNG: lossless only (palette mode for apple-touch-icon, level-9 recompression for the rest), pixel-identical RGBA, verified. 6,923 to 643; 6,191 to 421; 6,908 to 639; 8,987 to 1,377 (icon-512 and maskable).
- icon.svg 8,021 to 217 and icon-mono.svg 7,965 to 148 (svgo, renders identical).
- Observation: icon-512.png and icon-maskable-512.png were byte-identical, so the maskable icon has no extra safe-zone padding and may be cropped on Android. Not changed.
- oxipng was not used; sharp lossless was enough.

## Task 2: bundle audit (read-only)

Build: `npm run build` succeeded first time (Next 16.4.0 Turbopack, 78 s compile, no EPERM). All 17 app routes are dynamic (root layout has `export const dynamic = "force-dynamic"` at app/layout.tsx:7, and proxy.ts sets a per-request CSP nonce), so no HTML is cached.

Total client JS+CSS in .next/static/chunks: 1,186,455 bytes (30 files, uncompressed).

First-load JS per route (uncompressed, from .next/diagnostics/route-bundle-stats.json):

| Route | First-load JS |
|---|---:|
| /progress | 785,750 |
| /log | 782,991 |
| /mfa | 756,717 |
| /train/[session] | 540,044 |
| /train | 536,709 |
| /fuel | 533,630 |
| /settings | 528,696 |
| /today | 522,567 |
| /login, /signup | about 523,000 |
| /privacy | 465,286 |
| /_not-found | 457,466 |

What makes first load big
1. Framework floor of about 457 KB on every route: react-dom chunk 0s7mvllxht1mo.js (229,597), Next client runtime 35lace1nw_vqe.js (131,521), plus 34,043 / 31,478 / 15,213 / 10,030 / 5,584. Not fixable beyond keeping client islands small. Another 37,547 chunk (050w23gfej5q7.js) loads on 15 of 17 routes.
2. **Supabase browser client: chunk 2f3p33_swa95o.js, 258,228 bytes, on /progress, /log and /mfa** (about a third of those routes' first load). It holds supabase-js (auth, realtime, postgrest, storage, functions) plus the Node `buffer` polyfill.
3. The exercises content table inlined in the client: 255rxeix45-jv.js, 43,484 bytes, only on /train/[session].

Checks asked for
- Server-only code in client bundles: none found. @google/genai and web-push appear in no .next/static file (lib/ai/gemini.ts and lib/push.ts stay server side). zod is only imported in server files.
- lucide-react: named imports everywhere (for example components/bottom-nav.tsx:5); no barrel or namespace imports; no lucide-heavy chunk. Fine.
- The three Supabase/AI libraries: supabase-js is client-bundled (finding 1, avoidable on all three routes); @google/genai and web-push are not.
- Duplicated dependencies: `npm ls --all` shows one version of react, react-dom, next, zod, tslib, ws and every @supabase/* package. Only oddity: eslint-config-next 15.3.1 against next 16.4.0 (dev only).

### Code findings, ordered by impact

1. **Supabase browser client bundled into /log, /progress, /mfa. Saves about 258 KB uncompressed (about 70 KB gzip) on those routes' first load.**
   - features/photos/upload.ts:3 (static import) and :12 (`createClient()` in uploadPhoto); features/auth/components/mfa-panel.tsx:5, :28, :63; lib/supabase/client.ts:1 and :7. uploadPhoto is imported by features/logging/components/log-screen.tsx:24 and features/photos/components/progress-photos.tsx:7.
   - Fix: in upload.ts delete line 3 and inside the function use `const { createClient } = await import("@/lib/supabase/client"); const supabase = createClient();`. Same in mfa-panel.tsx at lines 28 and 63 (both already inside async functions). The chunk then loads only when a photo is attached or MFA opens. Alternative: upload through a server action or signed upload URL and drop the browser client.

2. **requireUser makes a full Auth network round trip per request, on top of proxy.ts.** lib/session.ts:13 calls `supabase.auth.getUser()`, then :21-25 awaits `profiles.select("*")`, strictly sequential. proxy.ts already ran `getClaims()` for the same request. Estimated saving 80 to 200 ms per page render.
   - Fix: line 13 use `const { data } = await supabase.auth.getClaims();` and read `data.claims.sub` (and email) as the user; replace `select("*")` at :23 with the columns the pages use. Keep getUser() only in server actions that mutate sensitive data.

3. **loadTrophyInput reads whole tables on every /today, /progress and /settings render, growing with account age.** features/data/ledger.ts:90-125 (the Promise.all) is reached through trophyState (ledger.ts:171) from features/data/today.ts:148, features/data/progress.ts:151 and app/(app)/settings/page.tsx:29. It pages through every workout_sets row (pageAll, 1000 per round trip), every daily_scores row, every workout_sessions row, the whole weight trend and all waist measurements. After a year of training that is thousands of rows and several sequential pages per view. Estimated saving 100 to 600 ms per render plus DB egress.
   - Fix: compute the trophy set in the nightly job (features/jobs/score-day.ts) and store it in user_flags, or add one SQL view/RPC returning the aggregates (log count, max streak, min avg_7d, first and min waist, lift-record count). Pages then read one row. Short term: wrap trophyState in `unstable_cache` keyed by user id, 1 hour TTL, with a tag revalidated by the logging and training actions.

4. **Duplicate and unbounded queries in loadProgress (features/data/progress.ts).**
   - :137-140 `measurements.select("*")` for all history, awaited before the main Promise.all at :147 (used only to find `earliest`). Fix: select only charted columns, and fetch `earliest` as `.order("measured_on").limit(1)` inside the Promise.all. Saves one round trip, about 60 to 150 ms.
   - :150 `weekResults()`, :151 `trophyState()` (calls weekResults again at ledger.ts:92) and the `allReviews` query query the same `weekly_reviews(week_start,result)` table three times in one render. Fix: wrap weekResults in React `cache()` or reuse one result.
   - :158 `photos.select("*").eq("kind","progress")` has no limit. Fix: explicit columns and `.limit(24)`.
   - The `workout_sessions.select("id,day")` and `workout_sets` (db_bench_press) queries in the same Promise.all have no date range or limit. Fix: `.gte("day", from)` or a limit.

5. **Exercises content table shipped to the browser (43 KB) just to resolve image paths.** components/exercise-image.tsx:2 imports `exerciseImage` from content/exercises.ts, and the component is pulled into the client component features/training/components/session-screen.tsx:9, so the whole table (how/tip/works text) lands in chunk 255rxeix45-jv.js (43,484 bytes, about 12 KB gzip) on /train/[session].
   - Fix: move `DRAWING_ONLY` and `exerciseImage()` (content/exercises.ts:281-289) into a tiny file such as content/exercise-image.ts that does not import the data, and import that from exercise-image.tsx. Or resolve image sources on the server and pass them in the SessionExercise props.

6. **Write on GET, then sequential reads.** app/(focus)/train/[session]/page.tsx:23 awaits `startSession()` (a server action with several queries; see features/training/actions.ts:32, :123, :145) before the Promise.all at :27. Every refresh or prefetch re-runs it. Fix: start `loadHistory(supabase, exercises, null)` in parallel with startSession and filter the new session id in memory afterwards; longer term create the session from the Start button's action rather than on render. Saves one to two round trips.

7. **Sequential loadHistory on the train page.** app/(app)/train/page.tsx:114 awaits loadHistory after the :84 Promise.all, and loadHistory (features/training/data.ts, about lines 28-55) itself runs two sequential queries (last 40 sessions, then their sets). Fix: put loadHistory into the :84 Promise.all by loading history for all gym exercises plus `exercises` (the set is the same regardless of the selected day) and merge the two queries into one with a join (`workout_sets` with `workout_sessions!inner(day,finished_at)`). Saves about 100 ms.

8. **Signed photo URLs awaited after the page query.** app/(app)/today/page.tsx:26, app/(app)/fuel/page.tsx:58 and app/(app)/progress/page.tsx:58 each await `signedUrls()` serially. The call depends on the paths, but the photos are below the fold: render them in a `<Suspense>` child that does its own signedUrls so the page streams first. Saves 100 to 300 ms of TTFB when photos exist.

9. **Smaller query items.**
   - features/data/today.ts:141 `day_checkins.select("*")`: list the columns used.
   - app/api/export/route.ts:57 `select("*")` is intentional for a full export, but it must page (use `pageAll`) because PostgREST caps at 1000 rows.
   - features/data/ledger.ts: `daily_scores.select("streak,breakdown")` is unbounded just to compute bestStreak; latestLedger already carries bestStreak in `breakdown`, so this query can be dropped once trophies move out of the render path.

10. **Cron tick runs users serially.** features/jobs/tick.ts:33 `for (const p of profiles)` awaits scoring, pushes, reports and adaptive budget per user, about 8 to 15 awaits per user. Fine for one user; it will hit the function time limit as users grow. Fix: process users with a small concurrency pool (for example 5 at a time with `Promise.allSettled` over chunks). Nights within one user must stay sequential, as the code already notes.

Sequential await depth: no page exceeds about 5 round-trip stages. Worst is /progress: requireProfile (2) + measurements (1) + Promise.all of 13 queries (1; trophyState runs 9 more inside it) + signedUrls (1). /today: requireProfile (2) + loadToday (1 stage, 15 parallel) + signedUrls (1). All of these come after the proxy's own getClaims.

## Task 3: caching recommendations (text only, nothing applied)

### HTTP headers (next.config.ts `headers()`, added next to the existing security block)

| Path | Cache-Control | Why |
|---|---|---|
| /_next/static/:path* | `public, max-age=31536000, immutable` | Next already sends this for hashed chunks and fonts (next/font/google is served from /_next/static/media). Keep. |
| /images/:path* | `public, max-age=2592000, stale-while-revalidate=604800` | Names are not content-hashed (push_up-0.webp), so not immutable. Use `immutable` with 1 year only after adding a version suffix to file names. |
| /icons/:path* | `public, max-age=604800, stale-while-revalidate=86400` | Manifest and notification icons change rarely. |
| /_next/image | set `images.minimumCacheTTL: 2592000` in next.config.ts (currently 14400, 4 hours) | Optimised variants stay cached 30 days in the CDN and browser instead of revalidating every 4 hours. Sources are static. |
| /manifest.webmanifest, /robots.txt | `public, max-age=3600` | Small, rarely change. |
| /sw.js | keep `no-cache, no-store, must-revalidate` (already set) | Must always revalidate. |
| /offline.html | `public, max-age=0, must-revalidate` | Precached by the service worker. |
| pages and /api/* | keep Next defaults (`private, no-cache, no-store, must-revalidate`) | Authenticated, per-user, nonce-bearing. |

Vercel serves files from /public with `max-age=0, must-revalidate` by default, so today every repeat visit revalidates each image; the rules above fix that.

### Service worker strategy (replace the fetch handler in public/sw.js; keep the push and notificationclick code)

```js
const SHELL = "steady-shell-v2";   // offline.html + icon, precached at install
const STATIC = "steady-static-v2"; // /_next/static/*
const IMAGES = "steady-img-v2";    // /images/*, /icons/*, /_next/image*
const MAX_IMAGES = 120;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // never touch Supabase, Gemini or signed photo URLs
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;   // never cache API or auth
  if (url.searchParams.has("_rsc") || req.headers.get("RSC")) return;                  // never cache page data (RSC)

  if (url.pathname.startsWith("/_next/static/")) {          // hashed, immutable: cache-first
    event.respondWith(cacheFirst(req, STATIC));
    return;
  }
  if (url.pathname.startsWith("/images/") || url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/_next/image")) {            // stale-while-revalidate
    event.respondWith(staleWhileRevalidate(req, IMAGES, MAX_IMAGES));
    return;
  }
  if (req.mode === "navigate") {                            // HTML: network only, offline fallback, never stored
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
  }
});

async function cacheFirst(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, name, max) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const refresh = fetch(req).then(async (res) => {
    if (res.ok) {
      await cache.put(req, res.clone());
      const keys = await cache.keys();
      if (keys.length > max) await cache.delete(keys[0]);  // trim oldest
    }
    return res;
  }).catch(() => hit);
  return hit || refresh;
}
```

Also: in `activate`, delete every cache whose name is not SHELL, STATIC or IMAGES (the current code only keeps one name). Because the cache key is the full URL, each `/_next/image?url=...&w=...&q=...` width caches separately, and a replaced source image shows one visit later after the background refresh, which is fine for static exercise art. Precache the current week's `-0.webp` exercise frames only if offline training is wanted (about 600 KB).

Expected effect: repeat visits serve JS chunks, fonts, icons and exercise/meal images from disk without a network trip; HTML and data still go to the network as required, so what remains is the dynamic HTML plus the Supabase round trips from Task 2.
