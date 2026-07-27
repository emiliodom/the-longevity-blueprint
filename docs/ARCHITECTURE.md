# Architecture — Longevity Blueprint v3

Read this before making a change — it should tell you which single file to open without grepping the whole repo.

---

## Folder map

```
index.html                       — HTML shell only; Vue app root (#app), script load order at the bottom
server.js                        — bootstrap only: middleware + router mounting, nothing domain-specific

src/
├── css/style.css                — all custom CSS (CSS custom properties for theming)
└── js/                          — frontend, Vue 3 via CDN, no build step
    ├── db.js                    — DB[] page content array + NAV_GROUPS (sidebar)
    ├── storage.js                — Storage: the only object that calls fetch()
    ├── data/timerPhrases.json    — getReady/pushThrough voice+popup phrase pools for sprintTimer.js (plain static JSON, no server route — fetched straight off the /src static mount)
    └── components/
        ├── calculators.js       — 9 biometric calculator components
        ├── charts.js            — BarChart / DonutChart (Chart.js wrappers)
        ├── blockStyleConfig.js  — window.BlockStyleConfig: block style/position/collision/animation tuning (plain data — edit this, not weekBuilder.js/style.css, to retune how blocks look/drag)
        ├── weekBuilder.js       — WeekBuilder: drag-and-drop week planner (SortableJS)
        ├── goalDashboard.js     — GoalDashboard: milestone CRUD + "Build Week" handoff
        ├── dailyTracker.js      — DailyTracker: Strava link + screenshots, embeds AiAnalyzer
        ├── aiAnalyzer.js        — AiAnalyzer: day/week/month OpenAI summary panel
        ├── sprintTimer.js       — SprintTimer: warmup/work/rest/cooldown interval timer (see "Sprint/Interval Timer" section below)
        ├── settingsPage.js      — SettingsPage: password, usage quotas, language, theme
        ├── foodPlanner.js       — FoodPlanner: Guatemalan-food weekly meal planner vs daily calorie/macro target
        └── supplementStack.js   — SupplementStack: daily checklist for the 8-supplement stack (db.js pages 7/8)

Every file under components/ wraps its body in an IIFE. These are plain
`<script>` tags, not ES modules — they all share one global scope, so a
top-level `const`/`function` in one file can collide with another's. A
`const` collision throws and silently aborts that whole script (this
actually happened once — see git history); a `function` collision just
gets silently overwritten. The IIFE keeps each file's helpers private;
only the `app.component(...)` registration (or `window.BlockStyleConfig`,
for the one non-component file) is the deliberate, public surface.

src/server/                       — backend, one small file per concern
├── db/
│   ├── pool.js                  — mysql2/promise pool + query() helper (all routes import this)
│   ├── schema.sql                — every CREATE TABLE (idempotent — IF NOT EXISTS)
│   └── setup.js                  — `npm run db:setup`: creates the DB + applies schema.sql
├── middleware/
│   ├── auth.js                    — requireAuth (session check only; ownership checked per-route)
│   └── rateLimit.js                — authLimiter (in-memory, login/register brute-force protection)
├── lib/
│   ├── templates.js               — GOAL_TEMPLATES / BLOCK_TEMPLATES (static content, not user data)
│   ├── exercises.js                — EXERCISE_TEMPLATES: 200 exercises (25/category) for the Week Builder's block-detail modal
│   ├── autobuild.js                — deterministic rules engine: goal + week → suggested blocks
│   ├── openai.js                   — OpenAI vision analyzer (server-side key, never sent to browser)
│   ├── quota.js                    — durable per-account usage quotas (uploads, AI calls) — usage_events table
│   ├── validation.js                — shared input validation (password policy)
│   ├── pexels.js                    — Pexels photo search + 24h in-memory cache, server-side key only
│   ├── foods.js                      — FOOD_TEMPLATES: Guatemalan food macro data (static content, not user data)
│   ├── nutritionTargets.js           — daily calorie/macro target (mirrors calculators.js formulas + db.js's 2,100/2,800 kcal protocol)
│   ├── supplements.js                 — SUPPLEMENT_TEMPLATES: the same 8 supplements already cited in db.js pages 7/8
│   └── exporters/
│       ├── shared.js               — date/sort helpers shared by all 3 exporters
│       ├── csv.js                  — week → CSV text
│       ├── ics.js                  — week → .ics calendar text
│       └── pdf.js                  — week → PDF (pdfkit; renders onto a doc the route owns)
└── routes/                        — one Express router per domain, each documents its own endpoints
    ├── auth.js                     — register/login/logout/me/avatar
    ├── account.js                   — account-level: usage (quota status), change password, language preference
    ├── profiles.js                  — the "athlete" record CRUD (everything else hangs off profile_id)
    ├── dashboard.js                  — Daily Mission Control (one JSON blob per profile)
    ├── log.js                        — Exercise Journal (run/cycle/lift sessions)
    ├── goals.js                       — Goal Dashboard CRUD + GET .../goals/templates
    ├── training.js                     — Week Builder: weeks/blocks CRUD, autobuild, CSV/ICS/PDF export
    ├── tracker.js                       — Daily Tracker: Strava link + screenshot upload
    ├── ai.js                             — POST .../ai/analyze (day/week/month, cached)
    ├── images.js                          — GET /api/images/hero (Pexels-backed, graceful null fallback)
    ├── nutrition.js                        — Food Planner: foods list, meal-plan weeks/items, computed macros/targets
    └── supplements.js                       — Supplements tracker: templates + per-day taken[] (replace-all PUT)

docs/
├── ARCHITECTURE.md               — this file
└── DEPLOYMENT.md                  — Hostinger Node.js app setup
```

