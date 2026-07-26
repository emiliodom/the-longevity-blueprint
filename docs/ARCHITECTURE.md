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
    └── components/
        ├── calculators.js       — 9 biometric calculator components
        ├── charts.js            — BarChart / DonutChart (Chart.js wrappers)
        ├── blockStyleConfig.js  — window.BlockStyleConfig: block style/position/collision/animation tuning (plain data — edit this, not weekBuilder.js/style.css, to retune how blocks look/drag)
        ├── weekBuilder.js       — WeekBuilder: drag-and-drop week planner (SortableJS)
        ├── goalDashboard.js     — GoalDashboard: milestone CRUD + "Build Week" handoff
        ├── dailyTracker.js      — DailyTracker: Strava link + screenshots, embeds AiAnalyzer
        ├── aiAnalyzer.js        — AiAnalyzer: day/week/month OpenAI summary panel
        ├── settingsPage.js      — SettingsPage: password, usage quotas, language, theme
        └── foodPlanner.js       — FoodPlanner: Guatemalan-food weekly meal planner vs daily calorie/macro target

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
│   ├── autobuild.js                — deterministic rules engine: goal + week → suggested blocks
│   ├── openai.js                   — OpenAI vision analyzer (server-side key, never sent to browser)
│   ├── quota.js                    — durable per-account usage quotas (uploads, AI calls) — usage_events table
│   ├── validation.js                — shared input validation (password policy)
│   ├── pexels.js                    — Pexels photo search + 24h in-memory cache, server-side key only
│   ├── foods.js                      — FOOD_TEMPLATES: Guatemalan food macro data (static content, not user data)
│   ├── nutritionTargets.js           — daily calorie/macro target (mirrors calculators.js formulas + db.js's 2,100/2,800 kcal protocol)
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
    └── nutrition.js                        — Food Planner: foods list, meal-plan weeks/items, computed macros/targets

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
                   └──< ai_analyses
```

All child tables have `ON DELETE CASCADE` back to `profiles` (and `profiles` cascades from `users`) — deleting a profile or user cleans up everything without app-level cleanup code. `training_weeks.goal_id` is `ON DELETE SET NULL` — deleting a goal un-links its week rather than deleting the week.

Goal/block **templates** are plain JS config in `src/server/lib/templates.js`, not a table — they're editable content, not user data, mirroring how `src/js/db.js`'s `DB` array holds page content. They span 8 block categories (run, trail, weights, calisthenics, cycling, swimming, boxing, stretch) and ~20 goal templates across running/trail, natural bodyweight progression (r/bodyweightfitness-style, deliberately not bodybuilding), cycling (FTP/Coggan zones), swimming (Critical Swim Speed), and amateur boxing conditioning — see the file's header comment for the evidentiary basis of each. New categories need only a `BLOCK_CATEGORY_STYLE` entry in `blockStyleConfig.js` to render correctly — no CSS changes.

---

## Week Builder drag-and-drop (weekBuilder.js)

SortableJS (CDN, loaded in `index.html`'s `<head>`) drives drag-and-drop, with `forceFallback: true` — pointer-based dragging instead of the browser's native HTML5 DnD, chosen after browser-automation testing surfaced that native DnD cannot be reliably driven by any synthetic-input tool (Playwright included — this is a well-known, tool-wide limitation, not specific to this app.) `forceFallback` also sidesteps native DnD's inconsistent drag-image rendering and its friction with fixed/sticky-positioned ancestors (this layout has both).

Sync strategy: **every** drag operation (drop from palette, move to another day, reorder within a day) calls the relevant API endpoint, then reloads the entire week from the server and re-initializes all Sortable instances (`initSortables()` destroys and recreates them). This trades a small UI flash for never having Vue's virtual DOM and Sortable's direct DOM manipulation fight over list order — there is exactly one source of truth (the server) at all times.

**Tap-to-place is a first-class second path, not a fallback-of-last-resort**: click a palette template (`selectTemplate`) to highlight it, then click a day's "+ Add …" button (`placeOnDay`) to place it there, calling the exact same `Storage.addBlock` flow a drop would. This exists because drag-only interactions exclude touch-without-precision, keyboard, and screen-reader users regardless of how well the drag itself works — and, concretely, it's how this feature's add-block path got verified end-to-end in a browser (see the browser-automation note above).

## Auto-build (lib/autobuild.js)

Deterministic and rules-based — **not** an AI feature. `GOAL_TYPE_DOMAIN` maps every `goal_type` to one of 6 domains (running, trail, calisthenics, cycling, swimming, boxing) plus a `general` fallback for weight/lift_pr goals or no goal at all — each domain has its own `build*Week()` function producing a week actually built around that sport, not a running week with the label changed (e.g. a calisthenics goal gets a push/pull/leg/skill split, a swim goal gets CSS-based interval sets). The original running-only logic (weeks-remaining → specificity phase, ramping long run) lives on as `buildRunningWeek`. Every domain still gets a daily heel-rehab/mobility stretch block, and — unless running/trail specificity IS the goal — a short daily maintenance Zone 2 run, since the app's core premise is a daily cardio streak regardless of the active goal. Calling auto-build **replaces** the week's current blocks — intentional (a reset), not a merge.

## Goal Dashboard → Week Builder handoff

`goalDashboard.js`'s "Build Week from this Goal" button sets `this.$root.pendingAutobuildGoalId` and navigates to the Week Builder page. `weekBuilder.js` checks that field on `mounted()`, consumes it (selects the goal + runs autobuild), and clears it. This uses the single Vue root instance (already the app's global state holder in `app.js`) instead of introducing a state-management library — see the comment block at the top of both files.

## AI Analyzer (lib/openai.js, routes/ai.js)

`POST /api/profiles/:id/ai/analyze` with `{ scope: 'day'|'week'|'month', date, regenerate? }`. Computes the period's start/end date, gathers `workout_logs` + `daily_trackers` (+ their screenshot files, base64-encoded, capped at 10 images) for that window, and sends one chat-completions request to a vision-capable OpenAI model (`OPENAI_MODEL` env var). Results are cached in `ai_analyses` keyed by `(profile_id, scope, period_start)` — repeat views return the cached row unless `regenerate: true` is passed, so viewing the same period twice never re-spends API credits silently.

## Hero images (lib/pexels.js, routes/images.js)

The 22 content pages each carry a `heroQuery` string in `db.js` (e.g. `'mountain sunrise trail runner'`) instead of a hardcoded photo URL. `app.js`'s `loadHeroImage()` calls `GET /api/images/hero?query=...` on every page navigation (`setPage()`) and once after the initial profile load, caching the result in `heroImageCache` keyed by query string (not page id — several pages could share a query) so the same query is never re-fetched client-side either.

- **Server-side cache**: `lib/pexels.js` also caches per-query for 24h in-memory — the queries are a fixed set of 22 strings, so without this every page view by every user would re-hit Pexels for the exact same handful of queries, which is both wasteful and a fast way to exhaust Pexels' free-tier rate limit (200 req/hour).
- **Graceful degradation everywhere**: no `PEXELS_API_KEY` configured, a failed request, or zero results — all three return `null` (a normal 200 response, not an error). The frontend's `resolvedHero` computed treats `null` exactly like a page with no `heroQuery` at all: it falls back to the plain title header. Nothing breaks or shows an error state if you never add a Pexels key.
- **Attribution**: Pexels' API terms require crediting the photographer and linking back to Pexels when a photo is displayed — `index.html`'s hero block renders "Photo by {photographer} on Pexels" with both links whenever a hero image is showing. Don't remove this if you touch that block.

---

## Food Planner (lib/foods.js, lib/nutritionTargets.js, routes/nutrition.js)

`FOOD_TEMPLATES` is a ~24-item Guatemalan food database (macros per 100g), deliberately limited to everyday staples already referenced in db.js pages 5/6 — not an exhaustive international food database. `meal_plans`/`meal_plan_items` store only `food_id` (a string reference into that static list, not a foreign key) + `grams` per (day, meal slot) — every macro number is computed server-side on read (`macrosFor()` in foods.js), so retuning a food's macro data in foods.js takes effect everywhere immediately, no migration needed.

The daily calorie/macro target line isn't a new nutrition philosophy — `nutritionTargets.js` reimplements the exact formulas already in `calculators.js` (BMR via Mifflin-St Jeor, protein at 1.6g/kg, fat at 22%) and the exact protocol already stated in db.js pages 3/6 (2,100 kcal Mon–Sat, 2,800 kcal Sunday surplus), just exposed server-side as a per-day-of-week target for the planner to compare against.

---

## New pages (frontend)

Week Builder / Goal Dashboard / Daily Tracker / Settings / Food Planner are page ids **25–29** in `src/js/db.js`, flagged `isTrainingBuilder` / `isGoals` / `isTracker` / `isSettings` / `isNutrition` respectively — the same pattern as the existing `isDashboard` (page 20) / `isJournal` (page 21) pages. `index.html`'s main-content `v-else-if` chain and `app.js`'s generic top-bar PDF button (`exportPDF()` / `window.print()`) both exclude all five, since the Week Builder has its own server-rendered PDF/CSV/ICS export toolbar instead and the others don't need print export at all.

## Settings page (settingsPage.js, routes/account.js)

Three independent concerns, one page:
- **Password change** — `PUT /api/account/password` requires `currentPassword` (bcrypt-verified) before accepting `newPassword`, which goes through the same policy check as registration (`src/server/lib/validation.js`'s `passwordPolicyError`, shared so the two can't drift apart).
- **Usage display** — reads `GET /api/account/usage` (see the quota section above) and renders the same `.goal-progress-track`/`.goal-progress-fill` bars the Goal Dashboard uses.
- **Language preference** — `PUT /api/account/preferences` persists `users.preferred_language` (added via an `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `schema.sql` — see the comment there for why new columns on an already-shipped table need that instead of just editing the `CREATE TABLE`). Persisting it is separate from *applying* it: clicking "Apply" also sets the `googtrans` cookie Google Translate reads on load and reloads the page. It is deliberately **not** auto-re-applied on every login — an unexpected forced reload on login would be a worse experience than asking once.
- Theme toggle is also surfaced here for discoverability, but it's the same `darkMode`/`toggleTheme()` that already lived on the root instance (`$root.toggleTheme()`) — no new state.

---

## Security

- **Static file serving is scoped**, not `express.static(__dirname)`. `server.js` serves `index.html` explicitly at `/` and mounts `express.static` only on `/src` and `/uploads`. Serving the whole project root would also expose `server.js`, `package.json`, and everything under `src/server/` (backend source) to any anonymous request — don't widen this without re-checking that.
- **Helmet** (`helmet()`, CSP disabled — see the comment in `server.js` for why) sets the standard hardening headers (`X-Content-Type-Options`, `X-Frame-Options`, `Cross-Origin-Opener-Policy`, etc.).
- **Session cookie**: `httpOnly`, `sameSite: 'lax'` (cross-site POSTs won't carry the cookie — the app's CSRF mitigation, chosen over full CSRF tokens as proportionate to this app's scope), `secure` gated on `NODE_ENV=production` (requires `NODE_ENV=production` to be set in the real deployment, or the cookie won't require HTTPS).
- **`app.set('trust proxy', 1)`** — required for both the `secure` cookie check and rate-limit IP detection to work correctly behind Hostinger's reverse proxy.
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
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL connection (used by `pool.js` and `setup.js`) |
| `OPENAI_API_KEY` | Server-side only — never sent to the browser |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini` in `lib/openai.js` if unset |
| `PEXELS_API_KEY` | Optional — hero images just don't appear (plain title header) if unset |

See `.env.example` for a ready-to-copy template.