**To find something:** frontend UI → `src/js/components/`. An API call → `src/js/storage.js` (client) → matching `src/server/routes/*.js` (server). A DB column → `src/server/db/schema.sql`. Page content/nav → `src/js/db.js`.

---

## Request flow

```
Vue component (src/js/components/*.js)
   → Storage.xxx() (src/js/storage.js — the only place fetch() is called)
      → HTTP → Express router (src/server/routes/*.js)
         → requireAuth (session check) → ownership check (profile_id belongs to session user)
            → query() (src/server/db/pool.js) → MySQL
```

Every route mounted under `/api/profiles/:id/...` uses `express.Router({ mergeParams: true })` so `req.params.id` (the profile id) is available without re-declaring it — see any file in `src/server/routes/` for the pattern.

---

## IDs

Every table's primary key is a `VARCHAR(36)` UUID generated app-side with `crypto.randomUUID()` (Node's built-in `crypto`, no dependency) — not `AUTO_INCREMENT`. This keeps every route returning the same opaque string `id` the frontend has always expected (`storage.js`/`app.js` compare/store ids as strings, e.g. `bp_active_profile` in localStorage), so swapping JSON files for MySQL required zero changes to how the frontend handles ids.

## Client-side persisted UI state (localStorage)

Two small pieces of navigation state survive a page reload via plain `localStorage` (both in `storage.js`, both restored in `app.js`'s `loadProfile()` — i.e. once a profile is actually loaded and `appState` is about to become `'app'`, not any earlier):
- `bp_active_profile` — which profile was last active (`getActiveProfileId`/`setActiveProfileId`), pre-existing.
- `bp_last_page` — which page/tab (`currentPageId`, matched against the `DB` array) the user was last on (`getLastPageId`/`setLastPageId`, set from `app.js`'s `setPage()`). Restoring it re-validates the saved id still exists in `DB` first — content can change between visits — falling back to the `currentPageId` default (page 1) rather than landing on a stale/missing page.

Both are plain client-side conveniences, not synced server-side or tied to the account — a different browser/device starts fresh.

## Dates

MySQL/MariaDB `DATE` columns (`target_date`, `week_start_date`, `period_start`, `period_end`) are configured in `pool.js` via `dateStrings: ['DATE']` to come back as plain `'YYYY-MM-DD'` strings, not JS `Date` objects — a `Date` would serialize through `res.json()` with a UTC timestamp attached, silently shifting the calendar date in some timezones. `DATETIME` columns (`created_at`, etc.) are left as `Date` objects, matching the ISO-with-timezone strings the app already returned in v2.

## JSON columns

Bind JSON columns (`dashboards.data`, `training_blocks.details`, `ai_analyses.raw_response`) as a plain `JSON.stringify(...)` string parameter — **do not** wrap it in `CAST(? AS JSON)`. MySQL supports that cast; MariaDB does not (its `JSON` type is a `LONGTEXT` alias with a check constraint), and using it will throw `ER_PARSE_ERROR` at runtime, not at authoring time. A bound string parameter works on both.

## Optional numeric/date fields from forms

A blank number/date input bound with `v-model`/`v-model.number` sends `''` (empty string), not `null` — Vue only coerces to a number on successful parse. `?? null` does **not** catch this (`'' ?? null` is still `''`), and MySQL's `DECIMAL`/`DATE` columns reject an empty string outright (`ER_TRUNCATED_WRONG_VALUE_FOR_FIELD`) rather than treating it as `NULL`. Any route binding an optional numeric/date field from `req.body` must run it through `blankToNull()` in `src/server/lib/validation.js` first — see `routes/goals.js` and `routes/profiles.js` for the pattern. This one was found by clicking through the Goal Dashboard in a real browser (creating a goal from a template with no target value) — the equivalent `curl` tests never hit it because they always either omitted the field or passed a real number.

## Async errors

`server.js` requires `express-async-errors` immediately after `express` — this patches Express 4 (which does not natively catch rejected promises in `async` route handlers) to forward them to the error-handling middleware at the bottom of `server.js` instead of crashing the whole process. Every route handler in `src/server/routes/` is `async` and relies on this; don't remove the require.

---

## Database schema

See `src/server/db/schema.sql` for the authoritative definitions (columns, types, constraints). Table relationships:

```
users ──< profiles ──< dashboards (1:1)
                   ├──< workout_logs
                   ├──< goals ──< training_weeks (optional link)
                   ├──< training_weeks ──< training_blocks
                   ├──< daily_trackers ──< tracker_screenshots
                   ├──< meal_plans ──< meal_plan_items
                   ├──< supplement_intakes
                   └──< ai_analyses
```

All child tables have `ON DELETE CASCADE` back to `profiles` (and `profiles` cascades from `users`) — deleting a profile or user cleans up everything without app-level cleanup code. `training_weeks.goal_id` is `ON DELETE SET NULL` — deleting a goal un-links its week rather than deleting the week.

Goal/block **templates** are plain JS config in `src/server/lib/templates.js`, not a table — they're editable content, not user data, mirroring how `src/js/db.js`'s `DB` array holds page content. They span 8 block categories (run, trail, weights, calisthenics, cycling, swimming, boxing, stretch) and ~20 goal templates across running/trail, natural bodyweight progression (r/bodyweightfitness-style, deliberately not bodybuilding), cycling (FTP/Coggan zones), swimming (Critical Swim Speed), and amateur boxing conditioning — see the file's header comment for the evidentiary basis of each. New categories need only a `BLOCK_CATEGORY_STYLE` entry in `blockStyleConfig.js` to render correctly — no CSS changes.

---

## Week Builder drag-and-drop (weekBuilder.js)

SortableJS (CDN, loaded in `index.html`'s `<head>`) drives drag-and-drop, with `forceFallback: true` — pointer-based dragging instead of the browser's native HTML5 DnD, chosen after browser-automation testing surfaced that native DnD cannot be reliably driven by any synthetic-input tool (Playwright included — this is a well-known, tool-wide limitation, not specific to this app.) `forceFallback` also sidesteps native DnD's inconsistent drag-image rendering and its friction with fixed/sticky-positioned ancestors (this layout has both).

Sync strategy: **every** drag operation (drop from palette, move to another day, reorder within a day) calls the relevant API endpoint, then reloads the entire week from the server and re-initializes all Sortable instances (`initSortables()` destroys and recreates them). This trades a small UI flash for never having Vue's virtual DOM and Sortable's direct DOM manipulation fight over list order — there is exactly one source of truth (the server) at all times.

**Tap-to-place is a first-class second path, not a fallback-of-last-resort**: click a palette template (`selectTemplate`) to highlight it, then click a day's "+ Add …" button (`placeOnDay`) to place it there, calling the exact same `Storage.addBlock` flow a drop would. This exists because drag-only interactions exclude touch-without-precision, keyboard, and screen-reader users regardless of how well the drag itself works — and, concretely, it's how this feature's add-block path got verified end-to-end in a browser (see the browser-automation note above).

**Palette DOM must keep every `.palette-item` and category-header as a flat, direct child of the `ref="palette"` element** — SortableJS treats an attached container's direct children as its draggable units. The template uses `<template v-for>` (a non-rendering Vue wrapper) around each category's header + items specifically to flatten them, instead of a `<div v-for>` group wrapper; with a wrapper div, grabbing any single item would drag the *entire category group* as one clump (the bug this was fixed from). The palette's Sortable instance also passes `filter: '.palette-category-header'` so headers themselves aren't draggable.

**Block-detail modal** (`detailItem`/`openTemplateDetail`/`openBlockDetail`/`closeDetail`/`selectExercise`, plus the `detailExercises` computed): clicking a palette item's or placed block's ⓘ button opens the app's first modal (no prior modal convention existed — see `.detail-modal-backdrop`/`.detail-modal` in `style.css`, patterned after the existing `.server-error` fixed-overlay + `.module-card` panel styles), listing every `EXERCISE_TEMPLATES` entry (`lib/exercises.js`, fetched via `GET /api/profiles/:id/training/exercises`) matching that block/template's category. `detailItem.blockId` is only set when opened from an already-*placed* block (not a palette template preview) — that's what gates the "Use this →" button per exercise row, which calls the normal `Storage.updateBlock` to overwrite that block's `title`/`details.exerciseId` with the chosen exercise. There's no separate per-block exercise table — the chosen exercise just becomes the block's title, same as picking a template does.

**Palette layout**: horizontal, full-width, above the day board (not a fixed-width sidebar beside it) so the board gets the full container width. `.palette-row` is `display:flex; flex-wrap:wrap` — every item and category header stays a flat direct child (required for Sortable, per the note above), and each header carries Tailwind's `basis-full` utility to force a line break, visually grouping categories into rows without a wrapper element.

**Palette is collapsed by default** (`showPalette`, toggled by `.palette-toggle`) — ~24 templates across 8 categories is too much vertical space to show unconditionally. Collapsing uses `v-show`, not `v-if`: `v-show` only toggles CSS `display:none` and keeps the `ref="palette"` DOM node mounted, so its SortableJS instance never needs to be destroyed/recreated on every expand — a `v-if` here would silently break drag-and-drop every time the panel was reopened, since the ref it was bound to would no longer exist.

**Two mobile/touch-specific SortableJS options, set once in `blockStyleConfig.js`'s `sortableOptions()` so every instance (palette + every day list) gets them uniformly:**
- `filter: '.palette-item-info, .block-card-info'` + `preventOnFilter: false` — without this, tapping the ⓘ info button was being captured as the start of a drag/touch gesture on the whole `.palette-item`/`.block-card` instead of reaching the button's own click handler; this filter excludes those buttons from initiating a drag, and `preventOnFilter:false` stops Sortable from also suppressing their native tap (its default is to `preventDefault()` a filtered element's initiating touch, which can swallow the browser's synthesized click). Any caller-supplied `filter` (e.g. the palette's category headers) is merged in, not overwritten.
- `delay: 150, delayOnTouchOnly: true, touchStartThreshold: 5` — a touch-scroll gesture starts with the exact same touchstart/touchmove as a drag; without a delay, swiping down the page to scroll past a block could get misread as picking it up and dropping it on whatever day the finger happened to be over when the touch ended. The delay gives a real scroll swipe (which moves past the 5px threshold almost immediately) a window to cancel the pending drag-activation; a genuine press-and-hold-then-drag still works normally. `delayOnTouchOnly` keeps mouse/desktop dragging instant — this only affects touch input.

## Daily Tracker ← Week Builder link

The Daily Tracker (Strava link + notes + screenshots, keyed on `profile_id + date`) and Week Builder (`training_weeks`/`training_blocks`, keyed on `profile_id + week_start_date + day_of_week`) are separate feature stacks with no shared foreign key — a block's real calendar date only exists implicitly as `week_start_date + day_of_week days`. `dailyTracker.js` bridges them by re-deriving that same date math itself: it keeps its own private `mondayOf()` (an intentional duplicate of `weekBuilder.js`'s, not a shared helper — see this file's own header comment on why small date helpers are per-file copies here, not a shared global), computes that date's `weekStartDate` + `dayOfWeek`, and calls `Storage.getWeekByDate()` to fetch whatever was planned.

**`GET /weeks/by-date/:weekStartDate` is deliberately read-only** — unlike `POST /weeks` (`ensureWeek`, used by Week Builder itself), it never creates a `training_weeks` row. The Daily Tracker is opened far more often and for far more dates than someone deliberately plans a week for; reusing `ensureWeek` here would silently seed an empty week row for every date anyone ever viewed in the tracker. Missing week → `{ id: null, weekStartDate, goalId: null, blocks: [] }`, not a 404 — "nothing planned yet" is a normal, expected state here, not an error.

Every week is independently stored (`training_weeks` is unique on `profile_id + week_start_date`) and resolved fresh from whatever date the tracker is currently showing — flipping the Daily Tracker's date always looks up that exact week, the same way paging a calendar would, never a cached/generic "current week."

## Auto-build (lib/autobuild.js)

Deterministic and rules-based — **not** an AI feature. `GOAL_TYPE_DOMAIN` maps every `goal_type` to one of 6 domains (running, trail, calisthenics, cycling, swimming, boxing) plus a `general` fallback for weight/lift_pr goals or no goal at all — each domain has its own `build*Week()` function producing a week actually built around that sport, not a running week with the label changed (e.g. a calisthenics goal gets a push/pull/leg/skill split, a swim goal gets CSS-based interval sets). The original running-only logic (weeks-remaining → specificity phase, ramping long run) lives on as `buildRunningWeek`. Every domain still gets a daily heel-rehab/mobility stretch block, and — unless running/trail specificity IS the goal — a short daily maintenance Zone 2 run, since the app's core premise is a daily cardio streak regardless of the active goal. Calling auto-build **replaces** the week's current blocks — intentional (a reset), not a merge.

## Goal Dashboard → Week Builder handoff

`goalDashboard.js`'s "Build Week from this Goal" button sets `this.$root.pendingAutobuildGoalId` and navigates to the Week Builder page. `weekBuilder.js` checks that field on `mounted()`, consumes it (selects the goal + runs autobuild), and clears it. This uses the single Vue root instance (already the app's global state holder in `app.js`) instead of introducing a state-management library — see the comment block at the top of both files.

## AI Analyzer (lib/openai.js, routes/ai.js)

`POST /api/profiles/:id/ai/analyze` with `{ scope: 'day'|'week'|'month', date, regenerate? }`. Computes the period's start/end date, gathers `workout_logs` + `daily_trackers` (+ their screenshot files, base64-encoded, capped at 10 images), `meal_plan_items` (joined against `meal_plans` and filtered by computed date via `DATE_ADD` in SQL, since items only carry a `day_of_week` offset, not an absolute date), and `supplement_intakes` for that window, and sends one chat-completions request to a vision-capable OpenAI model (`OPENAI_MODEL` env var). The prompt covers training, nutrition, and supplement adherence together — see `buildPrompt()` in `lib/openai.js`. Results are cached in `ai_analyses` keyed by `(profile_id, scope, period_start)` — repeat views return the cached row unless `regenerate: true` is passed, so viewing the same period twice never re-spends API credits silently.

## Hero images (lib/pexels.js, routes/images.js)

The 22 content pages each carry a `heroQuery` string in `db.js` (e.g. `'mountain sunrise trail runner'`) instead of a hardcoded photo URL. `app.js`'s `loadHeroImage()` calls `GET /api/images/hero?query=...` on every page navigation (`setPage()`) and once after the initial profile load, caching the result in `heroImageCache` keyed by query string (not page id — several pages could share a query) so the same query is never re-fetched client-side either.

- **Server-side cache**: `lib/pexels.js` also caches per-query for 24h in-memory — the queries are a fixed set of 22 strings, so without this every page view by every user would re-hit Pexels for the exact same handful of queries, which is both wasteful and a fast way to exhaust Pexels' free-tier rate limit (200 req/hour).
- **Graceful degradation everywhere**: no `PEXELS_API_KEY` configured, a failed request, or zero results — all three return `null` (a normal 200 response, not an error). The frontend's `resolvedHero` computed treats `null` exactly like a page with no `heroQuery` at all: it falls back to the plain title header. Nothing breaks or shows an error state if you never add a Pexels key.
- **Attribution**: Pexels' API terms require crediting the photographer and linking back to Pexels when a photo is displayed — `index.html`'s hero block renders "Photo by {photographer} on Pexels" with both links whenever a hero image is showing. Don't remove this if you touch that block.

---

## Food Planner (lib/foods.js, lib/nutritionTargets.js, routes/nutrition.js)

`FOOD_TEMPLATES` is a ~24-item Guatemalan food database (macros per 100g), deliberately limited to everyday staples already referenced in db.js pages 5/6 — not an exhaustive international food database. `meal_plans`/`meal_plan_items` store only `food_id` (a string reference into that static list, not a foreign key) + `grams` per (day, meal slot) — every macro number is computed server-side on read (`macrosFor()` in foods.js), so retuning a food's macro data in foods.js takes effect everywhere immediately, no migration needed.

The daily calorie/macro target line isn't a new nutrition philosophy — `nutritionTargets.js` reimplements the exact formulas already in `calculators.js` (BMR via Mifflin-St Jeor, protein at 1.6g/kg, fat at 22%) and the exact protocol already stated in db.js pages 3/6 (2,100 kcal Mon–Sat, 2,800 kcal Sunday surplus), just exposed server-side as a per-day-of-week target for the planner to compare against.

## Supplements tracker (lib/supplements.js, routes/supplements.js, supplementStack.js)

`supplement_intakes` stores one row per (profile, date, supplement_key) — "taken" is presence of the row, not a boolean column; toggling off deletes it. The PUT endpoint replaces the whole day's set in one call (delete-all-then-reinsert) rather than exposing separate add/remove endpoints, mirroring the Daily Dashboard's existing single-PUT checklist pattern. `SUPPLEMENT_TEMPLATES` is intentionally the same 8 supplements db.js pages 7/8 already cite with sources — this is a tracker for existing reviewed content, not a new list to independently vet.

---

## New pages (frontend)

Week Builder / Goal Dashboard / Daily Tracker / Settings / Food Planner / Supplements are page ids **25–30** in `src/js/db.js`, flagged `isTrainingBuilder` / `isGoals` / `isTracker` / `isSettings` / `isNutrition` / `isSupplements` respectively — the same pattern as the existing `isDashboard` (page 20) / `isJournal` (page 21) pages. `index.html`'s main-content `v-else-if` chain and `app.js`'s generic top-bar PDF button (`exportPDF()` / `window.print()`) both exclude all six, since the Week Builder has its own server-rendered PDF/CSV/ICS export toolbar instead and the others don't need print export at all. Sprint Timer (below) is page id **31**, `isSprintTimer`, added later and out of the 25–30 run — ids don't need to stay contiguous, `NAV_GROUPS` just filters by id.

## Sprint/Interval Timer (sprintTimer.js, lib/timerPresets.js)

A deliberately different content model from `lib/exercises.js`: that catalog's `dosage` field is free text for a human to read ("8-12 x 400m, 90s jog rest" mixes a distance with a duration — not parseable into a countdown). `TIMER_PRESETS` is fully structured (`rounds`/`workSec`/`restSec`) specifically so the timer can run a preset directly, and deliberately covers only the three split-based sports (run/cycling/swimming), not all 8 block categories. Picking a preset just pre-fills the editable rounds/work/rest fields — it's a starting point, not a locked-in config.

**UI is deliberately oversized** — `.timer-display`'s countdown scales up to `10rem` (`clamp(4rem, 22vw, 10rem)`), the whole card fills with a solid phase color (`.timer-phase-work`/`-rest`/`-done`), not just a small badge. This is intentional: the tool is meant to be glanced at from arm's length (or further) mid-run/ride, not read up close.

**Audio/voice cues, not just visual** — for the same reason (using it while moving, not staring at the phone): a Web Audio oscillator beep (`_beep()`, no asset files, matching this app's no-build-step approach elsewhere) on the last 3 seconds of each phase and on every phase transition, plus spoken "Go"/"Rest"/"Workout complete" cues via `SpeechSynthesis` when voice is enabled. Both, plus volume, persist to `localStorage` (`bp_timer_sound`/`bp_timer_voice`/`bp_timer_volume`) — same pattern as the other `bp_*` client-side prefs (see "Client-side persisted UI state" above).

**Screen Wake Lock** (`navigator.wakeLock`, feature-detected, silently no-ops if unsupported/denied) is requested on start/resume and released on pause/reset — a phone screen dimming/locking mid-interval-set would defeat a tool meant to run untouched for minutes.

**Countdown is anchored to `Date.now()`, not a naive `setInterval` decrement** (`_phaseEndAt`, `start()`/`_tick()`/`_transitionPhase()`). A plain "subtract 1 each tick" clock drifts behind real elapsed time the longer it runs — `setInterval` ticks can be delayed by a busy event loop or a backgrounded/throttled tab, and a decrement-based clock never reclaims that lost time, only compounds it. Every tick instead recomputes `secondsLeft` from the wall-clock timestamp the current phase should end at, so a late tick just catches up to the true remaining time. `pause()`/`resume()` capture/restore the remaining milliseconds rather than pausing a decrement counter, for the same reason.

**Phase sequence**: `idle -> [warmup] -> (work -> rest) × rounds -> [cooldown] -> done`. `warmupEnabled`/`cooldownEnabled` (both default on, persisted to `localStorage` like the sound/voice prefs) skip that phase entirely rather than running it with a zero duration — `start()` and `_transitionPhase()` both branch on them directly. `currentRound` only increments on the `rest -> work` transition, so a round's *rest* is considered part of that same round, not the next one — `roundStatus(n)` (used by both the round label and the sidebar cards below) treats a round as `'current'` only while its own `work` sub-phase is active, and `'done'` for the rest of that round's rest, cooldown, or `done`.

**Session sidebar** (`sessionCards` computed, `.timer-rounds-sidebar`/`.timer-round-card`): one card per warm-up/round/cool-down across the *whole* session, each flagged done/current/upcoming — real-time visibility into how much of the session is behind you and how much is left, not just the current round's countdown. Horizontal scroll strip under 1024px width, a fixed-width scrolling column beside the big countdown above that.

**Motivational voice/popup cues** (`_showMotivation()`, `src/js/data/timerPhrases.json`) are a separate, additional layer on top of the structural "Go"/"Rest"/"Cool down" announcements above — a random phrase from `getReady` fires once per phase in the last 3 seconds of `warmup`/`rest` (work is about to start), and one from `pushThrough` in the last 3 seconds of `work` (it's about to end), both spoken via `SpeechSynthesis` and flashed as a `.timer-motivation-popup` banner over the countdown for ~2.5s. `_motivationShownForPhase` gates it to once per phase (reset in `_enterPhase()`) so it doesn't refire on every one of the 3 countdown ticks. Plain JSON (not a server route) — no profile-scoping or DB round-trip needed for static phrase lists, fetched directly from the `/src` static mount already serving every other client asset.

**Setup and sound-settings panels are independently collapsible** (`showSetup`/`showSoundPanel`, `.timer-section-toggle`) — same rationale as the Week Builder's palette collapse: less permanent vertical space spent on controls, more on the thing that matters while actually moving. Sound settings default *collapsed* (a set-once preference, not something glanced at mid-run); setup defaults *expanded* since you need it to actually configure a session, and it's already hidden entirely once `phase !== 'idle'` regardless. Default `volume` is `1` (max) — this tool is meant to be heard over wind/traffic/breathing, not a quiet media-player-style default.

## Settings page (settingsPage.js, routes/account.js)

Three independent concerns, one page:
- **Password change** — `PUT /api/account/password` requires `currentPassword` (bcrypt-verified) before accepting `newPassword`, which goes through the same policy check as registration (`src/server/lib/validation.js`'s `passwordPolicyError`, shared so the two can't drift apart).
- **Usage display** — reads `GET /api/account/usage` (see the quota section above) and renders the same `.goal-progress-track`/`.goal-progress-fill` bars the Goal Dashboard uses.
- **Language preference** — `PUT /api/account/preferences` persists `users.preferred_language` (added via an `ALTER TABLE ... ADD COLUMN` in `schema.sql`, applied separately from the `CREATE TABLE` batch — see that file's comment and the "Week Builder drag-and-drop" section above for why `IF NOT EXISTS` isn't used there). Persisting it is separate from *applying* it: clicking "Apply" also sets the `googtrans` cookie Google Translate reads on load and reloads the page. It is deliberately **not** auto-re-applied on every login — an unexpected forced reload on login would be a worse experience than asking once.
- Theme toggle is also surfaced here for discoverability, but it's the same `darkMode`/`toggleTheme()` that already lived on the root instance (`$root.toggleTheme()`) — no new state.

---

## Security

- **Static file serving is scoped**, not `express.static(__dirname)`. `server.js` serves `index.html` explicitly at `/` and mounts `express.static` only on `/src` and `/uploads`. Serving the whole project root would also expose `server.js`, `package.json`, and everything under `src/server/` (backend source) to any anonymous request — don't widen this without re-checking that.
- **Helmet** (`helmet()`, CSP disabled — see the comment in `server.js` for why) sets the standard hardening headers (`X-Content-Type-Options`, `X-Frame-Options`, `Cross-Origin-Opener-Policy`, etc.).
- **Session cookie**: `httpOnly`, `sameSite: 'lax'` (cross-site POSTs won't carry the cookie — the app's CSRF mitigation, chosen over full CSRF tokens as proportionate to this app's scope), `secure` gated on `NODE_ENV=production` (requires `NODE_ENV=production` to be set in the real deployment, or the cookie won't require HTTPS).
- **Session store is MySQL-backed** (`express-mysql-session`, reusing the app's existing `pool` from `db/pool.js` rather than opening a second connection pool — see `server.js`). Deliberately *not* express-session's default in-memory `MemoryStore`: that store loses every logged-in session on any process restart (redeploy, crash, `nodemon` picking up a file change), which surfaces to users as an "Unauthorized" error on the next action they take, despite the page still showing them as logged in — the session cookie is still valid and gets sent, but the server-side session record it points to is just gone. The store auto-creates its own `sessions` table on first use (`CREATE TABLE IF NOT EXISTS`, matching this codebase's other idempotent-migration conventions), so no manual schema step is needed.
- **`app.set('trust proxy', 1)`** — required for both the `secure` cookie check and rate-limit IP detection to work correctly behind Hostinger's reverse proxy.
- **Graceful shutdown on `SIGTERM`/`SIGINT`** (`server.js`, bottom): closes the HTTP server, the session store, and the DB pool before calling `process.exit(0)`, with a 5s force-exit fallback if any of that hangs. Every PaaS host sends `SIGTERM` on ordinary redeploys/restarts — not a crash — but `node server.js` previously had no handler for it, so the process was just killed mid-flight; `npm start`'s wrapper then logs that abrupt kill as `npm error signal SIGTERM`, which reads as a failed deploy in the platform's UI even though nothing actually broke. Exiting cleanly with code `0` on our own terms avoids that false alarm. (Verified via `process.emit('SIGTERM')` in-process, since Windows dev machines can't deliver a real cross-process `SIGTERM` the way the Linux containers this actually runs on do.)
- **Auth rate limiting** (`src/server/middleware/rateLimit.js`, `authLimiter`): 20 requests / 15 min per IP on `/api/auth/register` and `/api/auth/login`, in-memory (express-rate-limit) — resetting on restart is an accepted trade-off here (see the file's header comment for why this is different from the upload/AI quotas, below).
- **Per-account usage quotas** ("wall it so no one exhausts the app"), `src/server/lib/quota.js` + the `usage_events` table: 60 screenshot uploads and 30 real AI-analyzer calls per rolling 24h, per account — durable (DB-backed, survives restarts) unlike the auth limiter above, and with **no bypass for any account**, including the deployer's own.
  - Screenshot uploads: checked in `routes/tracker.js` after multer has written the batch to disk (file count isn't known until the multipart body is parsed) — if the batch would exceed quota, the just-written files are deleted and the request is rejected with 429, so nothing is orphaned on disk.
  - AI analysis: checked in `routes/ai.js` only once a cache-miss/`regenerate` is about to trigger a real OpenAI call — viewing an already-cached period is always free and never counts against the quota.
  - `GET /api/account/usage` (`routes/account.js`) reports current usage/limit for both, surfaced in the Settings page.
- **Ownership checks**: every profile-scoped route (`dashboard.js`, `log.js`, `goals.js`, `training.js`, `tracker.js`, `ai.js`) re-verifies `profile.user_id === session.userId` before reading or writing anything — `requireAuth` only proves *a* session exists, not that it owns the resource in the URL.
- **SQL**: always parameterized (`?` placeholders) — the one exception is `DB_NAME` interpolated into `CREATE DATABASE IF NOT EXISTS` in `setup.js`, which is an operator-set deployment value from `.env`, not user input.
- **Uploads**: filenames are always server-generated (`crypto.randomUUID()` + the original extension only), never the client-supplied filename directly — avoids path traversal via a crafted `originalname`. MIME type is checked (not just extension); size and file-count are capped per request. Uploaded files are served statically without an auth check — anyone with the exact (UUID-based, unguessable) URL can view them; this is a deliberate scope trade-off, not an oversight.

## Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default 3000) |
| `SESSION_SECRET` | express-session secret |
| `NODE_ENV` | Set to `production` in real deployments — gates the session cookie's `secure` flag (see Security, above) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL connection (used by `pool.js` and `setup.js`) |
| `OPENAI_API_KEY` | Server-side only — never sent to the browser |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini` in `lib/openai.js` if unset |
| `PEXELS_API_KEY` | Optional — hero images just don't appear (plain title header) if unset |

See `.env.example` for a ready-to-copy template.
